/*
 * Mejora de fotos de producto con IA (OpenAI) — proxy serverless
 * (Cloudflare Pages Function: POST /api/ia-imagen).
 *
 * El navegador nunca ve la API key: le pega a esta función con la clave
 * compartida de Formas (header x-formas-clave) y la función llama a OpenAI.
 *
 * Generar una imagen tarda bastante, así que se usa la Responses API en modo
 * background: OpenAI encola el trabajo y el navegador consulta el estado cada
 * unos segundos. Cada llamada a esta función responde en milisegundos.
 *
 *   POST {action:'start', mode:'fondo-blanco'|'situacion'|'resolucion', image:<dataURL>, producto?, ancho?, alto?}
 *   POST {action:'start', mode:'logo', image:<dataURL png>, pedido, ancho?, alto?}
 *     → {id, status}
 *   POST {action:'estado', id}
 *     → {status:'queued'|'in_progress'|'completed'|'failed', image?, error?}
 *
 * Variables (Cloudflare → Workers & Pages → este proyecto → Settings → Variables and Secrets):
 *   OPENAI_API_KEY        obligatoria
 *   FORMAS_IA_CLAVE       obligatoria — clave compartida que pide la app
 *   OPENAI_MODEL          opcional — modelo "conductor" (default gpt-5-mini)
 *   OPENAI_IMAGE_MODEL    opcional — modelo de imagen (default gpt-image-2.5-sunburst,
 *                         el más fiel editando; gpt-image-2.5-flare = más rápido)
 *   OPENAI_IMAGE_QUALITY  opcional — low | medium | high | xhigh | max (default medium)
 */

const OPENAI = 'https://api.openai.com/v1';

/* El "estilo Formas": reglas de marca fijas que acompañan a TODA imagen.
   Es la fuente de verdad del look — se ajusta acá, no en el HTML. */
const ESTILO_FORMAS = `Sos el retocador fotográfico de Formas Publicitarias, una empresa de merchandising corporativo. Recibís la foto de un producto promocional (a veces sacada con el celular) y la editás respetando SIEMPRE estas reglas de marca:
- El producto es intocable: mantené idénticos su forma, proporciones, colores, materiales y sobre todo cualquier logo o texto que tenga aplicado. No lo redibujes ni lo "mejores": fidelidad total.
- Estética Formas: luminosa, limpia y profesional; luz suave de estudio, balance de blancos correcto, colores fieles y frescos.
- No agregues texto, marcas de agua, personas reconocibles ni productos que no estén en la foto original.
- El resultado debe verse como una fotografía real, nunca como ilustración ni render 3D.`;

const MODO_FONDO_BLANCO = `Convertí la foto en una toma de producto estilo e-commerce: aislá el producto y presentalo sobre un fondo blanco puro y uniforme, centrado y completo en el encuadre, con una sombra de contacto suave y realista debajo. Corregí iluminación y nitidez si la foto original es floja.`;

/* "Más resolución": la foto llegó chica (celular viejo, captura de un catálogo web)
   y hay que agrandarla sin tocar nada más. Pisa a propósito la parte "estética"
   del estilo Formas: acá no se corrige luz ni color, solo se recupera detalle. */
const MODO_RESOLUCION = `Esta tarea es ÚNICAMENTE de resolución: la foto original es chica y hay que entregarla más grande y nítida. Reproducí exactamente la misma imagen — mismo encuadre y recorte, mismo fondo, misma posición y tamaño del producto, mismos colores, misma iluminación y sombras, mismos logos y textos — recuperando detalle fino, bordes limpios y texturas realistas, como un ampliado fotográfico de alta calidad. No apliques la estética Formas ni corrijas luz, balance de blancos o color; no agregues, quites, muevas ni "mejores" ningún elemento; no cambies el fondo ni lo limpies. Si alguna zona es ambigua por la baja resolución, resolvela de la forma más fiel y neutra posible, nunca inventando elementos nuevos.`;

/* "Modificar logo con IA": el vendedor escribe qué quiere cambiar. No lleva el estilo
   Formas de las fotos: el logo es un archivo de diseño para imprimir, no una foto de producto. */
const ESTILO_LOGO = `Sos el diseñador gráfico de Formas Publicitarias, una empresa de merchandising corporativo. Recibís el logo de un cliente y lo editás haciendo ÚNICAMENTE el cambio que pide el vendedor:
- Todo lo que el pedido no menciona queda idéntico: forma, tipografía, proporciones, colores, textos y disposición.
- Si el pedido incluye un texto, escribilo exactamente como está pedido, letra por letra.
- Es un logo para imprimir: gráfico plano y prolijo, con bordes nítidos y colores planos; nunca una foto, un mockup ni un render 3D, salvo que el pedido lo diga.
- Entregá el logo completo y centrado, con un poco de aire alrededor, sobre fondo transparente salvo que el pedido pida un fondo.`;

/* "En situación" se arma según las opciones que eligió el vendedor */
function promptSituacion(o) {
  const partes = [];
  partes.push(o.escena
    ? `Mostrá el mismo producto en una situación real y creíble en este lugar o contexto: ${o.escena}.`
    : `Mostrá el mismo producto en una situación de uso real y creíble acorde a su tipo (una oficina, un evento corporativo, una cafetería, un exterior urbano...).`);
  if (o.persona === 'persona') {
    partes.push(`El producto está siendo usado por una persona adulta genérica (que no se parezca a ninguna persona real), de la forma en que el producto se usa de verdad: si es indumentaria o un accesorio que se lleva puesto (gorra, remera, buzo, chomba, delantal, mochila, riñonera...), la persona lo tiene PUESTO como corresponde — la gorra en la cabeza, la remera puesta — y nunca lo sostiene en la mano; si es un objeto de uso, lo está usando con naturalidad (tomando del mate, escribiendo con la birome, bebiendo del termo).`);
  } else if (o.persona === 'manos') {
    partes.push(`Se ven solamente las manos de una persona interactuando con el producto, en primer plano; no se ve el resto del cuerpo.`);
  } else if (o.persona === 'no') {
    partes.push(`Sin personas en la escena.`);
  } // 'auto' u omitido: el modelo decide
  partes.push(`El producto es el protagonista: nítido, en primer plano y bien iluminado; el entorno acompaña detrás con un desenfoque suave. Ambiente luminoso, actual y aspiracional.`);
  if (o.medidas) {
    partes.push(`Medidas reales del producto: ${o.medidas}. Respetá esa escala: el tamaño del producto en la escena debe ser proporcional y realista respecto de las manos, personas y objetos que aparezcan.`);
  }
  if (o.escalaFoto) {
    partes.push(`Referencia adicional de escala tomada del boceto: la foto original completa abarca ${o.escalaFoto} reales; deducí de ahí el tamaño real del producto y respetalo en la escena.`);
  }
  if (o.datos && o.datos !== o.medidas) {
    partes.push(`Datos del producto cargados por el vendedor (material, medidas y color): ${o.datos}.`);
  }
  if (o.detalles) {
    partes.push(`Indicaciones adicionales del vendedor sobre la escena: ${o.detalles}.`);
  }
  return partes.join(' ');
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

/* el motivo de un rechazo de OpenAI, legible: viene en {error:{message}} (clave sin crédito,
   organización sin verificar, modelo inexistente…). Es lo que la app le muestra al vendedor. */
async function motivo(r) {
  const texto = await r.text();
  try { return String(JSON.parse(texto).error.message || texto).slice(0, 600); } catch { return texto.slice(0, 600); }
}

/* ponytail: el plan Free de Workers corta a los 10 ms de CPU por llamada, y pasar por JSON
   (parse, stringify y codificar) una foto de 6 MB gasta ~15 ms. Por eso la foto (en start) y
   la imagen generada (en estado) nunca se convierten a texto: se ubican en los bytes del JSON
   y se reenvían tal cual. Sirve porque base64 y los data URL no llevan comillas.
   Con Workers Paid (5 min de CPU) esto se puede volver a req.json() directo.
   Devuelve el JSON parseado con el campo reemplazado por HUECO, y los bytes del valor. */
const HUECO = '@@campo-grande@@';
const enc = new TextEncoder(), dec = new TextDecoder();
const COMILLA = 0x22, DOS_PUNTOS = 0x3a, ESPACIOS = [0x20, 0x09, 0x0a, 0x0d];
function sacarCampo(bytes, campo) {
  const clave = enc.encode(`"${campo}"`);
  const saltar = (j) => { while (ESPACIOS.includes(bytes[j])) j++; return j; };
  for (let i = bytes.indexOf(COMILLA); i >= 0; i = bytes.indexOf(COMILLA, i + 1)) {
    if (!clave.every((b, k) => bytes[i + k] === b)) continue;
    let j = saltar(i + clave.length);
    if (bytes[j] !== DOS_PUNTOS) continue;
    j = saltar(j + 1);
    if (bytes[j] !== COMILLA) continue;
    const fin = bytes.indexOf(COMILLA, j + 1);
    if (fin < 0) break;
    const resto = dec.decode(bytes.subarray(0, i)) + `"${campo}":"${HUECO}"` + dec.decode(bytes.subarray(fin + 1));
    return [JSON.parse(resto), bytes.subarray(j + 1, fin)];
  }
  return [JSON.parse(dec.decode(bytes)), null];
}

/* Si algo se rompe adentro (una conexión con OpenAI que se corta, una respuesta inesperada),
   Cloudflare contesta una página de error 500 sin explicación (error 1101) y la app no puede
   decir qué pasó. Así el motivo llega a la app y queda en los logs de la función. */
export async function onRequest(ctx) {
  try {
    return await atender(ctx);
  } catch (e) {
    console.error('ia-imagen:', (e && e.stack) || e);
    return json({ error: 'La función de IA falló', detalle: String((e && e.message) || e).slice(0, 300) }, 500);
  }
}

async function atender({ request: req, env }) {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  // las variables se pegan a mano en Cloudflare y a veces traen un salto de línea, espacios,
  // comillas o un carácter invisible: en la key, eso arma un encabezado Authorization inválido
  // y fetch falla con "Invalid header value". Una key de OpenAI nunca lleva nada de eso.
  const apiKey = String(env.OPENAI_API_KEY || '').replace(/[^\x21-\x7E]|["'`]/g, '');
  const clave = String(env.FORMAS_IA_CLAVE || '').trim();
  if (!apiKey || !clave) {
    return json({ error: 'La IA no está configurada: faltan OPENAI_API_KEY y/o FORMAS_IA_CLAVE en las variables de Cloudflare.' }, 503);
  }
  if ((req.headers.get('x-formas-clave') || '').trim() !== clave) {
    return json({ error: 'Clave incorrecta' }, 401);
  }

  let body, fotoBytes;
  try { [body, fotoBytes] = sacarCampo(new Uint8Array(await req.arrayBuffer()), 'image'); } catch { return json({ error: 'Cuerpo JSON inválido' }, 400); }

  const auth = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };

  /* ---- iniciar un trabajo ---- */
  if (body.action === 'start') {
    let modo = null;
    if (body.mode === 'fondo-blanco') modo = MODO_FONDO_BLANCO;
    if (body.mode === 'situacion') modo = promptSituacion({
      escena: String(body.escena || '').slice(0, 120).trim(),
      persona: ['no', 'persona', 'manos'].includes(body.persona) ? body.persona : 'auto',
      medidas: String(body.medidas || '').slice(0, 120).trim(),
      escalaFoto: String(body.escalaFoto || '').slice(0, 60).trim(),
      datos: String(body.datos || '').slice(0, 300).trim(),
      detalles: String(body.detalles || '').slice(0, 300).trim(),
    });
    if (body.mode === 'resolucion') modo = MODO_RESOLUCION;
    const pedido = String(body.pedido || '').slice(0, 500).trim();
    if (body.mode === 'logo') {
      if (!pedido) return json({ error: 'Falta decir qué hacer con el logo' }, 400);
      modo = pedido;
    }
    if (!modo) return json({ error: 'mode debe ser "fondo-blanco", "situacion", "resolucion" o "logo"' }, 400);
    const foto = body.image === HUECO ? fotoBytes : new Uint8Array(0);
    if (dec.decode(foto.subarray(0, 11)) !== 'data:image/' || foto.length > 8_000_000) {
      return json({ error: 'image debe ser un data URL de imagen de hasta ~6 MB' }, 400);
    }
    const producto = String(body.producto || '').slice(0, 200).trim();
    const tecnica = String(body.tecnica || '').slice(0, 120).trim();

    // el logo lleva solo sus reglas y el pedido; las fotos, el estilo Formas + producto + técnica
    const prompt = body.mode === 'logo' ? ESTILO_LOGO + '\n\nPedido del vendedor: ' + pedido : (ESTILO_FORMAS + '\n\nTarea: ' + modo
      + (producto ? `\n\nEl producto de la foto es: ${producto}.` : '')
      + (tecnica ? `\n\nSi el producto tiene un logo aplicado, la técnica de aplicación elegida es: ${tecnica}. Hacé que el logo se vea aplicado con esa técnica de forma realista y coherente con el material — por ejemplo: bordado = relieve de hilos y puntadas visibles; grabado láser = hundido en el material, sin tinta, en el tono del propio material; serigrafía o tampografía = capa de tinta plana y pareja adherida a la superficie; vinilo = recorte aplicado con un leve brillo; sublimación = tinta integrada a la tela sin relieve. El acabado debe seguir la curvatura y la luz del producto, y el logo debe conservar exactamente su forma, colores, posición y tamaño.` : ''));

    // los bytes de la foto van tal cual en el lugar de HUECO (ver sacarCampo)
    const crear = (tool, forzarTool) => fetch(`${OPENAI}/responses`, {
      method: 'POST',
      headers: auth,
      body: new Blob(JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-5-mini',
        background: true,
        store: true,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: HUECO },
          ],
        }],
        tools: [tool],
        ...(forzarTool ? { tool_choice: { type: 'image_generation' } } : {}),
      }).split(HUECO).flatMap((parte, k) => k ? [foto, parte] : [parte])),
    });

    const quality = env.OPENAI_IMAGE_QUALITY || 'medium';
    // GPT Image 2.5 (sept 2026): 'sunburst' es el de máxima precisión de edición
    // — la prioridad acá es que el producto y el logo salgan fieles, aunque tarde
    // más; 'flare' es la alternativa rápida. Ya trabaja siempre en alta fidelidad,
    // así que input_fidelity no va: si se pasa, la request falla.
    const imgModel = env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
    // fondo blanco y situación salen siempre 1:1: las fotos cuadradas entran
    // parejas en la ficha y en el catálogo. "Más resolución" conserva la
    // proporción de la foto original (apaisada, vertical o cuadrada) para que
    // el boceto que ya se armó no cambie de encuadre; el logo, la suya.
    let size = '1024x1024';
    if (body.mode === 'resolucion' || body.mode === 'logo') {
      const w = Number(body.ancho) || 0, h = Number(body.alto) || 0;
      if (w > 0 && h > 0) {
        const ratio = w / h;
        size = ratio > 1.2 ? '1536x1024' : ratio < 1 / 1.2 ? '1024x1536' : '1024x1024';
      }
    }
    // el logo vuelve sin fondo, listo para apoyarlo sobre el producto
    const fondo = body.mode === 'logo' ? { background: 'transparent' } : {};
    let r = await crear({ type: 'image_generation', model: imgModel, action: 'edit', size, quality, ...fondo }, true);
    if (r.status === 400) {
      // los parámetros opcionales varían según la versión del modelo de imagen:
      // si alguno deja de aceptarse, se reintenta con lo mínimo indispensable
      r = await crear({ type: 'image_generation', model: imgModel, size }, false);
    }
    if (!r.ok) return json({ error: 'OpenAI rechazó el pedido (' + r.status + ')', detalle: await motivo(r) }, 502);
    const d = await r.json();
    return json({ id: d.id, status: d.status });
  }

  /* ---- consultar el estado ---- */
  if (body.action === 'estado') {
    const id = String(body.id || '');
    if (!/^resp_[A-Za-z0-9_-]{6,}$/.test(id)) return json({ error: 'id inválido' }, 400);

    const r = await fetch(`${OPENAI}/responses/${id}`, { headers: auth });
    if (!r.ok) return json({ error: 'No pude consultar el estado (' + r.status + ')', detalle: await motivo(r) }, 502);
    const [d, pngBytes] = sacarCampo(new Uint8Array(await r.arrayBuffer()), 'result');

    if (d.status === 'completed') {
      const call = (d.output || []).find(o => o.type === 'image_generation_call' && o.result);
      if (!call) {
        const texto = (d.output || [])
          .flatMap(o => o.content || [])
          .filter(c => c.type === 'output_text')
          .map(c => c.text).join(' ').slice(0, 400);
        return json({ status: 'failed', error: 'El modelo no devolvió una imagen.' + (texto ? ' Dijo: ' + texto : '') });
      }
      // armado a mano para no volver a serializar la imagen (ver sacarCampo)
      const png = call.result === HUECO ? pngBytes : call.result;
      return new Response(new Blob(['{"status":"completed","image":"data:image/png;base64,', png, '"}']),
        { headers: { 'content-type': 'application/json' } });
    }
    if (d.status === 'failed' || d.status === 'cancelled' || d.status === 'incomplete') {
      return json({ status: 'failed', error: (d.error && d.error.message) || 'La generación falló en OpenAI.' });
    }
    return json({ status: d.status }); // queued | in_progress
  }

  return json({ error: 'action debe ser "start" o "estado"' }, 400);
}

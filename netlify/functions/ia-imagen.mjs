/*
 * Mejora de fotos de producto con IA (OpenAI) — proxy serverless.
 *
 * El navegador nunca ve la API key: le pega a esta función con la clave
 * compartida de Formas (header x-formas-clave) y la función llama a OpenAI.
 *
 * Como generar una imagen puede tardar más que el límite de 26 s de una
 * función sincrónica de Netlify, se usa la Responses API en modo background:
 * OpenAI encola el trabajo y el navegador consulta el estado cada unos
 * segundos. Cada llamada a esta función responde en milisegundos.
 *
 *   POST {action:'start', mode:'fondo-blanco'|'situacion', image:<dataURL>, producto?}
 *     → {id, status}
 *   POST {action:'estado', id}
 *     → {status:'queued'|'in_progress'|'completed'|'failed', image?, error?}
 *
 * Variables de entorno (Netlify → Site configuration → Environment variables):
 *   OPENAI_API_KEY        obligatoria
 *   FORMAS_IA_CLAVE       obligatoria — clave compartida que pide la app
 *   OPENAI_MODEL          opcional — modelo "conductor" (default gpt-5-mini)
 *   OPENAI_IMAGE_QUALITY  opcional — low | medium | high (default medium)
 */

const OPENAI = 'https://api.openai.com/v1';

/* El "estilo Formas": reglas de marca fijas que acompañan a TODA imagen.
   Es la fuente de verdad del look — se ajusta acá, no en el HTML. */
const ESTILO_FORMAS = `Sos el retocador fotográfico de Formas Publicitarias, una empresa de merchandising corporativo. Recibís la foto de un producto promocional (a veces sacada con el celular) y la editás respetando SIEMPRE estas reglas de marca:
- El producto es intocable: mantené idénticos su forma, proporciones, colores, materiales y sobre todo cualquier logo o texto que tenga aplicado. No lo redibujes ni lo "mejores": fidelidad total.
- Estética Formas: luminosa, limpia y profesional; luz suave de estudio, balance de blancos correcto, colores fieles y frescos.
- No agregues texto, marcas de agua, personas reconocibles ni productos que no estén en la foto original.
- El resultado debe verse como una fotografía real, nunca como ilustración ni render 3D.`;

const MODOS = {
  'fondo-blanco': `Convertí la foto en una toma de producto estilo e-commerce: aislá el producto y presentalo sobre un fondo blanco puro y uniforme, centrado y completo en el encuadre, con una sombra de contacto suave y realista debajo. Corregí iluminación y nitidez si la foto original es floja.`,
  'situacion': `Mostrá el mismo producto en una situación de uso real y creíble acorde a su tipo (una oficina, un evento corporativo, una cafetería, un exterior urbano...). El producto es el protagonista: nítido, en primer plano y bien iluminado; el entorno acompaña detrás con un desenfoque suave. Ambiente luminoso, actual y aspiracional.`,
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = process.env.OPENAI_API_KEY;
  const clave = process.env.FORMAS_IA_CLAVE;
  if (!apiKey || !clave) {
    return json({ error: 'La IA no está configurada: faltan OPENAI_API_KEY y/o FORMAS_IA_CLAVE en las variables de entorno de Netlify.' }, 503);
  }
  if ((req.headers.get('x-formas-clave') || '') !== clave) {
    return json({ error: 'Clave incorrecta' }, 401);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Cuerpo JSON inválido' }, 400); }

  const auth = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };

  /* ---- iniciar un trabajo ---- */
  if (body.action === 'start') {
    const modo = MODOS[body.mode];
    if (!modo) return json({ error: 'mode debe ser "fondo-blanco" o "situacion"' }, 400);
    const image = typeof body.image === 'string' ? body.image : '';
    if (!image.startsWith('data:image/') || image.length > 8_000_000) {
      return json({ error: 'image debe ser un data URL de imagen de hasta ~6 MB' }, 400);
    }
    const producto = String(body.producto || '').slice(0, 200).trim();
    const tecnica = String(body.tecnica || '').slice(0, 120).trim();

    const prompt = ESTILO_FORMAS + '\n\nTarea: ' + modo
      + (producto ? `\n\nEl producto de la foto es: ${producto}.` : '')
      + (tecnica ? `\n\nSi el producto tiene un logo aplicado, la técnica de aplicación elegida es: ${tecnica}. Hacé que el logo se vea aplicado con esa técnica de forma realista y coherente con el material — por ejemplo: bordado = relieve de hilos y puntadas visibles; grabado láser = hundido en el material, sin tinta, en el tono del propio material; serigrafía o tampografía = capa de tinta plana y pareja adherida a la superficie; vinilo = recorte aplicado con un leve brillo; sublimación = tinta integrada a la tela sin relieve. El acabado debe seguir la curvatura y la luz del producto, y el logo debe conservar exactamente su forma, colores, posición y tamaño.` : '');

    const crear = (tool, forzarTool) => fetch(`${OPENAI}/responses`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        background: true,
        store: true,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: image },
          ],
        }],
        tools: [tool],
        ...(forzarTool ? { tool_choice: { type: 'image_generation' } } : {}),
      }),
    });

    const quality = process.env.OPENAI_IMAGE_QUALITY || 'medium';
    let r = await crear({ type: 'image_generation', action: 'edit', size: 'auto', quality, input_fidelity: 'high' }, true);
    if (r.status === 400) {
      // los parámetros opcionales varían según la versión del modelo de imagen
      // (p. ej. gpt-image-2 rechaza input_fidelity): reintento con lo mínimo
      r = await crear({ type: 'image_generation' }, false);
    }
    if (!r.ok) {
      const detalle = (await r.text()).slice(0, 600);
      return json({ error: 'OpenAI rechazó el pedido (' + r.status + ')', detalle }, 502);
    }
    const d = await r.json();
    return json({ id: d.id, status: d.status });
  }

  /* ---- consultar el estado ---- */
  if (body.action === 'estado') {
    const id = String(body.id || '');
    if (!/^resp_[A-Za-z0-9_-]{6,}$/.test(id)) return json({ error: 'id inválido' }, 400);

    const r = await fetch(`${OPENAI}/responses/${id}`, { headers: auth });
    if (!r.ok) return json({ error: 'No pude consultar el estado (' + r.status + ')' }, 502);
    const d = await r.json();

    if (d.status === 'completed') {
      const call = (d.output || []).find(o => o.type === 'image_generation_call' && o.result);
      if (!call) {
        const texto = (d.output || [])
          .flatMap(o => o.content || [])
          .filter(c => c.type === 'output_text')
          .map(c => c.text).join(' ').slice(0, 400);
        return json({ status: 'failed', error: 'El modelo no devolvió una imagen.' + (texto ? ' Dijo: ' + texto : '') });
      }
      return json({ status: 'completed', image: 'data:image/png;base64,' + call.result });
    }
    if (d.status === 'failed' || d.status === 'cancelled' || d.status === 'incomplete') {
      return json({ status: 'failed', error: (d.error && d.error.message) || 'La generación falló en OpenAI.' });
    }
    return json({ status: d.status }); // queued | in_progress
  }

  return json({ error: 'action debe ser "start" o "estado"' }, 400);
};

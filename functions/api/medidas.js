/*
 * Medidas y áreas guardadas a mano (Cloudflare Pages Function: /api/medidas).
 *
 * El boceteador mide el producto y sugiere el área de impresión solo; si algo no
 * quedó bien, el vendedor lo ajusta y lo guarda: la próxima vez que cualquiera
 * traiga ese producto, sale así. A medida que se usa, los productos van quedando
 * perfectos. Se guarda por raíz del producto (vale para todos sus colores y talles)
 * y, por foto, la regla y el área (cada foto tiene su escala y su encuadre). El área
 * depende de la técnica (la serigrafía rotativa envuelve el producto; la tampografía
 * entra en unos pocos cm): con técnica, el área se guarda para esa técnica y se
 * recuerda en qué foto va.
 *
 *   GET  /api/medidas?raiz=NFM_820
 *     → {raiz, medidas?, preferida?, tecnicas?:{<técnica>:<url>},
 *        fotos:{<url>:{regla, cm, zona?, area?, zonas?:{<técnica>:{zona, area?, autor, fecha}}, autor, fecha}},
 *        historial?}   o {raiz} si no hay nada
 *   POST /api/medidas  {raiz, foto, regla, cm, zona?, area?, tecnica?, medidas?, autor?}
 *   POST /api/medidas  {raiz, foto, borrar:true, tecnica?}
 *     → sin técnica, esa foto vuelve a lo automático; con técnica, solo el área de esa técnica
 *
 * Límites por técnica (los carga producción: hasta cuánto imprime cada técnica):
 *   GET  /api/medidas?config=tecnicas  → {tecnicas:{<técnica>:{w?, h?}}, autor?, fecha?, historial?}
 *   POST /api/medidas  {config:'tecnicas', tecnicas:{<técnica>:{w?, h?}}, autor?}
 *
 * No pide clave (el boceteador pide confirmación antes de guardar): solo acepta
 * pedidos hechos desde la misma app (header Origin del mismo dominio) y guarda en
 * `historial` los últimos cambios, para poder ver quién cambió qué si algo se guardó mal.
 *
 * Necesita un KV de Cloudflare enlazado como MEDIDAS (Settings → Bindings, en
 * Production y en Preview).
 */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

const RAIZ = /^[A-Za-z0-9_.\-]{1,80}$/;
const HISTORIAL = 30;
const TECNICA = /^[\p{L}\p{N} ().°\-\/+]{1,60}$/u;
const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const vacio = o => !o || !Object.keys(o).length;

export async function onRequest(ctx) {
  try {
    return await atender(ctx);
  } catch (e) {
    console.error('medidas:', (e && e.stack) || e);
    return json({ error: 'La función de medidas falló', detalle: String((e && e.message) || e).slice(0, 300) }, 500);
  }
}

async function atender({ request: req, env }) {
  if (!env.MEDIDAS) {
    return json({ error: 'Falta configurar dónde se guardan las medidas: un KV de Cloudflare enlazado como MEDIDAS (ver README, «Medidas guardadas»).' }, 503);
  }
  const clave = k => 'raiz:' + k;

  if (req.method === 'GET') {
    if (new URL(req.url).searchParams.get('config') === 'tecnicas') {
      return json((await env.MEDIDAS.get('config:tecnicas', 'json')) || { tecnicas: {} });
    }
    const raiz = new URL(req.url).searchParams.get('raiz') || '';
    if (!RAIZ.test(raiz)) return json({ error: 'Producto inválido' }, 400);
    const d = await env.MEDIDAS.get(clave(raiz), 'json');
    return json(d || { raiz });
  }
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  /* solo desde la misma app: el navegador manda Origin en todo POST */
  let origen = '';
  try { origen = new URL(req.headers.get('origin') || '').host; } catch {}
  if (!origen || origen !== new URL(req.url).host) return json({ error: 'Solo se puede guardar desde el boceteador' }, 403);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const fecha = new Date().toISOString();
  const autor = String((b && b.autor) || '').slice(0, 80);
  if (b && b.config === 'tecnicas') return guardarLimites(env, b, autor, fecha);
  if (!b || !RAIZ.test(String(b.raiz || ''))) return json({ error: 'Producto inválido' }, 400);
  const foto = String(b.foto || '');
  if (!foto || foto.length > 600) return json({ error: 'Foto inválida' }, 400);
  const tecnica = b.tecnica ? String(b.tecnica) : '';
  if (tecnica && !TECNICA.test(tecnica)) return json({ error: 'Técnica inválida' }, 400);

  const d = (await env.MEDIDAS.get(clave(b.raiz), 'json')) || { raiz: b.raiz, fotos: {} };
  d.fotos = d.fotos || {};
  let accion;

  if (b.borrar && tecnica) {
    /* solo el área de esa técnica: la escala de la foto y las otras técnicas quedan */
    const f = d.fotos[foto];
    if (f && f.zonas) { delete f.zonas[tecnica]; if (vacio(f.zonas)) delete f.zonas; }
    if (d.tecnicas && d.tecnicas[tecnica] === foto) delete d.tecnicas[tecnica];
    accion = 'volvió al área automática de ' + tecnica;
  } else if (b.borrar) {
    delete d.fotos[foto];
    if (d.preferida === foto) delete d.preferida;
    for (const t of Object.keys(d.tecnicas || {})) if (d.tecnicas[t] === foto) delete d.tecnicas[t];
    if (vacio(d.fotos)) delete d.medidas; // sin nada guardado, vuelve todo a la descripción
    accion = 'volvió a lo automático';
  } else {
    const r = b.regla || {};
    if (!['x1', 'y1', 'x2', 'y2'].every(k => num(r[k], 0, 1))) return json({ error: 'Regla inválida' }, 400);
    if (!num(b.cm, 0.1, 1000)) return json({ error: 'Medida de la regla inválida' }, 400);
    let zona = null;
    if (b.zona) {
      const z = b.zona;
      if (!['x', 'y', 'w', 'h'].every(k => num(z[k], 0, 1)) || z.w <= 0 || z.h <= 0 || z.x + z.w > 1.001 || z.y + z.h > 1.001) {
        return json({ error: 'Área inválida' }, 400);
      }
      zona = { x: z.x, y: z.y, w: z.w, h: z.h };
    }
    const area = b.area ? String(b.area).slice(0, 80) : '';
    const prev = d.fotos[foto] || {};
    const f = { regla: { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 }, cm: b.cm, autor, fecha };
    /* lo guardado para las otras técnicas sigue valiendo (y, con técnica, el área sin técnica) */
    if (prev.zonas) f.zonas = prev.zonas;
    if (tecnica && prev.zona) { f.zona = prev.zona; if (prev.area) f.area = prev.area; }
    if (zona && tecnica) {
      f.zonas = Object.assign({}, f.zonas, { [tecnica]: Object.assign({ zona, autor, fecha }, area ? { area } : {}) });
      d.tecnicas = Object.assign({}, d.tecnicas, { [tecnica]: foto });
    } else if (zona) {
      f.zona = zona;
      if (area) f.area = area;
    }
    d.fotos[foto] = f;
    if (!tecnica || !d.preferida) d.preferida = foto;
    if (Array.isArray(b.medidas) && b.medidas.length >= 2 && b.medidas.length <= 3 && b.medidas.every(v => num(v, 0.1, 1000))) {
      d.medidas = b.medidas;
    }
    d.autor = autor; d.fecha = fecha;
    accion = 'guardó medida' + (zona ? ' y área' : '') + (zona && tecnica ? ' de ' + tecnica : '');
  }
  if (vacio(d.tecnicas)) delete d.tecnicas;

  d.historial = [Object.assign({ fecha, autor, foto, accion }, tecnica ? { tecnica } : {}), ...(d.historial || [])].slice(0, HISTORIAL);
  if (!Object.keys(d.fotos).length && !d.medidas) {
    // no queda nada guardado: solo el historial, para saber que alguien lo borró
    await env.MEDIDAS.put(clave(b.raiz), JSON.stringify({ raiz: b.raiz, fotos: {}, historial: d.historial }));
  } else {
    await env.MEDIDAS.put(clave(b.raiz), JSON.stringify(d));
  }
  return json(d);
}

/* hasta cuánto imprime cada técnica (ancho y alto máximos en cm; sin dato = sin límite) */
async function guardarLimites(env, b, autor, fecha) {
  const t = b.tecnicas;
  if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).length > 40) return json({ error: 'Límites inválidos' }, 400);
  const tecnicas = {};
  for (const [n, v] of Object.entries(t)) {
    if (!TECNICA.test(n) || !v || typeof v !== 'object') return json({ error: 'Límites inválidos' }, 400);
    const o = {};
    for (const k of ['w', 'h']) {
      if (v[k] === null || v[k] === undefined || v[k] === '') continue;
      if (!num(v[k], 0.1, 1000)) return json({ error: 'Límite inválido para ' + n }, 400);
      o[k] = v[k];
    }
    if (!vacio(o)) tecnicas[n] = o;
  }
  const antes = (await env.MEDIDAS.get('config:tecnicas', 'json')) || {};
  const d = { tecnicas, autor, fecha,
    historial: [{ fecha, autor, accion: 'actualizó los límites por técnica' }, ...(antes.historial || [])].slice(0, HISTORIAL) };
  await env.MEDIDAS.put('config:tecnicas', JSON.stringify(d));
  return json(d);
}

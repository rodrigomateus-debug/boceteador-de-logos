/*
 * Medidas guardadas a mano (Cloudflare Pages Function: /api/medidas).
 *
 * Cuando la medición automática no queda bien (o la descripción del shop está mal),
 * el vendedor ajusta la regla en el boceteador y la guarda: la próxima vez que
 * cualquiera traiga ese producto, sale así. Se guarda por raíz del producto (vale
 * para todos sus colores y talles) y la regla por foto (cada foto tiene su escala).
 *
 *   GET  /api/medidas?raiz=NFM_820
 *     → {raiz, medidas?, preferida?, fotos:{<url>:{regla:{x1,y1,x2,y2}, cm, autor, fecha}}} o {raiz} si no hay nada
 *   POST /api/medidas  {raiz, foto, regla, cm, medidas?, autor?}       (header x-formas-clave)
 *   POST /api/medidas  {raiz, foto, borrar:true}                         → vuelve a la medición automática
 *
 * Necesita un KV de Cloudflare enlazado como MEDIDAS (Settings → Bindings, en
 * Production y en Preview). Escribir pide la clave compartida FORMAS_IA_CLAVE,
 * la misma de las funciones de IA; leer no.
 */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

const RAIZ = /^[A-Za-z0-9_.\-]{1,80}$/;
const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

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
    const raiz = new URL(req.url).searchParams.get('raiz') || '';
    if (!RAIZ.test(raiz)) return json({ error: 'Producto inválido' }, 400);
    const d = await env.MEDIDAS.get(clave(raiz), 'json');
    return json(d || { raiz });
  }
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const esperada = String(env.FORMAS_IA_CLAVE || '').trim();
  if (!esperada) return json({ error: 'Falta FORMAS_IA_CLAVE en Cloudflare' }, 503);
  if ((req.headers.get('x-formas-clave') || '').trim() !== esperada) return json({ error: 'Clave incorrecta' }, 401);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  if (!b || !RAIZ.test(String(b.raiz || ''))) return json({ error: 'Producto inválido' }, 400);
  const foto = String(b.foto || '');
  if (!foto || foto.length > 600) return json({ error: 'Foto inválida' }, 400);

  const d = (await env.MEDIDAS.get(clave(b.raiz), 'json')) || { raiz: b.raiz, fotos: {} };
  d.fotos = d.fotos || {};
  const fecha = new Date().toISOString();

  if (b.borrar) {
    delete d.fotos[foto];
    if (d.preferida === foto) delete d.preferida;
    if (!Object.keys(d.fotos).length) delete d.medidas; // sin ninguna regla guardada, vuelve todo a la descripción
  } else {
    const r = b.regla || {};
    if (!['x1', 'y1', 'x2', 'y2'].every(k => num(r[k], 0, 1))) return json({ error: 'Regla inválida' }, 400);
    if (!num(b.cm, 0.1, 1000)) return json({ error: 'Medida de la regla inválida' }, 400);
    const autor = String(b.autor || '').slice(0, 80);
    d.fotos[foto] = { regla: { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 }, cm: b.cm, autor, fecha };
    d.preferida = foto;
    if (Array.isArray(b.medidas) && b.medidas.length >= 2 && b.medidas.length <= 3 && b.medidas.every(v => num(v, 0.1, 1000))) {
      d.medidas = b.medidas;
    }
    d.autor = autor; d.fecha = fecha;
  }

  if (!Object.keys(d.fotos).length && !d.medidas) await env.MEDIDAS.delete(clave(b.raiz));
  else await env.MEDIDAS.put(clave(b.raiz), JSON.stringify(d));
  return json(d);
}

/*
 * Puente con formas.shop (Cloudflare Pages Function: GET /api/shop).
 *
 * El boceteador trae del shop la ficha de un producto (fotos y medidas de la
 * descripción) para medirlo solo sobre la foto. El shop no deja que otra web
 * lea sus páginas ni sus fotos desde el navegador (no manda CORS, y una foto
 * ajena "ensucia" el canvas y no se puede medir), así que se piden por acá:
 *
 *   GET /api/shop?id=18953     → el HTML de https://formas.shop/app/product/detail/18953, tal cual
 *   GET /api/shop?img=<url>    → la foto, tal cual (solo de los dominios de abajo)
 *
 * La página se interpreta en el navegador (DOMParser): acá solo se reenvían los
 * bytes, así que cada llamada gasta casi nada de CPU (el plan Free corta a los 10 ms).
 * No es un proxy abierto: solo responde la ficha por número y fotos de estos dominios.
 */

const SHOP = 'https://formas.shop';
/* de dónde salen las fotos de las fichas: el shop, la plataforma STP y el proveedor de catálogo */
const HOSTS_FOTOS = /^(www\.)?(formas\.shop|stpo\.com\.ar|promoproductos\.com)$/i;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

export async function onRequest(ctx) {
  try {
    return await atender(ctx);
  } catch (e) {
    console.error('shop:', (e && e.stack) || e);
    return json({ error: 'No se pudo hablar con formas.shop', detalle: String((e && e.message) || e).slice(0, 300) }, 502);
  }
}

async function atender({ request: req }) {
  if (req.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
  const q = new URL(req.url).searchParams;

  if (q.has('id')) {
    const id = String(q.get('id')).trim();
    if (!/^\d{1,9}$/.test(id)) return json({ error: 'Código de producto inválido' }, 400);
    const r = await fetch(`${SHOP}/app/product/detail/${id}`, { headers: { accept: 'text/html' }, redirect: 'follow' });
    // el shop contesta 500 (no 404) cuando el código no existe
    if (!r.ok) return json({ error: `formas.shop no devolvió el producto ${id} (error ${r.status}): revisá que el código sea el correcto` }, 404);
    return new Response(r.body, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
    });
  }

  if (q.has('img')) {
    let u;
    try { u = new URL(q.get('img'), SHOP); } catch { return json({ error: 'Dirección de foto inválida' }, 400); }
    if (!/^https?:$/.test(u.protocol) || !HOSTS_FOTOS.test(u.hostname)) {
      return json({ error: 'Esa foto no es de formas.shop' }, 400);
    }
    const r = await fetch(u.href, { redirect: 'follow' });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok) return json({ error: `La foto no está (${r.status})` }, r.status === 404 ? 404 : 502);
    if (!/^image\//i.test(tipo)) return json({ error: 'Eso no es una imagen' }, 502);
    return new Response(r.body, { headers: { 'content-type': tipo, 'cache-control': 'public, max-age=86400' } });
  }

  return json({ error: 'Falta ?id=<código del producto> o ?img=<foto>' }, 400);
}

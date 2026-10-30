/*
 * Medidas y áreas guardadas a mano (Cloudflare Pages Function: /api/medidas).
 *
 * El boceteador mide el producto y sugiere el área de impresión solo; si algo no
 * quedó bien, el vendedor lo ajusta y lo guarda: la próxima vez que cualquiera
 * traiga ese producto, sale así. A medida que se usa, los productos van quedando
 * perfectos. Se guarda por raíz del producto (vale para todos sus colores y talles)
 * y, por foto, la regla y el área (cada foto tiene su escala y su encuadre).
 *
 *   GET  /api/medidas?raiz=NFM_820
 *     → {raiz, medidas?, preferida?, fotos:{<url>:{regla, cm, zona?, area?, autor, fecha}}, historial?}
 *       o {raiz} si no hay nada
 *   POST /api/medidas  {raiz, foto, regla, cm, zona?, area?, medidas?, autor?}
 *   POST /api/medidas  {raiz, foto, borrar:true}      → esa foto vuelve a lo automático
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

  /* solo desde la misma app: el navegador manda Origin en todo POST */
  let origen = '';
  try { origen = new URL(req.headers.get('origin') || '').host; } catch {}
  if (!origen || origen !== new URL(req.url).host) return json({ error: 'Solo se puede guardar desde el boceteador' }, 403);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  if (!b || !RAIZ.test(String(b.raiz || ''))) return json({ error: 'Producto inválido' }, 400);
  const foto = String(b.foto || '');
  if (!foto || foto.length > 600) return json({ error: 'Foto inválida' }, 400);

  const d = (await env.MEDIDAS.get(clave(b.raiz), 'json')) || { raiz: b.raiz, fotos: {} };
  d.fotos = d.fotos || {};
  const fecha = new Date().toISOString();
  const autor = String(b.autor || '').slice(0, 80);

  if (b.borrar) {
    delete d.fotos[foto];
    if (d.preferida === foto) delete d.preferida;
    if (!Object.keys(d.fotos).length) delete d.medidas; // sin nada guardado, vuelve todo a la descripción
  } else {
    const r = b.regla || {};
    if (!['x1', 'y1', 'x2', 'y2'].every(k => num(r[k], 0, 1))) return json({ error: 'Regla inválida' }, 400);
    if (!num(b.cm, 0.1, 1000)) return json({ error: 'Medida de la regla inválida' }, 400);
    const f = { regla: { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 }, cm: b.cm, autor, fecha };
    if (b.zona) {
      const z = b.zona;
      if (!['x', 'y', 'w', 'h'].every(k => num(z[k], 0, 1)) || z.w <= 0 || z.h <= 0 || z.x + z.w > 1.001 || z.y + z.h > 1.001) {
        return json({ error: 'Área inválida' }, 400);
      }
      f.zona = { x: z.x, y: z.y, w: z.w, h: z.h };
      if (b.area) f.area = String(b.area).slice(0, 80);
    }
    d.fotos[foto] = f;
    d.preferida = foto;
    if (Array.isArray(b.medidas) && b.medidas.length >= 2 && b.medidas.length <= 3 && b.medidas.every(v => num(v, 0.1, 1000))) {
      d.medidas = b.medidas;
    }
    d.autor = autor; d.fecha = fecha;
  }

  d.historial = [{ fecha, autor, foto, accion: b.borrar ? 'volvió a lo automático' : 'guardó medida' + (b.zona ? ' y área' : '') },
    ...(d.historial || [])].slice(0, HISTORIAL);
  if (!Object.keys(d.fotos).length && !d.medidas) {
    // no queda nada guardado: solo el historial, para saber que alguien lo borró
    await env.MEDIDAS.put(clave(b.raiz), JSON.stringify({ raiz: b.raiz, fotos: {}, historial: d.historial }));
  } else {
    await env.MEDIDAS.put(clave(b.raiz), JSON.stringify(d));
  }
  return json(d);
}

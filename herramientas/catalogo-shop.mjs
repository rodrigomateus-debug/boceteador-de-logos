// Arma catalogo-shop.json desde la API de catálogo de STP (tienda 67 = formas.shop).
//
//   STP_API_TOKEN=… ZECAT_TOKEN=… node herramientas/catalogo-shop.mjs
//
// El boceteador lo usa para «Traer de formas.shop»: buscar por link, código o nombre,
// las fotos de la tienda y del proveedor, las medidas y las áreas de impresión.
// Solo productos activos y solo lo que el boceteador necesita: sin precios, stock ni
// el bloque de costos. Los tokens se usan acá y nunca llegan a la web.
// Las medidas y las áreas se leen con leerDescripcion(), la misma función del
// generador, para que el catálogo y la ficha en vivo digan siempre lo mismo.
//
// Con ZECAT_TOKEN, los productos de Zecat (SKU «ZEC_…») suman las áreas del proveedor:
// cada área con su foto para ese color, dónde está en la foto, cuánto mide y qué técnicas
// admite (con el máximo de cada una). Sin el token se conservan las del catálogo anterior.
//
// Las técnicas por tipo de producto salen del cotizador de Formas (cotizadorformasshop.pages.dev):
// por cada subfamilia («Bolígrafos», «Remeras»…), las técnicas que se ofrecen y, si la tienen, su
// medida máxima («DTF hasta 29 × 29 cm»). Cada producto se cruza por su categoría madre de STP.
import fs from 'node:fs';

const API = 'https://www.stpo.com.ar/api/product/67/';
const RAIZ = new URL('..', import.meta.url);
const SALIDA = new URL('catalogo-shop.json', RAIZ);

const token = (process.env.STP_API_TOKEN || '').trim();
if (!token) { console.error('Falta STP_API_TOKEN (token de lectura de la API de catálogo de STP).'); process.exit(1); }

const html = fs.readFileSync(new URL('generador-bocetos.html', RAIZ), 'utf8');
const sacar = (desde, hasta) => {
  const i = html.indexOf(desde), j = html.indexOf(hasta, i);
  if (i < 0 || j < 0) throw new Error('No encontré ' + desde + ' en generador-bocetos.html');
  return html.slice(i, j);
};
const { leerDescripcion, canonTecnica } = new Function(
  sacar('function medidasDeTexto(', 'const textoMedidas')
  + sacar('const ENTIDADES', '/* de la página pública')
  + sacar('const TECNICAS', '/* fin de las técnicas */')
  + 'return { leerDescripcion, canonTecnica };')();

async function pedir(url, tok, quien) {
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(url, {
        headers: { authorization: 'Bearer ' + tok, accept: 'application/json', 'user-agent': 'boceteador-formas' },
      });
      if (r.status === 401) throw Object.assign(new Error(`La API de ${quien} rechazó el token (401).`), { final: true });
      if (!r.ok) throw new Error(`La API de ${quien} respondió ${r.status}`);
      return await r.json();
    } catch (e) {
      if (e.final || intento >= 4) throw e;
      await new Promise(res => setTimeout(res, 2000 * intento));
    }
  }
}
const pagina = n => pedir(`${API}?page=${n}&page_size=500`, token, 'STP');

const crudos = [];
for (let n = 1; ; n++) {
  const d = await pagina(n);
  crudos.push(...d.products);
  process.stdout.write(`\rbajando el catálogo… ${crudos.length} de ${d.total}`);
  if (!d.products.length || crudos.length >= d.total) break;
}
console.log();

/* las fotos del shop se guardan sin el dominio: el puente /api/shop las pide a formas.shop */
const corta = u => String(u || '').replace(/^https?:\/\/(www\.)?formas\.shop(?=\/)/, '');
const productos = crudos
  .filter(p => p.status === 'active')
  .map(p => {
    const { medidas, areas } = leerDescripcion(p.description_html);
    const fotos = (p.images || []).slice().sort((a, b) => a.position - b.position).map(i => corta(i.url));
    const proveedor = (p.master_images || []).map(i => corta(i.url)).filter(u => u && !fotos.includes(u));
    const o = { id: p.product_id, sku: p.sku, raiz: p.root, nombre: (p.name || '').trim() };
    /* color y material van a la ficha; el talle va aparte porque cada talle es un SKU con sus
       fotos y en la búsqueda se agrupan; lo demás (tipo de hojas, capacidad…) es la variante */
    const atributos = [p.attribute_1, p.attribute_2].filter(a => a && a.value);
    const valor = id => (atributos.find(a => a.attribute_id === id) || {}).value;
    const otros = atributos.filter(a => ![3, 5, 17].includes(a.attribute_id)).map(a => a.value.trim()).join(' · ');
    if (valor(5)) o.color = valor(5).trim();
    if (valor(17)) o.material = valor(17).trim();
    if (otros) o.variante = otros;
    if (valor(3)) o.talle = valor(3).trim();
    if (p.base_category && p.base_category.name) o.categoria = p.base_category.name.trim(); // la madre: se cruza con el cotizador
    if (fotos.length) o.fotos = fotos;
    if (proveedor.length) o.proveedor = proveedor;
    if (medidas) { o.medidas = medidas.valores; o.medidasTexto = medidas.texto; }
    if (areas.length) o.areas = areas;
    return o;
  });

/* ---------- áreas del proveedor (Zecat) ----------
   Cada área trae su foto por color (la de esa variante) y su recuadro sobre una grilla de
   400 × 400, con la medida en cm: la escala sale de ahí, sin medir la foto. */
const ZECAT = 'https://api.zecat.com/v1/generic_product';
const tokenZecat = (process.env.ZECAT_TOKEN || '').trim();
const MAYUS = new Set(['UV', 'DTF', 'DTP', 'CO2', 'HD', 'A4', 'A5', 'A6']);
const nombreArea = t => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (s !== s.toUpperCase() && !/^[A-ZÁÉÍÓÚÑ]{3,}\b/.test(s)) return s; // ya viene escrito normal
  return s.toLowerCase().replace(/[^\s]+/g, w => (MAYUS.has(w.toUpperCase()) ? w.toUpperCase() : w))
    .replace(/^./, c => c.toUpperCase());
};
const r4 = v => Math.round(v * 10000) / 10000;
const r2 = v => Math.round(v * 100) / 100;
function areasDeZecat(g, v) {
  const fotos = new Map((v.images || []).filter(i => i.printing_area_id).map(i => [String(i.printing_area_id), i.image_url]));
  const areas = [];
  for (const a of g.printing_areas || []) {
    const foto = fotos.get(String(a.id)) || (a.image && a.image.image_url);
    const { x_coordinate: x, y_coordinate: y, width: w, height: h, width_centimeters: wc, height_centimeters: hc } = a;
    if (!foto || !(w > 0 && h > 0 && wc > 0 && hc > 0)) continue;
    /* algunos recuadros se pasan apenas de la grilla: se recortan y la medida en cm acompaña */
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(400, x + w), y1 = Math.min(400, y + h);
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const o = { n: nombreArea(a.name), cm: [r2(wc * (x1 - x0) / w), r2(hc * (y1 - y0) / h)],
      z: [r4(x0 / 400), r4(y0 / 400), r4((x1 - x0) / 400), r4((y1 - y0) / 400)], foto };
    /* técnicas con nombre del boceteador; si dos del proveedor caen en la misma (serigrafía de
       1 y de 2 colores), vale el máximo más generoso (null = el área entera) */
    const tec = new Map();
    for (const t of a.printingTypeConfigurations || []) {
      const n = canonTecnica(t.name) || nombreArea(t.name);
      const max = [t.maxWidthCm > 0 ? t.maxWidthCm : null, t.maxHeightCm > 0 ? t.maxHeightCm : null];
      const prev = tec.get(n);
      tec.set(n, prev ? prev.map((m, i) => (m === null || max[i] === null ? null : Math.max(m, max[i]))) : max);
    }
    o.tec = [...tec].map(([n, [mw, mh]]) => [n, mw, mh]);
    if (a.main) o.principal = 1;
    if (!fotos.has(String(a.id))) o.otroColor = 1; // la foto del área es de otro color del mismo producto
    const q = (w / h) / (wc / hc);
    if (q > 1.1 || q < 0.9) o.dudosa = 1; // el recuadro y los cm no coinciden: la escala no es confiable
    areas.push(o);
  }
  return areas;
}
const zecat = productos.filter(p => /^ZEC_/.test(p.sku));
if (tokenZecat && zecat.length) {
  const lista = [];
  for (let n = 1; ; n++) {
    const d = await pedir(`${ZECAT}?page=${n}&limit=200`, tokenZecat, 'Zecat');
    lista.push(...(d.generic_products || []));
    process.stdout.write(`\rZecat: lista ${lista.length}`);
    if (n >= (d.total_pages || 1)) break;
  }
  const porSku = new Map();
  let hechos = 0;
  const cola = lista.map(x => x.id);
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cola.length) {
      const id = cola.shift();
      try {
        const g = (await pedir(`${ZECAT}/${id}`, tokenZecat, 'Zecat')).generic_product;
        for (const v of (g && g.products) || []) if (v.sku) porSku.set(String(v.sku), { g, v });
      } catch (e) { if (e.final) throw e; console.warn(`\nZecat ${id}: ${e.message}`); }
      process.stdout.write(`\rZecat: detalle ${++hechos} de ${lista.length}`);
    }
  }));
  console.log();
  for (const p of zecat) {
    const z = porSku.get(p.sku.slice(4));
    const areas = z && areasDeZecat(z.g, z.v);
    if (areas && areas.length) p.areasProv = areas;
  }
} else if (zecat.length) {
  /* sin token: las áreas del proveedor del catálogo anterior, si las había */
  let antes = null;
  try { antes = JSON.parse(fs.readFileSync(SALIDA, 'utf8')); } catch {}
  const previas = new Map(((antes && antes.productos) || []).filter(p => p.areasProv).map(p => [p.sku, p.areasProv]));
  zecat.forEach(p => { if (previas.has(p.sku)) p.areasProv = previas.get(p.sku); });
  console.log(`Sin ZECAT_TOKEN: se conservan las áreas de Zecat del catálogo anterior (${previas.size} productos).`);
}

/* ---------- técnicas por tipo de producto (cotizador de Formas) ---------- */
const COTIZADOR = 'https://cotizadorformasshop.pages.dev/';
/* «Necesers & Organizadores» = «Neceser & Organizadores», «Cinta Colgante» = «Cinta Colgante (Lanyard)» */
const clave = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, ' ')
  .replace(/[^a-z0-9&]+/g, ' ').trim().split(' ').map(w => w.replace(/s$/, '')).join(' ');
let tecnicasCategoria = null;
try {
  const r = await fetch(COTIZADOR, { headers: { 'user-agent': 'boceteador-formas' } });
  if (!r.ok) throw new Error('respondió ' + r.status);
  const html = await r.text(), i = html.indexOf('const SEED_SUB='), j = html.indexOf('.map(', i);
  if (i < 0 || j < 0) throw new Error('no encontré la tabla de subfamilias');
  tecnicasCategoria = {};
  for (const [, sub, , metodos] of JSON.parse(html.slice(i + 'const SEED_SUB='.length, j))) {
    const porTec = new Map();
    for (const m of metodos || []) {
      const n = canonTecnica(m);
      if (!n) continue; // etiqueta tejida, bajo relieve, offset…: no son técnicas del boceteador
      const t = String(m).match(/(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
      const max = t ? [parseFloat(t[1].replace(',', '.')), parseFloat(t[2].replace(',', '.'))] : [null, null];
      const prev = porTec.get(n); // varias medidas de la misma técnica: vale la más grande (sin medida = sin límite)
      porTec.set(n, prev ? prev.map((v, k) => (v === null || max[k] === null ? null : Math.max(v, max[k]))) : max);
    }
    tecnicasCategoria[sub] = [...porTec].map(([n, [w, h]]) => [n, w, h]);
  }
} catch (e) {
  console.warn('No pude leer las técnicas del cotizador (' + e.message + '): se conservan las del catálogo anterior.');
  try { tecnicasCategoria = JSON.parse(fs.readFileSync(SALIDA, 'utf8')).tecnicasCategoria || null; } catch {}
}
if (tecnicasCategoria) {
  const porClave = new Map(Object.keys(tecnicasCategoria).map(k => [clave(k), k]));
  productos.forEach(p => { const sub = porClave.get(clave(p.categoria)); if (sub) p.cat = sub; delete p.categoria; });
} else productos.forEach(p => { delete p.categoria; });

fs.writeFileSync(SALIDA, JSON.stringify({ generado: new Date().toISOString(), tienda: 67, tecnicasCategoria, productos }));
const con = k => productos.filter(p => p[k]).length;
console.log(`${productos.length} productos activos → catalogo-shop.json (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
console.log(`con medidas: ${con('medidas')} · con áreas de impresión: ${con('areas')} · con áreas del proveedor: ${con('areasProv')} · sin fotos: ${productos.length - con('fotos')}`);
console.log(`con técnicas del cotizador (por categoría): ${con('cat')} · subfamilias: ${Object.keys(tecnicasCategoria || {}).length}`);

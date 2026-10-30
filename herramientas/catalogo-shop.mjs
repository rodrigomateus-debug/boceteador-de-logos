// Arma catalogo-shop.json desde la API de catálogo de STP (tienda 67 = formas.shop).
//
//   STP_API_TOKEN=… node herramientas/catalogo-shop.mjs
//
// El boceteador lo usa para «Traer de formas.shop»: buscar por link, código o nombre,
// las fotos de la tienda y del proveedor, las medidas y las áreas de impresión.
// Solo productos activos y solo lo que el boceteador necesita: sin precios, stock ni
// el bloque de costos. El token se usa acá y nunca llega a la web.
// Las medidas y las áreas se leen con leerDescripcion(), la misma función del
// generador, para que el catálogo y la ficha en vivo digan siempre lo mismo.
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
const { leerDescripcion } = new Function(
  sacar('function medidasDeTexto(', 'const textoMedidas')
  + sacar('const ENTIDADES', '/* de la página pública')
  + 'return { leerDescripcion };')();

async function pagina(n) {
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(`${API}?page=${n}&page_size=500`, {
        headers: { authorization: 'Bearer ' + token, accept: 'application/json', 'user-agent': 'boceteador-formas' },
      });
      if (r.status === 401) throw Object.assign(new Error('La API rechazó el token (401).'), { final: true });
      if (!r.ok) throw new Error('La API respondió ' + r.status);
      return await r.json();
    } catch (e) {
      if (e.final || intento >= 4) throw e;
      await new Promise(res => setTimeout(res, 2000 * intento));
    }
  }
}

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
    /* el talle va aparte: cada talle es un SKU con sus fotos, y en la búsqueda se agrupan por color */
    const atributos = [p.attribute_1, p.attribute_2].filter(a => a && a.value);
    const talle = atributos.find(a => a.attribute_id === 3);
    const color = atributos.filter(a => a !== talle).map(a => a.value).join(' · ');
    if (color) o.color = color;
    if (talle) o.talle = talle.value;
    if (fotos.length) o.fotos = fotos;
    if (proveedor.length) o.proveedor = proveedor;
    if (medidas) { o.medidas = medidas.valores; o.medidasTexto = medidas.texto; }
    if (areas.length) o.areas = areas;
    return o;
  });

fs.writeFileSync(SALIDA, JSON.stringify({ generado: new Date().toISOString(), tienda: 67, productos }));
const con = k => productos.filter(p => p[k]).length;
console.log(`${productos.length} productos activos → catalogo-shop.json (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
console.log(`con medidas: ${con('medidas')} · con áreas de impresión: ${con('areas')} · sin fotos: ${productos.length - con('fotos')}`);

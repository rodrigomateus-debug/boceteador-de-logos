// Prueba del texto en curvas del boceteador (textoEnCurvas y compañía, que viven en
// generador-bocetos.html): node test_texto.mjs
// Usa un motor de mentira (cada letra es un rectángulo), con la misma forma que el de HarfBuzz: no baja nada.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./generador-bocetos.html', import.meta.url), 'utf8');
const i = html.indexOf('const HARFBUZZ_URLS'), j = html.indexOf('/* fin del texto en curvas', i);
assert.ok(i >= 0 && j > i, 'no encontré el bloque del texto en curvas');
const T = new Function(html.slice(i, j)
  + 'return { FUENTES, GRUPOS_FUENTE, TEXTO_NUEVO, urlsFuente, pesoCercano, nombrePeso, etiquetaFuente, nombreTexto, archivoTexto, limpiarTexto, textoEnCurvas, cajaCurvas, contornoEncimado, gruposQueSeTocan,'
  + ' FORMAS, FORMA_NUEVA, formaEnCurvas, invertirContorno, insetPoligono, aplanar, areaFirmada, nombreForma, archivoForma,'
  + ' ICONOS_CATEGORIAS, traducirBusqueda, iconoSeguro, iconoEnSvg, nombreIcono, archivoIcono };')();

/* motor de mentira (como el de HarfBuzz): 1000 unidades por eme, cada letra avanza 600 (o lo que diga
   avance) y dibuja un rectángulo de 500 de ancho y 700 de alto (el alto de las mayúsculas; el de la x es 500);
   no tiene «✓» ni «★» (su glifo es el 0, el de «letra que falta»). Las coordenadas, con y hacia arriba */
const FALTA = new Set(['✓', '★']);
const motor = (avance = 600) => ({
  upem: 1000, asc: 800, cap: 700, xAlto: 500,
  formados: [],
  forma(linea) { this.formados.push(linea); return [...linea].map(ch => ({ gid: FALTA.has(ch) ? 0 : ch.codePointAt(0), ax: avance, dx: 0, dy: 0 })); },
  contorno: gid => gid === 32 ? [] : [
    { type: 'M', values: [0, 0] }, { type: 'L', values: [500, 0] }, { type: 'L', values: [500, 700] }, { type: 'L', values: [0, 700] }, { type: 'Z', values: [] }],
  tiene: ch => !FALTA.has(ch),
});
const font = motor();
const gen = o => ({ ...T.TEXTO_NUEVO, ...o });
const xsDe = svg => [...svg.matchAll(/M([\d.-]+) /g)].map(m => +m[1]);

// un renglón: la tinta mide lo que dibujan las letras (no el avance de la última), cuerpo de 100
let r = T.textoEnCurvas(font, gen({ texto: 'AB' }));
assert.equal(r.w, 110); // 60 de avance + 50 de la segunda letra
assert.equal(r.h, 70);
assert.equal(r.cap, 70);
assert.equal(r.xAlto, 50);
assert.equal(r.porUnir, 0); // letras separadas: nada que unir
assert.deepEqual(r.faltan, []);
// en curvas: un <path>, ningún <text>, y el título escapado
assert.ok(/<path fill="#000000" d="M/.test(r.svg));
assert.ok(!/<text[\s>]/.test(r.svg));
r = T.textoEnCurvas(font, gen({ texto: 'A<b>&"' }));
assert.ok(r.svg.includes('A&lt;b&gt;&amp;&quot;'));
assert.ok(!r.svg.includes('<b>'));
// el viewBox deja aire alrededor de la tinta y declara su tamaño (normalizeSvg lo necesita)
r = T.textoEnCurvas(font, gen({ texto: 'AB' }));
const vb = r.svg.match(/viewBox="([^"]+)" width="([^"]+)" height="([^"]+)"/);
const [vx, vy, vw, vh] = vb[1].split(' ').map(Number);
assert.ok(vx < 0 && vw > 110 && vh > 70);
assert.equal(+vb[2], vw); assert.equal(+vb[3], vh);

// varios renglones: se alinean por su ancho tipográfico (AB = 120, A = 60)
assert.deepEqual(xsDe(T.textoEnCurvas(font, gen({ texto: 'AB\nA', alin: 'left' })).svg), [0, 60, 0]);
assert.deepEqual(xsDe(T.textoEnCurvas(font, gen({ texto: 'AB\nA', alin: 'center' })).svg), [0, 60, 30]);
assert.deepEqual(xsDe(T.textoEnCurvas(font, gen({ texto: 'AB\nA', alin: 'right' })).svg), [0, 60, 60]);
// el interlineado separa los renglones (base del primero en 80, del segundo en 80 + 1,5 × 100)
r = T.textoEnCurvas(font, gen({ texto: 'A\nA', interl: 1.5 }));
assert.equal(r.h, 150 + 70);
// un renglón vacío en el medio cuenta como espacio
assert.equal(T.textoEnCurvas(font, gen({ texto: 'A\n\nA', interl: 1 })).h, 200 + 70);
// el interletrado abre las letras, pero el que sobra después de la última no cuenta para alinear
r = T.textoEnCurvas(font, gen({ texto: 'AB', esp: 100 }));
assert.equal(r.w, 120);
assert.deepEqual(xsDe(T.textoEnCurvas(font, gen({ texto: 'AB\nA', alin: 'right', esp: 100 })).svg), [0, 70, 70]);

// sin nada que dibujar: null (el editor se queda con el texto anterior)
assert.equal(T.textoEnCurvas(font, gen({ texto: '   ' })), null);
assert.equal(T.textoEnCurvas(font, gen({ texto: '\n \n' })), null);
// las letras que la tipografía no tiene se avisan, una vez cada una, y NO se dibujan (serían el cuadrado de
// «letra que falta» en el boceto y en el taller): queda su lugar vacío
assert.deepEqual(T.textoEnCurvas(font, gen({ texto: 'Sí ✓ ✓' })).faltan, ['✓']);
assert.deepEqual(xsDe(T.textoEnCurvas(font, gen({ texto: 'A★B' })).svg), [0, 120]);
assert.equal(T.textoEnCurvas(font, gen({ texto: '★✓' })), null); // ninguna letra que se pueda dibujar
// se forma renglón por renglón (HarfBuzz pone el kerning y las ligaduras de cada uno); los vacíos no se forman
font.formados.length = 0;
T.textoEnCurvas(font, gen({ texto: 'AB' + String.fromCharCode(10, 10) + 'C' }));
assert.deepEqual(font.formados, ['AB', 'C']);

// la caja de las curvas es la de la tinta, no la de los puntos de control
assert.deepEqual(T.cajaCurvas([{ type: 'M', values: [0, 0] }, { type: 'Q', values: [50, 100, 100, 0] }]), { x1: 0, y1: 0, x2: 100, y2: 50 });
assert.deepEqual(T.cajaCurvas([{ type: 'M', values: [0, 0] }, { type: 'C', values: [0, 100, 100, 100, 100, 0] }]), { x1: 0, y1: 0, x2: 100, y2: 75 });
// partes que se enciman (una Ç de dos piezas) sí; el hueco de una «o» (adentro) y la i con su punto (aparte) no
const rect = (x1, y1, x2, y2) => [{ type: 'M', values: [x1, y1] }, { type: 'L', values: [x2, y1] }, { type: 'L', values: [x2, y2] }, { type: 'L', values: [x1, y2] }, { type: 'Z', values: [] }];
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(5, 8, 12, 14)]), true);
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(3, 3, 7, 7)]), false);
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(0, 12, 10, 14)]), false);
// las letras que se tocan se unen de a grupos (una manuscrita); con unir() se juntan, sin unir() van tal cual
const juntas = motor(450); // avanza menos de lo que mide: cada letra pisa a la siguiente
const pedidos = [];
r = T.textoEnCurvas(juntas, gen({ texto: 'ABC DE' }), ds => { pedidos.push(ds.length); return 'M0 0Z'; });
assert.deepEqual(pedidos, [3, 2]); // «ABC» y «DE»: el espacio las separa
assert.equal(r.porUnir, 2); assert.equal(r.unido, true);
assert.equal((r.svg.match(/M0 0Z/g) || []).length, 2);
r = T.textoEnCurvas(juntas, gen({ texto: 'ABC DE' }), null);
assert.equal(r.porUnir, 2); assert.equal(r.unido, false);
assert.equal(xsDe(r.svg).length, 5); // sin unir: las 5 letras tal cual
assert.equal(T.gruposQueSeTocan([{ caja: { x1: 0, y1: 0, x2: 10, y2: 10 } }, { caja: { x1: 20, y1: 0, x2: 30, y2: 10 } }, { caja: { x1: 9, y1: 5, x2: 21, y2: 6 } }]).length, 1);

// lo escrito se limpia antes de dibujar
const ch = n => String.fromCharCode(n);
assert.equal(T.limpiarTexto('A' + ch(9) + 'B'), 'A B');                   // tabulador pegado de Excel: espacio
assert.equal(T.limpiarTexto('A' + ch(11) + 'B'), 'A B');                  // salto de línea de Word
assert.equal(T.limpiarTexto('A' + ch(13) + ch(10) + 'B' + ch(13) + 'C'), 'A' + ch(10) + 'B' + ch(10) + 'C');
assert.equal(T.limpiarTexto('A' + ch(0x2028) + 'B'), 'A' + ch(10) + 'B');
assert.equal(T.limpiarTexto('Cafe' + ch(0x301)), 'Caf' + ch(0xe9));        // acento suelto (Mac, PDF): pegado a su letra
assert.equal(T.limpiarTexto('A' + ch(1) + ch(0x200b) + ch(0xfeff) + 'B'), 'AB'); // de control e invisibles: afuera
assert.equal(T.limpiarTexto('A' + ch(0xd800) + 'B'), 'AB');               // medio emoji suelto: afuera
assert.equal(T.limpiarTexto('😀'), '😀');                                   // un emoji entero queda (y se avisa si falta)
assert.equal(T.limpiarTexto('A' + ch(0xa0) + 'B'), 'A B');
// y se dibuja limpio: el tabulador ya no es un cuadrado, el acento suelto es una sola letra
assert.deepEqual(xsDe(T.textoEnCurvas(font, gen({ texto: 'A' + ch(9) + 'B' })).svg), [0, 120]);
assert.deepEqual(T.textoEnCurvas(font, gen({ texto: 'A' + ch(9) + 'B' })).faltan, []);
assert.equal(xsDe(T.textoEnCurvas(font, gen({ texto: 'Cafe' + ch(0x301) })).svg).length, 4);
assert.ok(!/[\u0000-\u0008]/.test(T.textoEnCurvas(font, gen({ texto: 'A' + ch(1) + 'B' })).svg));

// nombres: el del boceto y el del archivo que va al taller (sin caracteres que rompan un zip)
assert.equal(T.nombreTexto(gen({ texto: 'Feliz   día\nmamá' })), 'Texto «Feliz día mamá»');
assert.equal(T.nombreTexto(gen({ texto: 'x'.repeat(40) })), 'Texto «' + 'x'.repeat(27) + '…»');
assert.equal(T.archivoTexto(gen({ texto: 'A/B: "c"?' })), 'Texto A B c - Montserrat Negrita.svg');
assert.ok(!/[\\/:*?"<>|«»…]/.test(T.archivoTexto(gen({ texto: 'x'.repeat(50) + '<>|' }))));
// la tipografía del cliente ya trae el grosor en su nombre
assert.equal(T.etiquetaFuente({ fuente: 'cli:a1', fuenteNom: 'Corporativa Bold', peso: 700 }), 'Corporativa Bold');
assert.equal(T.etiquetaFuente({ fuente: 'lato', fuenteNom: 'Lato', peso: 900 }), 'Lato Ultranegrita');
// la de un solo grosor, sin grosor en el nombre
assert.equal(T.etiquetaFuente({ fuente: 'bebas-neue', fuenteNom: 'Bebas Neue', peso: 400 }), 'Bebas Neue');

// grosores: el más cercano que tenga la tipografía
assert.equal(T.pesoCercano([400, 700], 650), 700);
assert.equal(T.pesoCercano([300, 400], 900), 400);
assert.equal(T.pesoCercano([400], 700), 400);
assert.equal(T.nombrePeso(400), 'Normal');
assert.equal(T.nombrePeso(950), 'Ultranegrita');
assert.equal(T.nombrePeso(600), 'Seminegrita');

// el catálogo: ids únicos, grupos conocidos, grosores ordenados y la del texto nuevo disponible
const ids = T.FUENTES.map(f => f[0]);
assert.equal(new Set(ids).size, ids.length);
const grupos = new Set(T.GRUPOS_FUENTE.map(g => g[0]));
for (const [id, nom, gr, pesos] of T.FUENTES) {
  assert.ok(/^[a-z0-9-]+$/.test(id), id);
  assert.ok(nom && grupos.has(gr), id);
  assert.ok(pesos.length && pesos.every((p, k) => k === 0 || p > pesos[k - 1]), id);
}
const nueva = T.FUENTES.find(f => f[0] === T.TEXTO_NUEVO.fuente);
assert.ok(nueva && nueva[3].includes(T.TEXTO_NUEVO.peso));
// los archivos: .woff (opentype.js no lee .woff2), versión fija, con un CDN de respaldo
const urls = T.urlsFuente('lato', 900);
assert.equal(urls.length, 2);
assert.ok(urls.every(u => u.endsWith('/@fontsource/lato@5.3.0/files/lato-latin-900-normal.woff')));

// ---------- formas ----------
// el path del SVG, de vuelta a comandos (uno o dos contornos: el de afuera y el de adentro del borde)
const comandos = svg => [...(svg.match(/ d="([^"]+)"/)[1]).matchAll(/([MLCZ])([^MLCZ]*)/g)]
  .map(m => ({ type: m[1], values: m[2].trim() ? m[2].trim().split(/[ ,]+/).map(Number) : [] }));
const contornos = cmds => cmds.reduce((a, c) => { if (c.type === 'M') a.push([]); a[a.length - 1].push(c); return a; }, []);
const forma = o => T.formaEnCurvas({ ...T.FORMA_NUEVA, ...o });
for (const [id, , asp] of T.FORMAS) {
  // relleno: un contorno, adentro de la caja de 1000 × 1000/proporción (con la proporción con la que nace)
  const r = forma({ forma: id, aspecto: asp });
  assert.equal(r.w, 1000); assert.ok(Math.abs(r.h - 1000 / asp) < 1e-9, id);
  assert.ok(!/<text[\s>]/.test(r.svg) && (r.svg.match(/<path /g) || []).length === 1, id);
  const cs = contornos(comandos(r.svg));
  assert.equal(cs.length, 1, id);
  const k = T.cajaCurvas(cs[0]);
  assert.ok(k.x1 > -0.01 && k.y1 > -0.01 && k.x2 < 1000.01 && k.y2 < r.h + 0.01, id + ' se sale de su caja');
  assert.ok(k.x2 - k.x1 > 990 && k.y2 - k.y1 > r.h * 0.99, id + ' no llena su caja');
  // contorno (salvo la línea, que es siempre llena): dos contornos en sentidos opuestos, así queda hueco
  const b = forma({ forma: id, aspecto: asp, relleno: false, grosorMm: 2, anchoMm: 100 });
  const cb = contornos(comandos(b.svg));
  if (id === 'linea') { assert.equal(cb.length, 1); continue; }
  assert.equal(cb.length, 2, id);
  assert.ok(T.areaFirmada(T.aplanar(cb[0])) * T.areaFirmada(T.aplanar(cb[1])) < 0, id + ': el de adentro tiene que ir al revés');
}
// el grosor es el pedido, en mm reales: 2 mm en un rectángulo de 100 mm de ancho son 20 de 1000
let cb = contornos(comandos(forma({ forma: 'rect', aspecto: 2, relleno: false, grosorMm: 2, anchoMm: 100 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 20, y1: 20, x2: 980, y2: 480 });
// en el círculo, el de adentro es concéntrico
cb = contornos(comandos(forma({ forma: 'elipse', aspecto: 1, relleno: false, grosorMm: 5, anchoMm: 50 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 100, y1: 100, x2: 900, y2: 900 });
// en la estrella (con puntas y entrantes), cada lado de adentro queda a la misma distancia del de afuera
const pts = cs => T.aplanar(cs).map(p => p.map(v => +v));
const est = contornos(comandos(forma({ forma: 'estrella', aspecto: 1.05, relleno: false, grosorMm: 3, anchoMm: 100 }).svg));
const af = pts(est[0]), ad = pts(est[1]).reverse(); // el de adentro va al revés: se da vuelta para comparar lado a lado
const distLado = (p, a, b) => Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
assert.equal(af.length, ad.length);
for (let i = 0; i < af.length; i++) {
  // el lado i de afuera y el punto de adentro que le corresponde (el orden se corrió uno al invertir)
  const a = af[i], b2 = af[(i + 1) % af.length];
  const cerca = Math.min(...ad.map(q => Math.abs(distLado(q, a, b2) - 30)));
  assert.ok(cerca < 0.01, 'lado ' + i + ' de la estrella: ' + cerca); // el dibujo va con 2 decimales
}
// con el escudo y el corazón (curvas), el de adentro también queda adentro
for (const id of ['escudo', 'corazon']) {
  const c2 = contornos(comandos(forma({ forma: id, aspecto: 1, relleno: false, grosorMm: 3, anchoMm: 100 }).svg));
  const ka = T.cajaCurvas(c2[0]), kd = T.cajaCurvas(c2[1]);
  assert.ok(kd.x1 > ka.x1 + 25 && kd.x2 < ka.x2 - 25 && kd.y1 > ka.y1 + 25 && kd.y2 < ka.y2 - 25, id);
}
// un grosor imposible no tapa la forma: llega hasta el 45 % del lado corto
cb = contornos(comandos(forma({ forma: 'rect', aspecto: 1, relleno: false, grosorMm: 90, anchoMm: 100 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 450, y1: 450, x2: 550, y2: 550 });
// sin medida todavía, el grosor es el 4 % del lado corto
cb = contornos(comandos(forma({ forma: 'rect', aspecto: 2, relleno: false, anchoMm: 0 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 20, y1: 20, x2: 980, y2: 480 });
// las esquinas redondeadas: el rectángulo con esquinas al 50 % es una píldora (la caja no cambia)
assert.deepEqual(T.cajaCurvas(contornos(comandos(forma({ forma: 'rect', aspecto: 3, esquinas: 50 }).svg))[0]), { x1: 0, y1: 0, x2: 1000, y2: 333.33 }); // el dibujo va con 2 decimales
// invertir da vuelta el sentido, también con curvas
const elip = contornos(comandos(forma({ forma: 'elipse', aspecto: 1.5 }).svg))[0];
assert.ok(T.areaFirmada(T.aplanar(elip)) * T.areaFirmada(T.aplanar(T.invertirContorno(elip))) < 0);
assert.deepEqual(T.cajaCurvas(T.invertirContorno(elip)), T.cajaCurvas(elip));
// nombres
assert.equal(T.nombreForma({ ...T.FORMA_NUEVA, forma: 'estrella' }), 'Estrella');
assert.equal(T.nombreForma({ ...T.FORMA_NUEVA, forma: 'elipse', relleno: false, grosorMm: 1.5 }), 'Círculo · contorno de 1,5 mm');
assert.equal(T.nombreForma({ ...T.FORMA_NUEVA, forma: 'linea', relleno: false }), 'Línea'); // la línea es siempre llena
assert.equal(T.archivoForma({ ...T.FORMA_NUEVA, forma: 'corazon', relleno: false, grosorMm: 2 }), 'Forma Corazón - contorno 2 mm.svg');

// ---------- íconos ----------
const idsCat = new Set();
for (const [id, nombre, iconos] of T.ICONOS_CATEGORIAS) {
  assert.ok(nombre && !idsCat.has(id)); idsCat.add(id);
  assert.ok(iconos.length >= 8 && iconos.every(n => /^mdi:[a-z0-9-]+$/.test(n)), id);
  assert.equal(new Set(iconos).size, iconos.length, id + ' tiene repetidos');
}
// el buscador es en inglés: lo más pedido se traduce, sin importar tildes ni mayúsculas
assert.equal(T.traducirBusqueda('Corazón'), 'heart');
assert.equal(T.traducirBusqueda('  café  y TORTA '), 'coffee y cake');
assert.equal(T.traducirBusqueda('rocket'), 'rocket');
// solo se usa un ícono que sea dibujo
assert.ok(T.iconoSeguro('<path fill="currentColor" d="M0 0h24v24H0z"/>'));
for (const malo of ['<script>alert(1)</script>', '<path onload="x()" d="M0 0"/>', '<image href="http://x/y.png"/>', '<use href="#a"/>', '<path style="fill:url(javascript:x)"/>', 5])
  assert.ok(!T.iconoSeguro(malo), String(malo));
const ico = T.iconoEnSvg({ body: '<path fill="currentColor" d="M0 0h20v20H0z"/>', width: 24, height: 24 }, { icono: 'mdi:heart' });
assert.ok(ico.svg.includes('viewBox="0 0 24 24"') && !ico.svg.includes('currentColor') && ico.svg.includes('fill="#000000"'));
assert.equal(T.nombreIcono({ icono: 'mdi:coffee' }), 'Ícono «coffee»');
assert.equal(T.archivoIcono({ icono: 'mdi:coffee' }), 'Icono coffee (Material Design Icons).svg');

console.log('ok: texto, formas e íconos en curvas');

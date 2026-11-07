// Prueba del texto en curvas del boceteador (textoEnCurvas y compañía, que viven en
// generador-bocetos.html): node test_texto.mjs
// Usa un motor de mentira (cada letra es un rectángulo), con la misma forma que el de HarfBuzz: no baja nada.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./generador-bocetos.html', import.meta.url), 'utf8');
const i = html.indexOf('const HARFBUZZ_URLS'), j = html.indexOf('/* fin del texto en curvas', i);
assert.ok(i >= 0 && j > i, 'no encontré el bloque del texto en curvas');
const T = new Function(html.slice(i, j)
  + 'return { FUENTES, GRUPOS_FUENTE, TEXTO_NUEVO, urlsFuente, pesoCercano, nombrePeso, etiquetaFuente, nombreTexto, archivoTexto, limpiarTexto, textoEnCurvas, cajaCurvas, contornoEncimado, gruposQueSeTocan };')();

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

console.log('ok: texto en curvas');

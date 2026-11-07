// Prueba del texto en curvas del boceteador (textoEnCurvas y compañía, que viven en
// generador-bocetos.html): node test_texto.mjs
// Usa una tipografía de mentira (cada letra es un rectángulo), así no hace falta bajar nada.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./generador-bocetos.html', import.meta.url), 'utf8');
const i = html.indexOf('const OPENTYPE_URLS'), j = html.indexOf('/* fin del texto en curvas', i);
assert.ok(i >= 0 && j > i, 'no encontré el bloque del texto en curvas');
const T = new Function(html.slice(i, j)
  + 'return { FUENTES, GRUPOS_FUENTE, TEXTO_NUEVO, urlsFuente, pesoCercano, nombrePeso, etiquetaFuente, nombreTexto, archivoTexto, limpiarTexto, textoEnCurvas };')();

/* tipografía de mentira: 1000 unidades por eme, cada letra avanza 600 y dibuja un rectángulo de 500 de
   ancho y 700 de alto (el alto de las mayúsculas); no tiene «✓» ni «★» (su glifo es el 0, el de «letra
   que falta»). Se dibuja letra por letra, como opentype.js */
const FALTA = new Set(['✓', '★']);
const rectPath = rs => ({
  getBoundingBox: () => rs.length
    ? { x1: Math.min(...rs.map(r => r[0])), y1: Math.min(...rs.map(r => r[1])), x2: Math.max(...rs.map(r => r[2])), y2: Math.max(...rs.map(r => r[3])) }
    : { x1: NaN, y1: NaN, x2: NaN, y2: NaN },
  toPathData: () => rs.map(r => `M${r[0]} ${r[1]}H${r[2]}V${r[3]}H${r[0]}Z`).join(''),
});
const opcionesVistas = [];
const font = {
  unitsPerEm: 1000, ascender: 800, descender: -200,
  tables: { os2: { sCapHeight: 700 } },
  charToGlyphIndex: c => (FALTA.has(c) ? 0 : 1),
  forEachGlyph(text, x, y, size, opts, cb) {
    opcionesVistas.push(opts);
    const k = size / 1000;
    for (const ch of text) {
      const glifo = { index: FALTA.has(ch) ? 0 : 1, getPath: (gx, gy, gs) => rectPath(ch.trim() ? [[gx, gy - 700 * gs / 1000, gx + 500 * gs / 1000, gy]] : []) };
      cb(glifo, x, y, size, opts);
      x += 600 * k + ((opts && opts.tracking) || 0) / 1000 * size;
    }
    return x;
  },
  getPath(text, x, y, size) { // solo para el alto de la H, cuando falta sCapHeight
    const rs = [];
    for (const ch of text) { rs.push([x, y - 700 * size / 1000, x + 500 * size / 1000, y]); x += 600 * size / 1000; }
    return rectPath(rs);
  },
};
const gen = o => ({ ...T.TEXTO_NUEVO, ...o });

// un renglón: la tinta mide lo que dibujan las letras (no el avance de la última), cuerpo de 100
let r = T.textoEnCurvas(font, gen({ texto: 'AB' }));
assert.equal(r.w, 110); // 60 de avance + 50 de la segunda letra
assert.equal(r.h, 70);
assert.equal(r.cap, 70);
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
const xsDe = svg => [...svg.matchAll(/M([\d.-]+) /g)].map(m => +m[1]);
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
// las ligaduras quedan prendidas (opentype.js las apaga si recibe opciones sin «features»)
assert.ok(opcionesVistas.every(o => o.features && o.features.liga && o.features.rlig && o.kerning));

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
// sin sCapHeight, el alto de las mayúsculas sale de la H
r = T.textoEnCurvas({ ...font, tables: { os2: { sCapHeight: 0 } } }, gen({ texto: 'A' }));
assert.equal(r.cap, 70);

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

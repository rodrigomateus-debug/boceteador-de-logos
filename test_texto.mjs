// Prueba del texto en curvas del boceteador (textoEnCurvas y compañía, que viven en
// generador-bocetos.html): node test_texto.mjs
// Usa un motor de mentira (cada letra es un rectángulo), con la misma forma que el de HarfBuzz: no baja nada.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./generador-bocetos.html', import.meta.url), 'utf8');
const i = html.indexOf('const HARFBUZZ_URLS'), j = html.indexOf('/* fin del texto en curvas', i);
assert.ok(i >= 0 && j > i, 'no encontré el bloque del texto en curvas');
const T = new Function(html.slice(i, j)
  + 'return { FUENTES, GRUPOS_FUENTE, TEXTO_NUEVO, urlsFuente, pesoCercano, nombrePeso, etiquetaFuente, nombreTexto, archivoTexto, limpiarTexto, textoEnCurvas, cajaCurvas, contornoEncimado, gruposQueSeTocan, leerKern,'
  + ' FORMAS, FORMA_NUEVA, formaEnCurvas, invertirContorno, bordeAdentro, recorteExacto, aplanar, areaFirmada, nombreForma, archivoForma,'
  + ' ICONOS_CATEGORIAS, ICONOS_ES, ICONOS_FRASES, traducirBusqueda, consultasIcono, correccionIcono, distLetras, sinIconosPara, iconoSeguro, iconoEnSvg, nombreIcono, archivoIcono };')();

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
assert.ok(r.svg.includes('data-exacto="1"') && r.ink.x2 - r.ink.x1 === r.w && r.vb.length === 4); // la medida sale de la geometría
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
const hueco = (x1, y1, x2, y2) => [{ type: 'M', values: [x1, y1] }, { type: 'L', values: [x1, y2] }, { type: 'L', values: [x2, y2] }, { type: 'L', values: [x2, y1] }, { type: 'Z', values: [] }];
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...hueco(3, 3, 7, 7)]), false); // el ojo de la o: al revés que su contorno
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(3, 3, 7, 7)]), true);   // un lleno metido en otro lleno
// la A de una tipografía variable: el travesaño cae entero dentro de la caja de las patas (mirando solo cajas, pasaba)
const pata = (x0, x1) => [{ type: 'M', values: [x0, 0] }, { type: 'L', values: [x0 + 2, 0] }, { type: 'L', values: [x1 + 2, 20] }, { type: 'L', values: [x1, 20] }, { type: 'Z', values: [] }];
assert.equal(T.contornoEncimado([...pata(0, 9), ...pata(18, 9), ...rect(3, 6, 17, 8)]), true);
assert.equal(T.contornoEncimado(rect(0, 0, 10, 10)), false);
// dos llenos montados con los bordes en la misma recta (no se cruzan de lado a lado), y dos apoyados por un lado
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(5, 0, 15, 10)]), true);
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(10, 2, 20, 8)]), true);
// una isla adentro del hueco (◉: lleno, hueco, lleno) no está encimada; dos llenos separados, tampoco
assert.equal(T.contornoEncimado([...rect(0, 0, 30, 30), ...hueco(5, 5, 25, 25), ...rect(10, 10, 20, 20)]), false);
assert.equal(T.contornoEncimado([...rect(0, 0, 10, 10), ...rect(10.5, 0, 20, 10)]), false);
// se mira una vez por letra y tipografía (no en cada tecla)
const cuenta = motor(450); T.textoEnCurvas(cuenta, gen({ texto: 'AAAA' })); assert.equal(cuenta.encimadoDe.size, 1);
// un lazo en un solo trazo (un moño) también
assert.equal(T.contornoEncimado([{ type: 'M', values: [0, 0] }, { type: 'L', values: [10, 10] }, { type: 'L', values: [10, 0] }, { type: 'L', values: [0, 10] }, { type: 'Z', values: [] }]), true);
// curvas de un .ttf (un solo punto de control): se aplanan igual
assert.equal(T.aplanar([{ type: 'M', values: [0, 0] }, { type: 'Q', values: [50, 100, 100, 0] }], 2).length, 3);
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

// el kerning viejo (tabla kern, formato 0): dos pares, uno negativo; otra versión u otro formato no se leen
const kernTabla = pares => { const b = [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, pares.length, 0, 0, 0, 0, 0, 0];
  pares.forEach(([a, c, v]) => b.push(a >> 8, a & 255, c >> 8, c & 255, (v >> 8) & 255, v & 255));
  const largo = b.length - 4; b[6] = largo >> 8; b[7] = largo & 255; return new Uint8Array(b); };
const kv = T.leerKern(kernTabla([[36, 57, -80], [300, 5, 12]]));
assert.equal(kv.get(36 * 65536 + 57), -80);
assert.equal(kv.get(300 * 65536 + 5), 12);
assert.equal(kv.size, 2);
assert.equal(T.leerKern(null), null);
assert.equal(T.leerKern(new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), null);
// con interletrado se piden las letras sin ligaduras; sin interletrado, con
const pide = []; const espia = { ...motor(), forma(l, sin) { pide.push(!!sin); return motor().forma(l); } };
T.textoEnCurvas(espia, gen({ texto: 'fi', esp: 0 })); T.textoEnCurvas(espia, gen({ texto: 'fi', esp: 100 }));
assert.deepEqual(pide, [false, true]);

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
// el path del SVG, de vuelta a comandos (el contorno de afuera y, con contorno, el hueco)
const comandos = svg => [...(svg.match(/ d="([^"]+)"/)[1]).matchAll(/([MLCZ])([^MLCZ]*)/g)]
  .map(m => ({ type: m[1], values: m[2].trim() ? m[2].trim().split(/[ ,]+/).map(Number) : [] }));
const contornos = cmds => cmds.reduce((a, c) => { if (c.type === 'M') a.push([]); a[a.length - 1].push(c); return a; }, []);
const forma = o => T.formaEnCurvas({ ...T.FORMA_NUEVA, ...o });
// puntos seguidos sobre un contorno (también sobre los tramos rectos), y distancias
const denso = cmds => { const p = T.aplanar(cmds, 60), out = []; p.forEach((a, k) => { const b = p[(k + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4)); for (let m = 0; m < n; m++) out.push([a[0] + (b[0] - a[0]) * m / n, a[1] + (b[1] - a[1]) * m / n]); }); return out; };
const distSeg = (q, p, r) => { const vx = r[0] - p[0], vy = r[1] - p[1], l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((q[0] - p[0]) * vx + (q[1] - p[1]) * vy) / l2)); return Math.hypot(q[0] - p[0] - u * vx, q[1] - p[1] - u * vy); };
const distPoli = (q, pts) => pts.reduce((m, p, k) => Math.min(m, distSeg(q, p, pts[(k + 1) % pts.length])), Infinity);
const cruces = pts => { let n = 0; for (let a = 0; a < pts.length; a++) for (let b = a + 2; b < pts.length; b++) { if (a === 0 && b === pts.length - 1) continue;
  const p = pts[a], q = pts[(a + 1) % pts.length], r = pts[b], s2 = pts[(b + 1) % pts.length], rx = q[0] - p[0], ry = q[1] - p[1], sx = s2[0] - r[0], sy = s2[1] - r[1], den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) continue; const u = ((r[0] - p[0]) * sy - (r[1] - p[1]) * sx) / den, v = ((r[0] - p[0]) * ry - (r[1] - p[1]) * rx) / den; if (u > 1e-6 && u < 1 - 1e-6 && v > 1e-6 && v < 1 - 1e-6) n++; } return n; };

for (const [id, , asp] of T.FORMAS) {
  // relleno: un contorno que llena su caja; el lado largo mide 1000 (una línea vertical no pide una imagen enorme)
  const r = forma({ forma: id, aspecto: asp });
  assert.equal(Math.max(r.w, r.h), 1000, id); assert.ok(Math.abs(r.w / r.h - asp) < 1e-9, id);
  assert.ok(!/<text[\s>]/.test(r.svg) && (r.svg.match(/<path /g) || []).length === 1, id);
  assert.ok(r.svg.includes('data-exacto="1"'), id); // la medida sale de la geometría, no de sondear píxeles
  const cs = contornos(comandos(r.svg));
  assert.equal(cs.length, 1, id);
  const k = T.cajaCurvas(cs[0]);
  assert.ok(k.x1 > -0.01 && k.y1 > -0.01 && k.x2 < r.w + 0.01 && k.y2 < r.h + 0.01, id + ' se sale de su caja');
  assert.ok(k.x2 - k.x1 > r.w * 0.99 && k.y2 - k.y1 > r.h * 0.99, id + ' no llena su caja');
  // la tinta declarada (de donde sale la medida) es la del contorno
  assert.ok(Math.abs(r.ink.x1 - k.x1) < 0.01 && Math.abs(r.ink.x2 - k.x2) < 0.01 && Math.abs(r.ink.y1 - k.y1) < 0.01 && Math.abs(r.ink.y2 - k.y2) < 0.01, id);
}
const vert = forma({ forma: 'linea', aspecto: 0.02 }); // una línea vertical finita
assert.equal(vert.h, 1000); assert.equal(vert.w, 20);

/* el contorno: en un barrido de formas, proporciones y grosores, el borde mide el grosor pedido en todo el
   recorrido (ni más fino ni más grueso), el hueco no se cruza, queda adentro y va al revés que el de afuera.
   Si con ese grosor no queda hueco, la forma va llena (y lo dice), nunca con basura */
/* cada hueco (puede haber más de uno: en una estrella muy alta y gruesa el hueco queda en pedazos) está a `t`
   del borde de afuera en todo su recorrido, no se cruza, va al revés que el de afuera y queda adentro */
function huecosBien(cs, t, caso) {
  const fuera = denso(cs[0]), ka = T.cajaCurvas(cs[0]);
  cs.slice(1).forEach((h, k) => {
    const ds = denso(h).map(q => distPoli(q, fuera)), quien = caso + ' (hueco ' + (k + 1) + ' de ' + (cs.length - 1) + ')';
    assert.ok(Math.min(...ds) > t * 0.97 && Math.max(...ds) < t * 1.03, quien + ': grosor ' + (Math.min(...ds) / t).toFixed(2) + '–' + (Math.max(...ds) / t).toFixed(2) + ' del pedido');
    assert.equal(cruces(T.aplanar(h, 1)), 0, quien + ': el hueco se cruza');
    assert.ok(T.areaFirmada(T.aplanar(cs[0])) * T.areaFirmada(T.aplanar(h)) < 0, quien + ': el hueco tiene que ir al revés');
    const kd = T.cajaCurvas(h);
    assert.ok(kd.x1 > ka.x1 && kd.x2 < ka.x2 && kd.y1 > ka.y1 && kd.y2 < ka.y2, quien + ': el hueco se sale');
  });
}
let conHueco = 0, llenas = 0;
for (const [id] of T.FORMAS) {
  if (id === 'linea') continue;
  for (const asp of [0.2, 1, 1.6, 6]) for (const pct of [0.5, 2, 6, 15, 30, 45]) for (const puntas of id === 'estrella' ? [4, 5, 12] : [5]) for (const esq of id === 'rect' ? [0, 50] : [0]) {
    const caso = [id, asp, pct + ' %', puntas, esq].join(' · ');
    const r = forma({ forma: id, aspecto: asp, relleno: false, grosorMm: pct, anchoMm: 100, puntas, esquinas: esq });
    const cs = contornos(comandos(r.svg)), t = pct / 100 * r.w;
    if (r.lleno) { llenas++; assert.equal(cs.length, 1, caso + ': llena, pero con hueco'); continue; }
    conHueco++;
    assert.ok(cs.length >= 2, caso);
    huecosBien(cs, t, caso);
  }
}
assert.ok(conHueco > 150 && llenas > 30, conHueco + ' con hueco, ' + llenas + ' llenas');
/* el hueco es TODO lo que queda a más del grosor del borde, y nada más: se mira punto por punto en una grilla.
   Así se nota también una forma que sale llena sin serlo (pasaba con la estrella estirada: la punta de la
   paralela caía más allá de un lado corto y la cadena del hueco quedaba abierta) */
const adentroDe = (q, pts) => { let d = false; for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) { const p = pts[a], r = pts[b]; if ((p[1] > q[1]) !== (r[1] > q[1]) && q[0] < (r[0] - p[0]) * (q[1] - p[1]) / (r[1] - p[1]) + p[0]) d = !d; } return d; };
for (const [o, quiere] of [
  [{ forma: 'estrella', aspecto: 1.6, grosorMm: 3, anchoMm: 30 }, 'hueco'], [{ forma: 'estrella', aspecto: 1.6, grosorMm: 4, anchoMm: 30 }, 'hueco'],
  [{ forma: 'estrella', aspecto: 1.6, grosorMm: 4.5, anchoMm: 30 }, 'hueco'], [{ forma: 'estrella', aspecto: 1.6, puntas: 12, grosorMm: 1.6, anchoMm: 30 }, 'hueco'],
  [{ forma: 'estrella', aspecto: 1.6, puntas: 12, grosorMm: 2.4, anchoMm: 30 }, 'hueco'], [{ forma: 'estrella', aspecto: 3, puntas: 7, grosorMm: 1.8, anchoMm: 30 }, 'hueco'],
  [{ forma: 'estrella', aspecto: 0.4, puntas: 8, grosorMm: 4, anchoMm: 30 }, 'hueco'], [{ forma: 'estrella', aspecto: 1, puntas: 12, grosorMm: 5.8, anchoMm: 30 }, 'hueco'],
  [{ forma: 'estrella', aspecto: 0.2, puntas: 12, grosorMm: 6, anchoMm: 30 }, 'hueco'], // muy alta: el hueco queda en tres pedazos
  [{ forma: 'escudo', aspecto: 1.6, grosorMm: 3, anchoMm: 30 }, 'hueco'], [{ forma: 'corazon', aspecto: 0.4, grosorMm: 6, anchoMm: 30 }, 'hueco'],
  [{ forma: 'corazon', aspecto: 1.3, grosorMm: 7, anchoMm: 30 }, 'hueco'], [{ forma: 'hexagono', aspecto: 2.5, grosorMm: 4, anchoMm: 30 }, 'hueco'],
  [{ forma: 'triangulo', aspecto: 0.5, grosorMm: 5, anchoMm: 30 }, 'hueco'], [{ forma: 'rombo', aspecto: 3, grosorMm: 3, anchoMm: 30 }, 'hueco'],
  [{ forma: 'estrella', aspecto: 1.6, grosorMm: 5.6, anchoMm: 30 }, 'llena'], [{ forma: 'rombo', aspecto: 3, grosorMm: 4.9, anchoMm: 30 }, 'llena']]) {
  const caso = JSON.stringify(o), r = forma({ ...o, relleno: false }), cs = contornos(comandos(r.svg)), t = o.grosorMm / o.anchoMm * r.w;
  assert.equal(r.lleno ? 'llena' : 'hueco', quiere, caso);
  if (!r.lleno) huecosBien(cs, t, caso);
  const fuera = T.aplanar(cs[0], 40), huecos = cs.slice(1).map(c => T.aplanar(c, 8));
  let mal = 0, total = 0;
  for (let gy = 0; gy < 45; gy++) for (let gx = 0; gx < 45; gx++) {
    const q = [(gx + 0.37) / 45 * r.w, (gy + 0.61) / 45 * r.h];
    if (!adentroDe(q, fuera)) continue;
    const d = distPoli(q, fuera), enHueco = huecos.some(h => adentroDe(q, h));
    if (d > t * 1.04 + 1) { total++; if (!enHueco) mal++; }      // lejos del borde: tiene que ser hueco
    else if (d < t * 0.96 - 1) { total++; if (enHueco) mal++; }  // cerca del borde: tiene que ser tinta
  }
  assert.ok(total > 50 && mal === 0, caso + ': ' + mal + ' de ' + total + ' puntos de la grilla no coinciden con el grosor pedido');
}
// al engrosar, una vez que va llena no vuelve a tener hueco (antes había bandas de «llena» en el medio)
for (const o of [{ forma: 'estrella', aspecto: 1.6 }, { forma: 'estrella', aspecto: 2, puntas: 12 }, { forma: 'estrella', aspecto: 0.625, puntas: 8 }, { forma: 'corazon', aspecto: 1.1 }, { forma: 'escudo', aspecto: 2 }]) {
  let yaLlena = 0;
  for (let g = 0.4; g <= 12.01; g += 0.2) {
    const r = forma({ ...o, relleno: false, grosorMm: +g.toFixed(1), anchoMm: 30 });
    if (r.lleno) yaLlena = yaLlena || g; else assert.ok(!yaLlena, JSON.stringify(o) + ': con ' + g.toFixed(1) + ' mm tiene hueco y con ' + (+yaLlena).toFixed(1) + ' iba llena');
  }
}
// casos que fallaban: el corazón (lazo en la punta desde el 4 %), la estrella gruesa, formas estiradas, el óvalo
for (const [o, min] of [[{ forma: 'corazon', aspecto: 1.1, grosorMm: 6.7, anchoMm: 30 }, 2], [{ forma: 'estrella', aspecto: 1.05, grosorMm: 4, anchoMm: 20 }, 2],
  [{ forma: 'triangulo', aspecto: 80 / 13, grosorMm: 2, anchoMm: 80 }, 2], [{ forma: 'elipse', aspecto: 4, grosorMm: 1, anchoMm: 80 }, 2]])
  assert.equal(contornos(comandos(forma({ ...o, relleno: false }).svg)).length, min, JSON.stringify(o));
// el grosor es el pedido, en mm reales: 2 mm en un rectángulo de 100 mm de ancho son 20 de 1000
let cb = contornos(comandos(forma({ forma: 'rect', aspecto: 2, relleno: false, grosorMm: 2, anchoMm: 100 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 20, y1: 20, x2: 980, y2: 480 });
// en el círculo, el de adentro es concéntrico (y sigue siendo un círculo: 4 curvas)
cb = contornos(comandos(forma({ forma: 'elipse', aspecto: 1, relleno: false, grosorMm: 5, anchoMm: 50 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 100, y1: 100, x2: 900, y2: 900 });
assert.equal(cb[1].filter(c => c.type === 'C').length, 4);
// un grosor imposible no deja basura: la forma va llena y lo dice
let imp = forma({ forma: 'rect', aspecto: 1, relleno: false, grosorMm: 90, anchoMm: 100 });
assert.equal(imp.lleno, true); assert.equal(contornos(comandos(imp.svg)).length, 1);
imp = forma({ forma: 'estrella', aspecto: 1.05, relleno: false, grosorMm: 8, anchoMm: 20 });
assert.equal(imp.lleno, true); assert.equal(contornos(comandos(imp.svg)).length, 1);
assert.equal(forma({ forma: 'rect', aspecto: 1, relleno: false, grosorMm: 2, anchoMm: 100 }).lleno, false);
// sin medida todavía, el grosor es el 4 % del lado corto
cb = contornos(comandos(forma({ forma: 'rect', aspecto: 2, relleno: false, anchoMm: 0 }).svg));
assert.deepEqual(T.cajaCurvas(cb[1]), { x1: 20, y1: 20, x2: 980, y2: 480 });
// las esquinas redondeadas: el rectángulo con esquinas al 50 % es una píldora (la caja no cambia)
assert.deepEqual(T.cajaCurvas(contornos(comandos(forma({ forma: 'rect', aspecto: 3, esquinas: 50 }).svg))[0]), { x1: 0, y1: 0, x2: 1000, y2: 333.33 }); // el dibujo va con 2 decimales
// la línea nace fina (1 mm cada 10 cm) y es siempre llena
assert.equal(T.FORMAS.find(f => f[0] === 'linea')[2], 100);
assert.equal(contornos(comandos(forma({ forma: 'linea', aspecto: 100, relleno: false }).svg)).length, 1);
// invertir da vuelta el sentido, también con curvas
const elip = contornos(comandos(forma({ forma: 'elipse', aspecto: 1.5 }).svg))[0];
assert.ok(T.areaFirmada(T.aplanar(elip)) * T.areaFirmada(T.aplanar(T.invertirContorno(elip))) < 0);
assert.deepEqual(T.cajaCurvas(T.invertirContorno(elip)), T.cajaCurvas(elip));
// dónde cae la tinta en la imagen: de la geometría, sin sondear píxeles (una línea fina no pierde grosor)
const lin = forma({ forma: 'linea', aspecto: 160 }); // 80 × 0,5 mm
const rec = T.recorteExacto(lin.ink, lin.vb, 3000, Math.round(3000 * lin.vb[3] / lin.vb[2]));
assert.ok(Math.abs(rec.w / rec.h / 160 - 1) < 0.01, 'la línea de 80 × 0,5 mm mide ' + (rec.w / rec.h).toFixed(1) + ':1');
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
assert.equal(T.traducirBusqueda('  café  y TORTA '), 'coffee cake'); // «y» no dice nada
// la frase entera y, si no da, palabra por palabra (la más larga primero); sin conectores; plurales por su singular
assert.deepEqual(T.consultasIcono('copa de vino'), ['glass wine', 'glass', 'wine']);
assert.deepEqual(T.consultasIcono('sitio web'), ['web']); // las dos palabras dicen lo mismo
assert.deepEqual(T.consultasIcono('Tijeras'), ['content-cut']);
assert.deepEqual(T.consultasIcono('camiones'), ['truck']);
assert.deepEqual(T.consultasIcono('E-mail'), ['email']);
assert.deepEqual(T.consultasIcono('ñandú'), ['bird']);
assert.deepEqual(T.consultasIcono('niños'), ['human-child']);
assert.deepEqual(T.consultasIcono('x'), ['x']);
assert.deepEqual(T.consultasIcono('y'), ['y']); // sola, no se descarta
assert.deepEqual(T.consultasIcono('   '), []);
// frases hechas; y una palabra suelta de menos de 4 letras que no se conoce no se busca sola (traía piano por «año»)
assert.deepEqual(T.consultasIcono('Año nuevo'), ['firework']);
assert.deepEqual(T.consultasIcono('día de la madre'), ['flower']);
assert.deepEqual(T.consultasIcono('pedidos ya'), ['pedidos ya', 'pedidos']);
assert.deepEqual(T.consultasIcono('aire acondicionado'), ['air-conditioner']);
// errores de tipeo: la palabra conocida más parecida (solo como último recurso); una palabra bien escrita no se toca
assert.deepEqual(T.correccionIcono('telefno'), { consulta: 'phone', dice: 'telefono' });
assert.deepEqual(T.correccionIcono('instagran'), { consulta: 'instagram', dice: 'instagram' });
assert.deepEqual(T.correccionIcono('estreya'), { consulta: 'star', dice: 'estrella' });
assert.deepEqual(T.correccionIcono('wathsapp'), { consulta: 'whatsapp', dice: 'whatsapp' });
assert.equal(T.correccionIcono('teléfono'), null); assert.equal(T.correccionIcono('zzzqqq'), null); assert.equal(T.correccionIcono('sol'), null);
assert.equal(T.distLetras('casa', 'caso'), 1); assert.equal(T.distLetras('ab', 'ba'), 1); assert.equal(T.distLetras('telefno', 'telefono'), 1);
assert.ok(/Mercado Libre/.test(T.sinIconosPara('mercado libre')) && /TikTok/.test(T.sinIconosPara('tik tok')) && /Coca-Cola/.test(T.sinIconosPara('coca cola')));
for (const k of Object.keys(T.ICONOS_FRASES)) assert.ok(/^[a-z0-9 -]+$/.test(k), 'frase: ' + k);
// ninguna palabra del diccionario lleva acento ni mayúscula (se buscan ya sin acentos)
for (const k of Object.keys(T.ICONOS_ES)) assert.ok(/^[a-z0-9-]+$/.test(k), 'clave del diccionario: ' + k);
// una marca que no está entre los íconos se dice
assert.ok(/TikTok/.test(T.sinIconosPara('tiktok')) && /Logo o imagen/.test(T.sinIconosPara('tiktok')));
assert.ok(/«milanesa»|más general/.test(T.sinIconosPara('zzz')));
assert.equal(T.traducirBusqueda('rocket'), 'rocket');
// solo se usa un ícono que sea dibujo
assert.ok(T.iconoSeguro('<path fill="currentColor" d="M0 0h24v24H0z"/>'));
for (const malo of ['<script>alert(1)</script>', '<path onload="x()" d="M0 0"/>', '<image href="http://x/y.png"/>', '<use href="#a"/>', '<path style="fill:url(javascript:x)"/>', 5,
  '<x:script xmlns:x="http://www.w3.org/1999/xhtml">top.x=1</x:script>', '<SCRIPT>1</SCRIPT>', '<path d="M0 0"/><foreignObject/>', '<path d="M0 0"/><!-- x -->', '<a><path d="M0 0"/></a>', '<path d="&#x6a;"/>'])
  assert.ok(!T.iconoSeguro(malo), String(malo));
assert.ok(T.iconoSeguro('<g fill="none"><circle cx="12" cy="12" r="10"/><path d="M1 1"/></g>'));
// el tamaño que no sea un número no llega al SVG
assert.ok(T.iconoEnSvg({ body: '<path d="M0 0"/>', width: '24" onload="x', height: null }, { icono: 'mdi:x' }).svg.includes('viewBox="0 0 24 24" width="24" height="24"'));
const ico = T.iconoEnSvg({ body: '<path fill="currentColor" d="M0 0h20v20H0z"/>', width: 24, height: 24 }, { icono: 'mdi:heart' });
assert.ok(ico.svg.includes('viewBox="0 0 24 24"') && !ico.svg.includes('currentColor') && ico.svg.includes('fill="#000000"'));
assert.equal(T.nombreIcono({ icono: 'mdi:coffee' }), 'Ícono «coffee»');
assert.equal(T.archivoIcono({ icono: 'mdi:coffee' }), 'Icono coffee (Material Design Icons).svg');

console.log('ok: texto, formas e íconos en curvas');

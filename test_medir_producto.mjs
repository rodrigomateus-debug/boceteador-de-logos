// Prueba de la medición automática del boceteador (medidasDeTexto y medirProductoEnFoto,
// que viven en generador-bocetos.html): node test_medir_producto.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./generador-bocetos.html', import.meta.url), 'utf8');
const sacar = (desde, hasta) => {
  const i = html.indexOf(desde), j = html.indexOf(hasta, i);
  assert.ok(i >= 0 && j > i, 'no encontré ' + desde);
  return html.slice(i, j);
};
const { medidasDeTexto, medirProductoEnFoto } = new Function(
  sacar('function medidasDeTexto(', 'const textoMedidas')
  + sacar('function medirProductoEnFoto(', '/* mide una imagen ya cargada')
  + 'return { medidasDeTexto, medirProductoEnFoto };')();

// las medidas como vienen escritas en las fichas del shop
const casos = [
  ['Medidas cerrado: 14 × 9 cm.', [14, 9]],
  ['Medidas: 14 × 21 cm (A5).', [14, 21]],
  ['Medidas: 21 × 14 × 1,4 cm (A5).', [21, 14, 1.4]],
  ['Medidas: Ø 8,5 x 30 cm.', [8.5, 30]],
  ['Medidas: 12 cm de alto con tapa (9,5 cm sin tapa) × 8,5 cm de diámetro.', [12, 9.5, 8.5]],
  ['Tapa 130 × 180 mm.', [13, 18]],
  ['Cuerpo: 25 × 120 mm (ancho × alto).', [2.5, 12]],
  ['Envolvente 360°: 230 × 100 mm.', [23, 10]],
  ['Área de decoración ø5,5 cm', [5.5]],
  ['Embalaje: 8,4 x 8,4 x 29 cm, 596 g.', [8.4, 8.4, 29]],
  ['Capacidad: 350 ml.', []],
];
for (const [t, v] of casos) assert.deepEqual(medidasDeTexto(t), v, t);
assert.deepEqual(medidasDeTexto('14x9', 'cm'), [14, 9]);   // lo que tipea el vendedor
assert.deepEqual(medidasDeTexto('14 X 9'), []);            // sin unidad y sin default, nada

/* foto sintética: fondo blanco con ruido de JPEG, un anotador kraft de 360 × 560 px
   con una banda negra arriba, el anillado asomando y un bolígrafo pegado al costado
   (del mismo kraft: lo separa solo la sombra de contacto, como en las fotos reales) */
function foto(W, H, pintar) {
  const px = new Uint8ClampedArray(W * H * 4);
  let s = 7;
  const azar = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = pintar(x, y) || [255 - Math.round(azar() * 3), 255, 255 - Math.round(azar() * 3)];
    px.set([...c, 255], (y * W + x) * 4);
  }
  return px;
}
const kraft = [196, 160, 118], negro = [25, 25, 25];
const anotador = (x, y) => {
  if (x >= 120 && x < 480 && y >= 100 && y < 660) return y < 190 ? negro : kraft;          // tapa
  if (y >= 86 && y < 100 && x >= 130 && x < 470 && (x - 130) % 34 < 10) return negro;       // anillos
  if (x >= 480 && x < 483 && y >= 110 && y < 640) return [120, 100, 80];                     // sombra de contacto
  if (x >= 483 && x < 520 && y >= 110 && y < 640) return [205, 170, 125];                   // bolígrafo
  return null;
};
let r = medirProductoEnFoto(foto(700, 760, anotador), 700, 760, [14, 9]);
assert.equal(r.ok, true);
assert.equal(r.conf, 'alta');
assert.deepEqual(r.rect, { x0: 120, y0: 100, x1: 480, y1: 660 }); // ni el bolígrafo ni el anillado
assert.deepEqual(r.cm, { w: 9, h: 14 });
assert.ok(r.desvio < 0.01);

// la misma tapa con las medidas en otro orden y una tercera (el espesor): se resuelve igual
r = medirProductoEnFoto(foto(700, 760, anotador), 700, 760, [9, 14, 1.2]);
assert.deepEqual([r.conf, r.cm.w, r.cm.h], ['alta', 9, 14]);

// si la foto no guarda la proporción de la descripción, no se calibra a ciegas
r = medirProductoEnFoto(foto(700, 760, anotador), 700, 760, [14, 14]);
assert.equal(r.conf, 'baja');

// foto en situación (sin fondo liso) y producto cortado por el borde: se avisa
r = medirProductoEnFoto(foto(300, 300, (x, y) => [(x * 7) % 256, (y * 5) % 256, 90]), 300, 300, [14, 9]);
assert.deepEqual(r, { ok: false, motivo: 'fondo' });
r = medirProductoEnFoto(foto(300, 300, (x, y) => (x >= 100 && x < 190 && y >= 160 ? kraft : null)), 300, 300, [14, 9]);
assert.deepEqual(r, { ok: false, motivo: 'recorte' });

console.log('ok');

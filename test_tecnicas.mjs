// Técnicas del boceteador y nombres de los proveedores: node test_tecnicas.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('generador-bocetos.html', import.meta.url), 'utf8');
const i = html.indexOf('const TECNICAS'), j = html.indexOf('/* fin de las técnicas */', i);
const { TECNICAS, NOMBRES_TECNICA, canonTecnica, es360 } = new Function(html.slice(i, j) + 'return { TECNICAS, NOMBRES_TECNICA, canonTecnica, es360 };')();

// todo nombre canónico está en la lista del selector
for (const [, n] of NOMBRES_TECNICA) assert.ok(TECNICAS.includes(n), n);

// los nombres de Zecat (los 34 que usa hoy) caen en la técnica que corresponde
const casos = {
  'Transfer DTF': 'DTF', 'Transfer DTF Gorras': 'DTF', 'Transfer Full Color': 'DTF', 'Transfer': 'DTF',
  'Serigrafia Plana': 'Serigrafía plana', 'Serigrafia 2 colores': 'Serigrafía plana', 'Serigrafía Full Color': 'Serigrafía plana',
  'Serigrafía Rotativa': 'Serigrafía rotativa (360°)',
  'Tampografia 1 color': 'Tampografía', 'Tampografia Boligrafos': 'Tampografía',
  'Laser': 'Grabado láser', 'Laser CO2': 'Grabado láser', 'Speed Laser': 'Grabado láser',
  'Laser rotativo': 'Láser rotativo (360°)', 'Laser Rotativo CO2': 'Láser rotativo (360°)',
  'Uv': 'Impresión UV', 'UV Boligrafos': 'Impresión UV', 'UV Rotativa': 'UV rotativa (360°)',
  'Bordado': 'Bordado', 'Bordado 3D': 'Bordado', 'Hot stamping': 'Hot stamping',
  'Sublimacion tazas': 'Sublimación', 'DTP Full Color': 'DTP Full Color', 'HD Digital C': 'DTP Full Color',
  // las que escribían antes en el boceteador
  'Serigrafía': 'Serigrafía plana', 'Grabado láser': 'Grabado láser', 'Vinilo': 'Vinilo', 'DTF': 'DTF',
};
for (const [prov, canon] of Object.entries(casos)) assert.equal(canonTecnica(prov), canon, prov);
assert.equal(canonTecnica('Offset'), '');
assert.equal(canonTecnica(''), '');

// las rotativas son 360°; las planas no
assert.deepEqual(TECNICAS.filter(es360), ['Serigrafía rotativa (360°)', 'Láser rotativo (360°)', 'UV rotativa (360°)']);

console.log('ok');

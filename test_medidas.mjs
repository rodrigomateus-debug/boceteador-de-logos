// Prueba de functions/api/medidas.js con un KV simulado: node test_medidas.mjs
import assert from 'node:assert/strict';
import { onRequest } from './functions/api/medidas.js';

const kv = new Map();
const MEDIDAS = {
  get: async (k, tipo) => (kv.has(k) ? (tipo === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null),
  put: async (k, v) => { kv.set(k, v); },
  delete: async k => { kv.delete(k); },
};
const env = { MEDIDAS };
const leer = (raiz, e = env) => onRequest({ env: e, request: new Request('https://app.test/api/medidas?raiz=' + encodeURIComponent(raiz)) });
const guardar = (cuerpo, origen = 'https://app.test') => onRequest({ env, request: new Request('https://app.test/api/medidas', {
  method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, origen ? { origin: origen } : {}), body: JSON.stringify(cuerpo),
}) });

// sin nada guardado: responde la raíz sola
assert.deepEqual(await (await leer('NFM_820')).json(), { raiz: 'NFM_820' });

// se guarda la regla y el área de una foto, y las medidas corregidas; la próxima lectura las trae
const foto = '/upload/1792777885_6adb9e9d52dfc.jpg';
let r = await guardar({ raiz: 'NFM_820', foto, regla: { x1: .36, y1: .1, x2: .36, y2: .92 }, cm: 14, medidas: [14, 9],
  zona: { x: .2, y: .3, w: .4, h: .3 }, area: 'Tapa', autor: 'Rodrigo Mateus' });
assert.equal(r.status, 200);
let d = await (await leer('NFM_820')).json();
assert.deepEqual(d.medidas, [14, 9]);
assert.equal(d.preferida, foto);
assert.deepEqual(d.fotos[foto].regla, { x1: .36, y1: .1, x2: .36, y2: .92 });
assert.deepEqual(d.fotos[foto].zona, { x: .2, y: .3, w: .4, h: .3 });
assert.equal(d.fotos[foto].area, 'Tapa');
assert.equal(d.fotos[foto].autor, 'Rodrigo Mateus');
assert.equal(d.historial[0].accion, 'guardó medida y área');

// otra foto (otro color) se suma sin pisar la primera
await guardar({ raiz: 'NFM_820', foto: '/upload/otra.jpg', regla: { x1: .1, y1: .5, x2: .9, y2: .5 }, cm: 9 });
d = await (await leer('NFM_820')).json();
assert.deepEqual(Object.keys(d.fotos).sort(), ['/upload/otra.jpg', foto].sort());
assert.equal(d.preferida, '/upload/otra.jpg');
assert.equal(d.historial.length, 2);

// volver a lo automático: se borra esa foto; sin ninguna, queda solo el historial
await guardar({ raiz: 'NFM_820', foto: '/upload/otra.jpg', borrar: true });
d = await (await leer('NFM_820')).json();
assert.deepEqual(Object.keys(d.fotos), [foto]);
await guardar({ raiz: 'NFM_820', foto, borrar: true });
d = await (await leer('NFM_820')).json();
assert.deepEqual(d.fotos, {});
assert.equal(d.medidas, undefined);
assert.equal(d.historial.length, 4);
assert.equal(d.historial[0].accion, 'volvió a lo automático');

// sin clave, pero solo desde la misma app; los datos raros no entran
const valido = { raiz: 'NFM_820', foto, regla: { x1: 0, y1: 0, x2: 1, y2: 1 }, cm: 14 };
assert.equal((await guardar(valido, null)).status, 403);
assert.equal((await guardar(valido, 'https://otro.example')).status, 403);
for (const malo of [
  { ...valido, raiz: '../x' },
  { ...valido, foto: '' },
  { ...valido, regla: { x1: 0, y1: 0, x2: 7, y2: 1 } },
  { ...valido, cm: -3 },
  { ...valido, zona: { x: .8, y: 0, w: .5, h: .2 } },
]) assert.equal((await guardar(malo)).status, 400, JSON.stringify(malo));
assert.equal((await (await leer('NFM_820')).json()).historial.length, 4);

// el área depende de la técnica: cada una guarda la suya y recuerda en qué foto va
const frente = '/upload/frente.jpg', envuelta = 'https://d1yq3fbd6icaus.cloudfront.net/products/360.webp';
const regla = { x1: .1, y1: .5, x2: .9, y2: .5 };
await guardar({ raiz: 'ZEC_1', foto: frente, regla, cm: 20, zona: { x: .3, y: .3, w: .2, h: .2 }, area: 'Frente' });
await guardar({ raiz: 'ZEC_1', foto: frente, regla, cm: 20, zona: { x: .35, y: .35, w: .1, h: .05 }, area: 'Frente', tecnica: 'Tampografía', autor: 'Ana' });
await guardar({ raiz: 'ZEC_1', foto: envuelta, regla, cm: 22, zona: { x: .05, y: .2, w: .9, h: .5 }, area: '360°', tecnica: 'Serigrafía rotativa (360°)' });
d = await (await leer('ZEC_1')).json();
assert.deepEqual(d.tecnicas, { 'Tampografía': frente, 'Serigrafía rotativa (360°)': envuelta });
assert.deepEqual(d.fotos[frente].zona, { x: .3, y: .3, w: .2, h: .2 }, 'el área sin técnica sigue');
assert.deepEqual(d.fotos[frente].zonas['Tampografía'].zona, { x: .35, y: .35, w: .1, h: .05 });
assert.equal(d.fotos[frente].zonas['Tampografía'].autor, 'Ana');
assert.equal(d.fotos[envuelta].zonas['Serigrafía rotativa (360°)'].area, '360°');
assert.equal(d.preferida, frente, 'guardar con técnica no cambia la foto preferida');
// un producto guardado solo con técnica no tiene foto preferida general
await guardar({ raiz: 'ZEC_2', foto: envuelta, regla, cm: 22, zona: { x: .05, y: .2, w: .9, h: .5 }, tecnica: 'Serigrafía rotativa (360°)' });
assert.equal((await (await leer('ZEC_2')).json()).preferida, undefined);
assert.equal(d.historial[0].accion, 'guardó medida y área de Serigrafía rotativa (360°)');
// volver a guardar la escala de la foto (otra técnica) no pisa lo de las demás
await guardar({ raiz: 'ZEC_1', foto: frente, regla, cm: 21, zona: { x: .2, y: .2, w: .3, h: .3 }, tecnica: 'Grabado láser' });
d = await (await leer('ZEC_1')).json();
assert.equal(d.fotos[frente].cm, 21);
assert.deepEqual(Object.keys(d.fotos[frente].zonas).sort(), ['Grabado láser', 'Tampografía']);
assert.deepEqual(d.fotos[frente].zona, { x: .3, y: .3, w: .2, h: .2 });
// volver a lo automático para una técnica: solo esa
await guardar({ raiz: 'ZEC_1', foto: frente, borrar: true, tecnica: 'Tampografía' });
d = await (await leer('ZEC_1')).json();
assert.deepEqual(Object.keys(d.fotos[frente].zonas), ['Grabado láser']);
assert.equal(d.tecnicas['Tampografía'], undefined);
assert.equal(d.fotos[frente].cm, 21);
assert.equal(d.historial[0].accion, 'volvió al área automática de Tampografía');
// con una técnica que no tenía área ahí, no se borra nada más
await guardar({ raiz: 'ZEC_1', foto: envuelta, borrar: true, tecnica: 'Bordado' });
d = await (await leer('ZEC_1')).json();
assert.ok(d.fotos[envuelta].zonas['Serigrafía rotativa (360°)']);
// borrar la foto entera se lleva sus técnicas
await guardar({ raiz: 'ZEC_1', foto: envuelta, borrar: true });
d = await (await leer('ZEC_1')).json();
assert.deepEqual(d.tecnicas, { 'Grabado láser': frente });
assert.equal((await guardar({ raiz: 'ZEC_1', foto: frente, regla, cm: 2, tecnica: '<script>' })).status, 400);

// límites por técnica: los carga producción, sin clave y solo desde la app
assert.deepEqual(await (await onRequest({ env, request: new Request('https://app.test/api/medidas?config=tecnicas') })).json(), { tecnicas: {} });
const limites = (cuerpo, origen = 'https://app.test') => guardar(Object.assign({ config: 'tecnicas' }, cuerpo), origen);
r = await limites({ tecnicas: { 'Tampografía': { w: 7, h: 4 }, 'Grabado láser': { w: 10 }, 'Bordado': { w: null, h: '' } }, autor: 'Producción' });
assert.equal(r.status, 200);
d = await (await onRequest({ env, request: new Request('https://app.test/api/medidas?config=tecnicas') })).json();
assert.deepEqual(d.tecnicas, { 'Tampografía': { w: 7, h: 4 }, 'Grabado láser': { w: 10 } });
assert.equal(d.autor, 'Producción');
assert.equal(d.historial[0].accion, 'actualizó los límites por técnica');
assert.equal((await limites({ tecnicas: { 'Tampografía': { w: 7 } } }, 'https://otro.example')).status, 403);
assert.equal((await limites({ tecnicas: { 'Tampografía': { w: -1 } } })).status, 400);
assert.equal((await limites({ tecnicas: [1, 2] })).status, 400);
assert.equal((await limites({ tecnicas: { '<b>': { w: 1 } } })).status, 400);

// el contorno del producto ajustado a mano viaja con la regla
await guardar({ raiz: 'NFM_900', foto, regla: { x1: .9, y1: .1, x2: .9, y2: .9 }, cm: 29, contorno: { x: .3, y: .1, w: .3, h: .8, cm: [9, 29] } });
d = await (await leer('NFM_900')).json();
assert.deepEqual(d.fotos[foto].contorno, { x: .3, y: .1, w: .3, h: .8, cm: [9, 29] });
assert.equal((await guardar({ raiz: 'NFM_900', foto, regla: { x1: 0, y1: 0, x2: 1, y2: 1 }, cm: 2, contorno: { x: .9, y: 0, w: .3, h: .1 } })).status, 400);

// sin el KV configurado, el motivo vuelve legible
r = await leer('NFM_820', {});
assert.equal(r.status, 503);
assert.match((await r.json()).error, /KV de Cloudflare enlazado como MEDIDAS/);

console.log('ok');

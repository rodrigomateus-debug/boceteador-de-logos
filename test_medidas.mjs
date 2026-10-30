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

// sin el KV configurado, el motivo vuelve legible
r = await leer('NFM_820', {});
assert.equal(r.status, 503);
assert.match((await r.json()).error, /KV de Cloudflare enlazado como MEDIDAS/);

console.log('ok');

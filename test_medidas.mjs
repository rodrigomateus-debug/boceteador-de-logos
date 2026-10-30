// Prueba de functions/api/medidas.js con un KV simulado: node test_medidas.mjs
import assert from 'node:assert/strict';
import { onRequest } from './functions/api/medidas.js';

const kv = new Map();
const MEDIDAS = {
  get: async (k, tipo) => (kv.has(k) ? (tipo === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null),
  put: async (k, v) => { kv.set(k, v); },
  delete: async k => { kv.delete(k); },
};
const env = { MEDIDAS, FORMAS_IA_CLAVE: 'clave-prueba' };
const leer = (raiz, e = env) => onRequest({ env: e, request: new Request('https://x/api/medidas?raiz=' + encodeURIComponent(raiz)) });
const guardar = (cuerpo, clave = 'clave-prueba', e = env) => onRequest({ env: e, request: new Request('https://x/api/medidas', {
  method: 'POST', headers: { 'x-formas-clave': clave, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo),
}) });

// sin nada guardado: responde la raíz sola
assert.deepEqual(await (await leer('NFM_820')).json(), { raiz: 'NFM_820' });

// se guarda la regla de una foto y las medidas corregidas; la próxima lectura las trae
const foto = '/upload/1792777885_6adb9e9d52dfc.jpg';
let r = await guardar({ raiz: 'NFM_820', foto, regla: { x1: .36, y1: .1, x2: .36, y2: .92 }, cm: 14, medidas: [14, 9], autor: 'Rodrigo Mateus' });
assert.equal(r.status, 200);
let d = await (await leer('NFM_820')).json();
assert.deepEqual(d.medidas, [14, 9]);
assert.equal(d.preferida, foto);
assert.deepEqual(d.fotos[foto].regla, { x1: .36, y1: .1, x2: .36, y2: .92 });
assert.equal(d.fotos[foto].cm, 14);
assert.equal(d.fotos[foto].autor, 'Rodrigo Mateus');

// otra foto (otro color) se suma sin pisar la primera
await guardar({ raiz: 'NFM_820', foto: '/upload/otra.jpg', regla: { x1: .1, y1: .5, x2: .9, y2: .5 }, cm: 9 });
d = await (await leer('NFM_820')).json();
assert.deepEqual(Object.keys(d.fotos).sort(), ['/upload/otra.jpg', foto].sort());
assert.equal(d.preferida, '/upload/otra.jpg');

// volver a la automática: se borra la regla de esa foto; sin ninguna, se borra todo
await guardar({ raiz: 'NFM_820', foto: '/upload/otra.jpg', borrar: true });
d = await (await leer('NFM_820')).json();
assert.deepEqual(Object.keys(d.fotos), [foto]);
assert.deepEqual(d.medidas, [14, 9]);
await guardar({ raiz: 'NFM_820', foto, borrar: true });
assert.deepEqual(await (await leer('NFM_820')).json(), { raiz: 'NFM_820' });
assert.equal(kv.size, 0);

// escribir pide la clave; los datos raros no entran
assert.equal((await guardar({ raiz: 'NFM_820', foto, regla: { x1: 0, y1: 0, x2: 1, y2: 1 }, cm: 14 }, 'otra')).status, 401);
for (const malo of [
  { raiz: '../x', foto, regla: { x1: 0, y1: 0, x2: 1, y2: 1 }, cm: 14 },
  { raiz: 'NFM_820', foto: '', regla: { x1: 0, y1: 0, x2: 1, y2: 1 }, cm: 14 },
  { raiz: 'NFM_820', foto, regla: { x1: 0, y1: 0, x2: 7, y2: 1 }, cm: 14 },
  { raiz: 'NFM_820', foto, regla: { x1: 0, y1: 0, x2: 1, y2: 1 }, cm: -3 },
]) assert.equal((await guardar(malo)).status, 400, JSON.stringify(malo));
assert.equal(kv.size, 0);

// sin el KV configurado, el motivo vuelve legible
r = await leer('NFM_820', { FORMAS_IA_CLAVE: 'clave-prueba' });
assert.equal(r.status, 503);
assert.match((await r.json()).error, /KV de Cloudflare enlazado como MEDIDAS/);

console.log('ok');

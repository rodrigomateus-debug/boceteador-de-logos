// Prueba de functions/api/shop.js con fetch simulado: node test_shop.mjs
import assert from 'node:assert/strict';
import { onRequest } from './functions/api/shop.js';

const pedir = (qs, method = 'GET') => onRequest({ request: new Request('https://x/api/shop?' + qs, { method }) });

let llamadas = [];
const responder = (...respuestas) => {
  llamadas = [];
  globalThis.fetch = async (url, init) => { llamadas.push({ url, init }); return respuestas.shift(); };
};

// la ficha del producto llega tal cual, pedida por número
responder(new Response('<html><h3>Anotador Eco</h3></html>', { headers: { 'content-type': 'text/html' } }));
let r = await pedir('id=18953');
assert.equal(r.status, 200);
assert.equal(await r.text(), '<html><h3>Anotador Eco</h3></html>');
assert.equal(llamadas[0].url, 'https://formas.shop/app/product/detail/18953');

// la foto: relativa al shop, o de los dominios de catálogo
responder(new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { 'content-type': 'image/jpeg' } }));
r = await pedir('img=' + encodeURIComponent('/upload/1792777885_6adb9e9d52dfc.jpg'));
assert.equal(r.status, 200);
assert.equal(r.headers.get('content-type'), 'image/jpeg');
assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [0xff, 0xd8, 0xff]);
assert.equal(llamadas[0].url, 'https://formas.shop/upload/1792777885_6adb9e9d52dfc.jpg');

responder(new Response('x', { headers: { 'content-type': 'image/webp' } }));
r = await pedir('img=' + encodeURIComponent('https://www.promoproductos.com/upload/1641933728_61ddeba07f711.jpg'));
assert.equal(r.status, 200);

// no es un proxy abierto: otros dominios, otros protocolos y códigos raros no salen
responder();
for (const qs of [
  'img=' + encodeURIComponent('https://evil.example/x.jpg'),
  'img=' + encodeURIComponent('https://formas.shop.evil.example/x.jpg'),
  'img=' + encodeURIComponent('file:///etc/passwd'),
  'id=18953/../../admin',
  'id=abc',
  'nada=1',
]) assert.equal((await pedir(qs)).status, 400, qs);
assert.equal((await pedir('id=1', 'POST')).status, 405);
assert.equal(llamadas.length, 0);

// si lo que vuelve no es una imagen (una página de error del shop), no pasa
responder(new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }));
r = await pedir('img=' + encodeURIComponent('/upload/x.jpg'));
assert.equal(r.status, 502);

// el producto que no existe y el shop caído se informan legibles
responder(new Response('', { status: 500 }));
r = await pedir('id=99999999');
assert.equal(r.status, 404);
assert.deepEqual(await r.json(), { error: 'formas.shop no devolvió el producto 99999999 (error 500): revisá que el código sea el correcto' });
globalThis.fetch = async () => { throw new TypeError('Network connection lost.'); };
r = await pedir('id=18953');
assert.equal(r.status, 502);
assert.deepEqual(await r.json(), { error: 'No se pudo hablar con formas.shop', detalle: 'Network connection lost.' });

console.log('ok');

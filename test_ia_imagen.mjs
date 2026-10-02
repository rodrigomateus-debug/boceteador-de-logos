// Prueba de functions/api/ia-imagen.js con fetch simulado: node test_ia_imagen.mjs
import assert from 'node:assert/strict';
import { onRequest } from './functions/api/ia-imagen.js';

const env = { OPENAI_API_KEY: 'sk-prueba', FORMAS_IA_CLAVE: 'clave-prueba' };
const pedir = (cuerpo, clave = 'clave-prueba') => onRequest({
  env,
  request: new Request('https://x/api/ia-imagen', {
    method: 'POST', headers: { 'x-formas-clave': clave }, body: JSON.stringify(cuerpo),
  }),
});

let llamadas = [];
const responder = (...respuestas) => {
  llamadas = [];
  globalThis.fetch = async (url, init) => { llamadas.push({ url, init }); return respuestas.shift(); };
};

// start con una foto de ~6 MB: la foto llega intacta a OpenAI dentro de un JSON válido
const foto = 'data:image/jpeg;base64,' + Buffer.alloc(4_500_000, 7).toString('base64');
responder(new Response('{"id":"resp_abc123","status":"queued"}'));
let t = performance.now();
let r = await pedir({ action: 'start', mode: 'fondo-blanco', image: foto, producto: 'Taza' });
console.log(`start con foto de ${(foto.length / 1e6).toFixed(1)} MB: ${(performance.now() - t).toFixed(1)} ms`);
assert.equal(r.status, 200);
assert.deepEqual(await r.json(), { id: 'resp_abc123', status: 'queued' });
const enviado = JSON.parse(await llamadas[0].init.body.text());
assert.equal(enviado.input[0].content[1].image_url, foto);
assert.match(enviado.input[0].content[0].text, /Formas Publicitarias[\s\S]*Taza/);
assert.equal(enviado.model, 'gpt-5-mini');

// si OpenAI rechaza los parámetros opcionales (400), se reintenta con lo mínimo y la foto sigue entera
responder(new Response('malo', { status: 400 }), new Response('{"id":"resp_def456","status":"queued"}'));
r = await pedir({ action: 'start', mode: 'situacion', image: foto, persona: 'manos' });
assert.equal(r.status, 200);
assert.equal(llamadas.length, 2);
const reintento = JSON.parse(await llamadas[1].init.body.text());
assert.equal(reintento.input[0].content[1].image_url, foto);
assert.equal(reintento.tool_choice, undefined);

// estado: OpenAI responde con espacios y saltos de línea, y la imagen viene en "result"
const png = Buffer.alloc(2_500_000, 9).toString('base64');
responder(new Response(JSON.stringify({
  id: 'resp_abc123', status: 'completed',
  output: [{ type: 'reasoning', summary: [] }, { type: 'image_generation_call', status: 'completed', result: png }],
}, null, 2)));
t = performance.now();
r = await pedir({ action: 'estado', id: 'resp_abc123' });
console.log(`estado con imagen de ${(png.length / 1e6).toFixed(1)} MB: ${(performance.now() - t).toFixed(1)} ms`);
assert.deepEqual(await r.json(), { status: 'completed', image: 'data:image/png;base64,' + png });

// estado sin imagen: se informa lo que dijo el modelo
responder(new Response(JSON.stringify({
  status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'No puedo.' }] }],
})));
r = await pedir({ action: 'estado', id: 'resp_abc123' });
assert.deepEqual(await r.json(), { status: 'failed', error: 'El modelo no devolvió una imagen. Dijo: No puedo.' });

// clave incorrecta y foto que no es imagen
responder();
assert.equal((await pedir({ action: 'start', mode: 'fondo-blanco', image: foto }, 'otra')).status, 401);
assert.equal((await pedir({ action: 'start', mode: 'fondo-blanco', image: 'hola' })).status, 400);
assert.equal(llamadas.length, 0);

console.log('ok');

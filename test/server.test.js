const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { crearApp } = require('../server');

function crearEntorno(t, links = []) {
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'corta-test-'));
  const dbFile = path.join(directorio, 'links.json');
  fs.writeFileSync(dbFile, JSON.stringify(links, null, 2));

  t.after(() => fs.rmSync(directorio, { recursive: true, force: true }));

  return {
    app: crearApp({ dbFile, generarCodigo: () => 'abc' }),
    leerLinks: () => JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  };
}

async function solicitar(t, app, ruta, opciones) {
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => servidor.close());

  const { port } = servidor.address();
  return fetch(`http://127.0.0.1:${port}${ruta}`, opciones);
}

test('sirve la página principal', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/');
  const texto = await respuesta.text();

  assert.equal(respuesta.status, 200);
  assert.match(texto, /<h1>Corta<\/h1>/);
});

test('rechaza una creación cuando falta la URL', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { error: 'Falta la url' });
  assert.deepEqual(leerLinks(), []);
});

test('caracteriza la creación heredada de un enlace', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/recurso' })
  });

  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { codigo: 'abc', corta: '/abc' });

  const [link] = leerLinks();
  assert.equal(link.codigo, 'abc');
  assert.equal(link.url, 'https://example.com/recurso');
  assert.equal(link.clicks, 0);
  assert.ok(!Number.isNaN(Date.parse(link.creado)));
});

test('responde 404 para un código inexistente', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/noexiste');

  assert.equal(respuesta.status, 404);
  assert.equal(await respuesta.text(), 'No existe ese link');
});

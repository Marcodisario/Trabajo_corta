const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { crearApp } = require('../server');

function crearEntorno(t, links = [], opciones = {}) {
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'corta-test-'));
  const dbFile = path.join(directorio, 'links.json');
  fs.writeFileSync(dbFile, JSON.stringify(links, null, 2));

  t.after(() => fs.rmSync(directorio, { recursive: true, force: true }));

  return {
    app: crearApp({
      dbFile,
      generarCodigo: opciones.generarCodigo || (() => 'abc'),
      maxIntentosCodigo: opciones.maxIntentosCodigo
    }),
    dbFile,
    leerLinks: () => JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  };
}

function generarEnSecuencia(codigos) {
  let indice = 0;
  return () => codigos[Math.min(indice++, codigos.length - 1)];
}

async function solicitar(t, app, ruta, opciones) {
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => servidor.close());

  const { port } = servidor.address();
  return fetch(`http://127.0.0.1:${port}${ruta}`, opciones);
}

function crearLink(t, app, body) {
  return solicitar(t, app, '/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('sirve la página principal', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/');
  const texto = await respuesta.text();

  assert.equal(respuesta.status, 200);
  assert.match(texto, /<h1>Corta<\/h1>/);
});

test('expone un healthcheck para la plataforma', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/health');

  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { status: 'ok' });
});

test('la página de estadísticas no muestra datos ficticios', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/stats.html');
  const html = await respuesta.text();

  assert.equal(respuesta.status, 200);
  assert.doesNotMatch(html, /<span class="numero">123<\/span>/);
});

test('la página de estadísticas tiene campos para los datos reales', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/stats.html');
  const html = await respuesta.text();

  assert.match(html, /id="resultado-stats"/);
  assert.match(html, /id="clicks"/);
  assert.match(html, /id="url-original"/);
  assert.match(html, /id="creado"/);
  assert.match(html, /aria-live="polite"/);
});

test('la página consulta el endpoint y contempla errores', async (t) => {
  const { app } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/stats.html');
  const html = await respuesta.text();

  assert.match(html, /encodeURIComponent\(codigo\)/);
  assert.match(html, /\/api\/links\/\$\{encodeURIComponent\(codigo\)\}\/stats/);
  assert.match(html, /if \(!res\.ok\)/);
  assert.match(html, /catch \(error\)/);
});

test('rechaza una creación cuando falta la URL', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await crearLink(t, app, {});

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { error: 'URL inválida' });
  assert.deepEqual(leerLinks(), []);
});

for (const [nombre, url] of [
  ['string vacío', ''],
  ['espacios', '   '],
  ['valor no string', 123],
  ['URL relativa', '/recurso'],
  ['texto sin formato URL', 'no-es-una-url'],
  ['protocolo FTP', 'ftp://example.com/archivo'],
  ['protocolo javascript', 'javascript:alert(1)']
]) {
  test(`rechaza ${nombre}`, async (t) => {
    const { app, leerLinks } = crearEntorno(t);
    const respuesta = await crearLink(t, app, { url });

    assert.equal(respuesta.status, 400);
    assert.deepEqual(await respuesta.json(), { error: 'URL inválida' });
    assert.deepEqual(leerLinks(), []);
  });
}

test('rechaza JSON malformado con un error controlado', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"url":'
  });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { error: 'JSON inválido' });
  assert.deepEqual(leerLinks(), []);
});

test('crea un enlace HTTP válido', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await crearLink(t, app, {
    url: 'http://example.com/recurso'
  });

  assert.equal(respuesta.status, 201);
  assert.deepEqual(await respuesta.json(), { codigo: 'abc', corta: '/abc' });

  const [link] = leerLinks();
  assert.equal(link.codigo, 'abc');
  assert.equal(link.url, 'http://example.com/recurso');
  assert.equal(link.clicks, 0);
  assert.ok(!Number.isNaN(Date.parse(link.creado)));
});

test('crea un enlace HTTPS válido y recorta espacios exteriores', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await crearLink(t, app, {
    url: '  https://example.com/recurso?q=1  '
  });

  assert.equal(respuesta.status, 201);
  assert.equal(leerLinks()[0].url, 'https://example.com/recurso?q=1');
});

test('regenera el código cuando encuentra una colisión', async (t) => {
  const existente = [{
    codigo: 'abc',
    url: 'https://example.com/existente',
    clicks: 4,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, existente, {
    generarCodigo: generarEnSecuencia(['abc', 'xyz'])
  });
  const respuesta = await crearLink(t, app, {
    url: 'https://example.com/nuevo'
  });

  assert.equal(respuesta.status, 201);
  assert.deepEqual(await respuesta.json(), { codigo: 'xyz', corta: '/xyz' });

  const links = leerLinks();
  assert.equal(links.length, 2);
  assert.equal(links[0].codigo, 'abc');
  assert.equal(links[0].clicks, 4);
  assert.equal(links[1].codigo, 'xyz');
});

test('tolera varias colisiones consecutivas', async (t) => {
  const existentes = [
    { codigo: 'abc', url: 'https://example.com/a', clicks: 0, creado: '2026-08-14T12:00:00.000Z' },
    { codigo: 'def', url: 'https://example.com/b', clicks: 0, creado: '2026-08-14T12:00:00.000Z' }
  ];
  const { app, leerLinks } = crearEntorno(t, existentes, {
    generarCodigo: generarEnSecuencia(['abc', 'def', 'ghi'])
  });
  const respuesta = await crearLink(t, app, {
    url: 'https://example.com/nuevo'
  });

  assert.equal(respuesta.status, 201);
  assert.equal((await respuesta.json()).codigo, 'ghi');
  assert.deepEqual(leerLinks().map((link) => link.codigo), ['abc', 'def', 'ghi']);
});

test('falla de forma controlada si no consigue un código libre', async (t) => {
  const existentes = [{
    codigo: 'abc',
    url: 'https://example.com/existente',
    clicks: 0,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, existentes, {
    generarCodigo: () => 'abc',
    maxIntentosCodigo: 3
  });
  const respuesta = await crearLink(t, app, {
    url: 'https://example.com/nuevo'
  });

  assert.equal(respuesta.status, 503);
  assert.deepEqual(await respuesta.json(), {
    error: 'No hay códigos disponibles'
  });
  assert.deepEqual(leerLinks(), existentes);
});

test('devuelve estadísticas reales para un código existente', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 7,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, inicial);
  const respuesta = await solicitar(t, app, '/api/links/abc/stats');

  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), inicial[0]);
  assert.deepEqual(leerLinks(), inicial);
});

test('las estadísticas reflejan clicks sin incrementarlos', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 0,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, inicial);

  await solicitar(t, app, '/abc', { redirect: 'manual' });
  const respuesta = await solicitar(t, app, '/api/links/abc/stats');

  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).clicks, 1);
  assert.equal(leerLinks()[0].clicks, 1);
});

test('responde JSON 404 para estadísticas inexistentes', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/api/links/noexiste/stats');

  assert.equal(respuesta.status, 404);
  assert.deepEqual(await respuesta.json(), { error: 'No existe ese link' });
  assert.deepEqual(leerLinks(), []);
});

test('redirige al destino y persiste exactamente un click', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 0,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, inicial);
  const respuesta = await solicitar(t, app, '/abc', { redirect: 'manual' });

  assert.equal(respuesta.status, 302);
  assert.equal(respuesta.headers.get('location'), 'https://example.com/destino');
  assert.equal(leerLinks()[0].clicks, 1);
});

test('cuenta cada redirección una sola vez', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 0,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, inicial);

  for (let intento = 0; intento < 3; intento += 1) {
    const respuesta = await solicitar(t, app, '/abc', { redirect: 'manual' });
    assert.equal(respuesta.status, 302);
  }

  assert.equal(leerLinks()[0].clicks, 3);
});

test('conserva los clicks al recrear la aplicación', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 2,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const entorno = crearEntorno(t, inicial);

  await solicitar(t, entorno.app, '/abc', { redirect: 'manual' });

  const reiniciada = crearApp({
    dbFile: entorno.dbFile,
    generarCodigo: () => 'xyz'
  });
  await solicitar(t, reiniciada, '/abc', { redirect: 'manual' });

  assert.equal(entorno.leerLinks()[0].clicks, 4);
});

test('no pierde clicks ante accesos concurrentes', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 0,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, inicial);

  const respuestas = await Promise.all(
    Array.from({ length: 10 }, () =>
      solicitar(t, app, '/abc', { redirect: 'manual' })
    )
  );

  assert.ok(respuestas.every((respuesta) => respuesta.status === 302));
  assert.equal(leerLinks()[0].clicks, 10);
});

test('cargar una página estática no incrementa clicks', async (t) => {
  const inicial = [{
    codigo: 'abc',
    url: 'https://example.com/destino',
    clicks: 7,
    creado: '2026-08-14T12:00:00.000Z'
  }];
  const { app, leerLinks } = crearEntorno(t, inicial);
  const respuesta = await solicitar(t, app, '/stats.html');

  assert.equal(respuesta.status, 200);
  assert.equal(leerLinks()[0].clicks, 7);
});

test('responde 404 para un código inexistente', async (t) => {
  const { app, leerLinks } = crearEntorno(t);
  const respuesta = await solicitar(t, app, '/noexiste');

  assert.equal(respuesta.status, 404);
  assert.equal(await respuesta.text(), 'No existe ese link');
  assert.deepEqual(leerLinks(), []);
});

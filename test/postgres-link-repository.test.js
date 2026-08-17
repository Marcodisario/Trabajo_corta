const assert = require('node:assert/strict');
const test = require('node:test');

const { CodigoDuplicadoError } = require('../repositories/errors');
const { PostgresLinkRepository } = require('../repositories/postgres-link-repository');

function crearPool(respuestas = []) {
  const consultas = [];
  return {
    consultas,
    async query(text, values) {
      consultas.push({ text, values });
      const respuesta = respuestas.shift();
      if (respuesta instanceof Error) {
        throw respuesta;
      }
      return respuesta || { rows: [] };
    }
  };
}

test('inicializa la tabla de links con sus restricciones', async () => {
  const pool = crearPool();
  const repositorio = new PostgresLinkRepository({ pool });

  await repositorio.inicializar();

  const sql = pool.consultas[0].text;
  assert.match(sql, /CREATE TABLE IF NOT EXISTS links/i);
  assert.match(sql, /codigo\s+TEXT\s+PRIMARY KEY/i);
  assert.match(sql, /clicks\s+INTEGER\s+NOT NULL\s+DEFAULT 0/i);
  assert.match(sql, /CHECK\s*\(clicks >= 0\)/i);
  assert.match(sql, /creado\s+TIMESTAMPTZ\s+NOT NULL/i);
});

test('crea un link mediante una consulta parametrizada', async () => {
  const link = {
    codigo: 'abc',
    url: 'https://example.com',
    clicks: 0,
    creado: '2026-08-17T12:00:00.000Z'
  };
  const pool = crearPool([{ rows: [link] }]);
  const repositorio = new PostgresLinkRepository({ pool });

  assert.deepEqual(await repositorio.crear(link), link);
  assert.match(pool.consultas[0].text, /INSERT INTO links/i);
  assert.deepEqual(pool.consultas[0].values, [link.codigo, link.url, link.clicks, link.creado]);
});

test('traduce una violación de unicidad a una colisión de código', async () => {
  const error = new Error('duplicate key');
  error.code = '23505';
  const pool = crearPool([error]);
  const repositorio = new PostgresLinkRepository({ pool });

  await assert.rejects(
    repositorio.crear({ codigo: 'abc', url: 'https://example.com', clicks: 0, creado: new Date().toISOString() }),
    CodigoDuplicadoError
  );
});

test('incrementa clicks atómicamente y devuelve el link actualizado', async () => {
  const fila = {
    codigo: 'abc',
    url: 'https://example.com',
    clicks: 8,
    creado: new Date('2026-08-17T12:00:00.000Z')
  };
  const pool = crearPool([{ rows: [fila] }]);
  const repositorio = new PostgresLinkRepository({ pool });

  const link = await repositorio.incrementarClicks('abc');

  assert.match(pool.consultas[0].text, /SET clicks = clicks \+ 1/i);
  assert.match(pool.consultas[0].text, /RETURNING/i);
  assert.deepEqual(pool.consultas[0].values, ['abc']);
  assert.equal(link.clicks, 8);
  assert.equal(link.creado, '2026-08-17T12:00:00.000Z');
});

test('devuelve null cuando el código no existe', async () => {
  const pool = crearPool([{ rows: [] }, { rows: [] }]);
  const repositorio = new PostgresLinkRepository({ pool });

  assert.equal(await repositorio.buscarPorCodigo('noexiste'), null);
  assert.equal(await repositorio.incrementarClicks('noexiste'), null);
});


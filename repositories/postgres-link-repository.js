const { Pool } = require('pg');
const { CodigoDuplicadoError } = require('./errors');

function mapearLink(fila) {
  if (!fila) {
    return null;
  }
  return {
    codigo: fila.codigo,
    url: fila.url,
    clicks: fila.clicks,
    creado: fila.creado instanceof Date ? fila.creado.toISOString() : fila.creado
  };
}

class PostgresLinkRepository {
  constructor({ pool, connectionString } = {}) {
    this.pool = pool || new Pool({ connectionString });
  }

  async inicializar() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS links (
        codigo TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
        creado TIMESTAMPTZ NOT NULL
      )
    `);
  }

  async crear(link) {
    try {
      const resultado = await this.pool.query(
        `INSERT INTO links (codigo, url, clicks, creado)
         VALUES ($1, $2, $3, $4)
         RETURNING codigo, url, clicks, creado`,
        [link.codigo, link.url, link.clicks, link.creado]
      );
      return mapearLink(resultado.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new CodigoDuplicadoError(link.codigo);
      }
      throw error;
    }
  }

  async buscarPorCodigo(codigo) {
    const resultado = await this.pool.query(
      'SELECT codigo, url, clicks, creado FROM links WHERE codigo = $1',
      [codigo]
    );
    return mapearLink(resultado.rows[0]);
  }

  async incrementarClicks(codigo) {
    const resultado = await this.pool.query(
      `UPDATE links
       SET clicks = clicks + 1
       WHERE codigo = $1
       RETURNING codigo, url, clicks, creado`,
      [codigo]
    );
    return mapearLink(resultado.rows[0]);
  }
}

module.exports = { PostgresLinkRepository };

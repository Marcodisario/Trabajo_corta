const express = require('express');
const path = require('path');
const { generarCodigo } = require('./utils');
const { CodigoDuplicadoError } = require('./repositories/errors');
const { JsonLinkRepository } = require('./repositories/json-link-repository');
const { PostgresLinkRepository } = require('./repositories/postgres-link-repository');

function crearRepositorioDesdeEntorno() {
  if (process.env.DATABASE_URL) {
    return new PostgresLinkRepository({ connectionString: process.env.DATABASE_URL });
  }
  return new JsonLinkRepository(path.join(__dirname, 'links.json'));
}

function normalizarUrl(valor) {
  if (typeof valor !== 'string') {
    return null;
  }

  const url = valor.trim();
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function crearApp(opciones = {}) {
  const dbFile = opciones.dbFile || path.join(__dirname, 'links.json');
  const repositorio = opciones.repositorio || new JsonLinkRepository(dbFile);
  const generar = opciones.generarCodigo || generarCodigo;
  const maxIntentosCodigo = opciones.maxIntentosCodigo ?? 10;
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // crear un link corto
  app.post('/api/links', async (req, res, next) => {
    const url = normalizarUrl(req.body && req.body.url);
    if (!url) {
      return res.status(400).json({ error: 'URL inválida' });
    }
    try {
      for (let intento = 0; intento < maxIntentosCodigo; intento += 1) {
        const codigo = generar();
        const nuevo = {
          codigo,
          url,
          clicks: 0,
          creado: new Date().toISOString()
        };
        try {
          await repositorio.crear(nuevo);
          return res.status(201).json({ codigo, corta: '/' + codigo });
        } catch (error) {
          if (!(error instanceof CodigoDuplicadoError)) {
            throw error;
          }
        }
      }
      return res.status(503).json({ error: 'No hay códigos disponibles' });
    } catch (error) {
      return next(error);
    }
  });

  // consultar estadísticas sin contar un click
  app.get('/api/links/:codigo/stats', async (req, res, next) => {
    try {
      const link = await repositorio.buscarPorCodigo(req.params.codigo);
      if (!link) {
        return res.status(404).json({ error: 'No existe ese link' });
      }
      return res.json(link);
    } catch (error) {
      return next(error);
    }
  });

  // redirigir al destino
  app.get('/:codigo', async (req, res, next) => {
    try {
      const link = await repositorio.incrementarClicks(req.params.codigo);
      if (!link) {
        return res.status(404).send('No existe ese link');
      }
      return res.redirect(302, link.url);
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'JSON inválido' });
    }
    return next(error);
  });

  return app;
}

if (require.main === module) {
  const repositorio = crearRepositorioDesdeEntorno();
  repositorio.inicializar()
    .then(() => {
      const app = crearApp({ repositorio });
      app.listen(3000, function () {
        console.log('Corta escuchando en http://localhost:3000');
      });
    })
    .catch((error) => {
      console.error('No se pudo iniciar Corta', error);
      process.exitCode = 1;
    });
}

module.exports = { crearApp, crearRepositorioDesdeEntorno };

const express = require('express');
const fs = require('fs');
const path = require('path');
const { generarCodigo } = require('./utils');

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
  const generar = opciones.generarCodigo || generarCodigo;
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  function leerLinks() {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  }

  function guardarLinks(links) {
    fs.writeFileSync(dbFile, JSON.stringify(links, null, 2));
  }

  // crear un link corto
  app.post('/api/links', (req, res) => {
    const url = normalizarUrl(req.body && req.body.url);
    if (!url) {
      return res.status(400).json({ error: 'URL inválida' });
    }
    const links = leerLinks();
    const codigo = generar();
    const nuevo = {
      codigo: codigo,
      url: url,
      clicks: 0,
      creado: new Date().toISOString()
    };
    links.push(nuevo);
    guardarLinks(links);
    res.status(201).json({ codigo: codigo, corta: '/' + codigo });
  });

  // redirigir al destino
  app.get('/:codigo', (req, res) => {
    const links = leerLinks();
    const link = links.find(function (l) { return l.codigo === req.params.codigo; });
    if (!link) {
      return res.status(404).send('No existe ese link');
    }
    link.clicks = link.clicks + 1;
    res.send(link.url);
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
  const app = crearApp();
  app.listen(3000, function () {
    console.log('Corta escuchando en http://localhost:3000');
  });
}

module.exports = { crearApp };


const fs = require('node:fs');
const { CodigoDuplicadoError } = require('./errors');

class JsonLinkRepository {
  constructor(dbFile) {
    this.dbFile = dbFile;
  }

  async inicializar() {}

  leerLinks() {
    return JSON.parse(fs.readFileSync(this.dbFile, 'utf8'));
  }

  guardarLinks(links) {
    fs.writeFileSync(this.dbFile, JSON.stringify(links, null, 2));
  }

  async crear(link) {
    const links = this.leerLinks();
    if (links.some((existente) => existente.codigo === link.codigo)) {
      throw new CodigoDuplicadoError(link.codigo);
    }
    links.push(link);
    this.guardarLinks(links);
    return link;
  }

  async buscarPorCodigo(codigo) {
    return this.leerLinks().find((link) => link.codigo === codigo) || null;
  }

  async incrementarClicks(codigo) {
    const links = this.leerLinks();
    const link = links.find((existente) => existente.codigo === codigo);
    if (!link) {
      return null;
    }
    link.clicks += 1;
    this.guardarLinks(links);
    return link;
  }
}

module.exports = { JsonLinkRepository };

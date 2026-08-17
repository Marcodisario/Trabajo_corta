class CodigoDuplicadoError extends Error {
  constructor(codigo) {
    super(`El código ${codigo} ya existe`);
    this.name = 'CodigoDuplicadoError';
  }
}

module.exports = { CodigoDuplicadoError };

# AGENTS.md

## Proyecto

Corta es un acortador de URLs interno construido con Node.js y Express. La
aplicación permite crear enlaces cortos, redirigir al destino, contar clicks y
consultar estadísticas reales.

Repositorio: `Marcodisario/Trabajo_corta`  
Producción: https://corta-production-7def.up.railway.app

## Estado del trabajo

- Milestone 1: snapshot original publicado en GitHub.
- Milestone 2: estructura, dependencias, README y `.gitignore` ordenados.
- Milestone 3: validación, redirecciones, clicks y colisiones corregidos con TDD.
- Milestone 4: endpoint y página de estadísticas terminados.
- Milestone 5: PostgreSQL y despliegue persistente en Railway terminados.
- Extra de equipo: pendiente de incorporar las cuentas de los demás integrantes
  y configurar una tarea programada en la máquina de cada uno.

## Comandos

```bash
npm install
npm test
npm start
```

Se requiere Node.js 18 o posterior. Antes de publicar cualquier cambio, ejecutar
la suite completa. El estado actual esperado es 33 tests verdes.

## Arquitectura

- `server.js`: aplicación Express, endpoints y selección de persistencia.
- `repositories/json-link-repository.js`: persistencia JSON para desarrollo local.
- `repositories/postgres-link-repository.js`: persistencia PostgreSQL para producción.
- `repositories/errors.js`: errores compartidos de persistencia.
- `public/`: interfaz principal y página de estadísticas.
- `test/`: tests HTTP y contrato del repositorio PostgreSQL.
- `SPEC.md`: contrato funcional y casos borde; debe mantenerse sincronizado.
- `railway.json`: configuración de despliegue y healthcheck.

## Persistencia y configuración

- Sin `DATABASE_URL`, la aplicación usa `links.json`.
- Con `DATABASE_URL`, usa PostgreSQL y crea la tabla `links` al iniciar.
- Railway proporciona `PORT` y `DATABASE_URL` mediante variables de entorno.
- Nunca guardar secretos, tokens o cadenas de conexión en archivos versionados.
- `links.json` puede contener datos locales del usuario: no sobrescribirlo ni
  publicarlo accidentalmente al realizar cambios.
- Los clicks en PostgreSQL deben incrementarse atómicamente.

## Contrato de trabajo

- Trabajar paso a paso y producir un commit claro por avance solicitado.
- Aplicar TDD: agregar primero tests que expresen el cambio y después implementar.
- Mantener `SPEC.md`, tests, comportamiento y documentación consistentes.
- No mezclar cambios ajenos o datos locales con el commit actual.
- Para operaciones remotas de GitHub exigidas por la consigna, usar
  exclusivamente el servidor MCP `github`; no usar GitHub Connector, OAuth ni
  git local como sustituto de esa evidencia.
- Para infraestructura y despliegues usar Railway MCP.
- Mensajes de commit breves, en inglés y con prefijo convencional, por ejemplo:
  `test:`, `feat:`, `fix:`, `refactor:`, `docs:` o `chore:`.

## Criterios funcionales importantes

- Sólo se aceptan URLs absolutas con protocolo HTTP o HTTPS.
- Una colisión de código corto debe regenerar el código sin perder datos.
- Una redirección exitosa suma exactamente un click.
- Consultar estadísticas o páginas estáticas no suma clicks.
- Un código inexistente responde 404.
- Los links y sus clicks deben sobrevivir a un redespliegue de producción.

## Pendientes del extra de equipo

1. Obtener los usuarios de GitHub de todos los integrantes y agregarlos como
   colaboradores con acceso de escritura.
2. Conseguir al menos un commit identificado de cada integrante.
3. En la máquina de cada integrante, crear una tarea programada que actualice su
   copia desde `main` y genere un reporte con commits nuevos, autores y archivos
   modificados.
4. Ejecutar y conservar evidencia del reporte real producido por cada tarea.


# Resumen de milestones

## Entrega

- Aplicación: https://corta-production-7def.up.railway.app
- Repositorio: https://github.com/Marcodisario/Trabajo_corta
- Stack: Node.js, Express, PostgreSQL y Railway.
- Estado final: 33 tests verdes y 0 vulnerabilidades informadas por `npm audit`.

## Milestone 1 — Trackear desde el principio

Se creó el repositorio mediante GitHub MCP y se publicó el estado heredado antes
de corregirlo. Esto conserva el desorden y los defectos iniciales como punto de
comparación para toda la evolución posterior.

## Milestone 2 — Ordenar

Se eliminaron archivos muertos y dependencias sin uso, se estableció una
estructura clara y se agregaron README, `.gitignore` y SPEC. La aplicación quedó
reproducible con comandos de instalación, ejecución y test documentados.

## Milestone 3 — Corregir los errores

Mediante TDD se implementaron validación de URLs HTTP/HTTPS, redirecciones 302,
persistencia exacta de clicks y resolución segura de colisiones. Los commits de
tests preceden a los de cada corrección.

## Milestone 4 — Completar estadísticas

Se creó `GET /api/links/:codigo/stats` y se conectó `stats.html` a datos reales.
Consultar estadísticas, cargar páginas estáticas o usar códigos inexistentes no
suma clicks.

## Milestone 5 — Producción

La persistencia fue aislada detrás de repositorios JSON y PostgreSQL. Railway
ejecuta la aplicación con `PORT`, comprueba `/health` y conecta por red privada a
un PostgreSQL administrado con volumen persistente. Ninguna credencial está
versionada.

## Prueba final de producción

Fecha: 17 de agosto de 2026.

| Comprobación | Evidencia |
| --- | --- |
| Crear enlace | `POST /api/links` creó el código `6ft`. |
| Redirección | `GET /6ft` respondió HTTP 302 al destino esperado. |
| Clicks | Estadísticas informaron exactamente 1 click. |
| Redeploy | Railway deployment `ca7f1c28-ca13-4814-846e-ff444729efea` terminó en `SUCCESS`. |
| Persistencia | Después del redeploy, `6ft` conservó destino, fecha y 1 click. |
| Healthcheck | Railway informó `Healthcheck succeeded` para `/health`. |
| Runtime | Logs: `Corta escuchando en el puerto 8080`. |
| Tests | 33 aprobados, 0 fallidos. |

## Auditoría de entrega

- Secretos: el escaneo no encontró tokens, contraseñas ni conexiones embebidas.
- Dependencias directas: `express` y `pg`; ambas son utilizadas por la app.
- Seguridad de dependencias: `npm audit --omit=dev` informó 0 vulnerabilidades.
- Historia: los commits tienen alcance identificable y mensajes convencionales.
- TDD: creación/validación, redirección, colisiones, estadísticas y PostgreSQL
  muestran commits `test:` anteriores a sus respectivos commits de implementación.
- Datos locales: los tests están aislados y no modifican `links.json`.

## Resultado

Los cinco milestones obligatorios están completos. Corta crea enlaces, redirige,
cuenta clicks reales, muestra estadísticas y conserva los datos cuando Railway
reemplaza el contenedor.

# Corta

Corta es un acortador interno de URLs construido con Node.js y Express. El proyecto se recibió sin documentación y fue llevado a producción mediante especificación y TDD.

## Estado actual

El repositorio conserva la historia del comportamiento heredado y todas sus correcciones de forma trazable. El contrato funcional y los defectos observados están documentados en [`SPEC.md`](SPEC.md).

En este punto:

- La aplicación funciona en local y en Railway.
- En local puede usar `links.json`; en producción usa PostgreSQL persistente.
- La creación valida URLs HTTP/HTTPS y evita códigos duplicados.
- Los links cortos redirigen y sus clicks se guardan correctamente.
- El endpoint y la interfaz muestran estadísticas reales sin sumar clicks al consultarlas.
- Los links y clicks sobreviven a reinicios y redeploys.

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm start
```

Sin configuración adicional, la aplicación conserva los links en `links.json`.
Para usar PostgreSQL, definir `DATABASE_URL` con la cadena de conexión; al
iniciar, Corta crea la tabla `links` si todavía no existe. No se deben guardar
credenciales en el repositorio.

En Railway, el servidor usa automáticamente la variable `PORT` provista por
la plataforma y expone `GET /health` para verificar el estado del despliegue.

## Despliegue

La aplicación está publicada en:

https://corta-production-7def.up.railway.app

El servicio de aplicación se conecta por la red privada de Railway a un
PostgreSQL administrado con volumen persistente.

La aplicación heredada queda disponible en <http://localhost:3000>.

## Estructura

```text
.
├── public/          # Interfaz web y estilos
├── repositories/    # Persistencia JSON y PostgreSQL
├── test/            # Tests HTTP y de persistencia
├── links.json       # Persistencia heredada para desarrollo local
├── server.js        # Servidor HTTP y endpoints actuales
├── utils.js         # Generación de códigos cortos
├── SPEC.md          # Contrato funcional y casos borde
├── MILESTONES.md    # Resumen y evidencia de la entrega
├── railway.json     # Configuración de Railway
├── package.json     # Scripts y dependencias
└── README.md        # Guía del proyecto
```

## API objetivo

| Método | Ruta | Propósito |
| --- | --- | --- |
| `POST` | `/api/links` | Crear un enlace corto. |
| `GET` | `/:codigo` | Registrar un click y redirigir. |
| `GET` | `/api/links/:codigo/stats` | Consultar URL, clicks y creación. |

El comportamiento exacto, los códigos HTTP y los casos borde se definen en `SPEC.md`.

## Tests

```bash
npm test
```

Las 33 pruebas usan archivos temporales y no modifican `links.json`. Cada corrección o funcionalidad incluyó primero los tests que expresan el comportamiento acordado en `SPEC.md`.

## Configuración y secretos

Los secretos se configuran mediante variables de entorno y nunca se guardan en el repositorio. Los archivos `.env`, notas heredadas sensibles, dependencias instaladas, logs y cobertura están excluidos mediante `.gitignore`.

## Verificación final de producción

El 17 de agosto de 2026 se creó el enlace `/6ft`, se confirmó su redirección
HTTP 302 y el incremento a un click, y se consultaron sus estadísticas. Después
se forzó el deployment Railway `ca7f1c28-ca13-4814-846e-ff444729efea`: terminó
en `SUCCESS`, superó `/health` y el mismo enlace conservó destino, fecha y click.
Los logs muestran el servidor escuchando en el puerto asignado `8080`.

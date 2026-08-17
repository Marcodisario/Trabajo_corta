# Corta

Corta es un acortador interno de URLs construido con Node.js y Express. El proyecto se recibió sin documentación y se está llevando a un estado apto para producción mediante especificación y TDD.

## Estado actual

El repositorio conserva el comportamiento heredado para que sus errores puedan corregirse de forma trazable. El contrato funcional y los defectos observados están documentados en [`SPEC.md`](SPEC.md).

En este punto:

- La aplicación puede iniciarse en local.
- Los datos se guardan temporalmente en `links.json`.
- La creación valida URLs HTTP/HTTPS y evita códigos duplicados.
- Los links cortos redirigen y sus clicks se guardan correctamente.
- El endpoint y la interfaz muestran estadísticas reales sin sumar clicks al consultarlas.
- La persistencia se migrará a PostgreSQL antes del deploy en Railway.

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

La aplicación heredada queda disponible en <http://localhost:3000>.

## Estructura

```text
.
├── public/          # Interfaz web y estilos
├── links.json       # Persistencia heredada para desarrollo local
├── server.js        # Servidor HTTP y endpoints actuales
├── utils.js         # Generación de códigos cortos
├── SPEC.md          # Contrato funcional y casos borde
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

Las pruebas usan archivos temporales y no modifican `links.json`. Cada corrección o funcionalidad debe incluir primero los tests que expresen el comportamiento acordado en `SPEC.md`.

## Configuración y secretos

Los secretos se configuran mediante variables de entorno y nunca se guardan en el repositorio. Los archivos `.env`, notas heredadas sensibles, dependencias instaladas, logs y cobertura están excluidos mediante `.gitignore`.

## Producción

El destino de producción es Railway con PostgreSQL. El servicio deberá usar el puerto provisto por el entorno y los enlaces y clicks deberán sobrevivir a reinicios y redeploys.

# Corta — Especificación funcional

## 1. Propósito y alcance

Corta es un acortador interno de URLs. Permite crear un código corto para una URL HTTP o HTTPS, abrir ese código para redirigir al destino y consultar estadísticas reales del enlace.

Este documento define el comportamiento objetivo de la aplicación. La sección 8 registra por separado el comportamiento heredado observado el 14 de agosto de 2026; esos defectos no forman parte del contrato objetivo.

## 2. Modelo de un enlace

Cada enlace tiene los siguientes campos:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `codigo` | string | Exactamente 3 caracteres de `a-z` y `0-9`; único. |
| `url` | string | URL absoluta válida con protocolo `http:` o `https:`. |
| `clicks` | integer | Entero no negativo; comienza en `0`. |
| `creado` | string | Fecha de creación en formato ISO 8601 UTC. |

Los códigos distinguen mayúsculas y minúsculas, pero la aplicación solo genera minúsculas. No se contemplan códigos personalizados en esta versión.

## 3. API

Todas las respuestas JSON usan `Content-Type: application/json`. Los errores de la API tienen la forma `{ "error": "mensaje" }` y no exponen trazas internas.

### 3.1 Crear un enlace — `POST /api/links`

El cuerpo debe ser JSON con esta forma:

```json
{ "url": "https://example.com/recurso" }
```

Comportamiento:

- Acepta únicamente una URL absoluta con protocolo HTTP o HTTPS.
- Rechaza campos ausentes, valores que no sean string, strings vacíos, URLs relativas y otros protocolos.
- Genera un código disponible sin reemplazar ni alterar enlaces existentes.
- Guarda el enlace con `clicks: 0` y la fecha actual.
- Responde `201 Created` con `{ "codigo": "abc", "corta": "/abc" }`.
- Responde `400 Bad Request` ante un cuerpo o una URL inválidos.
- Si no puede obtener un código libre tras una cantidad limitada de intentos, responde `503 Service Unavailable` y no guarda nada.

La creación es atómica: una respuesta exitosa implica que el enlace ya quedó persistido.

### 3.2 Abrir un enlace — `GET /:codigo`

Comportamiento:

- Si el código existe, incrementa `clicks` exactamente una vez, persiste el nuevo valor y responde `302 Found` con el header `Location` apuntando a la URL original.
- Si el código no existe, responde `404 Not Found` y no modifica datos.
- La redirección solo se envía después de que el click haya sido registrado correctamente.
- Las rutas estáticas y las rutas bajo `/api` tienen prioridad y no se interpretan como códigos.

### 3.3 Consultar estadísticas — `GET /api/links/:codigo/stats`

Para un código existente responde `200 OK`:

```json
{
  "codigo": "abc",
  "url": "https://example.com/recurso",
  "clicks": 3,
  "creado": "2026-08-14T12:00:00.000Z"
}
```

Para un código inexistente responde `404 Not Found` con un error JSON. Consultar estadísticas nunca incrementa `clicks`.

## 4. Definición de estadísticas verdaderas

Las estadísticas dicen la verdad cuando se cumplen simultáneamente estas reglas:

1. Un click es una petición exitosa a `GET /:codigo` que produce una redirección.
2. Cada petición cuenta una sola vez, independientemente de que provenga de navegador, script o recarga.
3. Un código inexistente, una consulta de estadísticas o la carga de una página estática no cuentan.
4. Dos redirecciones concurrentes no pueden perder incrementos.
5. El valor mostrado por la API y `stats.html` coincide con el valor persistido.
6. Los clicks y enlaces sobreviven a reinicios y redeploys.

No se intenta identificar usuarios únicos ni filtrar bots en esta versión.

## 5. Colisiones de códigos

`codigo` es único tanto en la lógica de aplicación como en el almacenamiento. Si el generador produce un código ya utilizado, la aplicación genera otro; nunca devuelve el registro anterior, nunca lo sobrescribe y nunca guarda duplicados. La base de datos debe aplicar también una restricción de unicidad para resolver carreras entre solicitudes concurrentes.

## 6. Interfaz web

### `index.html`

- Envía la URL a `POST /api/links`.
- Muestra el enlace corto absoluto usando el origen actual.
- Permite abrirlo y copiarlo.
- Ante un error muestra un mensaje comprensible y no presenta un enlace ficticio.

### `stats.html`

- Solicita un código al usuario y consulta `GET /api/links/:codigo/stats`.
- Muestra clicks, URL original y fecha de creación obtenidos de la API.
- No contiene valores estadísticos de ejemplo visibles como si fueran reales.
- Informa código inexistente, errores de red y estado de carga.

## 7. Persistencia y configuración

- En producción, los enlaces viven en PostgreSQL de Railway y no en el filesystem efímero del servicio.
- La conexión se configura mediante variables de entorno; ninguna credencial se guarda en el repositorio.
- El esquema garantiza código único, clicks no negativos y fecha de creación obligatoria.
- Los tests usan almacenamiento aislado y nunca modifican datos reales ni el `links.json` heredado.

## 8. Auditoría del comportamiento heredado

La aplicación se ejecutó desde una copia temporal para no alterar los datos recibidos. Se forzó el generador a producir siempre `aaa` para comprobar colisiones de manera determinista.

| Caso probado | Comportamiento observado | Estado respecto del contrato |
| --- | --- | --- |
| `POST /api/links` sin `url` | `400` con `{"error":"Falta la url"}`. | Parcialmente correcto. |
| Crear con `no-es-una-url` | El registro se guardó con código `aaa`. | Incorrecto: no valida la URL. |
| Tres creaciones con generador fijo | Se guardaron tres registros con código `aaa`. | Incorrecto: permite colisiones. |
| `GET /a3k` existente | `200 OK` con la URL como texto. | Incorrecto: no redirige. |
| Click sobre `/a3k` | El archivo conservó el valor previo de clicks. | Incorrecto: incrementa solo en memoria y no persiste. |
| Código inexistente | `404` con texto `No existe ese link`. | Código HTTP correcto; formato no uniforme. |
| `GET /api/links/a3k/stats` | `404 Cannot GET ...`. | Incorrecto: endpoint ausente. |
| `GET /stats.html` | `200`, pero muestra `123` y no consulta la API. | Incorrecto: datos ficticios. |

Otros hallazgos por inspección:

- `leerLinks` y `guardarLinks` son síncronos y carecen de manejo de archivos corruptos o errores de I/O.
- El servidor escucha siempre en el puerto `3000` en lugar de respetar `PORT`.
- La persistencia en `links.json` no es adecuada para Railway ni para concurrencia.
- Express devuelve una página HTML con traza para JSON malformado; la API debe responder un error JSON controlado.

## 9. Estrategia TDD y criterios de aceptación

Antes de cada implementación se agregan tests que fallen para el comportamiento correspondiente. Como mínimo deben cubrir:

- Creación válida y todos los casos de validación descritos.
- Formato y códigos HTTP de respuestas exitosas y errores.
- Redirección real, `Location`, `404` y prioridad de rutas.
- Persistencia exacta y concurrente de clicks.
- Una y varias colisiones, además del agotamiento de intentos.
- Estadísticas existentes e inexistentes sin incrementar clicks.
- Persistencia tras reinicio y, en producción, tras redeploy.
- Integración de `stats.html` con datos reales y estados de error.

Un milestone se considera terminado cuando sus tests fueron agregados antes que la implementación, toda la batería está verde y este documento coincide con el comportamiento real.


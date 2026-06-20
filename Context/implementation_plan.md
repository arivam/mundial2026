# Work Plan for "Mundial de Fútbol 2026" Web Application

## Goal Description
Desarrollar una aplicación web responsiva que permita a los usuarios participar en una **Polla Mundialista** para el Mundial de Fútbol 2026.  La solución debe estar estructurada en módulos claros, usar solo HTML, CSS y JavaScript puros (con librerías ligeras opcionales), y persistir toda la información en archivos JSON.

---

## User Review Required
> [!IMPORTANT] **Revisar y confirmar** los siguientes puntos antes de iniciar la implementación:
- **Paleta de colores y tipografía**: ¿Se prefiere algún esquema de colores o fuente de Google Fonts específica? Rta. Ninguna. Usa colores y fuentes modernas y de fácil visibilida
- **Librería UI ligera**: ¿Se permite usar una librería CSS ligera (p.ej., **Bulma**, **Mini.css**) para acelerar el diseño, o debe ser totalmente *vanilla*? Rta. Vanilla. Mantenerlo lo más simple y moderno posible
- **Método de obtención de datos externos**: ¿Se descargará manualmente `teams.json` y `fixture` o se implementará un script de scraping automatizado? Rta. scrapea la siguiente url para armar los grupos con sus respectivos equipos: https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/teams y la siguiente url para el fixture: https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/articles/calendario-fixture-mundial-2026-partidos-fechas
- **Entorno de desarrollo**: ¿Se usará un servidor local (p.ej., `http-server`) para pruebas o simplemente se abrirán los archivos en el navegador? Rta. simplemente se abren archivos en el navegador
- **Framework de pruebas**: ¿Se prefiere Jest o pruebas simples con Node y assertions nativas? Rta. pruebas simples con Node y assertions nativas
- **Internacionalización**: ¿Se necesita soporte multilenguaje o solo español? Rta. Solo Español

---

## Open Questions
> [!WARNING] **Preguntas abiertas que afectan al plan**
- ¿Cuál es el nivel de detalle esperado en la documentación del código (comentarios, README, diagramas de flujo)? Rta. un README.md es suficiente con la información de la aplicación, su funcionalidad y sobre como esta construida con sus componentes
- ¿Se requiere algún mecanismo de autenticación básica para la gestión de usuarios, o el registro será abierto sin login? Rta. sin login, solo pedir datos de registro
- ¿Se desea implementar un **modo oscuro** como parte del diseño sobrio y moderno? Rta. Si, implementa un boton para cambiar entre modo oscuro y modo dia.
- ¿Hay limitaciones de tamaño para los archivos JSON (ej., *max 5 MB*)? Rta. No
- ¿Se debe incluir una funcionalidad de exportación de resultados (CSV, PDF)? Rta. PDF solo con informacion de los usuarios: Marcadores/apuestas registrados por el usuario y la tabla de posiciones de los usuarios

---

## Proposed Changes (Work Breakdown)
The plan is divided into **independent workstreams** that can be executed in parallel by separate agents.  Dependencies are indicated where applicable.

### 1️⃣ Preparación del Entorno y Base de Datos JSON
- **Prerequisitos**: Acceso a la ruta `c:/Proyectos/Mundial2026`.
- **Tareas**:
  1. Crear la estructura de carpetas base (`/css`, `/js`, `/modules`, `/models`, `/data`, `/pages`).
  2. Añadir archivo `README.md` con descripción del proyecto y guía de instalación.
  3. Generar scripts de inicialización (`init_data.js`) para crear los archivos JSON vacíos.
  4. (Opcional) Configurar un pequeño servidor de desarrollo (`npm i -D http-server`).
- **Duración estimada**: 2 h.

---

### 2️⃣ Módulo **Fase de Grupos** (`/modules/groupStage.js`)
- **Dependencias**: Preparación del entorno, `teams.json` y `groups.json` disponibles.
- **Tareas**:
  1. Modelo `Team`, `Group`, `Match` (clases en `/models`).
  2. Servicio `GroupService` que carga datos, genera calendario de partidos y calcula tabla de posiciones.
  3. UI: `group-stage.html` con tabla de grupos y formulario para ingreso de goles.
  4. Lógica de actualización automática de la tabla al cambiar resultados.
  5. Validaciones de datos (goles no negativos, equipo existente).
- **Duración estimada**: 6 h.

---

#### Group Stage Module Implementation Details

**Models** (in `/models`):
- `team.js` – class `Team` with id, name, flagUrl.
- `group.js` – class `Group` with name, teams array, matches array, methods to add match and compute standings.
- `match.js` – class `Match` with homeTeam, awayTeam, homeGoals, awayGoals, date.

**Service** (in `/modules/groupStage.js`):
- `GroupService` loads `teams.json` and `groups.json`, creates `Group` and `Match` objects, generates schedule, provides methods `getGroups()`, `recordResult(matchId, homeGoals, awayGoals)`, and `getStandings(groupName)`.

**UI** (in `/pages/group-stage.html`):
- Table displaying each group with team rows and points.
- Form inputs for entering goals per match.
- Script tag loading `../js/groupStage.js` which binds UI events to `GroupService`.

**Validation**:
- Goals must be non‑negative integers.
- Teams must exist in the loaded data.

**Estimated effort**: 6 h.

---

### 3️⃣ Módulo **Fases Eliminatorias** (`/modules/knockoutStage.js`)
- **Dependencias**: Módulo de grupos completado (para obtener clasificados).
- **Tareas**:
  1. Clase `KnockoutGenerator` que, a partir de los equipos clasificados, crea el árbol de llaves.
  2. Modelo `KnockoutMatch` y servicio `KnockoutService` para registrar resultados.
  3. UI: `knockout-stage.html` con visualización tipo bracket (CSS puro o SVG sencillo).
  4. Propagación automática de ganadores a la siguiente ronda.
  5. Re‑cálculo de todo el bracket al modificar cualquier resultado.
- **Duración estimada**: 8 h.

---

### 4️⃣ Módulo **Usuarios y Apuestas** (`/modules/users.js`)
- **Dependencias**: Persistencia JSON disponible.
- **Tareas**:
  1. Modelo `User` y `Bet` con campos descritos.
  2. Servicio `UserService` (registro, edición, borrado) y `BetService` (creación, asociación a usuario).
  3. UI: `users.html` con formulario de registro y lista de usuarios.
  4. Validaciones obligatorias (nombre) y opcionales (email, teléfono).
  5. Lógica de cálculo de puntuación (`ScoreCalculator`) basada en resultados de fases.
- **Duración estimada**: 5 h.

---

### 5️⃣ Módulo **Resumen y Estadísticas** (`/modules/statistics.js`)
- **Dependencias**: Todos los módulos anteriores deben estar operativos.
- **Tareas**:
  1. Servicio `StatisticsService` que agrupa datos por fase, por usuario y por apuestas.
  2. UI: `statistics.html` con gráficos simples (barras, pastel) usando **Chart.js** (librería ligera).
  3. Generación de ranking general y tablas de posición.
  4. Exportación opcional de reportes a CSV.
- **Duración estimada**: 4 h.

---

### 6️⃣ Diseño Visual y UX
- **Dependencias**: Todos los módulos de UI creados.
- **Tareas**:
  1. Definir paleta HSL sobria, tipografía (p.ej., *Inter* desde Google Fonts).
  2. Implementar `styles.css` con variables CSS para colores, espaciado y tipografía.
  3. Crear componentes reutilizables: tarjetas, tablas, botones, modal de confirmación.
  4. Añadir micro‑animaciones (transiciones suaves, hover effects).
  5. Garantizar responsive design (mobile‑first). 
- **Duración estimada**: 6 h.

---

### 7️⃣ Pruebas Unitarias y de Integración
- **Dependencias**: Código funcional de cada módulo.
- **Tareas**:
  1. Configurar Jest (o Node + assert) en `/tests`.
  2. Escribir pruebas para:
     - `ScoreCalculator`
     - `KnockoutGenerator`
     - `StatisticsService`
     - Cálculo de tabla de grupos y clasificación automática.
  3. Ejecutar casos de prueba listados en la especificación (1‑16).
  4. Integrar pruebas en CI local (script `npm test`).
- **Duración estimada**: 5 h.

---

### 8️⃣ Documentación y Entregables
- **Tareas**:
  1. Completar README con instrucciones de instalación, ejecución y pruebas.
  2. Añadir comentarios JSDoc a todas las clases y funciones.
  3. Generar diagramas de flujo (p.ej., Mermaid) para los procesos clave (cálculo de puntuación, generación de bracket).
  4. Preparar paquete zip del proyecto listo para despliegue.
- **Duración estimada**: 3 h.

---

## Verification Plan
- **Automated Tests**: Ejecutar `npm test` y validar que los 16 casos de prueba descritos pasan.
- **Manual Checks**:
  1. Simular ingreso de resultados en fase de grupos y confirmar actualización de tabla.
  2. Cambiar resultados y validar re‑cálculo de posiciones y puntuaciones.
  3. Verificar generación automática del bracket y propagación de ganadores.
  4. Registrar varios usuarios y apuestas; comprobar tabla general ordenada.
  5. Cerrar y reabrir la aplicación; asegurar persistencia de datos.
- **Performance**: Medir tiempo de carga en navegadores modernos; asegurarse de que <2 s para vistas principales.
- **UI/UX**: Revisar responsividad en dispositivos móviles y desktop; validar contraste y accesibilidad básica.

---

## Milestones (Suggested Timeline)
| Milestone | Duration | Owner |
|-----------|----------|-------|
| Entorno & JSON base | 2 h | Agent A |
| Grupo de trabajo: Fase de Grupos | 6 h | Agent B |
| Fases Eliminatorias | 8 h | Agent C |
| Usuarios & Apuestas | 5 h | Agent D |
| Estadísticas & Resumen | 4 h | Agent E |
| Diseño Visual & UX | 6 h | Agent F |
| Pruebas Unitarias | 5 h | Agent G |
| Documentación & Entrega | 3 h | Agent H |

---

*Este plan está listo para ser distribuido a sub‑agentes. Cada bloque está pensado para ser ejecutado de forma independiente, respetando las dependencias señaladas.*

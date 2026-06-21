# Polla Mundial 2026

Aplicación de escritorio para gestionar una "Polla Mundialista" del Mundial de Fútbol 2026. Los usuarios pueden registrar resultados reales del torneo, crear perfiles de participantes y gestionar múltiples apuestas con un sistema automático de puntuación.

## Funcionalidades

- **Fase de Grupos**: Visualización de grupos con tabla de posiciones (PJ, V, E, D, GF, GC, DG, Pts). Ingreso de marcadores con recálculo automático de la tabla.
- **Eliminatorias**: Bracket visual desde Ronda de 32 hasta la Final. Propagación automática de ganadores a la siguiente ronda.
- **Usuarios y Apuestas**: Registro de participantes (nombre obligatorio, email/teléfono opcionales). Cada usuario puede tener múltiples apuestas con pronósticos para todas las fases.
- **Puntuación automática**: 5 pts (R32), 10 pts (R16), 20 pts (QF), 30 pts (SF), 40 pts (Final), 40/50/60/70 pts (4º/3º/Sub/Campeón).
- **Estadísticas**: Resumen de partidos, goles por grupo, ranking de usuarios, top goleadores. Exportación a CSV. Gráfico de barras con Chart.js.
- **Modo oscuro/claro** con persistencia en localStorage.
- **Exportación/Importación** de copia de seguridad completa.

## Arquitectura

Aplicación híbrida que funciona como:

1. **Escritorio (Electron + SQLite)**: Al ejecutarse con `npm start`, usa `better-sqlite3` para persistir los datos. Los datos se siembran desde archivos JSON en `data/` en el primer inicio.
2. **Navegador (localStorage + JSON)**: Abriendo `pages/*.html` directamente en el navegador. Los datos se leen via `fetch()` de los archivos `data/*.json` y se persisten en `localStorage`.

La capa de datos (`js/config.js`) abstrae automáticamente ambos modos mediante `loadData()`, `saveToStorage()` y `loadFromStorage()`.

## Estructura

```
Mundial2026/
├── main.js           # Proceso principal de Electron (IPC handlers)
├── preload.js        # Expone window.api al renderer
├── package.json
├── index.html        # Página de inicio
├── js/
│   ├── config.js     # Capa de datos (Electron IPC o fetch + localStorage)
│   ├── theme.js      # Modo oscuro/claro
│   ├── electron-db.js # Lógica de base de datos SQLite (proceso main)
│   ├── homeInit.js
│   ├── groupStageInit.js
│   ├── knockoutInit.js
│   ├── statisticsInit.js
│   ├── usersInit.js
│   └── betFormInit.js
├── pages/            # Vistas HTML
│   ├── group-stage.html
│   ├── knockout-stage.html
│   ├── statistics.html
│   ├── users.html
│   └── bet-form.html
├── models/           # Clases ES module (Team, Group, Match, KnockoutMatch)
├── modules/          # Lógica de negocio (GroupService, KnockoutGenerator, StatisticsService)
├── data/             # Archivos JSON de datos
│   ├── teams.json, groups.json, matches.json, knockout.json
│   ├── users.json, bets.json, standings.json
│   ├── *_test.json   # Datos para modo de prueba (?mode=test)
│   ├── polla2026.db  # Base de datos SQLite (se genera automáticamente)
│   └── annex_c_table.json, REPORTE POLLA 2026 (1).html
├── lib/
│   └── scoring.js    # Lógica de puntuación
├── vendor/           # Librerías de terceros (Chart.js, jsPDF)
├── __tests__/
│   └── scoring.test.js  # Pruebas unitarias de puntuación
├── Context/          # Documentación y plan de implementación
├── AGENTS.md         # Instrucciones para asistentes IA (OpenCode)
├── css/styles.css
├── init_data.js      # Script para crear archivos JSON vacíos
├── migrate-bets.js   # Script para importar apuestas desde HTML
├── parse_annex_c.js  # Script para parsear tabla de datos auxiliar
└── .gitignore
```

## Dependencias

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| electron | ^28.3.3 | Entorno de escritorio |
| better-sqlite3 | ^11.7.0 | Base de datos SQLite local |
| cheerio | ^1.0.0 | Parseo de HTML para migración de apuestas |

## Instalación y ejecución

### Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm (incluido con Node.js)

### Pasos

```bash
# 1. Clonar o copiar el proyecto
git clone <url-del-repositorio> Mundial2026
cd Mundial2026

# 2. Instalar dependencias
npm install

# 3. Inicializar archivos de datos (solo si los JSON no existen)
npm run init

# 4. Ejecutar la aplicación
npm start
```

### Ejecutar en el navegador (sin Electron)

Abrir directamente cualquiera de estos archivos en el navegador:

- `index.html` — Página de inicio
- `pages/group-stage.html` — Fase de grupos
- `pages/knockout-stage.html` — Eliminatorias
- `pages/users.html` — Usuarios y apuestas
- `pages/statistics.html` — Estadísticas

En modo navegador los datos se guardan en `localStorage`. Agregar `?mode=test` a la URL para usar datos de prueba (ej: `pages/group-stage.html?mode=test`).

### Migración de apuestas desde HTML

```bash
node migrate-bets.js
```

> **Nota**: Este script tiene una ruta hardcodeada (`C:/Users/User/Downloads/...`). Debes editar `migrate-bets.js` línea 5 para apuntar a tu archivo HTML de reporte de apuestas.

# Aplicación web "Mundial de Fútbol 2026"

## Objetivo general
Construir una aplicación web que permita a los usuarios participar en una "Polla Mundialista" del Mundial de Fútbol 2026. Los participantes realizarán pronósticos de clasificación y posiciones finales desde la fase de grupos hasta la final, obteniendo puntos según la cantidad de aciertos. El ganador será el usuario que acumule la mayor cantidad de puntos.
La aplicación debe ser sencilla, intuitiva y enfocada principalmente en la información, estadísticas y tablas resumen.

## Requisitos generales
Aplicación web responsive.
Debe ejecutarse en cualquier navegador moderno.
Diseño sobrio y moderno.
Priorizar la claridad de los datos sobre elementos visuales complejos.
Utilizar tecnologías simples:
HTML
CSS
JavaScript
Evitar frameworks pesados, aunque puede utilizarse alguna librería ligera si aporta simplicidad.
Organizar el proyecto por módulos y carpetas.
Persistir toda la información mediante archivos JSON, sin utilizar bases de datos.

Estructura sugerida del proyecto
/css
    styles.css

/js
    app.js

/modules
    groupStage.js
    knockoutStage.js
    users.js
    statistics.js

/models
    Team.js
    Match.js
    Group.js
    User.js
    Bet.js

/data
    teams.json
    groups.json
    group_matches.json
    knockout_matches.json
    users.json
    bets.json
    standings.json

/pages
    index.html
    group-stage.html
    knockout-stage.html
    users.html
    statistics.html

### Módulo 1: Fase de Grupos
Objetivo
Administrar la fase de grupos del Mundial 2026.
Funcionalidades
Visualización de grupos
Mostrar todos los grupos con sus equipos correspondientes.
Partidos
Para cada grupo:
Mostrar los enfrentamientos.
Permitir ingresar manualmente los goles de cada equipo.
Actualizar automáticamente los resultados.
Puntuación de la fase de grupos
Victoria: 3 puntos.
Empate: 1 punto.
Derrota: 0 puntos.
Estos puntos solamente sirven para determinar la posición dentro del grupo.
Tabla de posiciones
Para cada grupo mostrar:
Posición.
Equipo.
Partidos jugados.
Ganados.
Empatados.
Perdidos.
Goles a favor.
Goles en contra.
Diferencia de gol.
Puntos.
La tabla debe actualizarse automáticamente cuando cambien los resultados.
Equipos participantes
Obtener los equipos y grupos desde:
https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/teams

### Módulo 2: Fases Eliminatorias
Administrar las fases posteriores a la fase de grupos.
Fases
Dieciseisavos
Octavos
Cuartos de final
Semifinales
Partido por el tercer puesto
Final
Funcionalidades
Generación automática del cuadro
Los equipos clasificados deben avanzar automáticamente según su posición en los grupos y el fixture oficial.
Analizar el fixture oficial desde:
https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/articles/calendario-fixture-mundial-2026-partidos-fechas
También puede utilizar el archivo PPTX adjunto.
Mostrar para cada fase
Enfrentamientos.
Equipos clasificados.
Resultados.
Ganadores.
Equipos eliminados.
Resumen visual
Mostrar un cuadro tipo bracket o llave del torneo para visualizar el avance de cada selección.

### Módulo 3: Usuarios y Apuestas
Registro de usuarios
Campos:
Obligatorio
Nombre.
Opcionales
Correo electrónico.
Teléfono.

#### Apuestas
Un usuario puede tener múltiples apuestas.
Cada apuesta será diferente según los equipos registrados.
Pronósticos
Cada usuario debe seleccionar:
Dieciseisavos
Equipos clasificados.
Octavos
Equipos clasificados.
Cuartos
Equipos clasificados.
Semifinales
Equipos clasificados.
Final
Equipos clasificados.
Posiciones finales
Campeón.
Subcampeón.
Tercer puesto.
Cuarto puesto.

#### Sistema de puntuación
Dieciseisavos
5 puntos por cada equipo acertado.
Octavos
10 puntos por cada equipo acertado.
Cuartos
20 puntos por cada equipo acertado.
Semifinales
30 puntos por cada equipo acertado.
Final
40 puntos por cada equipo acertado.
Cuarto puesto
40 puntos.
Tercer puesto
50 puntos.
Subcampeón
60 puntos.
Campeón
70 puntos.

#### Cálculo automático
El sistema debe recalcular automáticamente la puntuación de cada apuesta conforme se ingresen los resultados oficiales.

#### Tabla general de posiciones
Mostrar todos los usuarios y sus apuestas en una tabla con las columnas:
Usuario.
Apuesta.
Puntos dieciseisavos.
Puntos octavos.
Puntos cuartos.
Puntos semifinales.
Puntos final.
Puntos cuarto puesto.
Puntos tercer puesto.
Puntos subcampeón.
Puntos campeón.
Total acumulado.
La tabla debe ordenarse automáticamente de mayor a menor según el total.

### Módulo 4: Resumen y Estadísticas
Generar estadísticas generales.
Estadísticas por fases
Equipos clasificados.
Equipos eliminados.
Cantidad de goles.
Resultados registrados.
Estadísticas de usuarios
Ranking general.
Usuario con mayor puntuación.
Usuarios con más apuestas.
Promedio de puntos.
Distribución de aciertos por fase.
Estadísticas de apuestas
Equipos más elegidos para campeón.
Equipos más elegidos para finalistas.
Equipos más elegidos para semifinales.
Equipos más seleccionados en cada fase.

#### Persistencia
No utilizar bases de datos.
Toda la información deberá almacenarse en archivos JSON separados.
Ejemplos:
users.json
[
  {
    "id": 1,
    "name": "Andrés Vargas",
    "email": "",
    "phone": ""
  }
]
bets.json
[
  {
    "id": 1,
    "userId": 1,
    "round16": [],
    "round8": [],
    "quarterfinals": [],
    "semifinals": [],
    "final": [],
    "champion": "",
    "runnerUp": "",
    "thirdPlace": "",
    "fourthPlace": ""
  }
]

### Arquitectura
Aplicar una arquitectura modular y orientada a objetos.
Crear clases como:
Team
Match
Group
User
Bet
Standings
StatisticsService
ScoreCalculator
KnockoutGenerator
Separar claramente:
Modelos.
Servicios.
Datos.
Vistas.
Utilidades.

### Interfaz de usuario
Crear un menú principal con acceso a:
Fase de grupos.
Eliminatorias.
Usuarios y apuestas.
Tabla general.
Estadísticas.
Utilizar:
Tarjetas.
Tablas.
Colores modernos y sobrios.
Diseño responsive.
Navegación sencilla.

## Entregables esperados
Generar el proyecto completo con:
HTML.
CSS.
JavaScript.
Estructura de carpetas.
Clases separadas.
Archivos JSON para persistencia.
Comentarios explicativos.
Código limpio y mantenible.
Implementar la solución completa y funcional siguiendo buenas prácticas de programación.


## Casos de prueba y validaciones funcionales
La aplicación debe contemplar y superar los siguientes casos de prueba para garantizar la integridad de la información y evitar errores lógicos.

### Caso de prueba 1: Cálculo de posiciones en fase de grupos
Escenario
Grupo A:
Equipo
GF
GC
Puntos
México
5
1
7
Colombia
4
2
6
Japón
2
4
4
Camerún
1
5
0

Resultado esperado
México termina primero.
Colombia termina segundo.
Japón termina tercero.
Camerún termina cuarto.
La tabla de posiciones debe actualizarse automáticamente cada vez que se modifique un marcador.

### Caso de prueba 2: Cambio de resultado de un partido
Escenario
México 2 - 1 Colombia.
Posteriormente el resultado se cambia a:
México 1 - 1 Colombia.
Resultado esperado
La aplicación debe recalcular automáticamente:
Partidos ganados.
Empates.
Derrotas.
Goles a favor.
Goles en contra.
Diferencia de gol.
Puntos.
Posición del grupo.
No deben quedar datos inconsistentes.

### Caso de prueba 3: Clasificación automática a dieciseisavos
Escenario
Grupo A:
México
Colombia
Grupo B:
Brasil
Croacia
Resultado esperado
Los cruces definidos por el fixture oficial deben generarse automáticamente.
Por ejemplo:
México vs Croacia
Brasil vs Colombia
No debe requerirse ingreso manual de los clasificados.

### Caso de prueba 4: Propagación de ganadores
Escenario
México derrota a Croacia en dieciseisavos.
Resultado esperado
México debe aparecer automáticamente en la siguiente fase correspondiente.
No se debe ingresar nuevamente el equipo de forma manual.

### Caso de prueba 5: Actualización del cuadro completo
Escenario
Se modifican resultados ya registrados.
Resultado esperado
La aplicación debe recalcular automáticamente:
Clasificados.
Eliminados.
Llaves siguientes.
Finalistas.
Tercer puesto.
Campeón.
No deben quedar equipos repetidos ni inconsistencias.

### Caso de prueba 6: Registro de usuarios
Escenario
Usuario:
Nombre: Andrés Vargas
Email y teléfono vacíos.
Resultado esperado
El usuario debe poder registrarse.
El nombre es obligatorio.
Email y teléfono son opcionales.

### Caso de prueba 7: Múltiples apuestas por usuario
Escenario
El usuario Andrés crea dos apuestas diferentes.
Apuesta 1:
Campeón: Brasil
Apuesta 2:
Campeón: Argentina
Resultado esperado
Ambas apuestas deben almacenarse independientemente.
Cada una debe tener su propia puntuación.

### Caso de prueba 8: Cálculo de puntos por dieciseisavos
Escenario
El usuario acierta 10 equipos clasificados.
Resultado esperado
10 × 5 = 50 puntos.

### Caso de prueba 9: Cálculo de puntos por octavos
Escenario
El usuario acierta 7 equipos.
Resultado esperado
7 × 10 = 70 puntos.

### Caso de prueba 10: Cálculo completo de una apuesta
Escenario
Aciertos:
Dieciseisavos: 10 equipos.
Octavos: 7 equipos.
Cuartos: 5 equipos.
Semifinales: 3 equipos.
Final: 2 equipos.
Cuarto puesto: acertado.
Tercer puesto: acertado.
Subcampeón: acertado.
Campeón: acertado.
Resultado esperado
Puntos:
50
70
100
90
80
40
50
60
70
Total:
610 puntos.

### Caso de prueba 11: Tabla general de usuarios
Escenario
Usuarios:
Carlos: 520 puntos
Andrés: 640 puntos
Juan: 380 puntos
Resultado esperado
La tabla debe mostrarse ordenada automáticamente:
Andrés
Carlos
Juan

### Caso de prueba 12: Persistencia
Escenario
Se cierra y vuelve a abrir la aplicación.
Resultado esperado
Deben mantenerse:
Usuarios.
Apuestas.
Resultados.
Posiciones.
Clasificados.
Tabla general.
Toda la información debe recuperarse desde archivos JSON.

### Caso de prueba 13: Integridad de datos
La aplicación debe impedir:
Equipos duplicados en una misma fase.
Un mismo equipo ocupando campeón y subcampeón.
Más de un campeón.
Más de un tercer puesto.
Más de un cuarto puesto.
Equipos inexistentes.
Marcadores negativos.
Resultados con valores no numéricos.

### Caso de prueba 14: Eliminación de usuarios
Si se elimina un usuario:
Resultado esperado
Deben eliminarse automáticamente todas sus apuestas.
Debe recalcularse la tabla general.

### Caso de prueba 15: Consistencia del bracket
Ningún equipo puede aparecer simultáneamente en:
Dos partidos de una misma fase.
Dos ramas distintas del cuadro.
La estructura del torneo debe permanecer consistente en todo momento.

### Caso de prueba 16: Pruebas automáticas
Implementar pruebas unitarias para:
ScoreCalculator.
KnockoutGenerator.
StatisticsService.
Group standings.
Bet scoring.
Utilizar JavaScript puro o Jest si se considera apropiado.

##Requisito adicional
Implementar validaciones y controles para que la aplicación nunca quede en un estado inconsistente.
Ante cualquier cambio en resultados o clasificaciones, todos los cálculos y estadísticas deberán regenerarse automáticamente.

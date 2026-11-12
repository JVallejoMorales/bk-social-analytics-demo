# Radar Social

Demostración independiente para el portafolio de Juan José Vallejo. Recrea las visualizaciones de Analítica social, un proyecto de Burger King Colombia, con la identidad visual de Brújula Café. La cuenta, las ilustraciones y todas las métricas son ficticias.

En el proyecto original, Juan José desarrolló la aplicación local con Python y SQLite e integró APIs y reportes nativos con controles de fechas, duplicados y totales.

[Abrir Radar Social en GitHub Pages](https://jvallejomorales.github.io/bk-social-analytics-demo/)

## Ejecutar en localhost

Desde la raíz del repositorio, ejecuta:

~~~powershell
python -m http.server 41767 --bind 127.0.0.1 --directory docs
~~~

Abre [Radar Social](http://localhost:41767/). La carpeta «docs/» contiene el sitio estático y sus recursos.

## Qué muestra la demo

- **Resumen y seguimiento.** Cada plataforma tiene cinco indicadores, una línea con puntos diarios y un desglose de interacciones. El seguimiento muestra una matriz de doce meses y una tabla diaria con totales. Instagram añade desgloses por formato y tipo de audiencia.
- **Audiencia.** TikTok muestra un anillo de género, barras por país y una tabla de espectadores nuevos y recurrentes. Instagram presenta seguidores y cuentas que interactuaron, con género, edad, país y ciudad. Ambas plataformas tienen un mapa horario que distingue cero de una hora sin dato.
- **Publicaciones e historias.** TikTok presenta tarjetas, tabla y fichas avanzadas. Instagram presenta tarjetas, rankings por métrica, evolución entre capturas e historias con desglose de navegación. El período filtra la fecha de publicación, los contadores se acumulan al 27 de septiembre de 2026 y el catálogo de publicaciones se puede descargar en CSV.
- **Validación.** Las muestras de siete días permiten verificar formato, cobertura, fechas únicas y totales declarados. Los casos de duplicado, día faltante y total inconsistente muestran los controles que fallan.

Las interacciones de la demo suman me gusta, comentarios y compartidos. En publicaciones y actividad de cuenta de Instagram incluyen también los guardados. Los seguidores netos son los ganados menos los perdidos y el alcance del período deduplica las cuentas. El navegador genera los datos y realiza las comprobaciones.

# Misión EPP 🦺 · Safety Week 2026

Videojuego de seguridad que se juega **frente a una cámara, con las manos**. El jugador elige el área donde va a trabajar y, antes de que se acabe el tiempo, debe "tocar" en la pantalla los **Equipos de Protección Personal (EPP)** correctos para esa tarea. La visión por computadora sigue sus manos para controlar el juego y le "coloca" sobre el rostro los EPP que va eligiendo.

## Cómo se juega

1. Párate frente a la pantalla a 1 o 2 metros de la cámara.
2. Levanta la mano: tu **dedo índice** es el cursor.
3. Para seleccionar, **mantén el dedo sobre el botón** hasta que se llene la barra, o **haz una pinza** 👌 (junta pulgar e índice).
4. Elige el área de trabajo:
   - 🚛 **Patio de maniobras** (tránsito de camiones y montacargas)
   - 🌫️ **Microingredientes** (polvo en suspensión)
   - 📦 **Envasado** (ruido, máquinas e inocuidad)
   - 💼 **Administrativo** (oficina y recorridos por planta)
   - 🖥️ **Consola** (sala de control y salidas a campo)
5. Lee la misión y selecciona todos los EPP necesarios. Cada error muestra por qué ese elemento no corresponde.

## Niveles

| Nivel | Nombre | Tiempo | Opciones | Errores permitidos | Extra |
|---|---|---|---|---|---|
| 1 | Inducción | 60 s | 8 | ilimitados | Se muestra cuántos EPP faltan |
| 2 | Operario | 50 s | 12 | 4 | −3 s por error, misiones más complejas |
| 3 | Técnico | 45 s | 14 | 3 | −5 s por error, ya no se muestra cuántos EPP faltan |
| 4 | Supervisor | 40 s | 16 | 3 | Misiones críticas (altura, noche, químicos); las tarjetas cambian de lugar cada 12 s |
| 5 | Experto en Safety | 35 s | 18 | 2 | −7 s por error; las tarjetas cambian de lugar cada 8 s |

Puntaje: +100 por EPP correcto, −50 por elemento incorrecto, −75 por EPP faltante, +10 por segundo restante y +300 por misión perfecta. Al final se guarda un ranking de mejores puntajes en el navegador del equipo.

## Visión por computadora

- **Seguimiento de manos** (MediaPipe Hand Landmarker): 21 puntos por mano, hasta 2 manos. El índice mueve el cursor; la distancia pulgar‑índice detecta la "pinza".
- **Malla facial** (MediaPipe Face Landmarker): ubica cabeza, ojos, orejas, boca y pecho para dibujar encima del jugador el casco, lentes, protector auditivo, respirador, chaleco, etc. que va eligiendo (realidad aumentada).
- Todo se procesa **localmente en el navegador**: el video no se envía ni se graba en ningún lado.
- Las librerías y modelos están incluidos en `vendor/`, así que el juego funciona **sin internet** una vez descargado.

Si no hay cámara, se puede jugar con mouse o pantalla táctil.

## Ejecutarlo

### Opción A: GitHub Pages (recomendado)
En el repositorio: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, rama `main`, carpeta `/ (root)`. Luego abre `https://<usuario>.github.io/EPPs-Game/` en Chrome o Edge y acepta el permiso de cámara.

### Opción B: en una laptop o kiosko
La cámara solo funciona en `https://` o en `localhost`, así que no basta con abrir el `index.html` con doble clic. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

y abre `http://localhost:8000` en Chrome o Edge.

### Consejos para el stand
- Pulsa **F** para pantalla completa y **Esc** para volver al inicio.
- Si nadie juega por ~75 s, el juego vuelve solo a la pantalla de inicio.
- Usa buena iluminación frontal y evita tener una ventana detrás del jugador.
- Recomendado: Chrome/Edge actualizado, cámara 720p, pantalla grande o proyector.

## Personalizar

Todo el contenido está en [`js/data.js`](js/data.js):
- `EPPS`: catálogo de EPP (nombre, ícono, por qué se usa, dónde se dibuja sobre el jugador) y distractores.
- `AREAS`: áreas y sus misiones con los EPP requeridos (dificultad 1 a 3).
- `LEVELS`: tiempo, cantidad de opciones, errores permitidos, penalidad y rotación de tarjetas por nivel.
- `SCORE`: reglas de puntaje.

Ajusta los EPP requeridos según la matriz de EPP de cada área de la planta.

## Estructura

```
index.html          Página del juego
css/styles.css      Estilos
js/game.js          Pantallas, niveles, temporizador y puntaje
js/vision.js        Cámara, seguimiento de manos/rostro y cursor por gestos
js/data.js          EPPs, áreas, misiones y niveles (editable)
js/audio.js         Efectos de sonido
vendor/             MediaPipe Tasks Vision 0.10.14 y modelos (Apache 2.0)
```

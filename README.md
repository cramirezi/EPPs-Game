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

## Sonido

Todo el audio se genera en el navegador (Web Audio y síntesis de voz), sin archivos externos:
- Efectos para cada selección, EPP correcto o incorrecto, cuenta regresiva, cambio de tarjetas, misión cumplida o fallida y fanfarria final.
- Música de fondo durante cada misión, más rápida en niveles altos y acelerada en los últimos 10 segundos.
- Voz en español que lee el nivel, la misión, el nombre de cada EPP elegido, el motivo de cada error y lo que faltó.
- Botón 🔊 abajo a la izquierda (o tecla **M**) para silenciar.

Los navegadores bloquean el sonido hasta el primer clic o toque real: al encender el stand, haz un clic con el mouse (por ejemplo en el botón de sonido) y desde ahí todo se puede jugar solo con las manos.

## Visión por computadora

- **Seguimiento de manos** (MediaPipe Hand Landmarker): 21 puntos por mano, hasta 2 manos. El índice mueve el cursor; la distancia pulgar‑índice detecta la "pinza".
- **Malla facial** (MediaPipe Face Landmarker) y **pose del cuerpo** (MediaPipe Pose Landmarker): cada EPP correcto "vuela" desde la tarjeta hasta el jugador y queda puesto sobre él en la pantalla: casco o cofia en la cabeza, lentes en los ojos, protector auditivo en las orejas, respirador en la boca, chaleco en el torso, overol y arnés en el cuerpo, guantes y linterna en las manos y calzado en los pies (si se ven en cámara). Además, la lista de EPP colocados se muestra en el centro de la pantalla.
- Todo se procesa **localmente en el navegador**: el video no se envía ni se graba en ningún lado.
- Las librerías y modelos están incluidos en `vendor/`, así que el juego funciona **sin internet** una vez descargado.

Si no hay cámara, se puede jugar con mouse o pantalla táctil.

## Ejecutarlo

### Opción A: GitHub Pages (recomendado)
En el repositorio: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, rama `main`, carpeta `/ (root)`. Luego abre `https://<usuario>.github.io/EPPs-Game/` en Chrome o Edge y acepta el permiso de cámara.

### Opción B: en esta computadora, sin internet (laptop o kiosko)
1. Descarga el proyecto (botón **Code → Download ZIP** en GitHub, o `git clone`) y descomprímelo.
2. **Windows:** doble clic en **`Jugar.bat`**. Se abre una ventana negra (déjala abierta) y el juego en el navegador. No hace falta instalar nada.
3. **Mac / Linux:** ejecuta `./jugar.sh` (usa Python 3).
4. Acepta el permiso de cámara en el navegador (Chrome o Edge).

La cámara solo funciona en `https://` o en `localhost`, por eso no basta con abrir `index.html` con doble clic: los lanzadores levantan un pequeño servidor local en `http://localhost:8000`. Todo (librerías, modelos y sonidos) está dentro de la carpeta, así que después de descargarlo funciona sin internet.

### Consejos para el stand
- Pulsa **F** para pantalla completa, **M** para silenciar y **Esc** para volver al inicio.
- Si nadie juega por ~75 s, el juego vuelve solo a la pantalla de inicio.
- Usa buena iluminación frontal y evita tener una ventana detrás del jugador.
- Recomendado: Chrome/Edge actualizado, cámara 720p, televisor o proyector. Ubica la cámara arriba o debajo del televisor y al jugador a unos 2 m para que se vea de la cintura (o de los pies) hacia arriba.

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
Jugar.bat           Lanzador para Windows (doble clic)
jugar.sh            Lanzador para Mac/Linux
tools/servidor.ps1  Servidor local usado por Jugar.bat
css/styles.css      Estilos
js/game.js          Pantallas, niveles, temporizador y puntaje
js/vision.js        Cámara, seguimiento de manos/rostro y cursor por gestos
js/data.js          EPPs, áreas, misiones y niveles (editable)
js/audio.js         Efectos, música y voz
vendor/             MediaPipe Tasks Vision 0.10.14 y modelos de manos, rostro y pose (Apache 2.0)
```

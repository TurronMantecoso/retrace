# 📝 Lista de Ideas Pendientes para Retrace

Aquí recopilamos las ideas y posibles expansiones futuras para el entorno que aún no se han implementado, manteniendo siempre la estética retro/terminal y el motor AGS:

1. **Lockscreen custom (Lock/)**
   - En vez de depender de un `hyprlock` plano, crear una pantalla de bloqueo propia.
   - Implementar el mismo componente `CrtMask` al desbloquear la pantalla para que sea muy consistente con el resto del entorno.

2. **Session / Screenshot Tool Custom**
   - Actualmente usamos `grimblast` directamente desde los atajos. 
   - Idea: Crear una herramienta de captura de pantalla con interfaz propia que genere un "flash/glitch del CRT" visualmente en toda la pantalla al momento de tomar la foto.

3. **Cava / Visualizador de Audio**
   - Un visualizador de espectro musical estilo terminal (con barras ASCII). 
   - Es un clásico en los rices TUI (Terminal User Interface) y le quedaría perfecto al tema de Retrace.

4. **Wallpaper Picker / Switcher**
   - Un pequeño panel gráfico (widget) para visualizar, elegir y cambiar fondos de pantalla (con `swww` o `hyprpaper`) sin tener que salir a la terminal.

5. **Clipboard Manager UI**
   - Actualmente el historial del portapapeles usa `cliphist` enviado a `wofi`. 
   - Idea: Construir una interfaz propia en AGS con barra de búsqueda (estilo Applauncher) para gestionar y pegar desde el portapapeles.

6. **Emoji / Unicode Picker**
   - Un panel para buscar emojis.
   - Sería fácil reciclar la lógica de búsqueda difusa (fuzzy search) y el sistema de reciclaje de memoria (object pooling) que ya desarrollamos en el Applauncher.

7. **Media Player Widget (MPRIS)**
   - Un módulo dedicado para el control de reproducción multimedia (Spotify, mpv, navegadores).
   - Puede ir integrado en la barra o en el Dashboard, mostrando metadata (canción, artista, álbum) de la música actual.

8. **Workspace Overview / Expo**
   - Una vista tipo "misión control" que muestre todos los workspaces activos con miniaturas (thumbnails) en pantalla completa. 
   - Muy vistoso, útil para el flujo de trabajo y poco común en entornos AGS.

9. **System Monitor Standalone**
   - Un widget flotante invocable mediante un atajo.
   - Estilo `btop` pero construido con componentes visuales de AGS, separado del dashboard principal para un monitoreo mucho más profundo.

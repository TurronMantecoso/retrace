# Retrace (AGS / Astal Desktop Environment)

**Retrace** es un entorno de escritorio altamente estilizado, construido sobre **AGS (Aylur's GTK Shell) / Astal**. Cuenta con un diseño inspirado en la tecnología retro, terminales TUI, y pantallas de tubos de rayos catódicos (CRT), mezclado con un rendimiento extremadamente pulido y animaciones responsivas.

---

## 📂 Arquitectura y Rutas Principales

El proyecto se divide de manera modular. Cada carpeta tiene un propósito específico para mantener el código ordenado y escalable.

### ⚙️ Archivos Base

* **`app.ts`**: El núcleo de la aplicación. Es el punto de entrada principal. Se encarga de leer los monitores disponibles, inyectar el CSS, instanciar los widgets globales en pantalla y proveer el `requestHandler` que intercepta los comandos de la CLI (ej. `ags toggle applauncher`).
* **`style.css`**: Archivo de estilos maestro. Define la paleta de colores neón y retro (variables como `@purple-bright`, `@bg`, `@text`) e importa los estilos específicos de cada módulo.
* **`styles/`**: Directorio donde reside el CSS individual de cada widget (ej. `applauncher.css`, `powermenu.css`).
* **`package.json` / `tsconfig.json`**: Configuraciones de Node y TypeScript para el entorno AGS.

### 🧩 Widgets (`/widget/`)

La carpeta `widget/` contiene toda la interfaz gráfica, separada por componentes:

#### 1. Core de Animaciones
* **`widget/CrtMask.tsx`**: Uno de los archivos más importantes del proyecto. Contiene una subclase personalizada de GTK (`CrtClipper`) que dibuja sus hijos línea por línea simulando una televisión antigua encendiéndose. Este componente envuelve otros widgets para darles su icónica animación de entrada y salida de forma universal.

#### 2. Lanzador de Aplicaciones (`/widget/applauncher/`)
* **`appL.tsx` & `state.ts`**: Un buscador y lanzador de aplicaciones con estética de terminal. 
  * **Optimización Extrema:** Implementa un sistema de "Object Pooling" que recicla un máximo de 15 botones en memoria en lugar de crear/destruir widgets.
  * **Debouncing:** El campo de texto tiene un retraso inteligente de 60ms al escribir rápido para evitar tirones (stutters) de renderizado en GTK.
  * **Interactividad:** Utiliza la búsqueda difusa (Fuzzy Search) escrita en C mediante `AstalApps` e intercepta el cierre de ventanas de AGS para poder reproducir el efecto CRT antes de ocultarse.

#### 3. Menú de Energía (`/widget/PowerMenu/`)
* **`PowerMenu.tsx` & `state.ts`**: Un overlay de pantalla completa minimalista. Provee opciones de Logout, Suspend, Reboot, y Shutdown. Está envuelto en `CrtMask`, y su estado de visibilidad tiene un retraso intencional para permitir que el CRT se apague suavemente cuando el usuario presiona "Cancelar" o "Esc".

#### 4. Panel Principal (`/widget/Bar/`)
* La barra de estado superior o inferior. Muestra las áreas de trabajo (workspaces de Hyprland), el reloj, íconos de bandeja del sistema (systray) y botones para invocar al `Dashboard` o al `PowerMenu`.

#### 5. Centro de Control (`/widget/Dashboard/`)
* Un panel de acceso rápido para ajustes del sistema. Contiene utilidades tipo "Quick Toggles" (para prender/apagar servicios) y se apoya fuertemente en el estado reactivo (`system.ts`, `state.ts`) para mostrar porcentaje de CPU, RAM, etc.

#### 6. Gestor de Red (`/widget/NetManager/`)
* Interfaz para escanear, conectarse a redes Wi-Fi y dispositivos Bluetooth directamente desde el escritorio.

#### 7. Notificaciones (`/widget/Notifd/`)
* Escucha el demonio de notificaciones del sistema. Maneja tanto las alertas flotantes emergentes (Popups) como el historial almacenado en el Centro de Notificaciones.

#### 8. OSD - On Screen Display (`/widget/OSD/`)
* **`OSD.tsx`**: Indicadores visuales temporales que aparecen en pantalla al subir/bajar el volumen o cambiar el brillo del monitor.

---

## 🔄 ¿Cómo interactúa todo?

1. **Estado Reactivo (Signals):** En lugar de que los widgets se modifiquen mutuamente de forma directa, Retrace usa módulos `state.ts` en cada carpeta. Por ejemplo, al presionar un botón en la **Barra**, la barra simplemente llama a `setApplauncherOpen(true)`. 
2. **Reacción:** El archivo `appL.tsx`, que está "escuchando" ese estado, reacciona haciéndose visible y comenzando su animación de `CrtMask`.
3. **Control CLI (Hyprland):** Desde los atajos de teclado del gestor de ventanas (ej. `Super + R`), se envían señales nativas a la consola de AGS (`ags toggle applauncher`). El entorno detecta el cambio de visibilidad a nivel de la ventana de GTK, y gracias a ganchos en `notify::visible`, actualiza los estados de React en reversa para mantener las animaciones impecables.

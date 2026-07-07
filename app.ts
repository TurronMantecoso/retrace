import app from "ags/gtk4/app"
import Gdk from "gi://Gdk?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib"
import Bar from "./widget/Bar/Bar"
import NotificationPopups from "./widget/Notifd/NotiPop"
import NotifCenter from "./widget/Notifd/NotifCenter"
import Applauncher from "./widget/applauncher/appL"
import OSD from "./widget/OSD/OSD"
import PowerMenu from "./widget/PowerMenu/PowerMenu"
import Dashboard from "./widget/Dashboard/Dashboard"
import NetManager from "./widget/NetManager/NetManager"

///////////////////////////////////////////
//////////////////CONFIG///////////////////
///////////////////////////////////////////

const CONFIG = {
  barOnAllMonitors: true, // false = solo el monitor principal
}

///////////////////////////////////////////
////////////////BREATHE////////////////////
///////////////////////////////////////////

function startBreatheSync() {
  let bright = false

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
    bright = !bright

    Gtk.Window.list_toplevels().forEach((win) => {
      const ctx = win.get_style_context()
      ctx.remove_class(bright ? "breathe-dim" : "breathe-bright")
      ctx.add_class(bright ? "breathe-bright" : "breathe-dim")
    })

    return GLib.SOURCE_CONTINUE
  })
}

///////////////////////////////////////////
///////////////////APP/////////////////////
///////////////////////////////////////////

app.start({
  css: "./style.css",
  main() {
    const monitors = app.get_monitors()
    const targets = CONFIG.barOnAllMonitors ? monitors : [monitors[0]]

    targets.forEach((monitor: Gdk.Monitor) => {
      Bar({ gdkmonitor: monitor })
    })

    // NotifCenter solo en el monitor principal
    NotifCenter({ gdkmonitor: monitors[0] })
    NotificationPopups()
    Applauncher()
    OSD()
    
    // Instanciar PowerMenu en todos los monitores.
    // Solo el principal (i === 0) tendrá los botones, el resto solo tendrá el fondo oscuro.
    monitors.forEach((monitor: Gdk.Monitor, i: number) => {
      PowerMenu({ gdkmonitor: monitor })
    })

    Dashboard()
    NetManager()
    startBreatheSync()
  },
})

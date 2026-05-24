import app from "ags/gtk4/app"
import Gdk from "gi://Gdk?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib"
import Bar from "./widget/Bar"
import NotificationPopups from "./widget/NotiPop"

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

app.start({
  css: "./style.css",
  main() {
    app.get_monitors().forEach((monitor: Gdk.Monitor) => {
      Bar({ gdkmonitor: monitor })
    })
    NotificationPopups()
    startBreatheSync()
  },
})

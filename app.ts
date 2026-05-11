import app from "ags/gtk4/app"
import Gdk from "gi://Gdk?version=4.0"
import Bar from "./widget/Bar"

app.start({
  css: "./style.css",
  main() {
    app.get_monitors().forEach((monitor: Gdk.Monitor) => {
      Bar({ gdkmonitor: monitor })
    })
  },
})

import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { cpuPercent, ramInfo, diskInfo, uptime, ipAddress, startSystemMonitor } from "./system"

function drawProgressBar(percent: number, length: number = 15) {
  const filled = Math.round(percent * length)
  let bar = ""
  for (let i = 0; i < length; i++) {
    bar += i < filled ? "■" : "-"
  }
  return `[${bar}]`
}

// Iniciar el motor de recolección de datos
startSystemMonitor()

export default function Dashboard() {
  return (
    <window
      name="dashboard"
      application={app}
      visible={false} // Se abre con `astal -t dashboard`
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      margin_top={12}
      margin_right={12}
      keymode={Astal.Keymode.ON_DEMAND} // Captura Escape para cerrar
      $={(self) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            self.set_visible(false)
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <box class="dashboard-container" orientation={Gtk.Orientation.VERTICAL} spacing={16}>
        <label class="dashboard-title" label="> SYSTEM_MONITOR_" halign={Gtk.Align.START} />

        {/* CPU */}
        <box class="dashboard-item" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="dashboard-label" label="> CPU_LOAD_" halign={Gtk.Align.START} />
          <box spacing={8}>
            <label class="dashboard-bar cpu-bar" label={cpuPercent((p) => drawProgressBar(p))} />
            <label class="dashboard-value" label={cpuPercent((p) => `${Math.round(p * 100)}%`)} halign={Gtk.Align.END} hexpand />
          </box>
        </box>

        {/* RAM */}
        <box class="dashboard-item" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="dashboard-label" label="> MEMORY_ALLOCATION_" halign={Gtk.Align.START} />
          <box spacing={8}>
            <label class="dashboard-bar ram-bar" label={ramInfo((info) => drawProgressBar(info.used / info.total))} />
            <label class="dashboard-value" label={ramInfo((info) => `${Math.round(info.used)} MB`)} halign={Gtk.Align.END} hexpand />
          </box>
        </box>

        {/* DISCO */}
        <box class="dashboard-item" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="dashboard-label" label="> ROOT_FS_USAGE_" halign={Gtk.Align.START} />
          <box spacing={8}>
            <label class="dashboard-bar disk-bar" label={diskInfo((info) => drawProgressBar(info.percent))} />
            <label class="dashboard-value" label={diskInfo((info) => `${info.used}/${info.total}`)} halign={Gtk.Align.END} hexpand />
          </box>
        </box>

        <box class="dashboard-separator" />

        {/* INFO EXTRA */}
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          <box>
            <label class="dashboard-info-key" label="UPTIME: " />
            <label class="dashboard-info-val" label={uptime((v) => v)} />
          </box>
          <box>
            <label class="dashboard-info-key" label="IP_ADDR: " />
            <label class="dashboard-info-val" label={ipAddress((v) => v)} />
          </box>
        </box>
      </box>
    </window>
  )
}

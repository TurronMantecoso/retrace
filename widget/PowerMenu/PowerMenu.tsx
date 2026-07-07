import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding } from "ags"
import { execAsync } from "ags/process"
import { powerMenuOpen, setPowerMenuOpen, activePowerMonitor } from "./state"
import app from "ags/gtk4/app"

function PowerButton({ label, cmd, isCritical = false }: { label: string, cmd: string, isCritical?: boolean }) {
  return (
    <button
      class={`powermenu-btn ${isCritical ? "critical" : ""}`}
      onClicked={() => {
        setPowerMenuOpen(false)
        execAsync(cmd).catch(() => {})
      }}
    >
      <label label={`[ ${label} ]`} />
    </button>
  )
}

export default function PowerMenu({ gdkmonitor }: { gdkmonitor?: Gdk.Monitor }) {
  const monitors = createBinding(app, "monitors")

  return (
    <window
      gdkmonitor={gdkmonitor}
      name={`powermenu-${gdkmonitor?.get_connector() || "default"}`}
      application={app}
      visible={powerMenuOpen((v) => v)}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      $={(self) => {
        // Evento de teclado para cerrar con Escape
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            setPowerMenuOpen(false)
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <box class="powermenu-bg" hexpand vexpand halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}>
        <box 
          visible={activePowerMonitor((mon) => mon === (gdkmonitor?.get_connector() || ""))}
          class="powermenu-container" 
          halign={Gtk.Align.CENTER} 
          valign={Gtk.Align.CENTER}
          hexpand
          vexpand
          orientation={Gtk.Orientation.VERTICAL}
          spacing={32}
        >
          <label class="powermenu-title" label="> SELECT_POWER_ACTION_" />
          
          <box class="powermenu-actions" spacing={24} orientation={Gtk.Orientation.HORIZONTAL}>
            <PowerButton label="LOGOUT" cmd="hyprctl dispatch exit" />
            <PowerButton label="SUSPEND" cmd="systemctl suspend" />
            <PowerButton label="REBOOT" cmd="systemctl reboot" />
            <PowerButton label="SHUTDOWN" cmd="systemctl poweroff" isCritical={true} />
          </box>
          
          <button 
            class="powermenu-cancel"
            onClicked={() => setPowerMenuOpen(false)}
          >
            <label label="[ CANCEL ]" />
          </button>
        </box>
      </box>
    </window>
  )
}

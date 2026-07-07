import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { cpuPercent, ramInfo, diskInfo, uptime, ipAddress, startSystemMonitor } from "./system"
import GLib from "gi://GLib"
import { dashboardOpen, setDashboardOpen } from "./state"
import { createEffect } from "ags"
import CrtMask from "../CrtMask"
import QuickToggles from "./QuickToggles"
import Media from "./Media"
import Sliders from "./Sliders"
import Notifications from "./Notifications"

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
  let win: Astal.Window

  createEffect(() => {
    if (!win) return
    if (dashboardOpen()) {
      win.set_visible(true)
    } else {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
        if (!dashboardOpen()) win.set_visible(false)
        return GLib.SOURCE_REMOVE
      })
    }
  })

  return (
    <window
      name="dashboard"
      application={app}
      visible={false}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT | Astal.WindowAnchor.BOTTOM}
      margin_top={12}
      margin_right={12}
      margin_bottom={12}
      keymode={Astal.Keymode.ON_DEMAND}
      $={(self) => {
        win = self
        self.connect("notify::visible", () => {
          if (self.visible && !dashboardOpen()) {
            setDashboardOpen(true)
          }
        })
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            setDashboardOpen(false)
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <CrtMask openState={dashboardOpen} durationMs={800}>
        <box class="dashboard-bg">
          <scrolledwindow 
            hscrollbarPolicy={Gtk.PolicyType.NEVER} 
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} 
            vexpand={true}
          >
            <box class="dashboard-container" orientation={Gtk.Orientation.VERTICAL} spacing={16} widthRequest={380}>
              <label class="dashboard-title" label="> CONTROL_CENTER_" halign={Gtk.Align.START} />

              {/* Toggles */}
              <QuickToggles />

              {/* Media & Sliders */}
              <box orientation={Gtk.Orientation.VERTICAL} spacing={16} class="dashboard-media-sliders-box">
                <Media />
                <Sliders />
              </box>
              
              <box class="dashboard-separator" />

              {/* Notifications */}
              <Notifications />

              <box class="dashboard-separator" />

              {/* System Monitor (Heredado) */}
              <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <label class="dashboard-label" label="> SYSTEM_DIAGNOSTICS_" halign={Gtk.Align.START} />
                
                {/* CPU */}
                <box class="dashboard-item" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                  <box spacing={8}>
                    <label class="dashboard-label-small" label="CPU" />
                    <label class="dashboard-bar cpu-bar" label={cpuPercent((p) => drawProgressBar(p, 10))} hexpand />
                    <label class="dashboard-value" label={cpuPercent((p) => `${Math.round(p * 100)}%`)} halign={Gtk.Align.END} />
                  </box>
                </box>

                {/* RAM */}
                <box class="dashboard-item" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                  <box spacing={8}>
                    <label class="dashboard-label-small" label="RAM" />
                    <label class="dashboard-bar ram-bar" label={ramInfo((info) => drawProgressBar(info.used / info.total, 10))} hexpand />
                    <label class="dashboard-value" label={ramInfo((info) => `${Math.round(info.used)} MB`)} halign={Gtk.Align.END} />
                  </box>
                </box>

                {/* DISCO */}
                <box class="dashboard-item" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                  <box spacing={8}>
                    <label class="dashboard-label-small" label="DSK" />
                    <label class="dashboard-bar disk-bar" label={diskInfo((info) => drawProgressBar(info.percent, 10))} hexpand />
                    <label class="dashboard-value" label={diskInfo((info) => `${info.used}/${info.total}`)} halign={Gtk.Align.END} />
                  </box>
                </box>

                {/* INFO EXTRA */}
                <box spacing={16}>
                  <box>
                    <label class="dashboard-info-key" label="UPT: " />
                    <label class="dashboard-info-val" label={uptime((v) => v)} />
                  </box>
                  <box>
                    <label class="dashboard-info-key" label="IP: " />
                    <label class="dashboard-info-val" label={ipAddress((v) => v)} />
                  </box>
                </box>
              </box>

            </box>
          </scrolledwindow>
        </box>
      </CrtMask>
    </window>
  )
}

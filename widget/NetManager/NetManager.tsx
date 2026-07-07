import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, For, createState } from "ags"
import app from "ags/gtk4/app"
import Network from "gi://AstalNetwork"
import Bluetooth from "gi://AstalBluetooth"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"
import { netmanagerOpen, setNetmanagerOpen } from "./state"
import { createEffect } from "ags"
import CrtMask from "../CrtMask"

// === COMPONENTES DE WIFI ===
function WifiAP({ ap, isCurrent }: { ap: Network.AccessPoint, isCurrent: boolean }) {
  const [showPassword, setShowPassword] = createState(false)
  let passwordText = ""

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <button 
        class={`net-list-item ${isCurrent ? "active" : ""}`}
        onClicked={() => {
          if (isCurrent) return
          if (ap.requires_password) {
            setShowPassword(!showPassword.get())
          } else {
            execAsync(["nmcli", "dev", "wifi", "connect", ap.ssid || ""]).catch(() => {})
          }
        }}
      >
        <box spacing={12}>
          <image class="net-icon" iconName={ap.icon_name} pixelSize={16} />
          <label class="net-ssid" label={ap.ssid || "Hidden"} hexpand halign={Gtk.Align.START} />
          {isCurrent ? (
            <label class="net-active-indicator" label="[ CONNECTED ]" />
          ) : (
            <label class="net-strength" label={`${ap.strength}%`} />
          )}
        </box>
      </button>

      <box visible={showPassword((v) => v)} class="net-password-box" spacing={8}>
        <label label="> PASS_" class="prompt-icon" />
        <entry 
          hexpand 
          visibility={false}
          placeholderText="clave_wifi"
          onChanged={(self) => passwordText = self.text}
          onActivate={() => {
            execAsync(["nmcli", "dev", "wifi", "connect", ap.ssid || "", "password", passwordText])
              .then(() => setShowPassword(false))
              .catch(err => console.error(err))
          }}
        />
        <button 
          class="net-btn"
          onClicked={() => {
            execAsync(["nmcli", "dev", "wifi", "connect", ap.ssid || "", "password", passwordText])
              .then(() => setShowPassword(false))
              .catch(err => console.error(err))
          }}
        >
          <label label="[ OK ]" />
        </button>
      </box>
    </box>
  )
}

function NetworkPanel() {
  const nw = Network.get_default()
  if (!nw) {
    return (
      <box class="net-panel" hexpand orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <label class="net-title" label="> NETWORK_LINK_" halign={Gtk.Align.START} />
        <label label="[ NO NETWORK MODULE ]" class="net-disabled-text" vexpand />
      </box>
    )
  }

  const wifi = nw.wifi
  const wired = nw.wired
  const primary = createBinding(nw, "primary")

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={12} class="net-panel" hexpand>
      <box spacing={12} valign={Gtk.Align.CENTER}>
        <label class="net-title" label="> NETWORK_LINK_" hexpand halign={Gtk.Align.START} />
        {wifi ? (
          <button 
            class="net-toggle-btn" 
            onClicked={() => execAsync(["nmcli", "radio", "wifi", wifi.enabled ? "off" : "on"]).catch(()=>{})}
          >
            <label label={createBinding(wifi, "enabled").as(e => e ? "[ WIFI ON ]" : "[ WIFI OFF ]")} />
          </button>
        ) : (
          <button class="net-toggle-btn" sensitive={false}>
            <label label="[ NO WIFI ]" />
          </button>
        )}
      </box>

      <scrolledwindow 
        vexpand 
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          {/* ETHERNET ITEM */}
          {wired && (
            <box visible={createBinding(wired, "internet").as(i => i === Network.Internet.CONNECTED)}>
              <button class="net-list-item active">
                <box spacing={12}>
                  <image class="net-icon" iconName="network-computer-symbolic" pixelSize={16} />
                  <label class="net-ssid" label="Ethernet (Wired)" hexpand halign={Gtk.Align.START} />
                  <label class="net-active-indicator" label="[ CONNECTED ]" />
                </box>
              </button>
            </box>
          )}

          {/* WIFI ITEMS */}
          {wifi && (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
              <label visible={createBinding(wifi, "enabled").as(e => !e)} label="[ WIFI DISABLED ]" class="net-disabled-text" />
              <For 
                each={createBinding(wifi, "accessPoints").as(arr => {
                  const unique = new Map<string, Network.AccessPoint>()
                  for (const ap of arr) {
                    if (ap.ssid && !unique.has(ap.ssid)) unique.set(ap.ssid, ap)
                    else if (ap.ssid && unique.has(ap.ssid) && ap.strength > unique.get(ap.ssid)!.strength) {
                      unique.set(ap.ssid, ap)
                    }
                  }
                  return Array.from(unique.values()).sort((a,b) => b.strength - a.strength)
                })}
              >
                {(ap: Network.AccessPoint) => (
                  <WifiAP ap={ap} isCurrent={wifi.ssid === ap.ssid} />
                )}
              </For>
            </box>
          )}

          {!wifi && !wired && (
            <label label="[ NO INTERFACES ]" class="net-disabled-text" />
          )}
        </box>
      </scrolledwindow>
    </box>
  )
}

// === COMPONENTES DE BLUETOOTH ===
function BTDevice({ dev }: { dev: Bluetooth.Device }) {
  const connected = createBinding(dev, "connected")
  return (
    <button 
      class={connected.as(c => `net-list-item ${c ? "active" : ""}`)}
      onClicked={() => {
        if (dev.connected) dev.disconnect_device(() => {})
        else dev.connect_device(() => {})
      }}
    >
      <box spacing={12}>
        <image class="net-icon" iconName={createBinding(dev, "icon").as(i => i || "bluetooth-active-symbolic")} pixelSize={16} />
        <label class="net-ssid" label={createBinding(dev, "name")} hexpand halign={Gtk.Align.START} ellipsize={3} />
        <label visible={connected} class="net-active-indicator" label="[ CONNECTED ]" />
      </box>
    </button>
  )
}

function BTPanel() {
  const bt = Bluetooth.get_default()
  if (!bt) {
    return (
      <box class="net-panel" hexpand orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <label class="net-title" label="> BT_SCAN_" halign={Gtk.Align.START} />
        <label label="[ BT HARDWARE NOT FOUND ]" class="net-disabled-text" vexpand />
      </box>
    )
  }

  const isPowered = createBinding(bt, "isPowered")
  const devices = createBinding(bt, "devices")

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={12} class="net-panel" hexpand>
      <box spacing={12} valign={Gtk.Align.CENTER}>
        <label class="net-title" label="> BT_SCAN_" hexpand halign={Gtk.Align.START} />
        <button 
          class="net-toggle-btn" 
          onClicked={() => execAsync(["bluetoothctl", "power", bt.isPowered ? "off" : "on"]).catch(()=>{})}
        >
          <label label={isPowered.as(p => p ? "[ ON ]" : "[ OFF ]")} />
        </button>
      </box>

      <scrolledwindow 
        vexpand 
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label visible={isPowered.as(p => !p)} label="[ BT DISABLED ]" class="net-disabled-text" />
          <For 
            each={devices.as(arr => arr.filter(d => d.name).sort((a,b) => {
              if (a.connected !== b.connected) return a.connected ? -1 : 1
              return (a.name || "").localeCompare(b.name || "")
            }))}
          >
            {(dev: Bluetooth.Device) => (
              <BTDevice dev={dev} />
            )}
          </For>
        </box>
      </scrolledwindow>
    </box>
  )
}

export default function NetManager() {
  let win: Astal.Window

  createEffect(() => {
    if (!win) return
    if (netmanagerOpen()) {
      win.set_visible(true)
    } else {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
        if (!netmanagerOpen()) win.set_visible(false)
        return GLib.SOURCE_REMOVE
      })
    }
  })

  return (
    <window
      name="netmanager"
      application={app}
      visible={false}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.NONE} // Centrado
      keymode={Astal.Keymode.EXCLUSIVE}
      $={(self) => {
        win = self
        self.connect("notify::visible", () => {
          if (self.visible && !netmanagerOpen()) {
            setNetmanagerOpen(true)
          }
        })
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            setNetmanagerOpen(false)
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)
      }}
    >
      <CrtMask openState={netmanagerOpen} durationMs={800}>
        <box class="netmanager-bg" hexpand vexpand halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}>
          <box class="netmanager-container" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} hexpand vexpand>
            <box homogeneous={true} hexpand>
              <box class="net-panel-left">
                <NetworkPanel />
              </box>
              <box class="net-panel-right">
                <BTPanel />
              </box>
            </box>
          </box>
        </box>
      </CrtMask>
    </window>
  )
}

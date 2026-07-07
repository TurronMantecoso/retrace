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
function WifiAP({ ap, wifi }: { ap: Network.AccessPoint, wifi: Network.Wifi }) {
  const [expanded, setExpanded] = createState(false)
  const [isConnecting, setIsConnecting] = createState(false)
  const isCurrent = createBinding(wifi, "ssid").as(ssid => ssid === ap.ssid)
  let passwordText = ""

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <button 
        class={isCurrent.as(curr => `net-list-item ${curr ? "active" : ""}`)}
        onClicked={() => setExpanded(!expanded.get())}
      >
        <box spacing={12}>
          <image class="net-icon" iconName={ap.icon_name} pixelSize={16} />
          <label class="net-ssid" label={`[ WIFI ] ${ap.ssid || "Hidden"}`} hexpand halign={Gtk.Align.START} />
          <box>
            <label class="net-active-indicator" label="[ CONNECTED ]" visible={isCurrent} />
            <label class="net-active-indicator" label="[ CONNECTING... ]" visible={isConnecting((v) => v)} />
            <label class="net-strength" label={`${ap.strength}%`} visible={isCurrent.as(c => !c && !isConnecting.get())} />
          </box>
        </box>
      </button>

      <revealer revealChild={expanded((e) => e)} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
        <box class="net-details-box" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          <label label={`> DETALLES: ${ap.ssid || "Hidden"}`} class="net-title" halign={Gtk.Align.START} />
          
          <box visible={isCurrent.as(c => !c && ap.requires_password)} spacing={8} class="net-password-box">
            <label label="> PASS_" class="prompt-icon" />
            <entry 
              hexpand 
              visibility={false}
              placeholderText="clave_wifi"
              sensitive={isConnecting((v) => !v)}
              onChanged={(self) => passwordText = self.text}
              onActivate={() => {
                setIsConnecting(true)
                execAsync(["nmcli", "--wait", "15", "dev", "wifi", "connect", ap.ssid || "", "password", passwordText])
                  .then(() => setIsConnecting(false))
                  .catch(err => {
                    setIsConnecting(false)
                    execAsync(["notify-send", "-u", "normal", "WiFi", `Falló la conexión: ${err}`]).catch(()=>{})
                  })
              }}
            />
          </box>

          <box spacing={12} orientation={Gtk.Orientation.HORIZONTAL}>
            <button class="net-btn" sensitive={isConnecting((v) => !v)} onClicked={() => {
              setIsConnecting(true)
              const cmd = ap.requires_password && passwordText.length > 0
                ? ["nmcli", "--wait", "15", "dev", "wifi", "connect", ap.ssid || "", "password", passwordText]
                : ["nmcli", "--wait", "15", "dev", "wifi", "connect", ap.ssid || ""]
              
              execAsync(cmd)
                .then(() => setIsConnecting(false))
                .catch(err => {
                  setIsConnecting(false)
                  execAsync(["notify-send", "-u", "normal", "WiFi", `Falló la conexión: ${err}`]).catch(()=>{})
                })
            }}>
              <label label="[ CONECTAR ]" />
            </button>
            
            <button class="net-btn" sensitive={isCurrent} onClicked={() => {
              execAsync(["nmcli", "connection", "down", "id", ap.ssid || ""]).catch(()=>{})
            }}>
              <label label="[ DESCONECTAR ]" />
            </button>
          </box>
        </box>
      </revealer>
    </box>
  )
}

function BTDevice({ dev }: { dev: Bluetooth.Device }) {
  const [expanded, setExpanded] = createState(false)
  const connected = createBinding(dev, "connected")

  return (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <button 
        class={connected.as(c => `net-list-item ${c ? "active" : ""}`)}
        onClicked={() => setExpanded(!expanded.get())}
      >
        <box spacing={12}>
          <image class="net-icon" iconName={createBinding(dev, "icon").as(i => i || "bluetooth-active-symbolic")} pixelSize={16} />
          <label class="net-ssid" label={createBinding(dev, "name").as(n => `[ BT ] ${n}`)} hexpand halign={Gtk.Align.START} ellipsize={3} />
          <label visible={connected} class="net-active-indicator" label="[ CONNECTED ]" />
        </box>
      </button>

      <revealer revealChild={expanded((e) => e)} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
        <box class="net-details-box" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          <label label={createBinding(dev, "name").as(n => `> DETALLES: ${n}`)} class="net-title" halign={Gtk.Align.START} />
          
          <box spacing={12} orientation={Gtk.Orientation.HORIZONTAL}>
            <button class="net-btn" sensitive={connected.as(c => !c)} onClicked={() => dev.connect_device(() => {})}>
              <label label="[ CONECTAR ]" />
            </button>
            <button class="net-btn" sensitive={connected} onClicked={() => dev.disconnect_device(() => {})}>
              <label label="[ DESCONECTAR ]" />
            </button>
            <button class="net-btn critical" onClicked={() => execAsync(["bluetoothctl", "remove", dev.address]).catch(()=>{})}>
              <label label="[ OLVIDAR ]" />
            </button>
          </box>
        </box>
      </revealer>
    </box>
  )
}

export default function NetManager() {
  let win: Astal.Window
  const [expandedSection, setExpandedSection] = createState<"none" | "wifi" | "bt">("none")

  createEffect(() => {
    if (!win) return
    if (netmanagerOpen()) {
      win.set_visible(true)
    } else {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
        if (!netmanagerOpen()) {
          win.set_visible(false)
          setExpandedSection("none")
        }
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
      anchor={Astal.WindowAnchor.NONE}
      keymode={Astal.Keymode.EXCLUSIVE}
      $={(self) => {
        win = self
        self.connect("notify::visible", () => {
          if (self.visible && !netmanagerOpen()) setNetmanagerOpen(true)
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
            <box orientation={Gtk.Orientation.VERTICAL} spacing={24} hexpand>
              <label class="net-title" label="> COMMUNICATIONS_HUB_" halign={Gtk.Align.START} />
              
              <box spacing={16} homogeneous={true} hexpand>
                {/* WIFI QUICK TOGGLE */}
                {(() => {
                  const nw = Network.get_default()
                  if (!nw || !nw.wifi) return <box class="quick-toggle-container" hexpand><label label="[ NO WIFI ]" /></box>
                  const wifi = nw.wifi
                  return (
                    <box class="quick-toggle-container" orientation={Gtk.Orientation.HORIZONTAL} hexpand>
                        <button 
                          class={createBinding(wifi, "enabled").as(e => `quick-toggle-main ${e ? "active" : ""}`)}
                          onClicked={() => execAsync(["nmcli", "radio", "wifi", wifi.enabled ? "off" : "on"]).catch(()=>{})}
                          hexpand
                        >
                          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.START}>
                            <image iconName="network-wireless-symbolic" pixelSize={24} />
                            <box orientation={Gtk.Orientation.VERTICAL}>
                              <label label="Wi-Fi" class="quick-toggle-title" halign={Gtk.Align.START} />
                              <label label={createBinding(wifi, "ssid").as(s => s || (wifi.enabled ? "Desconectado" : "Apagado"))} class="quick-toggle-subtitle" halign={Gtk.Align.START} ellipsize={3} />
                            </box>
                          </box>
                        </button>
                        <button 
                          class={expandedSection((s) => `quick-toggle-expand ${s === "wifi" ? "expanded" : ""}`)}
                          onClicked={() => setExpandedSection(expandedSection.get() === "wifi" ? "none" : "wifi")}
                        >
                          <image iconName={expandedSection((s) => s === "wifi" ? "pan-up-symbolic" : "pan-down-symbolic")} pixelSize={16} />
                        </button>
                        </box>
                    )
                  })()}

                {/* BT QUICK TOGGLE */}
                {(() => {
                  const bt = Bluetooth.get_default()
                  if (!bt) return <box class="quick-toggle-container" hexpand><label label="[ NO BT ]" /></box>
                  return (
                    <box class="quick-toggle-container" orientation={Gtk.Orientation.HORIZONTAL} hexpand>
                        <button 
                          class={createBinding(bt, "isPowered").as(e => `quick-toggle-main ${e ? "active" : ""}`)}
                          onClicked={() => execAsync(["bluetoothctl", "power", bt.isPowered ? "off" : "on"]).catch(()=>{})}
                          hexpand
                        >
                          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.START}>
                            <image iconName="bluetooth-active-symbolic" pixelSize={24} />
                            <box orientation={Gtk.Orientation.VERTICAL}>
                              <label label="Bluetooth" class="quick-toggle-title" halign={Gtk.Align.START} />
                              <label label={createBinding(bt, "isPowered").as(e => e ? "Activado" : "Apagado")} class="quick-toggle-subtitle" halign={Gtk.Align.START} ellipsize={3} />
                            </box>
                          </box>
                        </button>
                        <button 
                          class={expandedSection((s) => `quick-toggle-expand ${s === "bt" ? "expanded" : ""}`)}
                          onClicked={() => setExpandedSection(expandedSection.get() === "bt" ? "none" : "bt")}
                        >
                          <image iconName={expandedSection((s) => s === "bt" ? "pan-up-symbolic" : "pan-down-symbolic")} pixelSize={16} />
                        </button>
                        </box>
                    )
                  })()}
              </box>

              <box class="netmanager-separator" hexpand vexpand={false} css="min-height: 2px;" />

              {/* WIFI LIST (REVEALER) */}
              <revealer revealChild={expandedSection((s) => s === "wifi")} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                <scrolledwindow hexpand hscrollbarPolicy={Gtk.PolicyType.NEVER} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} min_content_height={200} max_content_height={350}>
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    {(() => {
                      const nw = Network.get_default()
                      if (!nw) return <box />
                      const { wired, wifi } = nw
                      return (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                          {wired && (
                            <box visible={createBinding(wired, "internet").as(i => i === Network.Internet.CONNECTED)}>
                              <button class="net-list-item active" sensitive={false}>
                                <box spacing={12}>
                                  <image class="net-icon" iconName="network-computer-symbolic" pixelSize={16} />
                                  <label class="net-ssid" label="[ ETH ] Ethernet (Wired)" hexpand halign={Gtk.Align.START} />
                                  <label class="net-active-indicator" label="[ CONNECTED ]" />
                                </box>
                              </button>
                            </box>
                          )}
                          {wifi && (
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                              <label visible={createBinding(wifi, "enabled").as(e => !e)} label="[ WIFI DISABLED ]" class="net-disabled-text" />
                              <For 
                                each={createBinding(wifi, "accessPoints").as(arr => {
                                  const unique = new Map<string, Network.AccessPoint>()
                                  for (const ap of arr) {
                                    if (ap.ssid && !unique.has(ap.ssid)) unique.set(ap.ssid, ap)
                                    else if (ap.ssid && unique.has(ap.ssid) && ap.strength > unique.get(ap.ssid)!.strength) unique.set(ap.ssid, ap)
                                  }
                                  return Array.from(unique.values()).sort((a,b) => b.strength - a.strength)
                                })}
                              >
                                {(ap: Network.AccessPoint) => <WifiAP ap={ap} wifi={wifi} />}
                              </For>
                            </box>
                          )}
                        </box>
                      )
                    })()}
                  </box>
                </scrolledwindow>
              </revealer>

              {/* BT LIST (REVEALER) */}
              <revealer revealChild={expandedSection((s) => s === "bt")} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                <scrolledwindow hexpand hscrollbarPolicy={Gtk.PolicyType.NEVER} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} min_content_height={200} max_content_height={350}>
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    {(() => {
                      const bt = Bluetooth.get_default()
                      if (!bt) return <box />
                      const devices = createBinding(bt, "devices")
                      const isPowered = createBinding(bt, "isPowered")
                      return (
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                          <label visible={isPowered.as(p => !p)} label="[ BT DISABLED ]" class="net-disabled-text" />
                          <For 
                            each={devices.as(arr => arr.filter(d => d.name).sort((a,b) => {
                              if (a.connected !== b.connected) return a.connected ? -1 : 1
                              return (a.name || "").localeCompare(b.name || "")
                            }))}
                          >
                            {(dev: Bluetooth.Device) => <BTDevice dev={dev} />}
                          </For>
                        </box>
                      )
                    })()}
                  </box>
                </scrolledwindow>
              </revealer>

            </box>
          </box>
        </box>
      </CrtMask>
    </window>
  )
}

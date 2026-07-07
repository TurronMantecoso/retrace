import { Gtk } from "ags/gtk4"
import { createBinding, For, createState } from "ags"
import Network from "gi://AstalNetwork"
import Bluetooth from "gi://AstalBluetooth"
import { execAsync } from "ags/process"
import AstalWp from "gi://AstalWp"

function AudioToggle({ endpoint, type }: { endpoint: AstalWp.Endpoint, type: "mic" | "speaker" }) {
  const isMuted = createBinding(endpoint, "mute")
  const title = type === "mic" ? "> MIC_INPUT" : "> SPK_OUT"

  return (
    <box class="quick-toggle-container" orientation={Gtk.Orientation.HORIZONTAL} hexpand>
      <button 
        class={isMuted.as(m => `quick-toggle-main retro-btn ${m ? "active" : ""}`)}
        onClicked={() => { endpoint.mute = !endpoint.mute }}
        hexpand
      >
        <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.START}>
          <image 
            iconName={isMuted.as(m => {
              if (type === "mic") return m ? "microphone-sensitivity-muted-symbolic" : "audio-input-microphone-symbolic"
              return m ? "audio-volume-muted-symbolic" : "audio-volume-high-symbolic"
            })} 
            pixelSize={24} 
          />
          <box orientation={Gtk.Orientation.VERTICAL}>
            <label label={title} class="quick-toggle-title" halign={Gtk.Align.START} />
            <label label={isMuted.as(m => m ? "[ MUTED ]" : "[ ACTIVE ]")} class="quick-toggle-subtitle" halign={Gtk.Align.START} />
          </box>
        </box>
      </button>
    </box>
  )
}

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

export default function QuickToggles() {
  const [expandedSection, setExpandedSection] = createState<"none" | "wifi" | "bt">("none")

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={8} hexpand>
      {/* ROW 1: WIFI & BT */}
      <box spacing={16} homogeneous={true} hexpand>
        {/* NETWORK QUICK TOGGLE */}
        {(() => {
          const nw = Network.get_default()
          if (!nw) return <box class="quick-toggle-container" hexpand><label label="[ NO NETWORK ]" /></box>
          
          return (
            <box hexpand>
              {/* NO NETWORK FALLBACK */}
              <box 
                class="quick-toggle-container" 
                hexpand 
                visible={createBinding(nw, "primary").as(p => p === Network.Primary.UNKNOWN)}
              >
                <label label="[ NO NETWORK ]" />
              </box>

              {/* WIRED TILE */}
              <For each={createBinding(nw, "wired").as(w => w ? [w] : [])}>
                {(wired) => (
                  <box 
                    class="quick-toggle-container" 
                    orientation={Gtk.Orientation.HORIZONTAL} 
                    hexpand
                    visible={createBinding(nw, "primary").as(p => p === Network.Primary.WIRED)}
                  >
                    <button class="quick-toggle-main retro-btn active" hexpand>
                      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.START}>
                        <image iconName="network-wired-symbolic" pixelSize={24} />
                        <box orientation={Gtk.Orientation.VERTICAL}>
                          <label label="> NET_ETH" class="quick-toggle-title" halign={Gtk.Align.START} />
                          <label label="[ LINKED ]" class="quick-toggle-subtitle" halign={Gtk.Align.START} />
                        </box>
                      </box>
                    </button>
                  </box>
                )}
              </For>

              {/* WIFI TILE */}
              <For each={createBinding(nw, "wifi").as(w => w ? [w] : [])}>
                {(wifi) => (
                  <box 
                    class="quick-toggle-container" 
                    orientation={Gtk.Orientation.HORIZONTAL} 
                    hexpand
                    visible={createBinding(nw, "primary").as(p => p !== Network.Primary.WIRED)}
                  >
                    <button 
                      class={createBinding(wifi, "enabled").as(e => `quick-toggle-main retro-btn ${e ? "active" : ""}`)}
                      onClicked={() => execAsync(["nmcli", "radio", "wifi", wifi.enabled ? "off" : "on"]).catch(()=>{})}
                      hexpand
                    >
                      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.START}>
                        <image iconName="network-wireless-symbolic" pixelSize={24} />
                        <box orientation={Gtk.Orientation.VERTICAL}>
                          <label label="> NET_WIFI" class="quick-toggle-title" halign={Gtk.Align.START} />
                          <label label={createBinding(wifi, "ssid").as(s => s ? `[ ${s} ]` : (wifi.enabled ? "[ NO_CONN ]" : "[ OFF ]"))} class="quick-toggle-subtitle" halign={Gtk.Align.START} ellipsize={3} />
                        </box>
                      </box>
                    </button>
                    <button 
                      class={expandedSection((s) => `quick-toggle-expand retro-btn ${s === "wifi" ? "expanded" : ""}`)}
                      onClicked={() => setExpandedSection(expandedSection.get() === "wifi" ? "none" : "wifi")}
                    >
                      <image iconName={expandedSection((s) => s === "wifi" ? "pan-up-symbolic" : "pan-down-symbolic")} pixelSize={16} />
                    </button>
                  </box>
                )}
              </For>
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
                class={createBinding(bt, "isPowered").as(p => `quick-toggle-main retro-btn ${p ? "active" : ""}`)}
                onClicked={() => bt.toggle()}
                hexpand
              >
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.START}>
                  <image iconName={createBinding(bt, "isPowered").as(p => p ? "network-bluetooth-activated-symbolic" : "network-bluetooth-inactive-symbolic")} pixelSize={24} />
                  <box orientation={Gtk.Orientation.VERTICAL}>
                    <label label="> SYS_BT" class="quick-toggle-title" halign={Gtk.Align.START} />
                    <label label={createBinding(bt, "isPowered").as(p => p ? ((bt.get_devices?.().filter(d => d.connected).length || 0) > 0 ? `[ ${bt.get_devices().filter(d => d.connected).length} CONN ]` : "[ ON ]") : "[ OFF ]")} class="quick-toggle-subtitle" halign={Gtk.Align.START} />
                  </box>
                </box>
              </button>
              <button 
                class={expandedSection((s) => `quick-toggle-expand retro-btn ${s === "bluetooth" ? "expanded" : ""}`)}
                onClicked={() => setExpandedSection(expandedSection.get() === "bluetooth" ? "none" : "bluetooth")}
              >
                <image iconName={expandedSection((s) => s === "bt" ? "pan-up-symbolic" : "pan-down-symbolic")} pixelSize={16} />
              </button>
            </box>
          )
        })()}
      </box>

      {/* ROW 2: MIC & VOL (Mutes) */}
      <box spacing={16} homogeneous={true} hexpand>
        {/* MIC TOGGLE */}
        {(() => {
          const audio = AstalWp.get_default()?.audio
          if (!audio || !audio.defaultMicrophone) return <box class="quick-toggle-container" hexpand><label label="[ NO MIC ]" /></box>
          return <AudioToggle endpoint={audio.defaultMicrophone} type="mic" />
        })()}

        {/* SPEAKER TOGGLE */}
        {(() => {
          const audio = AstalWp.get_default()?.audio
          if (!audio || !audio.defaultSpeaker) return <box class="quick-toggle-container" hexpand><label label="[ NO SPEAKER ]" /></box>
          return <AudioToggle endpoint={audio.defaultSpeaker} type="speaker" />
        })()}
      </box>

      {/* REVEALERS FOR WIFI/BT */}
      <revealer revealChild={expandedSection((s) => s === "wifi")} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
        <scrolledwindow hexpand hscrollbarPolicy={Gtk.PolicyType.NEVER} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} min_content_height={200} max_content_height={350} class="quick-toggle-expanded-box">
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            {(() => {
              const nw = Network.get_default()
              if (!nw) return <box />
              
              return (
                <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                  <For each={createBinding(nw, "wired").as(w => w ? [w] : [])}>
                    {(wired) => (
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
                  </For>
                  
                  <For each={createBinding(nw, "wifi").as(w => w ? [w] : [])}>
                    {(wifi) => (
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
                  </For>
                </box>
              )
            })()}
          </box>
        </scrolledwindow>
      </revealer>

      <revealer revealChild={expandedSection((s) => s === "bt")} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
        <scrolledwindow hexpand hscrollbarPolicy={Gtk.PolicyType.NEVER} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} min_content_height={200} max_content_height={350} class="quick-toggle-expanded-box">
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
  )
}

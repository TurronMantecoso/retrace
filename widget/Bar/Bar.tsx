import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import { For, createBinding, onCleanup } from "ags"
import { createPoll } from "ags/time"
import Network from "gi://AstalNetwork"
import AstalTray from "gi://AstalTray"
import AstalNotifd from "gi://AstalNotifd"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import AstalWp from "gi://AstalWp"
import GLib from "gi://GLib"
import { exec, execAsync } from "ags/process"
import { notifCenterOpen, setNotifCenterOpen } from "../Notifd/state"
import { setPowerMenuOpen } from "../PowerMenu/state"
import app from "ags/gtk4/app"

///////////////////////////////////////////
//////////////APP LAUNCHER/////////////////
///////////////////////////////////////////



///////////////////////////////////////////
/////////////////WORKSPACE/////////////////
///////////////////////////////////////////

function Workspaces({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const hypr = Hyprland.get_default()
  const workspaces = createBinding(hypr, "workspaces")
  const activo = createBinding(hypr, "focusedWorkspace")

  const monitorName = gdkmonitor.connector ?? ""
  const filtrados = workspaces.as((wss) =>
    wss
      .filter((ws) => ws.monitor?.name === monitorName)
      .sort((a, b) => a.id - b.id),
  )

  return (
    <box>
      <For each={filtrados}>
        {(ws) => (
          <button
            class={activo.as((a) => (a?.id === ws.id ? "activo" : ""))}
            onClicked={() => hypr.dispatch("workspace", `${ws.id}`)}
          >
            <label label={`${ws.id}`} />
          </button>
        )}
      </For>
    </box>
  )
}

///////////////////////////////////////////
///////////INDICADOR NOTIFD////////////////
///////////////////////////////////////////

function NotifBadge() {
  const notifd = AstalNotifd.get_default()
  const notifs = createBinding(notifd, "notifications")

  return (
    <button
      class={notifCenterOpen((open) =>
        open ? "notif-badge-box open" : "notif-badge-box"
      )}
      onClicked={() => setNotifCenterOpen(!notifCenterOpen.get())}
      tooltipText="Centro de notificaciones"
    >
      <box spacing={2}>
        <label class="notif-badge-tag" label="notifd" />
        <label
          class={notifs.as((ns) =>
            ns.length > 0 ? "notif-badge-count active" : "notif-badge-count",
          )}
          label={notifs.as((ns) => (ns.length > 0 ? `${ns.length}` : "0"))}
        />
      </box>
    </button>
  )
}

///////////////////////////////////////////
//////////////////AUDIO////////////////////
///////////////////////////////////////////

function Audio() {
  const wp = AstalWp.get_default()
  const speaker = wp?.defaultSpeaker

  if (!speaker) {
    return (
      <menubutton class="audio" tooltipText="No hay dispositivo de audio">
        <image iconName="audio-volume-muted-symbolic" />
      </menubutton>
    )
  }

  const volume = createBinding(speaker, "volume")
  const iconName = createBinding(speaker, "volumeIcon")
  const mute = createBinding(speaker, "mute")

  return (
    <menubutton
      class="audio"
      tooltipText={volume.as((v) => `Volumen: ${Math.round(v * 100)}%`)}
    >
      <image iconName={iconName} />
      <popover>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          <box spacing={6} orientation={Gtk.Orientation.HORIZONTAL}>
            <button 
              onClicked={() => speaker.set_mute(!speaker.mute)}
              tooltipText={mute.as(m => m ? "Desmutear" : "Mutear")}
            >
              <image iconName={mute.as(m => m ? "audio-volume-muted-symbolic" : "audio-volume-high-symbolic")} />
            </button>
            <slider
              hexpand
              widthRequest={180}
              onChangeValue={({ value }) => speaker.set_volume(value)}
              value={volume}
            />
            <button 
              onClicked={() => {
                execAsync("pavucontrol").catch(err => {
                  console.error("Error lanzando pavucontrol:", err)
                  execAsync(["notify-send", "-u", "critical", "Error de Audio", "No se pudo abrir pavucontrol."]).catch(() => {})
                })
              }}
              tooltipText="Configuración de sonido"
            >
              <image iconName="settings-symbolic" />
            </button>
          </box>
          <label 
            class="audio-label" 
            label={createBinding(speaker, "description").as(d => d || "Desconocido")} 
            ellipsize={3}
            maxWidthChars={30} 
          />
        </box>
      </popover>
    </menubutton>
  )
}

///////////////////////////////////////////
/////////////////POWER/////////////////////
///////////////////////////////////////////

function Power() {
  return (
    <button 
      class="power-btn" 
      tooltipText="Menú de energía"
      onClicked={() => setPowerMenuOpen(true)}
    >
      <label label="⏻" />
    </button>
  )
}

///////////////////////////////////////////
//////////TRAY (SEGUNDO PLANO)/////////////
///////////////////////////////////////////

function SegundoPlano() {
  const tray = AstalTray.get_default()
  const items = createBinding(tray, "items")

  const init = (btn: Gtk.MenuButton, item: AstalTray.TrayItem) => {
    btn.menuModel = item.menuModel
    btn.insert_action_group("dbusmenu", item.actionGroup)

    item.connect("notify::menu-model", () => {
      btn.menuModel = item.menuModel
    })

    item.connect("notify::action-group", () => {
      btn.insert_action_group("dbusmenu", item.actionGroup)
    })
  }

  return (
    <box class="tray">
      <For each={items}>
        {(item) => (
          <menubutton $={(self) => init(self, item)}>
            <image gicon={createBinding(item, "gicon")} />
          </menubutton>
        )}
      </For>
    </box>
  )
}

///////////////////////////////////////////
///////////////////RELOJ///////////////////
///////////////////////////////////////////

function Reloj() {
  const hora = createPoll("", 1000, "date '+%H:%M'")
  const fechaCompleta = createPoll("", 60000, "date '+%A, %d de %B %Y'")

  let cal: Gtk.Calendar

  return (
    <menubutton class="reloj-label" tooltipText={fechaCompleta}>
      <label label={hora} />
      <popover
        $={(self) => {
          self.connect("notify::visible", () => {
            if (self.get_visible() && cal) {
              cal.select_day(GLib.DateTime.new_now_local())
            }
          })
        }}
      >
        <Gtk.Calendar $={(self) => (cal = self)} />
      </popover>
    </menubutton>
  )
}

///////////////////////////////////////////
/////////////////////RED///////////////////
///////////////////////////////////////////

function Red() {
  const red = Network.get_default()
  const primary = createBinding(red, "primary")
  const wifi = createBinding(red, "wifi")
  const wired = createBinding(red, "wired")

  const icon = primary.as((p) => {
    if (p === Network.Primary.WIFI) {
      const strength = red.wifi?.strength ?? 0
      if (strength > 40) return "globe-alt2-symbolic"
      return "strength-bars-1-symbolic"
    }
    if (p === Network.Primary.WIRED) return "network-computer-symbolic"
    return "offline-globe-symbolic"
  })

  const tooltip = primary.as((p) => {
    if (p === Network.Primary.WIFI) {
      const w = red.wifi
      return [
        `SSID:   ${w?.ssid ?? "N/A"}`,
        `Señal:  ${w?.strength ?? 0}%`,
      ].join("\n")
    }
    if (p === Network.Primary.WIRED) {
      const w = red.wired
      return [
        `Interfaz: ${w?.device?.interface ?? "N/A"}`,
        `Velocidad: ${w?.speed ?? "N/A"} Mbps`,
        `MAC: ${w?.hwAddress ?? "N/A"}`,
      ].join("\n")
    }
    return "Sin conexión"
  })

  return (
    <button 
      class="red-box" 
      tooltipText={tooltip}
      onClicked={() => app.toggle_window("netmanager")}
    >
      <box spacing={4} marginStart={4}>
        <image class="red-icon" iconName={icon} pixelSize={14} />
      </box>
    </button>
  )
}

///////////////////////////////////////////
///////////////////BAR/////////////////////
///////////////////////////////////////////

export default function Bar({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  let win: Astal.Window

  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  onCleanup(() => win.destroy())

  return (
    <window
      $={(self) => (win = self)}
      visible
      namespace="mi-bar"
      gdkmonitor={gdkmonitor}
      anchor={TOP | LEFT | RIGHT}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
    >
      <centerbox class="main-container">
        <box $type="start" spacing={2}>
          <Workspaces gdkmonitor={gdkmonitor} />
          {/* <NotifBadge /> */}
        </box>

        <box $type="center">
          <Reloj />
        </box>

        <box $type="end" spacing={4}>
          <Red />
          <SegundoPlano />
          <Audio />
          <Power />
        </box>

      </centerbox>
    </window>
  )
}

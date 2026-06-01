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
import { exec } from "ags/process"
import { notifCenterOpen, setNotifCenterOpen } from "../Notifd/state"

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
  const speaker = AstalWp.get_default().defaultSpeaker
  const iconName = createBinding(speaker, "volumeIcon")
  const volume = createBinding(speaker, "volume")

  return (
    <menubutton
      class="audio"
      tooltipText={volume.as((v) => `Volumen: ${Math.round(v * 100)}%`)}
    >
      <image iconName={iconName} />
      <popover>
        <box spacing={6}>
          <button onClicked={() => exec("pavucontrol")}>
            <image iconName="more-small-symbolic" />
          </button>
          <slider
            widthRequest={200}
            onChangeValue={({ value }) => speaker.set_volume(value)}
            value={volume}
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
    <menubutton class="power-btn" tooltipText="Menú de energía">
      <label label="⏻" />
      <popover>
        <box class="power-menu" orientation={Gtk.Orientation.VERTICAL}>
          <button
            class="power-item reboot"
            onClicked={() => exec("systemctl reboot")}
          >
            <label label="󰜉  Reiniciar" halign={Gtk.Align.START} hexpand />
          </button>
          <button
            class="power-item shutdown"
            onClicked={() => exec("systemctl poweroff")}
          >
            <label label="⏻  Apagar" halign={Gtk.Align.START} hexpand />
          </button>
        </box>
      </popover>
    </menubutton>
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

  return (
    <menubutton class="reloj-label" tooltipText={fechaCompleta}>
      <label label={hora} />
      <popover>
        <Gtk.Calendar />
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
      if (strength > 75) return "network-wireless-signal-excellent-symbolic"
      if (strength > 50) return "network-wireless-signal-good-symbolic"
      if (strength > 25) return "network-wireless-signal-ok-symbolic"
      return "network-wireless-signal-weak-symbolic"
    }
    if (p === Network.Primary.WIRED) return "network-wired-symbolic"
    return "network-offline-symbolic"
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
    <box class="red-box" spacing={4} marginStart={4} tooltipText={tooltip}>
      <image class="red-icon" iconName={icon} pixelSize={14} />
    </box>
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
          <NotifBadge />
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

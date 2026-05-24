import { Astal } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import { For, createBinding, onCleanup } from "ags"
import { createPoll } from "ags/time"
import Network from "gi://AstalNetwork"
import AstalTray from "gi://AstalTray"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import AstalWp from "gi://AstalWp"
import { exec } from "ags/process"

    ///////////////////////////////////////////
  /////////////////WORKSPACE/////////////////
///////////////////////////////////////////

function Workspaces({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  //Crea un nuevo objeto
  const hypr = Hyprland.get_default()
  //Obtiene los slots de workspaces
  const workspaces = createBinding(hypr, "workspaces")
  //Revisa que workspace esta siendo usado actualmente
  const activo = createBinding(hypr, "focusedWorkspace")

  //Obtener el monitor de Hyprland que corresponde al gdkmonitor
  const monitorName = gdkmonitor.connector ?? ""
  //Obtiene workspaces siendo usados
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
  //////////////////AUDIO////////////////////
///////////////////////////////////////////

function Audio() {
  //Crea el objeto de Speaker
  const speaker = AstalWp.get_default().defaultSpeaker
  //Toma el nombre del icono
  const iconName = createBinding(speaker, "volumeIcon")
  return (
    <menubutton class="audio" marginEnd={12}>
      <image iconName={iconName} />
      <popover>
        <box>
          <button onClicked={() => exec("pavucontrol")}>
            <image iconName={"more-small-symbolic"} />
          </button>
          <slider
            widthRequest={260}
            onChangeValue={({ value }) => speaker.set_volume(value)}
            value={createBinding(speaker, "volume")}
          />
        </box>
      </popover>
    </menubutton>
  )
}

    //////////////////////////////////////////
  ///////////////////TRAY///////////////////
//////////////////////////////////////////

function SegundoPlano() {
  //Crea el objeto de Tray
  const tray = AstalTray.get_default()
  //Obtiene los procesos en 2do plano
  const items = createBinding(tray, "items")

  //Agregar interacción con los iconos
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
  //Bucle donde obtiene hora y m,inuto
  const hora = createPoll("", 1000, "date '+ %H:%M'")
  //Bucle donde obtiene fecha detallada (Dia, Nº Dia, Mes, Año)
  const fechaCompleta = createPoll("", 60000, "date '+%A, %d de %B %Y'")

  return (
    <box class="reloj-label" tooltipText={fechaCompleta}>
      <label label={hora} />
    </box>
  )
}

    ///////////////////////////////////////////
  /////////////////////RED///////////////////
///////////////////////////////////////////

function Red() {
  //Obtiene el objeto de Network
  const red = Network.get_default()
  //Bucle para revisar si esta conectado
  const conectado = createBinding(red, "wired")

  return (
    <box
      marginStart={12}
      spacing={2}
      tooltipText={conectado.as((w) => {
        if (w && w.device) {
          const info = w.device

          return `Interfaz: ${info.interface || "N/A"}
Velocidad: ${info.speed || "N/A"} Mbps
MAC: ${info.hw_address || "N/A"}`
        }
        return "Desconectado"
      })}
    >
      <image
        marginEnd={10}
        pixelSize={16}
        iconName={conectado.as((estado) =>
          estado ? "strength-bars-1-symbolic" : "connected-squares-x-symbolic",
        )}
      />
    </box>
  )
}

    ///////////////////////////////////////////
  ///////////////////BAR/////////////////////
///////////////////////////////////////////

export default function Bar({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  let win: Astal.Window

  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  onCleanup(() => {
    win.destroy()
  })

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
        <box $type="start">
          <Workspaces gdkmonitor={gdkmonitor} />
        </box>

        <box $type="center">
          <Reloj />
        </box>

        <box $type="end">
          <Red />
          <SegundoPlano />
          <Audio />
        </box>
      </centerbox>
    </window>
  )
}

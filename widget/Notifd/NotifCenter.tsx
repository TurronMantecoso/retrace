import { Astal, Gtk } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import GLib from "gi://GLib"
import Gdk from "gi://Gdk?version=4.0"
import Pango from "gi://Pango"
import { createBinding, For, onCleanup } from "ags"
import { notifCenterOpen, setNotifCenterOpen } from "./state"

const ONE_DAY_S = 24 * 60 * 60

function time(t: number) {
  return GLib.DateTime.new_from_unix_local(t).format("%H:%M")!
}

function isRecent(t: number) {
  return Math.floor(Date.now() / 1000) - t < ONE_DAY_S
}

///////////////////////////////////////////
/////////////// NOTIF CARD ////////////////
///////////////////////////////////////////

function NotifCard({ n }: { n: AstalNotifd.Notification }) {
  const primaryAction = n.actions[0] ?? null

  return (
    <box class="nc-card" orientation={Gtk.Orientation.VERTICAL}>

      {/* ── Header del card ── */}
      <box class="nc-card-header" spacing={4}>
        {(n.appIcon || n.desktopEntry) && (
          <image
            class="nc-card-icon"
            iconName={n.appIcon || n.desktopEntry}
            pixelSize={14}
          />
        )}
        <label
          class="nc-card-appname"
          label={`> ${n.appName || "Unknown"}`}
          halign={Gtk.Align.START}
          ellipsize={Pango.EllipsizeMode.END}
          maxWidthChars={20}
        />
        <label
          class="nc-card-time"
          label={time(n.time)}
          hexpand
          halign={Gtk.Align.END}
        />
        <button
          class="nc-card-dismiss"
          onClicked={() => n.dismiss()}
        >
          <image iconName="window-close-symbolic" pixelSize={12} />
        </button>
      </box>

      {/* ── Cuerpo del card ── */}
      <box class="nc-card-body" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        <label
          class="nc-card-summary"
          label={n.summary}
          halign={Gtk.Align.START}
          xalign={0}
          ellipsize={Pango.EllipsizeMode.END}
        />
        {n.body && (
          <label
            class="nc-card-text"
            label={n.body}
            halign={Gtk.Align.START}
            xalign={0}
            wrap
            lines={2}
            ellipsize={Pango.EllipsizeMode.END}
          />
        )}
      </box>

      {/* ── Acciones ── */}
      <box class="nc-card-actions">
        <button
          class="nc-action-open"
          hexpand
          onClicked={() => {
            if (primaryAction) n.invoke(primaryAction.id)
            setNotifCenterOpen(false)
          }}
        >
          <label
            label={primaryAction ? `[ ${primaryAction.label} ]` : "[ proceed ]"}
            halign={Gtk.Align.CENTER}
            hexpand
          />
        </button>
      </box>

    </box>
  )
}

///////////////////////////////////////////
////////////// NOTIF CENTER ///////////////
///////////////////////////////////////////

export default function NotifCenter({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  const notifd = AstalNotifd.get_default()

  // Filtra solo notificaciones de las últimas 24h
  const notifications = createBinding(notifd, "notifications").as((ns) =>
    ns.filter((n) => isRecent(n.time))
  )

  let win: Astal.Window
  onCleanup(() => win?.destroy())

  return (
    <window
      $={(self) => (win = self)}
      class="NotifCenter"
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.LEFT | Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      layer={Astal.Layer.TOP}
      exclusivity={Astal.Exclusivity.NORMAL}
      margin_top={9}
      margin_left={8}
      margin_bottom={9}
      
      visible={notifCenterOpen((v) => v)}
    >
      <box class="nc-container" orientation={Gtk.Orientation.VERTICAL} widthRequest={320}>

        {/* ── Header ── */}
        <box class="nc-header" spacing={4}>
          <label
            class="nc-title"
            label="[ notif-center ]"
            halign={Gtk.Align.START}
            hexpand
          />
          <button
            class="nc-clear-btn"
            tooltipText="Limpiar todo"
            onClicked={() => {
              notifd.get_notifications().forEach((n) => n.dismiss())
            }}
          >
            <label label="[ clear_all ]" />
          </button>
          <button
            class="nc-close-btn"
            tooltipText="Cerrar"
            onClicked={() => setNotifCenterOpen(false)}
          >
            <image iconName="window-close-symbolic" pixelSize={12} />
          </button>
        </box>

        {/* ── Lista scrolleable ── */}
        <Gtk.ScrolledWindow
          vexpand
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        >
          <box orientation={Gtk.Orientation.VERTICAL} class="nc-list">

            <label
              class="nc-empty"
              label="> NO_NEW_LOGS"
              visible={notifications.as((ns) => ns.length === 0)}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
              vexpand
            />

            <For each={notifications}>
              {(n) => <NotifCard n={n} />}
            </For>

          </box>
        </Gtk.ScrolledWindow>

      </box>
    </window>
  )
}

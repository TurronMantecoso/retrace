import { Gtk } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import GLib from "gi://GLib"
import Pango from "gi://Pango"
import { createBinding, For } from "ags"
import { dashboardOpen } from "./state"

const ONE_DAY_S = 24 * 60 * 60

function time(t: number) {
  return GLib.DateTime.new_from_unix_local(t).format("%H:%M")!
}

function isRecent(t: number) {
  return Math.floor(Date.now() / 1000) - t < ONE_DAY_S
}

function NotifCard({ n }: { n: AstalNotifd.Notification }) {
  const primaryAction = n.actions[0] ?? null

  return (
    <box class="nc-card" orientation={Gtk.Orientation.VERTICAL}>
      <box class="nc-card-header" spacing={4}>
        {(n.appIcon || n.desktopEntry) && (
          <image class="nc-card-icon" iconName={n.appIcon || n.desktopEntry} pixelSize={14} />
        )}
        <label class="nc-card-appname" label={`> ${n.appName || "Unknown"}`} halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} maxWidthChars={20} />
        <label class="nc-card-time" label={time(n.time)} hexpand halign={Gtk.Align.END} />
        <button class="nc-card-dismiss" onClicked={() => n.dismiss()}>
          <image iconName="window-close-symbolic" pixelSize={12} />
        </button>
      </box>
      <box class="nc-card-body" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        <label class="nc-card-summary" label={n.summary} halign={Gtk.Align.START} xalign={0} ellipsize={Pango.EllipsizeMode.END} />
        {n.body && (
          <label class="nc-card-text" label={n.body} halign={Gtk.Align.START} xalign={0} wrap lines={2} ellipsize={Pango.EllipsizeMode.END} />
        )}
      </box>
      <box class="nc-card-actions">
        <button
          class="nc-action-open"
          hexpand
          onClicked={() => {
            if (primaryAction) n.invoke(primaryAction.id)
            // Note: we don't close the dashboard automatically here
          }}
        >
          <label label={primaryAction ? `[ ${primaryAction.label} ]` : "[ proceed ]"} halign={Gtk.Align.CENTER} hexpand />
        </button>
      </box>
    </box>
  )
}

export default function Notifications() {
  const notifd = AstalNotifd.get_default()

  const notifications = createBinding(notifd, "notifications").as((ns) =>
    ns.filter((n) => isRecent(n.time)).reverse() // Show newest first
  )

  return (
    <box class="dashboard-notifications" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <box class="nc-header" spacing={4}>
        <label class="nc-title" label="> NOTIFICATIONS_CENTER_" halign={Gtk.Align.START} hexpand />
        <box spacing={8}>
          <button
            class="nc-dnd-btn"
            onClicked={() => { notifd.dontDisturb = !notifd.dontDisturb }}
          >
            <label label={createBinding(notifd, "dontDisturb").as(dnd => dnd ? "[ DND: ON ]" : "[ DND: OFF ]")} />
          </button>
          <button
            class="nc-clear-btn"
            tooltipText="Limpiar todo"
            onClicked={() => {
              notifd.get_notifications().forEach((n) => n.dismiss())
            }}
          >
            <label label="[ CLEAR ]" />
          </button>
        </box>
      </box>

      <scrolledwindow
        vexpand
        hscrollbarPolicy={Gtk.PolicyType.NEVER}
        vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
        min_content_height={250}
        max_content_height={350}
      >
        <box orientation={Gtk.Orientation.VERTICAL} class="nc-list" spacing={8}>
          <label
            class="nc-empty"
            label="> NO_NEW_LOGS_"
            visible={notifications.as((ns) => ns.length === 0)}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            vexpand
          />
          <For each={notifications}>
            {(n) => <NotifCard n={n} />}
          </For>
        </box>
      </scrolledwindow>
    </box>
  )
}

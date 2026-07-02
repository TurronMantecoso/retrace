import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, For, createState } from "ags"
import GLib from "gi://GLib"
import AstalWp from "gi://AstalWp"
import { briPercent, startBrightnessMonitor } from "./brightness"
import app from "ags/gtk4/app"

// OSD State
const [visible, setVisible] = createState(false)
let hideTimeout: GLib.Source | null = null

function showOsd() {
  setVisible(true)
  if (hideTimeout) {
    GLib.source_remove(hideTimeout)
  }
  hideTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
    setVisible(false)
    hideTimeout = null
    return GLib.SOURCE_REMOVE
  })
}

function drawProgressBar(percent: number) {
  const total = 10
  const filled = Math.round(percent * total)
  let bar = ""
  for (let i = 0; i < total; i++) {
    bar += i < filled ? "■" : "-"
  }
  return `[${bar}]`
}

function OSDWidget() {
  const audio = AstalWp.get_default()?.audio

  const [volLabel, setVolLabel] = createState(drawProgressBar(0))
  const [volValue, setVolValue] = createState("0%")
  const [lastUpdate, setLastUpdate] = createState("VOL")

  // Inicialización y actualización de brillo
  startBrightnessMonitor(() => {
    setLastUpdate("BRI")
    showOsd()
  })

  // Inicialización y actualización de audio
  if (audio) {
    let volHandler: number | null = null
    let muteHandler: number | null = null

    const updateSpeaker = () => {
      const spk = audio.defaultSpeaker
      if (spk) {
        if (volHandler) spk.disconnect(volHandler)
        if (muteHandler) spk.disconnect(muteHandler)

        const updateUI = () => {
          setVolLabel(spk.mute ? drawProgressBar(0) : drawProgressBar(spk.volume))
          setVolValue(spk.mute ? "MUTED" : `${Math.round(spk.volume * 100)}%`)
        }

        volHandler = spk.connect("notify::volume", () => {
          updateUI()
          setLastUpdate("VOL")
          showOsd()
        })

        muteHandler = spk.connect("notify::mute", () => {
          updateUI()
          setLastUpdate("VOL")
          showOsd()
        })
        
        updateUI()
      }
    }

    audio.connect("notify::default-speaker", updateSpeaker)
    updateSpeaker()
  }

  return (
    <box class="osd-container" orientation={Gtk.Orientation.VERTICAL}>
      <box class="osd-item" visible={lastUpdate((v) => v === "VOL")}>
        <label class="osd-label" label="[ VOL ]" />
        <label class="osd-bar vol-bar" label={volLabel((v) => v)} />
        <label class="osd-value" halign={Gtk.Align.END} label={volValue((v) => v)} />
      </box>
      <box class="osd-item" visible={lastUpdate((v) => v === "BRI")}>
        <label class="osd-label" label="[ BRI ]" />
        <label class="osd-bar bri-bar" label={briPercent((v) => drawProgressBar(v))} />
        <label class="osd-value" halign={Gtk.Align.END} label={briPercent((v) => `${Math.round(v * 100)}%`)} />
      </box>
    </box>
  )
}

export default function OSD() {
  const monitors = createBinding(app, "monitors")

  return (
    <For each={monitors}>
      {(monitor: Gdk.Monitor) => (
        <window
          class="osd-window"
          gdkmonitor={monitor}
          anchor={Astal.WindowAnchor.BOTTOM}
          margin_bottom={64}
          layer={Astal.Layer.OVERLAY}
          visible={visible((v) => v)}
        >
          <OSDWidget />
        </window>
      )}
    </For>
  )
}

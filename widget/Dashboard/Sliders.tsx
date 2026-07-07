import { Gtk } from "ags/gtk4"
import { createBinding, For } from "ags"
import AstalWp from "gi://AstalWp"

function drawProgressBar(percent: number, length: number = 20) {
  const filled = Math.round(percent * length)
  let bar = ""
  for (let i = 0; i < length; i++) {
    bar += i < filled ? "■" : "-"
  }
  return `[${bar}]`
}

function VolumeSlider({ endpoint }: { endpoint: AstalWp.Endpoint }) {
  const volBinding = createBinding(endpoint, "volume")
  
  const lbl = (
    <label 
      label={volBinding.as(v => drawProgressBar(v, 35))} 
      class="text-slider-bar" 
      halign={Gtk.Align.START} 
      valign={Gtk.Align.CENTER}
      hexpand
    />
  )

  const sl = (
    <slider 
      hexpand 
      class="invisible-slider"
      drawValue={false}
      value={volBinding}
      onChangeValue={(s) => { endpoint.volume = s.value }}
    />
  )

  const ov = <overlay hexpand child={lbl} />
  ov.add_overlay(sl as Gtk.Widget)

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <box spacing={8}>
        <label label="> VOL_" class="dashboard-label" />
        <label label={volBinding.as(v => `[ ${Math.round(v * 100)}% ]`)} class="net-active-indicator" />
      </box>
      <box spacing={12}>
        <label label="[-]" class="slider-btn" />
        {ov}
        <label label="[+]" class="slider-btn" />
      </box>
    </box>
  )
}

export default function Sliders() {
  const audio = AstalWp.get_default()?.audio

  if (!audio) {
    return <box><label label="[ NO AUDIO MODULE ]" class="media-empty-text" /></box>
  }

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={12} class="dashboard-sliders">
      <For each={createBinding(audio, "defaultSpeaker").as(s => s ? [s] : [])}>
        {(speaker) => <VolumeSlider endpoint={speaker} />}
      </For>
    </box>
  )
}

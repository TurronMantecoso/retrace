import { Gtk } from "ags/gtk4"
import { createBinding, For } from "ags"
import Mpris from "gi://AstalMpris"

export default function Media() {
  const mpris = Mpris.get_default()

  return (
    <box class="dashboard-media" orientation={Gtk.Orientation.VERTICAL}>
      {/* Empty State */}
      <box 
        class="media-empty" 
        halign={Gtk.Align.CENTER} 
        visible={createBinding(mpris, "players").as(p => p.length === 0)}
      >
        <label label="[ NO MEDIA PLAYING ]" class="media-empty-text" />
      </box>
      
      {/* Player State */}
      <For each={createBinding(mpris, "players").as(p => p.slice(0, 1))}>
        {(player) => (
          <box spacing={16} class="media-player-box">

            <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand valign={Gtk.Align.CENTER}>
              <label 
                class="media-title" 
                label={createBinding(player, "title").as(t => t || "Unknown Title")} 
                halign={Gtk.Align.START} 
                ellipsize={3}
              />
              <label 
                class="media-artist" 
                label={createBinding(player, "artist").as(a => a || "Unknown Artist")} 
                halign={Gtk.Align.START} 
                ellipsize={3}
              />
              
              <box class="media-controls" spacing={12} halign={Gtk.Align.START} margin_top={8}>
                <button class="media-btn" onClicked={() => player.canGoPrevious && player.previous()}>
                  <label label="[<]" />
                </button>
                <button class="media-btn" onClicked={() => player.canControl && player.play_pause()}>
                  <label label={createBinding(player, "playbackStatus").as(s => s === Mpris.PlaybackStatus.PLAYING ? "[ || ]" : "[ > ]")} />
                </button>
                <button class="media-btn" onClicked={() => player.canGoNext && player.next()}>
                  <label label="[>]" />
                </button>
              </box>
            </box>
          </box>
        )}
      </For>
    </box>
  )
}

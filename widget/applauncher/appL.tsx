import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import Apps from "gi://AstalApps"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"

const MAX_ITEMS = 50

function lookupIcon(iconName: string | null): string {
  if (!iconName) return "application-x-executable"
  if (iconName.startsWith("/")) return iconName

  const display = Gdk.Display.get_default()
  if (display) {
    const theme = Gtk.IconTheme.get_for_display(display)
    if (theme.has_icon(iconName)) return iconName
  }

  const home = GLib.get_home_dir()
  const paths = [
    `${home}/.local/share/icons/hicolor/128x128/apps/${iconName}.png`,
    `${home}/.local/share/icons/hicolor/256x256/apps/${iconName}.png`,
    `${home}/.local/share/icons/hicolor/64x64/apps/${iconName}.png`,
    `${home}/.local/share/icons/hicolor/48x48/apps/${iconName}.png`,
    `${home}/.local/share/icons/hicolor/32x32/apps/${iconName}.png`,
    `${home}/.local/share/icons/hicolor/16x16/apps/${iconName}.png`,
    `/var/lib/flatpak/exports/share/icons/hicolor/128x128/apps/${iconName}.png`,
    `/var/lib/flatpak/exports/share/icons/hicolor/256x256/apps/${iconName}.png`,
    `/var/lib/flatpak/exports/share/icons/hicolor/64x64/apps/${iconName}.png`,
    `/var/lib/flatpak/exports/share/icons/hicolor/48x48/apps/${iconName}.png`,
    `/var/lib/flatpak/exports/share/icons/hicolor/32x32/apps/${iconName}.png`,
    `/var/lib/flatpak/exports/share/icons/hicolor/16x16/apps/${iconName}.png`,
    `/usr/share/icons/hicolor/128x128/apps/${iconName}.png`,
    `/usr/share/icons/hicolor/256x256/apps/${iconName}.png`,
    `/usr/share/icons/hicolor/64x64/apps/${iconName}.png`,
    `/usr/share/icons/hicolor/48x48/apps/${iconName}.png`,
    `/usr/share/icons/hicolor/32x32/apps/${iconName}.png`,
    `/usr/share/icons/hicolor/16x16/apps/${iconName}.png`,
    `/usr/share/pixmaps/${iconName}.png`,
    `/usr/share/pixmaps/${iconName}.svg`,
    `${home}/.local/share/icons/hicolor/scalable/apps/${iconName}.svg`,
    `/var/lib/flatpak/exports/share/icons/hicolor/scalable/apps/${iconName}.svg`,
    `/usr/share/icons/hicolor/scalable/apps/${iconName}.svg`,
  ]

  for (const path of paths) {
    if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
      return path
    }
  }

  return "application-x-executable"
}

function hide() {
  app.get_window("applauncher")?.set_visible(false)
}

function AppItem({ app }: { app: Apps.Application }) {
  const btn = new Gtk.Button({ cssClasses: ["app-item"] })
  btn.connect("clicked", () => {
    hide()
    try {
      if (app.get_key("Terminal") === "true") {
        // Lanzamiento manual para aplicaciones de terminal usando kitty
        const cmd = app.executable.replace(/%[a-zA-Z]/g, "").trim()
        execAsync(`kitty -e ${cmd}`).catch((err) => {
          execAsync([
            "notify-send", "-u", "critical", "Error de Terminal",
            `No se pudo lanzar la aplicación de terminal: ${app.name || app.get_name()}`
          ]).catch(() => {})
        })
      } else {
        app.launch()
      }
    } catch (err) {
      execAsync([
        "notify-send",
        "-u", "critical",
        "Error de Ejecución",
        `No se pudo lanzar la aplicación: ${app.name || app.get_name()}`
      ]).catch(() => {})
    }
  })

  const resolvedIcon = lookupIcon(app.icon_name || app.get_icon_name())
  const isPath = resolvedIcon.startsWith("/")

  const box = new Gtk.Box({ spacing: 12 })
  box.append(new Gtk.Image(isPath ? { file: resolvedIcon, pixel_size: 32 } : { icon_name: resolvedIcon, pixel_size: 32 }))

  const vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, valign: Gtk.Align.CENTER })
  vbox.append(new Gtk.Label({
    cssClasses: ["app-name"],
    label: app.name || app.get_name(),
    halign: Gtk.Align.START,
    ellipsize: 3,
    max_width_chars: 30
  }))

  if (app.description || app.get_description()) {
    vbox.append(new Gtk.Label({
      cssClasses: ["app-description"],
      label: app.description || app.get_description(),
      halign: Gtk.Align.START,
      ellipsize: 3,
      max_width_chars: 40
    }))
  }

  box.append(vbox)
  btn.set_child(box)
  return btn
}

export default function Applauncher() {
  const apps = new Apps.Apps()
  
  let text = ""
  let listContainer: Gtk.Box | null = null
  let searchEntry: Gtk.Entry | null = null

  const updateList = () => {
    if (!listContainer) return
    // Eliminar hijos actuales
    let child = listContainer.get_first_child()
    while (child) {
      listContainer.remove(child)
      child = listContainer.get_first_child()
    }
    // Añadir nuevos resultados
    let results = apps.fuzzy_query(text)
    
    // Si no hay búsqueda, ordenamos por frecuencia de uso y luego alfabéticamente
    if (text.trim() === "") {
      results = results.sort((a, b) => {
        const freqDiff = b.get_frequency() - a.get_frequency()
        if (freqDiff !== 0) return freqDiff
        return (a.get_name() || "").localeCompare(b.get_name() || "")
      })
    }
    
    results = results.slice(0, MAX_ITEMS)
    results.forEach(app => {
      listContainer!.append(AppItem({ app }))
    })
  }

  return (
    <window
      name="applauncher"
      application={app}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.NONE} // Flotante centrado
      $={(self) => {
        const keyCtrl = new Gtk.EventControllerKey()
        keyCtrl.connect("key-pressed", (_, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            hide()
            return true
          }
          return false
        })
        self.add_controller(keyCtrl)

        // Limpiar la caja de texto al abrir
        self.connect("notify::visible", () => {
          if (self.visible) {
            text = ""
            if (searchEntry) searchEntry.text = ""
            updateList()
          }
        })
      }}
    >
      <box class="applauncher-window" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        <box class="applauncher-search" spacing={8}>
          <label label=">" class="prompt-icon" />
          <entry
            $={(self) => { searchEntry = self }}
            hexpand
            placeholderText="ejecutar_"
            onChanged={(self) => {
              text = self.text
              updateList()
            }}
            onActivate={() => {
              const results = apps.fuzzy_query(text)
              if (results.length > 0) {
                hide()
                results[0].launch()
              }
            }}
          />
        </box>
        
        <scrolledwindow 
          vexpand
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          min_content_height={200}
          max_content_height={400}
        >
          <box 
            orientation={Gtk.Orientation.VERTICAL} 
            spacing={4} 
            class="app-list"
            $={(self) => { 
              listContainer = self 
              updateList()
            }}
          />
        </scrolledwindow>
      </box>
    </window>
  )
}

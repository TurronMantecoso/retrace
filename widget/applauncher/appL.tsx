import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import Apps from "gi://AstalApps"
import GLib from "gi://GLib"
import { execAsync } from "ags/process"
import { createState, createEffect } from "ags"
import CrtMask from "../CrtMask"
import { applauncherOpen, setApplauncherOpen } from "./state"

const MAX_ITEMS = 15

const iconCache: Record<string, string> = {}

function lookupIcon(iconName: string | null): string {
  if (!iconName) return "application-x-executable"
  if (iconCache[iconName]) return iconCache[iconName]
  
  if (iconName.startsWith("/")) {
    iconCache[iconName] = iconName
    return iconName
  }

  const display = Gdk.Display.get_default()
  if (display) {
    const theme = Gtk.IconTheme.get_for_display(display)
    if (theme.has_icon(iconName)) {
      iconCache[iconName] = iconName
      return iconName
    }
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
      iconCache[iconName] = path
      return path
    }
  }

  iconCache[iconName] = "application-x-executable"
  return "application-x-executable"
}

function hide() {
  setApplauncherOpen(false)
}

class AppItemWidget {
  btn: Gtk.Button;
  private iconImage: Gtk.Image;
  private nameLabel: Gtk.Label;
  private descLabel: Gtk.Label;
  private app: Apps.Application | null = null;

  constructor() {
    this.btn = new Gtk.Button({ cssClasses: ["app-item"] });
    this.btn.connect("clicked", () => {
      if (!this.app) return;
      hide();
      try {
        if (this.app.get_key("Terminal") === "true") {
          const cmd = this.app.executable.replace(/%[a-zA-Z]/g, "").trim();
          execAsync(`kitty -e ${cmd}`).catch(() => {
            execAsync(["notify-send", "-u", "critical", "Error de Terminal", `No se pudo lanzar la aplicación de terminal: ${this.app!.name || this.app!.get_name()}`]).catch(() => {});
          });
        } else {
          this.app.launch();
        }
      } catch (err) {
        execAsync(["notify-send", "-u", "critical", "Error de Ejecución", `No se pudo lanzar la aplicación: ${this.app!.name || this.app!.get_name()}`]).catch(() => {});
      }
    });

    this.iconImage = new Gtk.Image({ pixel_size: 32 });
    
    this.nameLabel = new Gtk.Label({
      cssClasses: ["app-name"],
      halign: Gtk.Align.START,
      ellipsize: 3,
      max_width_chars: 30
    });

    this.descLabel = new Gtk.Label({
      cssClasses: ["app-description"],
      halign: Gtk.Align.START,
      ellipsize: 3,
      max_width_chars: 40
    });

    const box = new Gtk.Box({ spacing: 12 });
    box.append(this.iconImage);

    const vbox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, valign: Gtk.Align.CENTER });
    vbox.append(this.nameLabel);
    vbox.append(this.descLabel);
    
    box.append(vbox);
    this.btn.set_child(box);
  }

  update(app: Apps.Application) {
    this.app = app;
    this.nameLabel.label = app.name || app.get_name();
    
    const desc = app.description || app.get_description();
    if (desc) {
      this.descLabel.label = desc;
      this.descLabel.show();
    } else {
      this.descLabel.hide();
    }

    const resolvedIcon = lookupIcon(app.icon_name || app.get_icon_name());
    const isPath = resolvedIcon.startsWith("/");
    if (isPath) {
      this.iconImage.set_from_file(resolvedIcon);
    } else {
      this.iconImage.set_from_icon_name(resolvedIcon);
    }
    
    this.btn.show();
  }

  hide() {
    this.btn.hide();
  }
}

export default function Applauncher() {
  const apps = new Apps.Apps()
  
  let text = ""
  let listContainer: Gtk.Box | null = null
  let searchEntry: Gtk.Entry | null = null

  const itemPool: AppItemWidget[] = []

  const updateList = () => {
    if (!listContainer) return
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
    
    // Asegurar que hay suficientes widgets en el pool
    while (itemPool.length < results.length) {
      const item = new AppItemWidget()
      itemPool.push(item)
      listContainer!.append(item.btn)
    }

    // Actualizar los widgets con los nuevos resultados
    for (let i = 0; i < itemPool.length; i++) {
      if (i < results.length) {
        itemPool[i].update(results[i])
      } else {
        itemPool[i].hide()
      }
    }
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
        // Handle ags toggle and animations
        let isAnimatingHide = false;
        self.connect("notify::visible", () => {
          if (self.visible) {
             if (!applauncherOpen() && !isAnimatingHide) {
                setApplauncherOpen(true)
                if (searchEntry) {
                   text = ""
                   searchEntry.text = ""
                   updateList()
                   setTimeout(() => searchEntry?.grab_focus(), 50)
                }
             }
          } else {
             if (applauncherOpen() && !isAnimatingHide) {
                isAnimatingHide = true;
                setApplauncherOpen(false);
                self.visible = true;
                setTimeout(() => {
                   self.visible = false;
                   isAnimatingHide = false;
                }, 800)
             }
          }
        })

        self.add_controller(keyCtrl)
      }}
    >
      <CrtMask openState={applauncherOpen} durationMs={800}>
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
      </CrtMask>
    </window>
  )
}

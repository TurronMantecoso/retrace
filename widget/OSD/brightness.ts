import { createState } from "ags"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

export const [briPercent, setBriPercent] = createState(0)

export function startBrightnessMonitor(onChange: () => void) {
  let maxBrightness = 0
  
  // Solo buscamos dispositivos de la clase 'backlight' (pantallas reales)
  execAsync("brightnessctl -c backlight max").then(out => {
    maxBrightness = Number(out) || 0
  }).catch(() => {})

  let last = -1
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
    // Si no hay pantalla detectada (ej. PC de escritorio), no hacemos nada
    if (maxBrightness === 0) return GLib.SOURCE_CONTINUE

    execAsync("brightnessctl -c backlight get").then(out => {
      const current = Number(out) || 0
      const pct = current / maxBrightness
      
      if (last !== -1 && Math.abs(pct - last) > 0.01) {
        setBriPercent(pct)
        onChange()
      } else if (last === -1) {
        setBriPercent(pct)
      }
      last = pct
    }).catch(() => {})
    
    return GLib.SOURCE_CONTINUE
  })
}

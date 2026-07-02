import { createState } from "ags"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

export const [briPercent, setBriPercent] = createState(0)

export function startBrightnessMonitor(onChange: () => void) {
  let maxBrightness = 1
  execAsync("brightnessctl max").then(out => maxBrightness = Number(out) || 1).catch(() => {})

  let last = -1
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
    execAsync("brightnessctl get").then(out => {
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

import { createState } from "ags"

export const [powerMenuOpen, setPowerMenuOpen] = createState(false)
export const [activePowerMonitor, setActivePowerMonitor] = createState<string>("")

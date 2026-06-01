import { createState } from "ags"

// Estado compartido entre NotifBadge (Bar) y NotifCenter
export const [notifCenterOpen, setNotifCenterOpen] = createState(false)

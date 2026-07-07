import { createState } from "ags"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"

export const [cpuPercent, setCpuPercent] = createState(0)
export const [ramInfo, setRamInfo] = createState({ used: 0, total: 1 })
export const [diskInfo, setDiskInfo] = createState({ used: "0G", total: "1G", percent: 0 })
export const [uptime, setUptime] = createState("0d 0h 0m")
export const [ipAddress, setIpAddress] = createState("Offline")

export function startSystemMonitor() {
    // CPU
    let lastTotal = 0
    let lastIdle = 0
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        execAsync(["cat", "/proc/stat"]).then(contents => {
            const lines = contents.split("\n")
            const cpuLine = lines.find(l => l.startsWith("cpu "))
            if (cpuLine) {
                const parts = cpuLine.trim().split(/\s+/).slice(1).map(Number)
                const idle = parts[3]
                const total = parts.reduce((acc, curr) => acc + curr, 0)
                const diffIdle = idle - lastIdle
                const diffTotal = total - lastTotal
                lastIdle = idle
                lastTotal = total
                if (diffTotal > 0) setCpuPercent((diffTotal - diffIdle) / diffTotal)
            }
        }).catch(() => {})
        return GLib.SOURCE_CONTINUE
    })

    // RAM
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        execAsync(["cat", "/proc/meminfo"]).then(contents => {
            const matchTotal = contents.match(/MemTotal:\s+(\d+)/)
            const matchAvailable = contents.match(/MemAvailable:\s+(\d+)/)
            if (matchTotal && matchAvailable) {
                const total = Number(matchTotal[1]) / 1024
                const available = Number(matchAvailable[1]) / 1024
                setRamInfo({ used: total - available, total })
            }
        }).catch(() => {})
        return GLib.SOURCE_CONTINUE
    })

    // DISCO
    const updateDisk = () => {
        execAsync(["bash", "-c", "df -h / | awk 'NR==2{print $3, $2, $5}'"]).then(out => {
            const [used, total, pct] = out.trim().split(" ")
            if (pct) {
                setDiskInfo({ used, total, percent: Number(pct.replace("%", "")) / 100 })
            }
        }).catch(() => {})
    }
    updateDisk()
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 60000, () => { updateDisk(); return GLib.SOURCE_CONTINUE })

    // UPTIME
    const updateUptime = () => {
        execAsync(["cat", "/proc/uptime"]).then(contents => {
            const up = Number(contents.split(" ")[0])
            const d = Math.floor(up / 86400)
            const h = Math.floor((up % 86400) / 3600)
            const m = Math.floor((up % 3600) / 60)
            setUptime(`${d}d ${h}h ${m}m`)
        }).catch(() => {})
    }
    updateUptime()
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 60000, () => { updateUptime(); return GLib.SOURCE_CONTINUE })

    // IP
    const updateIp = () => {
        execAsync(["bash", "-c", "ip route get 1.1.1.1 | awk '{print $7}'"]).then(out => {
            setIpAddress(out.trim() || "Offline")
        }).catch(() => {})
    }
    updateIp()
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 60000, () => { updateIp(); return GLib.SOURCE_CONTINUE })
}

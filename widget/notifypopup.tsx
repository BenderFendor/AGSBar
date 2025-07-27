
import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import Notification from "./notify"
import { createBinding, For, createState, onCleanup } from "ags"

export default function NotificationPopups() {
  const monitors = createBinding(app, "monitors")

  const notifd = AstalNotifd.get_default()

  const [notifications, setNotifications] = createState(
    new Array<AstalNotifd.Notification>(),
  )

  // Store timeout IDs to clean them up
  const timeouts = new Map<number, any>()

  const notifiedHandler = notifd.connect("notified", (_: any, id: any, replaced: any) => {
    try {
      const notification = notifd.get_notification(id)
      
      if (!notification) {
        console.warn("Failed to get notification with id:", id)
        return
      }

      if (replaced && notifications.get().some(n => n.id === id)) {
        setNotifications((ns) => ns.map((n) => (n.id === id ? notification : n)))
      } else {
        setNotifications((ns) => [notification, ...ns])
        
        // Set auto-dismiss timeout (5 seconds for normal, 10 for critical)
        const timeout = notification.urgency === AstalNotifd.Urgency.CRITICAL ? 10000 : 5000
        const timeoutId = setTimeout(() => {
          setNotifications((ns) => ns.filter((n) => n.id !== id))
          timeouts.delete(id)
        }, timeout)
        
        timeouts.set(id, timeoutId)
      }
    } catch (error) {
      console.error("Error in notified handler:", error)
    }
  })

  const resolvedHandler = notifd.connect("resolved", (_: any, id: any) => {
    try {
      // Clear any pending timeout
      const timeoutId = timeouts.get(id)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeouts.delete(id)
      }
      
      setNotifications((ns) => ns.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Error in resolved handler:", error)
    }
  })

  // technically, we don't need to cleanup because in this example this is a root component
  // and this cleanup function is only called when the program exits, but exiting will cleanup either way
  // but it's here to remind you that you should not forget to cleanup signal connections
  onCleanup(() => {
    // Clear all pending timeouts
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId))
    timeouts.clear()
    
    notifd.disconnect(notifiedHandler)
    notifd.disconnect(resolvedHandler)
  })

  return (
    <For each={monitors} cleanup={(win) => (win as Gtk.Window).destroy()}>
      {(monitor) => (
        <window
          class="NotificationPopups"
          gdkmonitor={monitor}
          visible={notifications((ns) => ns.length > 0)}
          anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
        >
          <box orientation={Gtk.Orientation.VERTICAL}>
            <For each={notifications}>
              {(notification) => {
                // Add safety check
                if (!notification) {
                  console.warn("Null notification in list")
                  return <box />
                }
                
                return (
                  <Notification
                    notification={notification}
                    onHoverLost={() => {
                      // This is now just a fallback - the main dismissal happens via timeout
                      // But we keep it for compatibility
                    }}
                  />
                )
              }}
            </For>
          </box>
        </window>
      )}
    </For>
  )
}

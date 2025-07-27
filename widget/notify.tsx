import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import Adw from "gi://Adw"
import GLib from "gi://GLib"
import AstalNotifd from "gi://AstalNotifd"
import Pango from "gi://Pango"

function isIcon(icon?: string | null) {
  const display = Gdk.Display.get_default()
  if (!display || !icon) return false
  const iconTheme = Gtk.IconTheme.get_for_display(display)
  return iconTheme.has_icon(icon)
}

function fileExists(path: string) {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

function time(time: number, format = "%H:%M") {
  if (typeof time !== 'number' || isNaN(time)) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  try {
    return GLib.DateTime.new_from_unix_local(time).format(format)!
  } catch (error) {
    console.warn("Error formatting time:", error)
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

function urgency(n: AstalNotifd.Notification) {
  const { LOW, NORMAL, CRITICAL } = AstalNotifd.Urgency
  switch (n.urgency) {
    case LOW:
      return "low"
    case CRITICAL:
      return "critical"
    case NORMAL:
    default:
      return "normal"
  }
}

export default function Notification({
  notification: n,
  onHoverLost,
}: {
  notification: AstalNotifd.Notification
  onHoverLost: () => void
}) {
  // Ensure notification object is valid and has required properties
  if (!n || typeof n !== 'object') {
    console.warn("Invalid notification object:", n)
    return <box />
  }

  // Safely access notification properties with fallbacks
  const safeNotification = {
    id: n.id ?? 0,
    appName: n.appName ?? "Unknown",
    appIcon: n.appIcon ?? null,
    desktopEntry: n.desktopEntry ?? null,
    summary: n.summary ?? "",
    body: n.body ?? "",
    image: n.image ?? null,
    urgency: n.urgency ?? AstalNotifd.Urgency.NORMAL,
    time: n.time ?? Date.now() / 1000,
    actions: n.actions ?? [],
    dismiss: () => {
      try {
        n.dismiss?.()
      } catch (error) {
        console.warn("Failed to dismiss notification:", error)
      }
    },
    invoke: (id: string) => {
      try {
        n.invoke?.(id)
      } catch (error) {
        console.warn("Failed to invoke notification action:", error)
      }
    }
  }

  return (
    <Adw.Clamp maximumSize={400}>
      <box
        widthRequest={400}
        class={`Notification ${urgency(safeNotification)}`}
        orientation={Gtk.Orientation.VERTICAL}
      >
        <box class="header">
          {(safeNotification.appIcon || isIcon(safeNotification.desktopEntry)) && (
            <image
              class="app-icon"
              visible={Boolean(safeNotification.appIcon || safeNotification.desktopEntry)}
              iconName={safeNotification.appIcon || safeNotification.desktopEntry || "application-x-executable"}
            />
          )}
          <label
            class="app-name"
            halign={Gtk.Align.START}
            ellipsize={Pango.EllipsizeMode.END}
            label={safeNotification.appName || "Unknown"}
          />
          <label
            class="time"
            hexpand
            halign={Gtk.Align.END}
            label={time(safeNotification.time) || ""}
          />
          <button onClicked={safeNotification.dismiss}>
            <image iconName="window-close-symbolic" />
          </button>
        </box>
        <Gtk.Separator visible />
        <box class="content">
          {safeNotification.image && 
           typeof safeNotification.image === 'string' && 
           safeNotification.image.length > 0 && 
           fileExists(safeNotification.image) && (
            <image 
              valign={Gtk.Align.START} 
              class="image" 
              file={safeNotification.image}
            />
          )}
          {safeNotification.image && 
           typeof safeNotification.image === 'string' && 
           safeNotification.image.length > 0 && 
           !fileExists(safeNotification.image) && 
           isIcon(safeNotification.image) && (
            <box valign={Gtk.Align.START} class="icon-image">
              <image
                iconName={safeNotification.image}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
              />
            </box>
          )}
          <box orientation={Gtk.Orientation.VERTICAL}>
            <label
              class="summary"
              halign={Gtk.Align.START}
              xalign={0}
              label={safeNotification.summary}
              ellipsize={Pango.EllipsizeMode.END}
            />
            {safeNotification.body && (
              <label
                class="body"
                wrap
                useMarkup
                halign={Gtk.Align.START}
                xalign={0}
                justify={Gtk.Justification.FILL}
                label={safeNotification.body}
              />
            )}
          </box>
        </box>
        {Array.isArray(safeNotification.actions) && safeNotification.actions.length > 0 && (
          <box class="actions">
            {safeNotification.actions.map(({ label, id }: { label: string; id: string }) => (
              <button 
                hexpand 
                onClicked={() => {
                  try {
                    safeNotification.invoke(id)
                  } catch (error) {
                    console.warn("Error invoking notification action:", error)
                  }
                }}
              >
                <label label={label || "Action"} halign={Gtk.Align.CENTER} hexpand />
              </button>
            ))}
          </box>
        )}
      </box>
    </Adw.Clamp>
  )
}

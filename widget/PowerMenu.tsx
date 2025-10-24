import { Astal, Gtk } from "ags/gtk4"
import GLib from "gi://GLib"

export default function PowerMenu() {
  let win: Astal.Window

  function runCommand(command: string) {
    try {
      // Use async spawn so UI doesn't block. Commands may require privileges.
      GLib.spawn_command_line_async(command)
    } catch (e) {
      // Best-effort: log error
      console.error("PowerMenu command failed:", e)
    }
  }

  function onReboot() {
    win.hide()
    // normal reboot
    runCommand("systemctl reboot")
  }

  function onHibernate() {
    win.hide()
    // many systems require privileges for hibernate; try systemctl
    runCommand("systemctl hibernate")
  }

  function onSleep() {
    win.hide()
    runCommand("systemctl suspend")
  }

  function onLock() {
    win.hide()
    // hyprlock is a common locker for Hyprland; call it directly
    runCommand("hyprlock")
  }

  function onCancel() {
    win.hide()
  }

  return (
    <window
      $={(ref) => (win = ref)}
      name="powermenu"
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8} cssClasses={["power-menu"]}>
        <label label="Power" cssClasses={["power-menu-title"]} />
        <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <button onClicked={onReboot} cssClasses={["power-btn"]}>
            <box spacing={8}>
              <image iconName="system-reboot" iconSize={Gtk.IconSize.LARGE} />
              <label label="Reboot" />
            </box>
          </button>
          <button onClicked={onHibernate} cssClasses={["power-btn"]}>
            <box spacing={8}>
              <image iconName="system-suspend-hibernate" iconSize={Gtk.IconSize.LARGE} />
              <label label="Hibernate" />
            </box>
          </button>
          <button onClicked={onSleep} cssClasses={["power-btn"]}>
            <box spacing={8}>
              <image iconName="media-playback-pause" iconSize={Gtk.IconSize.LARGE} />
              <label label="Sleep" />
            </box>
          </button>
        </box>
        <button onClicked={onLock} cssClasses={["power-btn"]}>
          <box spacing={8}>
            <image iconName="object-locked" iconSize={Gtk.IconSize.LARGE} />
            <label label="Lock" />
          </box>
        </button>
        <Gtk.Separator />
        <button onClicked={onCancel} cssClasses={["power-cancel"]}>
          <label label="Cancel" />
        </button>
      </box>
    </window>
  )
}

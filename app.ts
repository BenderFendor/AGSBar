import app from "ags/gtk4/app"
import style from "./style.scss"
import css from "./colors.css"
import Bar from "./widget/Bar"
import NotificationPopups from "./widget/notifypopup"
import Applauncher from "./widget/Applauncher"
import { preloadWallpapersAsync } from "./widget/wallpaperpicker"
import GLib from "gi://GLib"
import Gtk from "gi://Gtk?version=4.0"

let applauncher: Gtk.Window

app.apply_css("./colors.css")

app.start({
  css: style,
  gtkTheme: "adw-gtk3",
  requestHandler(request, res) {
    const [, argv] = GLib.shell_parse_argv(request)
    if (!argv) return res("argv parse error")

    switch (argv[0]) {
      case "toggle":
        if (!applauncher) {
          return res("applauncher not initialized yet")
        }
        applauncher.visible = !applauncher.visible
        return res("ok")
      default:
        return res("unknown command")
    }
  },
  main() {
    // Initialize applauncher first so it's available for requests
    applauncher = Applauncher() as Gtk.Window
    app.add_window(applauncher)
    
    app.get_monitors().map(Bar)
    NotificationPopups()
    
    // Start wallpaper preloading in background
    preloadWallpapersAsync().then(() => {
      console.log("[App] Wallpapers preloaded successfully")
    }).catch((error) => {
      console.error("[App] Wallpaper preloading failed:", error)
    })
  },
})


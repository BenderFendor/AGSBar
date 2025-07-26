import app from "ags/gtk4/app"
import style from "./style.scss"
import css from "./colors.css"
import Bar from "./widget/Bar"
import NotificationPopups from "./widget/notifypopup"
import { preloadWallpapersAsync } from "./widget/wallpaperpicker"

app.apply_css("./colors.css")

app.start({
  css: style,
  gtkTheme: "adw-gtk3",
  main() {
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


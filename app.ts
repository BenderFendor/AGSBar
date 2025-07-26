import app from "ags/gtk4/app"
import style from "./style.scss"
import css from "./colors.css"
import Bar from "./widget/Bar"
import NotificationPopups from "./widget/notifypopup"
import WallpaperPicker from "./widget/wallpaperpicker"

app.apply_css("./colors.css")

app.start({
  css: style,
  gtkTheme: "adw-gtk3",
  main() {
    app.get_monitors().map(Bar)
    NotificationPopups()
    WallpaperPicker()
  },
})


import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import GdkPixbuf from "gi://GdkPixbuf"
import Astal from "gi://Astal?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import Gio from "gi://Gio"
import { execAsync } from "ags/process"
import { createBinding, For, createState } from "ags"

// Configuration variables
const WALLPAPER_DIR = GLib.get_home_dir() + "/Walls"
const cachePath = `${GLib.get_user_cache_dir()}/ags-wallpapers`
const imageFormats = [".jpeg", ".jpg", ".webp", ".png"]

// Ensure cache directory exists
function ensureDirectory(path: string) {
  if (!GLib.file_test(path, GLib.FileTest.IS_DIR)) {
    GLib.mkdir_with_parents(path, 0o755)
  }
}

function getWallpaperList(path: string): string[] {
  console.log(`[WallpaperPicker] Scanning directory: ${path}`)
  
  try {
    // Check if directory exists
    if (!GLib.file_test(path, GLib.FileTest.IS_DIR)) {
      console.error(`[WallpaperPicker] Directory does not exist: ${path}`)
      return []
    }

    const dir = Gio.file_new_for_path(path)
    const fileEnum = dir.enumerate_children(
      "standard::name",
      Gio.FileQueryInfoFlags.NONE,
      null,
    )

    const files: string[] = []
    let fileInfo = fileEnum.next_file(null)
    while (fileInfo) {
      const fileName = fileInfo.get_name()
      console.log(`[WallpaperPicker] Found file: ${fileName}`)
      if (imageFormats.some((fmt) => fileName.toLowerCase().endsWith(fmt))) {
        files.push(fileName)
        console.log(`[WallpaperPicker] Added image: ${fileName}`)
      }
      fileInfo = fileEnum.next_file(null)
    }
    
    console.log(`[WallpaperPicker] Found ${files.length} wallpaper files`)
    return files
  } catch (error) {
    console.error(`[WallpaperPicker] Error scanning directory: ${error}`)
    return []
  }
}

function cacheImage(
  inputPath: string,
  cachePath: string,
  newWidth: number,
  customName?: string,
): string {
  const baseName = GLib.path_get_basename(inputPath)
  const extension = baseName.split(".").pop()!.toLowerCase()
  const outputFileName = customName ? `${customName}.${extension}` : baseName
  const outputPath = `${cachePath}/${outputFileName}`

  console.log(`[WallpaperPicker] Caching image from ${inputPath} to ${outputPath}`)

  try {
    const pixbuf = GdkPixbuf.Pixbuf.new_from_file(inputPath)
    const aspectRatio = pixbuf.get_width() / pixbuf.get_height()
    const scaledHeight = Math.round(newWidth / aspectRatio)

    const scaledPixbuf = pixbuf.scale_simple(
      newWidth,
      scaledHeight,
      GdkPixbuf.InterpType.BILINEAR,
    )

    const outputFormat = extension === "png" ? "png" : "jpeg"
    scaledPixbuf?.savev(outputPath, outputFormat, [], [])
    console.log(`[WallpaperPicker] Successfully cached: ${outputFileName}`)
    return outputPath
  } catch (error) {
    console.error(`[WallpaperPicker] Failed to cache image ${inputPath}: ${error}`)
    // Create a black placeholder if image loading fails
    const black_pixbuf = GdkPixbuf.Pixbuf.new(
      GdkPixbuf.Colorspace.RGB,
      true,
      8,
      newWidth,
      (newWidth * 9) / 16,
    )
    black_pixbuf.fill(0x0)
    black_pixbuf.savev(outputPath, "jpeg", [], [])
    console.log(`[WallpaperPicker] Created placeholder for: ${outputFileName}`)
    return outputPath
  }
}

function WallpaperPicker() {
  console.log(`[WallpaperPicker] Initializing wallpaper picker`)
  console.log(`[WallpaperPicker] Default wallpaper directory: ${WALLPAPER_DIR}`)
  console.log(`[WallpaperPicker] Cache directory: ${cachePath}`)
  
  ensureDirectory(cachePath)
  
  const [wallpaperPath, setWallpaperPath] = createState(WALLPAPER_DIR)
  const [wallpapers, setWallpapers] = createState<string[]>([])
  const [isLoading, setIsLoading] = createState(true)

  // Load wallpapers when path changes
  const loadWallpapers = (path: string) => {
    console.log(`[WallpaperPicker] Loading wallpapers from: ${path}`)
    setIsLoading(true)
    
    // Use setTimeout to make it async and allow UI to update
    setTimeout(() => {
      const wallpaperList = getWallpaperList(path)
      console.log(`[WallpaperPicker] Retrieved ${wallpaperList.length} wallpapers`)
      
      // Cache images that aren't already cached
      const wallpapersToCache = wallpaperList.filter(
        (image) => !GLib.file_test(`${cachePath}/${image}`, GLib.FileTest.EXISTS),
      )
      
      console.log(`[WallpaperPicker] Need to cache ${wallpapersToCache.length} images`)

      wallpapersToCache.forEach((image) => {
        console.log(`[WallpaperPicker] Caching image: ${image}`)
        cacheImage(`${path}/${image}`, cachePath, 200)
      })

      setWallpapers(wallpaperList)
      setIsLoading(false)
      console.log(`[WallpaperPicker] Finished loading wallpapers. Final count: ${wallpaperList.length}`)
      console.log(`[WallpaperPicker] Wallpaper list:`, wallpaperList)
    }, 100)
  }

  // Initial load
  console.log(`[WallpaperPicker] Starting initial load for path: ${wallpaperPath.get()}`)
  loadWallpapers(wallpaperPath.get())

  return (
    <window
      name="wallpaperpicker"
      visible={false}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.TOP}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT}
      application={app}
      widthRequest={800}
      heightRequest={600}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        marginTop={16}
        marginBottom={16}
        marginStart={16}
        marginEnd={16}
      >
        {/* Header */}
        <box spacing={8}>
          <label label="Wallpaper Picker" hexpand />
          <button
            onClicked={() => {
              const folderChooser = new Gtk.FileDialog({
                title: "Choose Wallpaper Folder",
                initialFolder: Gio.file_new_for_path(wallpaperPath.get()),
              })

              folderChooser.select_folder(null, null, (_, res) => {
                try {
                  const result = folderChooser.select_folder_finish(res)
                  if (result && result.get_path()) {
                    const newPath = result.get_path()!
                    setWallpaperPath(newPath)
                    loadWallpapers(newPath)
                  }
                } catch (e) {
                  console.error("Folder selection failed:", e)
                }
              })
            }}
          >
            <image iconName="folder-symbolic" />
          </button>
          <button
            onClicked={() => {
              if (GLib.file_test(cachePath, GLib.FileTest.IS_DIR)) {
                execAsync(`rm -rf ${cachePath}`)
                  .then(() => {
                    ensureDirectory(cachePath)
                    loadWallpapers(wallpaperPath.get())
                  })
              }
            }}
          >
            <image iconName="user-trash-full-symbolic" />
          </button>
          <button
            onClicked={() => {
              const window = app.get_window("wallpaperpicker")
              if (window) window.visible = false
            }}
          >
            <image iconName="window-close-symbolic" />
          </button>
        </box>

        {/* Current path */}
        <label 
          label={wallpaperPath((p) => `Path: ${p}`)} 
          halign={Gtk.Align.START}
          cssClasses={["directory"]}
        />

        <Gtk.Separator />

        {/* Wallpaper grid */}
        <Gtk.ScrolledWindow vexpand>
          <Gtk.FlowBox
            selectionMode={Gtk.SelectionMode.NONE}
            columnSpacing={8}
            rowSpacing={8}
            homogeneous
          >
            {isLoading((loading) => {
              console.log(`[WallpaperPicker] Loading state: ${loading}`)
              return loading
            }) ? (
              <label label="Loading wallpapers..." />
            ) : (
              <For each={wallpapers}>
                {(wallpaper) => {
                  console.log(`[WallpaperPicker] Rendering wallpaper: ${wallpaper}`)
                  return (
                    <button
                      onClicked={() => {
                        const fullPath = `${wallpaperPath.get()}/${wallpaper}`
                        console.log(`[WallpaperPicker] Setting wallpaper: ${fullPath}`)
                        execAsync([
                          "swww",
                          "img",
                          "--transition-type",
                          "random",
                          fullPath,
                        ]).then(() => {
                          console.log(`Set wallpaper to: ${fullPath}`)
                          const window = app.get_window("wallpaperpicker")
                          if (window) window.visible = false
                        }).catch((error) => {
                          console.error("Failed to set wallpaper:", error)
                        })
                      }}
                    >
                      <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        <Gtk.Picture
                          widthRequest={180}
                          heightRequest={120}
                          contentFit={Gtk.ContentFit.COVER}
                          file={Gio.file_new_for_path(`${cachePath}/${wallpaper}`)}
                        />
                        <label 
                          label={wallpaper} 
                          maxWidthChars={20}
                          ellipsize={3} // PANGO_ELLIPSIZE_END
                        />
                      </box>
                    </button>
                  )
                }}
              </For>
            )}
          </Gtk.FlowBox>
        </Gtk.ScrolledWindow>
      </box>
    </window>
  )
}

export function toggleWallpaperPicker() {
  const window = app.get_window("wallpaperpicker")
  if (window) {
    window.visible = !window.visible
  } else {
    WallpaperPicker()
  }
}

export default WallpaperPicker

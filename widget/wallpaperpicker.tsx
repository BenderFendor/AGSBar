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

// Pre-load wallpapers function
async function preloadWallpapers(path: string): Promise<string[]> {
  console.log(`[WallpaperPicker] Pre-loading wallpapers from: ${path}`)
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const wallpaperList = getWallpaperList(path)
      console.log(`[WallpaperPicker] Pre-loaded ${wallpaperList.length} wallpapers`)
      
      // Cache images that aren't already cached
      const wallpapersToCache = wallpaperList.filter(
        (image) => !GLib.file_test(`${cachePath}/${image}`, GLib.FileTest.EXISTS),
      )
      
      console.log(`[WallpaperPicker] Need to cache ${wallpapersToCache.length} images`)

      wallpapersToCache.forEach((image) => {
        console.log(`[WallpaperPicker] Caching image: ${image}`)
        cacheImage(`${path}/${image}`, cachePath, 200)
      })
      
      console.log(`[WallpaperPicker] Pre-loading complete. Final count: ${wallpaperList.length}`)
      resolve(wallpaperList)
    }, 100)
  })
}

function WallpaperPicker(initialWallpapers: string[] = [], initialPath: string = WALLPAPER_DIR) {
  console.log(`[WallpaperPicker] Initializing wallpaper picker with ${initialWallpapers.length} wallpapers`)
  console.log(`[WallpaperPicker] Path: ${initialPath}`)
  console.log(`[WallpaperPicker] Cache directory: ${cachePath}`)
  
  ensureDirectory(cachePath)
  
  const [wallpaperPath, setWallpaperPath] = createState(initialPath)
  const [wallpapers, setWallpapers] = createState<string[]>(initialWallpapers)
  const [isLoading, setIsLoading] = createState(false) // Start with false since we pre-loaded

  // Load wallpapers when path changes
  const loadWallpapers = async (path: string) => {
    console.log(`[WallpaperPicker] Loading wallpapers from: ${path}`)
    setIsLoading(true)
    
    const wallpaperList = await preloadWallpapers(path)
    setWallpapers(wallpaperList)
    setIsLoading(false)
    console.log(`[WallpaperPicker] Finished loading wallpapers. Final count: ${wallpaperList.length}`)
  }

  const wallpaperWindow = (
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

        {/* Status */}
        <label 
          label={`Found ${wallpapers.get().length} wallpapers`}
          halign={Gtk.Align.START}
        />

        {/* Wallpaper grid */}
        <Gtk.ScrolledWindow vexpand>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            {isLoading.get() ? (
              <label label="Loading wallpapers..." />
            ) : wallpapers.get().length === 0 ? (
              <label label="No wallpapers found in this directory" />
            ) : (
              wallpapers.get().map((wallpaper, index) => {
                console.log(`[WallpaperPicker] Creating button for wallpaper ${index}: ${wallpaper}`)
                const cachePath_file = `${cachePath}/${wallpaper}`
                return (
                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <button
                      widthRequest={200}
                      heightRequest={140}
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
                          file={Gio.file_new_for_path(cachePath_file)}
                        />
                        <label 
                          label={wallpaper} 
                          maxWidthChars={25}
                          ellipsize={3} // PANGO_ELLIPSIZE_END
                          halign={Gtk.Align.CENTER}
                        />
                      </box>
                    </button>
                  </box>
                )
              })
            )}
          </box>
        </Gtk.ScrolledWindow>
      </box>
    </window>
  )
  
  return wallpaperWindow
}

export function toggleWallpaperPicker() {
  console.log(`[WallpaperPicker] Toggle called`)
  const window = app.get_window("wallpaperpicker")
  console.log(`[WallpaperPicker] Found window:`, window)
  if (window) {
    console.log(`[WallpaperPicker] Toggling visibility. Current: ${window.visible}`)
    window.visible = !window.visible
  } else {
    console.log(`[WallpaperPicker] Creating new wallpaper picker window with preloaded data`)
    console.log(`[WallpaperPicker] Current preloaded count: ${preloadedWallpapers.length}`)
    
    // If wallpapers aren't preloaded yet, preload them first
    if (preloadedWallpapers.length === 0 && !isPreloading) {
      console.log(`[WallpaperPicker] No preloaded wallpapers, preloading now...`)
      preloadWallpapersAsync().then((wallpapers) => {
        console.log(`[WallpaperPicker] Preloading finished, creating window with ${wallpapers.length} wallpapers`)
        WallpaperPicker(wallpapers, WALLPAPER_DIR)
        const newWindow = app.get_window("wallpaperpicker")
        if (newWindow) newWindow.visible = true
      })
    } else {
      WallpaperPicker(preloadedWallpapers, WALLPAPER_DIR)
      const newWindow = app.get_window("wallpaperpicker")
      if (newWindow) newWindow.visible = true
    }
  }
}

let preloadedWallpapers: string[] = []
let isPreloading = false

export async function preloadWallpapersAsync() {
  if (isPreloading || preloadedWallpapers.length > 0) {
    console.log("[WallpaperPicker] Already preloaded or preloading")
    return preloadedWallpapers
  }
  
  isPreloading = true
  console.log("[WallpaperPicker] Starting background preload")
  preloadedWallpapers = await preloadWallpapers(WALLPAPER_DIR)
  isPreloading = false
  console.log(`[WallpaperPicker] Background preload complete: ${preloadedWallpapers.length} wallpapers`)
  return preloadedWallpapers
}

export default WallpaperPicker

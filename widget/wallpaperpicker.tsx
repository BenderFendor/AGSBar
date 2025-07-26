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

  // Calculate responsive image sizes based on window size
  const windowWidth = Math.floor(1920 * 0.8) // Smaller window - 30% instead of 50%
  const windowHeight = Math.floor(1080 * 0.8)
  const padding = 32 // Total padding around grid
  const spacing = 12 // Spacing between images
  const headerHeight = 40 + 32 + 40 // Header + controls + other elements
  
  // Calculate available space for grid
  const availableWidth = windowWidth - padding * 2 // Left and right padding
  const availableHeight = windowHeight - headerHeight - 80 // Top elements and bottom padding
  
  // Calculate image sizes (3 columns, 2 rows)
  const imageWidth = Math.floor((availableWidth - spacing * 2) / 3) // 3 columns with 2 gaps
  const imageHeight = Math.floor((availableHeight - spacing * 1) / 2) // 2 rows with 1 gap
  
  // Keep aspect ratio reasonable
  const maxImageHeight = Math.floor(imageWidth * 0.6) // 16:9.6 ratio roughly
  const finalImageHeight = Math.min(imageHeight, maxImageHeight)

  const wallpaperWindow = (
    <window
      name="wallpaperpicker"
      visible={false}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.TOP}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT | Astal.WindowAnchor.BOTTOM}
      application={app}
      widthRequest={windowWidth}
      heightRequest={windowHeight}
      cssClasses={["wallpaper-picker-window"]}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        spacing={0}
        cssClasses={["wallpaper-picker-container"]}
      >
        {/* Header */}
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={0}
          cssClasses={["wallpaper-header"]}
          heightRequest={40}
        >
          {/* Empty space to center title with close button offset */}
          <box widthRequest={24} />
          
          <label 
            label="Wallpaper Gallery" 
            hexpand 
            halign={Gtk.Align.CENTER}
            cssClasses={["wallpaper-header-title"]}
          />
          
          <button
            cssClasses={["wallpaper-close-btn"]}
            widthRequest={24}
            heightRequest={24}
            onClicked={() => {
              const window = app.get_window("wallpaperpicker")
              if (window) window.visible = false
            }}
          >
            <label label="✕" cssClasses={["close-btn-x"]} />
          </button>
        </box>

        {/* Controls Section */}
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={8}
          marginTop={8}
          marginBottom={8}
          marginStart={16}
          marginEnd={16}
        >
          <button
            cssClasses={["wallpaper-control-btn"]}
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
            cssClasses={["wallpaper-control-btn"]}
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
        </box>

        {/* Current path */}
        <label 
          label={wallpaperPath.as(p => `Path: ${p}`)} 
          halign={Gtk.Align.START}
          marginStart={16}
          marginEnd={16}
          cssClasses={["directory"]}
        />

        <Gtk.Separator marginTop={4} marginBottom={4} />

        {/* Status */}
        <label 
          label={wallpapers.as(list => `Found ${list.length} wallpapers`)}
          halign={Gtk.Align.START}
          marginStart={16}
          marginEnd={16}
          marginBottom={8}
        />

        {/* Scrollable Grid Layout */}
        <Gtk.ScrolledWindow
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
          marginStart={16}
          marginEnd={16}
          marginBottom={16}
        >
          <Gtk.FlowBox
            selectionMode={Gtk.SelectionMode.NONE}
            homogeneous={true}
            maxChildrenPerLine={3}
            minChildrenPerLine={3}
            rowSpacing={8}
            columnSpacing={8}
            halign={Gtk.Align.CENTER}
          >
            <For each={wallpapers}>
              {(wallpaper: string) => (
                <button
                  widthRequest={imageWidth}
                  heightRequest={finalImageHeight}
                  cssClasses={["wallpaper-grid-btn"]}
                  onClicked={() => {
                    const fullPath = `${wallpaperPath.get()}/${wallpaper}`
                    console.log(`[WallpaperPicker] Setting wallpaper: ${fullPath}`)
                    execAsync([
                      "matugen", // Use matugen for setting wallpaper
                      "image",
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
                      widthRequest={imageWidth - 10}
                      heightRequest={finalImageHeight - 30}
                      contentFit={Gtk.ContentFit.COVER}
                      file={Gio.file_new_for_path(`${cachePath}/${wallpaper}`)}
                    />
                    <label 
                      label={wallpaper} 
                      maxWidthChars={15}
                      ellipsize={3}
                      halign={Gtk.Align.CENTER}
                      cssClasses={["wallpaper-filename"]}
                    />
                  </box>
                </button>
              )}
            </For>
          </Gtk.FlowBox>
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
    if (window.visible) {
      // Add closing animation
      window.cssClasses = ["wallpaper-picker-window", "closing"]
      setTimeout(() => {
        window.visible = false
        window.cssClasses = ["wallpaper-picker-window"]
      }, 200)
    } else {
      // Add opening animation
      window.cssClasses = ["wallpaper-picker-window", "opening"]
      window.visible = true
      setTimeout(() => {
        window.cssClasses = ["wallpaper-picker-window"]
      }, 300)
    }
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
        if (newWindow) {
          newWindow.cssClasses = ["wallpaper-picker-window", "opening"]
          newWindow.visible = true
          setTimeout(() => {
            newWindow.cssClasses = ["wallpaper-picker-window"]
          }, 300)
        }
      })
    } else {
      WallpaperPicker(preloadedWallpapers, WALLPAPER_DIR)
      const newWindow = app.get_window("wallpaperpicker")
      if (newWindow) {
        newWindow.cssClasses = ["wallpaper-picker-window", "opening"]
        newWindow.visible = true
        setTimeout(() => {
          newWindow.cssClasses = ["wallpaper-picker-window"]
        }, 300)
      }
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

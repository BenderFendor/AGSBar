import { For, createState } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import AstalApps from "gi://AstalApps"
import Graphene from "gi://Graphene"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import GdkPixbuf from "gi://GdkPixbuf"

const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor

interface SearchResult {
  type: 'app' | 'file'
  app?: AstalApps.Application
  path?: string
  name: string
  icon: string
  displayName?: string
}

const CACHE_FILE = GLib.get_home_dir() + "/.cache/ags-launcher-cache.json"

function getFileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  
  if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
    return 'folder'
  }
  
  switch (ext) {
    case 'txt': case 'md': case 'readme': return 'text-x-generic'
    case 'pdf': return 'application-pdf'
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': return 'image-x-generic'
    case 'mp3': case 'wav': case 'flac': case 'ogg': return 'audio-x-generic'
    case 'mp4': case 'avi': case 'mkv': case 'mov': return 'video-x-generic'
    case 'zip': case 'tar': case 'gz': case '7z': return 'package-x-generic'
    case 'js': case 'ts': case 'py': case 'cpp': case 'c': case 'h': return 'text-x-script'
    case 'html': case 'css': case 'xml': return 'text-html'
    case 'json': case 'yaml': case 'toml': return 'text-x-generic'
    default: return 'text-x-generic'
  }
}

function getDisplayName(path: string): string {
  const name = GLib.path_get_basename(path)
  const dir = GLib.path_get_dirname(path)
  const homeDir = GLib.get_home_dir()
  
  // Replace home directory with ~
  const displayDir = dir.replace(homeDir, '~')
  
  return `${name} (${displayDir})`
}

function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'xpm'].includes(ext || '')
}

function isVideoFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv', 'mpg', 'mpeg'].includes(ext || '')
}

function isPdfFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ext === 'pdf'
}

function createAsyncImagePreview(path: string): Gtk.Widget {
  const image = new Gtk.Image()
  image.set_from_icon_name("image-loading")
  image.set_icon_size(Gtk.IconSize.LARGE)
  
  // Load image directly without Tumbler dependency
  GLib.timeout_add(GLib.PRIORITY_LOW, 10, () => {
    try {
      // Generate thumbnail path using FreeDesktop specification
      const fileUri = `file://${path}`
      const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, fileUri, -1)
      const thumbDir = GLib.get_user_cache_dir() + '/thumbnails/large'
      const thumbPath = `${thumbDir}/${hash}.png`
      
      // Check if cached thumbnail already exists
      if (GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
        try {
          const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumbPath, 400, 400, true)
          image.set_from_pixbuf(pixbuf)
          image.set_size_request(400, 400)
          return false
        } catch (error) {
          console.warn(`Failed to load cached thumbnail: ${error}`)
        }
      }
      
      // Create thumbnail cache directory if it doesn't exist
      GLib.mkdir_with_parents(thumbDir, 0o755)
      
      // Try to request thumbnail via D-Bus (Thunar/system thumbnails)
      try {
        const bus = Gio.bus_get_sync(Gio.BusType.SESSION, null)
        if (bus) {
          console.log(`Requesting D-Bus thumbnail for image: ${fileUri}`)
          // Correct D-Bus call signature: (asasssu)
          const variant = GLib.Variant.new('(asasssu)', [
            [fileUri],         // uris (array of strings)
            ['image/jpeg'],    // mime_types (array of strings) - generic image type
            'large',           // flavor (string)
            'default',         // scheduler (string)
            0                  // handle_to_unqueue (uint32)
          ])
          
          bus.call(
            'org.freedesktop.thumbnails.Thumbnailer1',
            '/org/freedesktop/thumbnails/Thumbnailer1',
            'org.freedesktop.thumbnails.Thumbnailer1',
            'Queue',
            variant,
            null,
            Gio.DBusCallFlags.NO_AUTO_START,
            -1,
            null,
            null
          )
          
          // Poll for D-Bus generated thumbnail
          let attempts = 0
          const maxAttempts = 50 // 5 seconds
          
          const checkThumbnail = () => {
            attempts++
            if (GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
              try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumbPath, 400, 400, true)
                image.set_from_pixbuf(pixbuf)
                image.set_size_request(400, 400)
              } catch (error) {
                console.warn(`Failed to load D-Bus thumbnail: ${error}`)
                image.set_from_icon_name("image-x-generic")
                image.set_icon_size(Gtk.IconSize.LARGE)
              }
              return false // Stop polling
            } else if (attempts >= maxAttempts) {
              // Timeout - fallback to generic icon
              image.set_from_icon_name("image-x-generic")
              image.set_icon_size(Gtk.IconSize.LARGE)
              return false
            }
            return true // Continue polling
          }
          
          GLib.timeout_add(GLib.PRIORITY_LOW, 100, checkThumbnail)
        } else {
          image.set_from_icon_name("image-x-generic")
          image.set_icon_size(Gtk.IconSize.LARGE)
        }
      } catch (dbusError) {
        console.warn(`D-Bus thumbnailing failed: ${dbusError}`)
        image.set_from_icon_name("image-x-generic")
        image.set_icon_size(Gtk.IconSize.LARGE)
      }
      
      // COMMENTED OUT: Direct pixbuf loading for testing
      // try {
      //   const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 400, 400, true)
      //   image.set_from_pixbuf(pixbuf)
      //   image.set_size_request(400, 400)
      //   
      //   // Save thumbnail to cache for future use
      //   try {
      //     pixbuf.savev(thumbPath, 'png', [], [])
      //   } catch (saveError) {
      //     console.warn(`Failed to save thumbnail cache: ${saveError}`)
      //   }
      // } catch (error) {
      //   console.warn(`Failed to load image preview for ${path}:`, error)
      //   image.set_from_icon_name("image-x-generic")
      //   image.set_icon_size(Gtk.IconSize.LARGE)
      // }
    } catch (error) {
      console.warn(`Image preview failed for ${path}:`, error)
      image.set_from_icon_name("image-x-generic")
      image.set_icon_size(Gtk.IconSize.LARGE)
    }
    return false // Don't repeat
  })
  
  return image
}

function createAsyncVideoThumbnail(path: string): Gtk.Widget {
  const image = new Gtk.Image()
  image.set_from_icon_name("video-x-generic")
  image.set_icon_size(Gtk.IconSize.LARGE)
  
  // Load video thumbnail using D-Bus or fallback to FFmpeg
  GLib.timeout_add(GLib.PRIORITY_LOW, 10, () => {
    try {
      // Generate thumbnail path using FreeDesktop specification
      const fileUri = `file://${path}`
      const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, fileUri, -1)
      const thumbDir = GLib.get_user_cache_dir() + '/thumbnails/large'
      const thumbPath = `${thumbDir}/${hash}.png`
      
      // Check if cached thumbnail already exists
      if (GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
        try {
          const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumbPath, 400, 400, true)
          image.set_from_pixbuf(pixbuf)
          image.set_size_request(400, 400)
          return false
        } catch (error) {
          console.warn(`Failed to load cached thumbnail: ${error}`)
        }
      }
      
      // Create thumbnail cache directory
      GLib.mkdir_with_parents(thumbDir, 0o755)
      
      // Try D-Bus thumbnailing (supports both images and videos)
      try {
        const bus = Gio.bus_get_sync(Gio.BusType.SESSION, null)
        if (bus) {
          console.log(`Requesting D-Bus thumbnail for video: ${fileUri}`)
          // Correct D-Bus call signature: (asasssu)
          const variant = GLib.Variant.new('(asasssu)', [
            [fileUri],      // uris (array of strings)
            ['video/mp4'],  // mime_types (array of strings) - we'll use generic video/mp4
            'large',        // flavor (string)
            'default',      // scheduler (string)
            0               // handle_to_unqueue (uint32)
          ])
          
          // Try the call and log any errors
          try {
            bus.call(
              'org.freedesktop.thumbnails.Thumbnailer1',
              '/org/freedesktop/thumbnails/Thumbnailer1',
              'org.freedesktop.thumbnails.Thumbnailer1',
              'Queue',
              variant,
              null,
              Gio.DBusCallFlags.NONE, // Changed from NO_AUTO_START to allow service activation
              5000, // 5 second timeout
              null,
              null
            )
            console.log(`D-Bus thumbnail request sent for: ${fileUri}`)
          } catch (callError) {
            console.warn(`D-Bus call failed: ${callError}`)
            
            // Try alternative: use tumbler directly if available
            try {
              console.log(`Trying tumbler command fallback for: ${path}`)
              const tumblerCmd = `tumbler "${path}"`
              GLib.spawn_command_line_async(tumblerCmd)
            } catch (tumblerError) {
              console.warn(`Tumbler command also failed: ${tumblerError}`)
            }
          }
          
          // Poll for D-Bus generated thumbnail
          let attempts = 0
          const maxAttempts = 50 // 5 seconds
          
          const checkThumbnail = () => {
            attempts++
            if (GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
              console.log(`Found thumbnail for video: ${thumbPath}`)
              try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumbPath, 400, 400, true)
                image.set_from_pixbuf(pixbuf)
                image.set_size_request(400, 400)
              } catch (error) {
                console.warn(`Failed to load D-Bus thumbnail: ${error}`)
                image.set_from_icon_name("video-x-generic")
                image.set_icon_size(Gtk.IconSize.LARGE)
              }
              return false // Stop polling
            } else if (attempts >= maxAttempts) {
              console.warn(`Timeout waiting for video thumbnail: ${thumbPath}`)
              // Timeout - show generic icon (no FFmpeg fallback for testing)
              image.set_from_icon_name("video-x-generic")
              image.set_icon_size(Gtk.IconSize.LARGE)
              return false
            }
            return true // Continue polling
          }
          
          GLib.timeout_add(GLib.PRIORITY_LOW, 100, checkThumbnail)
        } else {
          console.warn("Failed to get D-Bus session bus")
          image.set_from_icon_name("video-x-generic")
          image.set_icon_size(Gtk.IconSize.LARGE)
        }
      } catch (dbusError) {
        console.warn(`D-Bus thumbnailing failed: ${dbusError}`)
        image.set_from_icon_name("video-x-generic")
        image.set_icon_size(Gtk.IconSize.LARGE)
      }
      
      // COMMENTED OUT: FFmpeg fallback for testing
      // function fallbackToFFmpeg() {
      //   const tempFile = `/tmp/video_thumb_${Date.now()}.png`
      //   const cmd = `ffmpeg -i "${path}" -ss 00:00:01.000 -vframes 1 -y "${tempFile}" 2>/dev/null`
      //   
      //   try {
      //     const [success] = GLib.spawn_command_line_sync(cmd)
      //     if (success && GLib.file_test(tempFile, GLib.FileTest.EXISTS)) {
      //       try {
      //         const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(tempFile, 400, 400, true)
      //         image.set_from_pixbuf(pixbuf)
      //         image.set_size_request(400, 400)
      //         
      //         // Copy to cache
      //         try {
      //           pixbuf.savev(thumbPath, 'png', [], [])
      //         } catch (saveError) {
      //           console.warn(`Failed to save FFmpeg thumbnail: ${saveError}`)
      //         }
      //       } catch (loadError) {
      //         console.warn(`Failed to load FFmpeg thumbnail: ${loadError}`)
      //         image.set_from_icon_name("video-x-generic")
      //         image.set_icon_size(Gtk.IconSize.LARGE)
      //       }
      //       
      //       // Clean up temp file
      //       try {
      //         GLib.unlink(tempFile)
      //       } catch (unlinkError) {
      //         console.warn(`Failed to cleanup temp file: ${unlinkError}`)
      //       }
      //     } else {
      //       image.set_from_icon_name("video-x-generic")
      //       image.set_icon_size(Gtk.IconSize.LARGE)
      //     }
      //   } catch (ffmpegError) {
      //     console.warn(`FFmpeg thumbnail generation failed: ${ffmpegError}`)
      //     image.set_from_icon_name("video-x-generic")
      //     image.set_icon_size(Gtk.IconSize.LARGE)
      //   }
      // }
      
    } catch (error) {
      console.warn(`Video thumbnail generation failed for ${path}:`, error)
      image.set_from_icon_name("video-x-generic")
      image.set_icon_size(Gtk.IconSize.LARGE)
    }
    return false
  })
  
  return image
}

function createAsyncPreview(path: string): Gtk.Widget {
  if (isImageFile(path)) {
    return createAsyncImagePreview(path)
  } else if (isVideoFile(path) || isPdfFile(path)) {
    return createAsyncVideoThumbnail(path) // Use same function for videos and PDFs
  } else {
    const image = new Gtk.Image()
    image.set_from_icon_name(getFileIcon(path))
    image.set_icon_size(Gtk.IconSize.LARGE)
    return image
  }
}

function loadRecentApps(): AstalApps.Application[] {
  try {
    if (!GLib.file_test(CACHE_FILE, GLib.FileTest.EXISTS)) {
      return []
    }
    
    const [success, contents] = GLib.file_get_contents(CACHE_FILE)
    if (!success || !contents) return []
    
    const data = JSON.parse(contents.toString())
    const apps = new AstalApps.Apps()
    
    return data.recentApps?.map((appName: string) => 
      apps.get_applications().find((app: AstalApps.Application) => app.name === appName)
    ).filter(Boolean) || []
  } catch (error) {
    console.error('Error loading recent apps:', error)
    return []
  }
}

function saveRecentApp(app: AstalApps.Application) {
  try {
    let recentApps: string[] = []
    
    // Load existing cache
    if (GLib.file_test(CACHE_FILE, GLib.FileTest.EXISTS)) {
      const [success, contents] = GLib.file_get_contents(CACHE_FILE)
      if (success && contents) {
        const data = JSON.parse(contents.toString())
        recentApps = data.recentApps || []
      }
    }
    
    // Remove if already exists and add to front
    recentApps = recentApps.filter(name => name !== app.name)
    recentApps.unshift(app.name)
    
    // Keep only last 5
    recentApps = recentApps.slice(0, 5)
    
    // Save cache
    const data = { recentApps }
    GLib.file_set_contents(CACHE_FILE, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving recent app:', error)
  }
}

export default function Applauncher() {
  let contentbox: Gtk.Box
  let searchentry: Gtk.Entry
  let win: Astal.Window

  const apps = new AstalApps.Apps()
  const [list, setList] = createState(new Array<SearchResult>())
  const [selectedIndex, setSelectedIndex] = createState(0)
  const [windowWidth, setWindowWidth] = createState(800)
  const [visibleStartIndex, setVisibleStartIndex] = createState(0)
  const [fileSearchOffset, setFileSearchOffset] = createState(0)
  const [isLoadingMore, setIsLoadingMore] = createState(false)
  const [hasMoreFiles, setHasMoreFiles] = createState(true)

  let currentSearchAbort: (() => void) | null = null
  let scrolledWindow: Gtk.ScrolledWindow
  let currentSearchTerm = ""

  // Track scroll position to update visible start index and load more files
  function updateVisibleStartIndex() {
    if (!scrolledWindow) return
    
    const adjustment = scrolledWindow.get_vadjustment()
    const scrollPosition = adjustment.get_value()
    const itemHeight = 80 // Approximate height per item with larger images
    const startIndex = Math.floor(scrollPosition / itemHeight)
    setVisibleStartIndex(startIndex)
    
    // Check if we need to load more files (infinite scrolling)
    const currentList = list.get()
    const fileResults = currentList.filter(item => item.type === 'file')
    const maxScroll = adjustment.get_upper() - adjustment.get_page_size()
    const scrollPercentage = scrollPosition / maxScroll
    
    // Load more when scrolled 80% and we have files and not already loading
    if (scrollPercentage > 0.8 && 
        fileResults.length >= 40 && 
        !isLoadingMore.get() && 
        hasMoreFiles.get() && 
        currentSearchTerm) {
      loadMoreFiles()
    }
  }

  // Load recent apps when launcher starts empty
  function loadInitialResults() {
    const recentApps = loadRecentApps()
    const recentResults: SearchResult[] = recentApps.map(app => ({
      type: 'app' as const,
      app,
      name: app.name,
      displayName: app.name,
      icon: app.iconName || 'application-x-executable'
    }))
    setList(recentResults)
    setSelectedIndex(0)
    setVisibleStartIndex(0)
    
    // Calculate optimal window width (60% of screen width)
    const maxNameLength = Math.max(...recentResults.map(r => (r.displayName || r.name).length), 20)
    const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
    const screenWidth = 1920 // Default fallback, could be improved with proper screen detection
    const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
    setWindowWidth(calculatedWidth)
  }

  // Load more files for infinite scrolling
  function loadMoreFiles() {
    if (!currentSearchTerm || isLoadingMore.get() || !hasMoreFiles.get()) return
    
    setIsLoadingMore(true)
    const newOffset = fileSearchOffset.get() + 50
    setFileSearchOffset(newOffset)
    
    // Search for more files with increased limit
    searchFiles(currentSearchTerm, newOffset, true)
  }

  async function searchFiles(text: string, offset: number = 0, append: boolean = false): Promise<void> {
    try {
      // Cancel any previous search if this is a new search (not append)
      if (!append && currentSearchAbort) {
        currentSearchAbort()
      }

      let cancelled = false
      if (!append) {
        currentSearchAbort = () => { cancelled = true }
      }

      // Use locate with offset simulation (since locate doesn't have native offset)
      // We'll get more results and slice them in memory for simplicity
      const totalLimit = offset + 50
      const cmd = `locate -i -l ${Math.min(totalLimit, 500)} "${text}"`

      // Start search with a small delay
      GLib.timeout_add(GLib.PRIORITY_LOW, append ? 10 : 50, () => {
        if (cancelled && !append) return false
        
        try {
          const [success, stdout] = GLib.spawn_command_line_sync(cmd)
          if (!success || !stdout || (cancelled && !append)) return false
          
          let allFiles = stdout.toString().trim().split('\n').filter(line => line.length > 0)
          
          // Apply offset manually since locate doesn't support it natively
          const files = allFiles.slice(offset, offset + 50)
          
          // Check if we have fewer files than requested (reached end)
          if (files.length < 50 || allFiles.length < totalLimit) {
            setHasMoreFiles(false)
          }
          
          files.forEach((path, index) => {
            if (cancelled && !append) return
            
            // Add a small delay between each file to make it feel more responsive
            GLib.timeout_add(GLib.PRIORITY_LOW, index * 5, () => {
              if (cancelled && !append) return false
              
              const name = GLib.path_get_basename(path)
              const isDirectory = GLib.file_test(path, GLib.FileTest.IS_DIR)
              
              const fileResult: SearchResult = {
                type: 'file' as const,
                path,
                name: GLib.path_get_basename(path),
                displayName: getDisplayName(path),
                icon: getFileIcon(path)
              }

              // Update the list, avoiding duplicates
              const currentResults = list.get()
              const currentAppResults = currentResults.filter(item => item.type === 'app')
              const currentFileResults = currentResults.filter(item => item.type === 'file')
              
              // Check if this file path already exists
              const isDuplicate = currentFileResults.some(item => item.path === path)
              if (!isDuplicate) {
                const combined = [...currentAppResults, ...currentFileResults, fileResult]
                setList(combined)
                
                // Update window width based on new content (60% of screen)
                const maxNameLength = Math.max(...combined.map(r => (r.displayName || r.name).length), 20)
                const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
                const screenWidth = 1920
                const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
                setWindowWidth(calculatedWidth)
              }
              
              // If this is the last file being processed and we're loading more
              if (append && index === files.length - 1) {
                setIsLoadingMore(false)
              }
              
              return false // Don't repeat
            })
          })
          
          // If no files were added and we're appending, stop loading
          if (append && files.length === 0) {
            setIsLoadingMore(false)
            setHasMoreFiles(false)
          }
          
        } catch (error) {
          console.error('Error with locate search:', error)
          if (append) {
            setIsLoadingMore(false)
          }
        }
        
        return false // Don't repeat
      })

    } catch (error) {
      console.error('Error starting file search:', error)
      if (append) {
        setIsLoadingMore(false)
      }
    }
  }

  async function search(text: string) {
    if (text === "") {
      currentSearchTerm = ""
      setFileSearchOffset(0)
      setHasMoreFiles(true)
      setIsLoadingMore(false)
      loadInitialResults()
      // Cancel any ongoing file search
      if (currentSearchAbort) {
        currentSearchAbort()
        currentSearchAbort = null
      }
      return
    }

    // Reset selection and infinite scroll state when searching
    setSelectedIndex(0)
    setVisibleStartIndex(0)
    setFileSearchOffset(0)
    setHasMoreFiles(true)
    setIsLoadingMore(false)
    currentSearchTerm = text

    // Search apps first and display immediately
    const appResults: SearchResult[] = apps.fuzzy_query(text).slice(0, 6).map((app: AstalApps.Application) => ({
      type: 'app' as const,
      app,
      name: app.name,
      displayName: app.name,
      icon: app.iconName || 'application-x-executable'
    }))

    // Set initial results with just apps
    setList(appResults)
    
    // Update window width based on app names (60% of screen)
    const maxNameLength = Math.max(...appResults.map(r => (r.displayName || r.name).length), 20)
    const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
    const screenWidth = 1920
    const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
    setWindowWidth(calculatedWidth)

    // Start streaming file search (will update the list as results come in)
    searchFiles(text)
  }

  function launch(result?: SearchResult) {
    if (!result) return
    
    win.hide()
    
    if (result.type === 'app' && result.app) {
      saveRecentApp(result.app)
      result.app.launch()
    } else if (result.type === 'file' && result.path) {
      // Use xdg-open to open with default application, detached from AGS process
      try {
        GLib.spawn_async(null, ['xdg-open', result.path], null, 
          GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, 
          null)
      } catch (error) {
        console.error('Error opening file:', error)
      }
    }
  }

  // close on ESC
  // handle arrow keys for navigation and alt + number key
  function onKey(
    _e: Gtk.EventControllerKey,
    keyval: number,
    _: number,
    mod: number,
  ) {
    const currentList = list.get()
    
    if (keyval === Gdk.KEY_Escape) {
      win.visible = false
      return
    }

    // Arrow key navigation
    if (keyval === Gdk.KEY_Down || keyval === Gdk.KEY_j) {
      const newIndex = Math.min(selectedIndex.get() + 1, currentList.length - 1)
      setSelectedIndex(newIndex)
      return
    }

    if (keyval === Gdk.KEY_Up || keyval === Gdk.KEY_k) {
      const newIndex = Math.max(selectedIndex.get() - 1, 0)
      setSelectedIndex(newIndex)
      return
    }

    // Enter key to launch selected item
    if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
      const selected = currentList[selectedIndex.get()]
      if (selected) {
        launch(selected)
      }
      return
    }

    // Alt + number key shortcuts (based on visible items)
    if (mod === Gdk.ModifierType.ALT_MASK) {
      for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
        if (keyval === Gdk[`KEY_${i}`]) {
          const visibleIndex = visibleStartIndex.get() + (i - 1)
          if (visibleIndex < currentList.length) {
            return launch(currentList[visibleIndex])
          }
        }
      }
    }
  }

  // close on clickaway
  function onClick(_e: Gtk.GestureClick, _: number, x: number, y: number) {
    const [, rect] = contentbox.compute_bounds(win)
    const position = new Graphene.Point({ x, y })

    if (!rect.contains_point(position)) {
      win.visible = false
      return true
    }
  }

  return (
    <window
      $={(ref) => (win = ref)}
      name="launcher"
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      onNotifyVisible={({ visible }) => {
        if (visible) searchentry.grab_focus()
        else searchentry.set_text("")
      }}
    >
      <Gtk.EventControllerKey onKeyPressed={onKey} />
      <Gtk.GestureClick onPressed={onClick} />
      <box
        $={(ref) => (contentbox = ref)}
        cssClasses={['launcher-content']}
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.CENTER}
        orientation={Gtk.Orientation.VERTICAL}
        widthRequest={windowWidth((w) => w)}
        heightRequest={list((l) => Math.min(800, Math.max(400, l.length * 80 + 150)))}
      >
        <entry
          $={(ref) => (searchentry = ref)}
          onNotifyText={({ text }) => search(text)}
          placeholderText="Search apps and files..."
        />
        <Gtk.Separator visible={list((l) => l.length > 0)} />
        <Gtk.ScrolledWindow
          $={(ref) => {
            scrolledWindow = ref
            // Connect scroll event handler
            const adjustment = ref.get_vadjustment()
            adjustment.connect('value-changed', updateVisibleStartIndex)
          }}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          minContentHeight={list((l) => Math.min(600, Math.max(300, l.length * 80)))}
          maxContentHeight={600}
        >
          <box orientation={Gtk.Orientation.VERTICAL}>
            <For each={list}>
              {(result, index) => (
                <button 
                  onClicked={() => launch(result)}
                  cssClasses={selectedIndex((i) => i === index.get() ? ['selected'] : [])}
                >
                  <box spacing={10} cssClasses={['result-item']}>
                    <box cssClasses={['icon-container']}>
                      {result.type === 'file' && result.path && (isImageFile(result.path) || isVideoFile(result.path) || isPdfFile(result.path)) ? (
                        createAsyncPreview(result.path)
                      ) : (
                        <image iconName={result.icon} iconSize={Gtk.IconSize.LARGE} />
                      )}
                    </box>
                    <box orientation={Gtk.Orientation.VERTICAL} hexpand cssClasses={['content-container']}>
                      <label 
                        label={result.displayName} 
                        maxWidthChars={50} 
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={['result-name']}
                      />
                      {result.type === 'file' && (
                        <label
                          cssClasses={['file-path']}
                          label={result.path || ''}
                          maxWidthChars={60}
                          ellipsize={3} // END
                          halign={Gtk.Align.START}
                        />
                      )}
                    </box>
                    <box cssClasses={['shortcut-container']}>
                      <label
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        label={visibleStartIndex((start) => {
                          const visiblePos = index.get() - start + 1
                          return visiblePos > 0 && visiblePos <= 9 ? `󰘳${visiblePos}` : ''
                        })}
                        cssClasses={['shortcut-number']}
                      />
                    </box>
                  </box>
                </button>
              )}
            </For>
          </box>
        </Gtk.ScrolledWindow>
      </box>
    </window>
  )
}

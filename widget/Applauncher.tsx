import { For, createState } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import AstalApps from "gi://AstalApps"
import Graphene from "gi://Graphene"
import GLib from "gi://GLib"
import Gio from "gi://Gio"

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
  const [windowWidth, setWindowWidth] = createState(450)

  let currentSearchAbort: (() => void) | null = null

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
    
    // Calculate optimal window width
    const maxNameLength = Math.max(...recentResults.map(r => (r.displayName || r.name).length), 20)
    const calculatedWidth = Math.max(450, Math.min(800, maxNameLength * 12 + 100))
    setWindowWidth(calculatedWidth)
  }

  async function searchFiles(text: string): Promise<void> {
    try {
      // Cancel any previous search
      if (currentSearchAbort) {
        currentSearchAbort()
      }

      let cancelled = false
      currentSearchAbort = () => { cancelled = true }

      // Use simple locate for file search
      const cmd = `locate -i -l 50 "${text}"`

      // Start search with a small delay
      GLib.timeout_add(GLib.PRIORITY_LOW, 50, () => {
        if (cancelled) return false
        
        try {
          const [success, stdout] = GLib.spawn_command_line_sync(cmd)
          if (!success || !stdout || cancelled) return false
          
          const files = stdout.toString().trim().split('\n').filter(line => line.length > 0)
          
          files.forEach((path, index) => {
            if (cancelled) return
            
            // Add a small delay between each file to make it feel more responsive
            GLib.timeout_add(GLib.PRIORITY_LOW, index * 5, () => {
              if (cancelled) return false
              
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
                    
                    // Update window width based on new content
                    const maxNameLength = Math.max(...combined.map(r => (r.displayName || r.name).length), 20)
                    const calculatedWidth = Math.max(450, Math.min(800, maxNameLength * 12 + 100))
                    setWindowWidth(calculatedWidth)
                  }              return false // Don't repeat
            })
          })
        } catch (error) {
          console.error('Error with locate search:', error)
        }
        
        return false // Don't repeat
      })

    } catch (error) {
      console.error('Error starting file search:', error)
    }
  }

  async function search(text: string) {
    if (text === "") {
      loadInitialResults()
      // Cancel any ongoing file search
      if (currentSearchAbort) {
        currentSearchAbort()
        currentSearchAbort = null
      }
      return
    }

    // Reset selection when searching
    setSelectedIndex(0)

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
    
    // Update window width based on app names
    const maxNameLength = Math.max(...appResults.map(r => (r.displayName || r.name).length), 20)
    const calculatedWidth = Math.max(450, Math.min(800, maxNameLength * 12 + 100))
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

    // Alt + number key shortcuts
    if (mod === Gdk.ModifierType.ALT_MASK) {
      for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
        if (keyval === Gdk[`KEY_${i}`]) {
          return launch(currentList[i - 1])
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
        heightRequest={350}
      >
        <entry
          $={(ref) => (searchentry = ref)}
          onNotifyText={({ text }) => search(text)}
          placeholderText="Search apps and files..."
        />
        <Gtk.Separator visible={list((l) => l.length > 0)} />
        <Gtk.ScrolledWindow
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          minContentHeight={200}
          maxContentHeight={400}
        >
          <box orientation={Gtk.Orientation.VERTICAL}>
            <For each={list}>
              {(result, index) => (
                <button 
                  onClicked={() => launch(result)}
                >
                  <box>
                    <image iconName={result.icon} />
                    <label 
                      label={result.displayName} 
                      maxWidthChars={40} 
                      wrap 
                    />
                    {result.type === 'file' && (
                      <label
                        cssClasses={['file-path']}
                        label={result.path || ''}
                        maxWidthChars={30}
                        ellipsize={3} // END
                        halign={Gtk.Align.START}
                      />
                    )}
                    <label
                      hexpand
                      halign={Gtk.Align.END}
                      label={index((i) => `󰘳${i + 1}`)}
                    />
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

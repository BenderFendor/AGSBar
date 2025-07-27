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
}

export default function Applauncher() {
  let contentbox: Gtk.Box
  let searchentry: Gtk.Entry
  let win: Astal.Window

  const apps = new AstalApps.Apps()
  const [list, setList] = createState(new Array<SearchResult>())

  let currentSearchAbort: (() => void) | null = null

  async function searchFiles(text: string): Promise<void> {
    try {
      // Cancel any previous search
      if (currentSearchAbort) {
        currentSearchAbort()
      }

      let cancelled = false
      currentSearchAbort = () => { cancelled = true }

      // Use a simpler approach with GLib.spawn_command_line_async
      const proc = GLib.spawn_command_line_async(`locate -i -l 100 "${text}"`)
      
      // For now, let's fall back to the synchronous version but with a timeout
      GLib.timeout_add(GLib.PRIORITY_LOW, 50, () => {
        if (cancelled) return false
        
        try {
          const [success, stdout] = GLib.spawn_command_line_sync(`locate -i -l 100 "${text}"`)
          if (!success || !stdout || cancelled) return false
          const files = stdout.toString().trim().split('\n').filter(line => line.length > 0)
          
          files.forEach((path, index) => {
            if (cancelled) return
            
            // Add a small delay between each file to make it feel more responsive
            GLib.timeout_add(GLib.PRIORITY_LOW, index * 10, () => {
              if (cancelled) return false
              
              const name = GLib.path_get_basename(path)
              const isDirectory = GLib.file_test(path, GLib.FileTest.IS_DIR)
              
              const fileResult: SearchResult = {
                type: 'file' as const,
                path,
                name,
                icon: isDirectory ? 'folder' : 'text-x-generic'
              }

              // Update the list immediately with current results
              const currentAppResults = list.get().filter(item => item.type === 'app')
              const currentFileResults = list.get().filter(item => item.type === 'file')
              const combined = [...currentAppResults, ...currentFileResults, fileResult].slice(0, 8)
              setList(combined)
              
              return false // Don't repeat
            })
          })
        } catch (error) {
          console.error('Error searching files:', error)
        }
        
        return false // Don't repeat
      })

    } catch (error) {
      console.error('Error starting file search:', error)
    }
  }

  async function search(text: string) {
    if (text === "") {
      setList([])
      // Cancel any ongoing file search
      if (currentSearchAbort) {
        currentSearchAbort()
        currentSearchAbort = null
      }
      return
    }

    // Search apps first and display immediately
    const appResults: SearchResult[] = apps.fuzzy_query(text).slice(0, 6).map((app: AstalApps.Application) => ({
      type: 'app' as const,
      app,
      name: app.name,
      icon: app.iconName || 'application-x-executable'
    }))

    // Set initial results with just apps
    setList(appResults)

    // Start streaming file search (will update the list as results come in)
    searchFiles(text)
  }

  function launch(result?: SearchResult) {
    if (!result) return
    
    win.hide()
    
    if (result.type === 'app' && result.app) {
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
  // handle alt + number key
  function onKey(
    _e: Gtk.EventControllerKey,
    keyval: number,
    _: number,
    mod: number,
  ) {
    if (keyval === Gdk.KEY_Escape) {
      win.visible = false
      return
    }

    if (mod === Gdk.ModifierType.ALT_MASK) {
      for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
        if (keyval === Gdk[`KEY_${i}`]) {
          return launch(list.get()[i - 1])
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
        name="launcher-content"
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.CENTER}
        orientation={Gtk.Orientation.VERTICAL}
        widthRequest={400}
        heightRequest={300}
      >
        <entry
          $={(ref) => (searchentry = ref)}
          onNotifyText={({ text }) => search(text)}
          placeholderText="Search apps and files..."
        />
        <Gtk.Separator visible={list((l) => l.length > 0)} />
        <box orientation={Gtk.Orientation.VERTICAL}>
          <For each={list}>
            {(result, index) => (
              <button onClicked={() => launch(result)}>
                <box>
                  <image iconName={result.icon} />
                  <label 
                    label={result.name} 
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
      </box>
    </window>
  )
}

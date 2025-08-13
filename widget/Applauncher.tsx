import { For, createState } from "ags"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import AstalApps from "gi://AstalApps"
import Graphene from "gi://Graphene"
import GLib from "gi://GLib"
import { SearchResult } from "./util/types"
import { FileUtils } from "./util/FileUtils"
import { ThumbnailGenerator } from "./util/ThumbnailGenerator"
import { CacheManager } from "./util/CacheManager"
import { LaunchManager } from "./util/LaunchManager"
import { SearchManager } from "./util/SearchManager"

const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor

export default function Applauncher() {
  let contentbox: Gtk.Box
  let searchentry: Gtk.Entry
  let win: Astal.Window

  const searchManager = new SearchManager()
  const [list, setList] = createState(new Array<SearchResult>())
  const [selectedIndex, setSelectedIndex] = createState(0)
  const [windowWidth, setWindowWidth] = createState(800)
  const [visibleStartIndex, setVisibleStartIndex] = createState(0)
  const [fileSearchOffset, setFileSearchOffset] = createState(0)
  const [isLoadingMore, setIsLoadingMore] = createState(false)
  const [hasMoreFiles, setHasMoreFiles] = createState(true)

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
    // Only for file search mode (when search term starts with /)
    if (currentSearchTerm.startsWith('/')) {
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
  }

  // Load recent apps when launcher starts empty
  function loadInitialResults() {
    const recentApps = CacheManager.loadRecentApps()
    const recentResults: SearchResult[] = recentApps.map(app => ({
      type: 'app' as const,
      app,
      name: app.name,
      displayName: app.name,
      icon: app.iconName || 'application-x-executable'
    }))
    
    // If no recent apps, show some popular/default apps
    if (recentResults.length === 0) {
      const allApps = searchManager.searchApps('')
      const defaultResults = allApps.slice(0, 8) // Show first 8 apps if no recent ones
      setList(defaultResults)
      
      const maxNameLength = Math.max(...defaultResults.map(r => (r.displayName || r.name).length), 20)
      const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
      const screenWidth = Gdk.Display.get_default()?.get_monitors().get_item(0)?.get_geometry().width || 1920
      const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
      setWindowWidth(calculatedWidth)
    } else {
      setList(recentResults)
      
      const maxNameLength = Math.max(...recentResults.map(r => (r.displayName || r.name).length), 20)
      const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
      const screenWidth = Gdk.Display.get_default()?.get_monitors().get_item(0)?.get_geometry().width || 1920 
      const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
      setWindowWidth(calculatedWidth)
    }
    
    setSelectedIndex(0)
    setVisibleStartIndex(0)
  }

  // Load more files for infinite scrolling
  function loadMoreFiles() {
    if (!currentSearchTerm || isLoadingMore.get() || !hasMoreFiles.get()) return
    
    // Only load more files if we're in file search mode (starts with /)
    if (!currentSearchTerm.startsWith('/')) return
    
    setIsLoadingMore(true)
    const newOffset = fileSearchOffset.get() + 50
    setFileSearchOffset(newOffset)
    
    // Search for more files with increased limit (remove / prefix)
    const fileSearchTerm = currentSearchTerm.slice(1)
    searchFiles(fileSearchTerm, newOffset, true)
  }

  function searchFiles(text: string, offset: number = 0, append: boolean = false) {
    searchManager.searchFiles(text, offset, append, 
      // onResult callback
      (fileResult: SearchResult) => {
        const currentResults = list.get()
        const currentAppResults = currentResults.filter(item => item.type === 'app')
        const currentFileResults = currentResults.filter(item => item.type === 'file')
        
        // Check if this file path already exists
        const isDuplicate = currentFileResults.some(item => item.path === fileResult.path)
        if (!isDuplicate) {
          const combined = [...currentFileResults, fileResult] // Only show files, no apps
          setList(combined)
          
          // Update window width based on new content (60% of screen)
          const maxNameLength = Math.max(...combined.map(r => (r.displayName || r.name).length), 20)
          const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
          const screenWidth = 1920
          const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
          setWindowWidth(calculatedWidth)
        }
      },
      // onComplete callback
      (hasMore: boolean) => {
        setHasMoreFiles(hasMore)
        if (append) {
          setIsLoadingMore(false)
        }
      }
    )
  }

  async function search(text: string) {
    if (text === "") {
      currentSearchTerm = ""
      setFileSearchOffset(0)
      setHasMoreFiles(true)
      setIsLoadingMore(false)
      loadInitialResults()
      // Cancel any ongoing file search
      searchManager.cancelCurrentSearch()
      return
    }

    // Reset selection and infinite scroll state when searching
    setSelectedIndex(0)
    setVisibleStartIndex(0)
    setFileSearchOffset(0)
    setHasMoreFiles(true)
    setIsLoadingMore(false)
    currentSearchTerm = text

    // Check if searching for files/folders (starts with /)
    if (text.startsWith('/')) {
      // Only search files when starting with /
      const fileSearchTerm = text.slice(1) // Remove the / prefix
      if (fileSearchTerm.length > 0) {
        setList([]) // Clear results while searching
        searchFiles(fileSearchTerm)
      } else {
        setList([]) // Show empty list when just "/"
      }
    } else {
      // Search apps only
      const appResults = searchManager.searchApps(text)
      setList(appResults)
      
      // Update window width based on app names (60% of screen)
      const maxNameLength = Math.max(...appResults.map(r => (r.displayName || r.name).length), 20)
      const baseWidth = Math.max(800, Math.min(1200, maxNameLength * 12 + 200))
      const screenWidth = 1920
      const calculatedWidth = Math.min(baseWidth, screenWidth * 0.6)
      setWindowWidth(calculatedWidth)
    }
  }

  function launch(result?: SearchResult) {
    if (!result) return
    
    win.hide()
    
    if (result.type === 'app' && result.app) {
      CacheManager.saveRecentApp(result.app)
      result.app.launch()
    } else if (result.type === 'file' && result.path) {
      LaunchManager.launchFile(result.path)
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
        heightRequest={list((l) => {
          // Calculate dynamic height based on items
          const itemHeight = 80
          const headerHeight = 60 // Entry + separator (reduced padding)
          const actualItems = Math.min(l.length, 7) // Show max 7 items before scrolling
          if (l.length === 0) {
            return headerHeight // Just header when no items
          }
          return headerHeight + (actualItems * itemHeight)
        })}
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
          vscrollbarPolicy={list((l) => l.length > 7 ? Gtk.PolicyType.AUTOMATIC : Gtk.PolicyType.NEVER)}
          minContentHeight={list((l) => l.length * 80)}
          maxContentHeight={list((l) => l.length > 7 ? 560 : l.length * 80)}
          visible={list((l) => l.length > 0)}
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
                      {result.type === 'file' && result.path && FileUtils.needsThumbnail(result.path) ? (
                        ThumbnailGenerator.createAsyncPreview(result.path)
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
                          return visiblePos > 0 && visiblePos <= 9 ? `  󰘳${visiblePos}  ` : ''
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

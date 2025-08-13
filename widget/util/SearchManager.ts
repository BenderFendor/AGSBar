import GLib from "gi://GLib"
import AstalApps from "gi://AstalApps"
import { SearchResult } from "./types"
import { FileUtils } from "./FileUtils"

export class SearchManager {
  private apps: AstalApps.Apps | null = null
  private currentSearchAbort: (() => void) | null = null

  constructor() {
    try {
      this.apps = new AstalApps.Apps()
    } catch (error) {
      console.error('Failed to initialize AstalApps.Apps:', error)
      this.apps = null
    }
  }

  searchApps(text: string): SearchResult[] {
    if (!this.apps) {
      console.warn('Apps service not available')
      return []
    }

    try {
      if (text === '') {
        // Return all apps when no search text
        const applications = this.apps.get_applications()
        if (!applications) return []
        
        return applications.slice(0, 20).map((app: AstalApps.Application) => ({
          type: 'app' as const,
          app,
          name: app.name,
          displayName: app.name,
          icon: app.iconName || 'application-x-executable'
        }))
      }
      
      const results = this.apps.fuzzy_query(text)
      if (!results) return []
      
      return results.slice(0, 6).map((app: AstalApps.Application) => ({
        type: 'app' as const,
        app,
        name: app.name,
        displayName: app.name,
        icon: app.iconName || 'application-x-executable'
      }))
    } catch (error) {
      console.error('Error searching apps:', error)
      return []
    }
  }

  async searchFiles(
    text: string, 
    offset: number = 0, 
    append: boolean = false,
    onResult: (result: SearchResult) => void,
    onComplete: (hasMore: boolean) => void
  ): Promise<void> {
    try {
      // Cancel any previous search if this is a new search (not append)
      if (!append && this.currentSearchAbort) {
        this.currentSearchAbort()
      }

      let cancelled = false
      if (!append) {
        this.currentSearchAbort = () => { cancelled = true }
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
          const hasMore = files.length >= 50 && allFiles.length >= totalLimit
          
          files.forEach((path, index) => {
            if (cancelled && !append) return
            
            // Add a small delay between each file to make it feel more responsive
            GLib.timeout_add(GLib.PRIORITY_LOW, index * 5, () => {
              if (cancelled && !append) return false
              
              const fileResult: SearchResult = {
                type: 'file' as const,
                path,
                name: GLib.path_get_basename(path),
                displayName: FileUtils.getDisplayName(path),
                icon: FileUtils.getFileIcon(path)
              }

              onResult(fileResult)
              return false // Don't repeat
            })
          })
          
          // Signal completion
          GLib.timeout_add(GLib.PRIORITY_LOW, files.length * 5 + 10, () => {
            if (!cancelled || append) {
              onComplete(hasMore)
            }
            return false
          })
          
        } catch (error) {
          console.error('Error executing file search:', error)
          onComplete(false)
        }
        
        return false // Don't repeat
      })

    } catch (error) {
      console.error('Error starting file search:', error)
      onComplete(false)
    }
  }

  cancelCurrentSearch() {
    if (this.currentSearchAbort) {
      this.currentSearchAbort()
      this.currentSearchAbort = null
    }
  }
}

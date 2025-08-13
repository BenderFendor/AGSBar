import GLib from "gi://GLib"
import AstalApps from "gi://AstalApps"

const CACHE_FILE = GLib.get_home_dir() + "/.cache/ags-launcher-cache.json"

export class CacheManager {
  static loadRecentApps(): AstalApps.Application[] {
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

  static saveRecentApp(app: AstalApps.Application) {
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
}

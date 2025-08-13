import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import GdkPixbuf from "gi://GdkPixbuf"
import { FileUtils } from "./FileUtils"

export class ThumbnailGenerator {
  static createAsyncImagePreview(path: string): Gtk.Widget {
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
        this.requestDBusThumbnail(fileUri, 'image/jpeg', thumbPath, image)
        
      } catch (error) {
        console.warn(`Image preview failed for ${path}:`, error)
        image.set_from_icon_name("image-x-generic")
        image.set_icon_size(Gtk.IconSize.LARGE)
      }
      return false // Don't repeat
    })
    
    return image
  }

  static createAsyncVideoThumbnail(path: string): Gtk.Widget {
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
        this.requestDBusThumbnail(fileUri, 'video/mp4', thumbPath, image)
        
      } catch (error) {
        console.warn(`Video thumbnail generation failed for ${path}:`, error)
        image.set_from_icon_name("video-x-generic")
        image.set_icon_size(Gtk.IconSize.LARGE)
      }
      return false
    })
    
    return image
  }

  static createAsyncPreview(path: string): Gtk.Widget {
    if (FileUtils.isImageFile(path)) {
      return this.createAsyncImagePreview(path)
    } else if (FileUtils.isVideoFile(path) || FileUtils.isPdfFile(path)) {
      return this.createAsyncVideoThumbnail(path) // Use same function for videos and PDFs
    } else {
      const image = new Gtk.Image()
      image.set_from_icon_name(FileUtils.getFileIcon(path))
      image.set_icon_size(Gtk.IconSize.LARGE)
      return image
    }
  }

  private static requestDBusThumbnail(fileUri: string, mimeType: string, thumbPath: string, image: Gtk.Image) {
    try {
      const bus = Gio.bus_get_sync(Gio.BusType.SESSION, null)
      if (bus) {
        console.log(`Requesting D-Bus thumbnail for: ${fileUri}`)
        // Correct D-Bus call signature: (asasssu)
        const variant = GLib.Variant.new('(asasssu)', [
          [fileUri],         // uris (array of strings)
          [mimeType],        // mime_types (array of strings)
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
        this.pollForThumbnail(thumbPath, image)
      } else {
        this.setFallbackIcon(image, mimeType)
      }
    } catch (dbusError) {
      console.warn(`D-Bus thumbnailing failed: ${dbusError}`)
      this.setFallbackIcon(image, mimeType)
    }
  }

  private static pollForThumbnail(thumbPath: string, image: Gtk.Image) {
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
  }

  private static setFallbackIcon(image: Gtk.Image, mimeType: string) {
    if (mimeType.startsWith('image/')) {
      image.set_from_icon_name("image-x-generic")
    } else if (mimeType.startsWith('video/')) {
      image.set_from_icon_name("video-x-generic")
    } else {
      image.set_from_icon_name("application-pdf")
    }
    image.set_icon_size(Gtk.IconSize.LARGE)
  }
}

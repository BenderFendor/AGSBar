import GLib from "gi://GLib"

export class FileUtils {
  static getFileIcon(path: string): string {
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

  static getDisplayName(path: string): string {
    const name = GLib.path_get_basename(path)
    const dir = GLib.path_get_dirname(path)
    const homeDir = GLib.get_home_dir()
    
    // Replace home directory with ~
    const displayDir = dir.replace(homeDir, '~')
    
    return `${name} (${displayDir})`
  }

  static isImageFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', 'ico', 'xpm'].includes(ext || '')
  }

  static isVideoFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase()
    return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv', 'mpg', 'mpeg'].includes(ext || '')
  }

  static isPdfFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase()
    return ext === 'pdf'
  }

  static needsThumbnail(path: string): boolean {
    return this.isImageFile(path) || this.isVideoFile(path) || this.isPdfFile(path)
  }
}

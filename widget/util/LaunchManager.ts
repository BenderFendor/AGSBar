import GLib from "gi://GLib"

export class LaunchManager {
  static getTerminalCommand(): string {
    // Try to find an available terminal emulator
    const terminals = ['kitty', 'alacritty', 'gnome-terminal', 'konsole', 'xterm']
    
    for (const terminal of terminals) {
      try {
        const [success] = GLib.spawn_command_line_sync(`which ${terminal}`)
        if (success) {
          switch (terminal) {
            case 'kitty':
              return 'kitty'
            case 'alacritty':
              return 'alacritty -e'
            case 'gnome-terminal':
              return 'gnome-terminal --'
            case 'konsole':
              return 'konsole -e'
            case 'xterm':
              return 'xterm -e'
            default:
              return terminal
          }
        }
      } catch (error) {
        // Continue to next terminal
      }
    }
    
    // Fallback to xterm
    return 'xterm -e'
  }

  static isTerminalApplication(desktopFile: string, mimeType: string, filePath?: string): boolean {
    const terminalApps = [
      'nvim', 'neovim', 'vim',
      'emacs', 'nano', 'micro',
      'helix', 'kakoune'
    ]
    
    const isTerminalApp = terminalApps.some(app => 
      desktopFile.toLowerCase().includes(app.toLowerCase())
    )
    
    // Also check for text files that might open in terminal editors
    const isTextFile = mimeType.startsWith('text/') || 
                      mimeType === 'application/json' ||
                      mimeType === 'application/xml' ||
                      ['.md', '.txt', '.log', '.conf', '.cfg', '.ini', '.sh', '.py', '.js', '.ts', '.css', '.html'].some(ext => 
                        filePath?.toLowerCase().endsWith(ext)
                      )
    
    return isTerminalApp || (isTextFile && desktopFile.includes('nvim'))
  }

  static launchInTerminal(filePath: string) {
    console.log(`Opening ${filePath} in terminal`)
    const terminal = this.getTerminalCommand()
    
    // For kitty, use the correct syntax
    if (terminal === 'kitty') {
      GLib.spawn_async(null, ['kitty', 'xdg-open', filePath], null, 
        GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, 
        null)
    } else {
      // For other terminals
      const terminalCmd = `${terminal} xdg-open "${filePath}"`
      GLib.spawn_async(null, ['sh', '-c', terminalCmd], null, 
        GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, 
        null)
    }
  }

  static launchFile(filePath: string) {
    try {
      // Get the MIME type and default application
      const [mimeSuccess, mimeOut] = GLib.spawn_command_line_sync(`file -b --mime-type "${filePath}"`)
      
      if (mimeSuccess && mimeOut) {
        const mimeType = mimeOut.toString().trim()
        const [appSuccess, appOut] = GLib.spawn_command_line_sync(`xdg-mime query default ${mimeType}`)
        
        if (appSuccess && appOut) {
          const desktopFile = appOut.toString().trim()
          console.log(`File: ${filePath}, MIME: ${mimeType}, Default app: ${desktopFile}`)
          
          if (this.isTerminalApplication(desktopFile, mimeType, filePath)) {
            this.launchInTerminal(filePath)
            return
          }
        }
      }
      
      // Default launch with xdg-open
      this.launchWithXdgOpen(filePath)
    } catch (error) {
      console.error('Error opening file:', error)
      this.launchWithXdgOpen(filePath)
    }
  }

  private static launchWithXdgOpen(filePath: string) {
    try {
      GLib.spawn_async(null, ['xdg-open', filePath], null, 
        GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, 
        null)
    } catch (fallbackError) {
      console.error('Fallback xdg-open also failed:', fallbackError)
    }
  }
}

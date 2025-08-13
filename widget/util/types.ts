import AstalApps from "gi://AstalApps"

export interface SearchResult {
  type: 'app' | 'file'
  app?: AstalApps.Application
  path?: string
  name: string
  icon: string
  displayName?: string
}

export interface SearchState {
  list: SearchResult[]
  selectedIndex: number
  windowWidth: number
  visibleStartIndex: number
  fileSearchOffset: number
  isLoadingMore: boolean
  hasMoreFiles: boolean
  currentSearchTerm: string
  currentSearchAbort: (() => void) | null
}

/// <reference types="vite/client" />

interface Window {
  fileSystem: {
    selectFolder: () => Promise<string | null>
    readData: (folderPath: string, fileName: string) => Promise<string | null>
    writeData: (folderPath: string, fileName: string, content: string) => Promise<boolean>
    checkExists: (folderPath: string, fileName: string) => Promise<boolean>
    listFiles: (folderPath: string) => Promise<string[]>
    deletePath: (folderPath: string, relativePath: string) => Promise<boolean>
    openPdfAtPage: (relativePath: string, page: number) => Promise<{ ok: boolean; url?: string; error?: string }>
    openGuide?: () => Promise<{ ok: boolean; url?: string; error?: string }>
    ollamaRequest: (method: string, url: string, body?: string, timeoutMs?: number, authBearer?: string) => Promise<{ ok: boolean; status: number; body: string; error?: string }>
    cancelOllamaRequests?: () => Promise<{ ok: boolean }>
    searchLibrary?: (query: string, limit?: number) => Promise<{
      ok: boolean
      results: Array<{
        id: number
        sourcePath: string
        blockIndex: number
        title: string
        snippet: string
        pdfPage?: number | null
        sourcePdf?: string | null
      }>
      error?: string
    }>
  }
}

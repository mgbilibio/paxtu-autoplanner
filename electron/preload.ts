import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('fileSystem', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  readData: (folderPath: string, fileName: string) => ipcRenderer.invoke('fs:readData', folderPath, fileName),
  writeData: (folderPath: string, fileName: string, content: string) => ipcRenderer.invoke('fs:writeData', folderPath, fileName, content),
  checkExists: (folderPath: string, fileName: string) => ipcRenderer.invoke('fs:checkExists', folderPath, fileName),
  listFiles: (folderPath: string) => ipcRenderer.invoke('fs:listFiles', folderPath),
  deletePath: (folderPath: string, relativePath: string) => ipcRenderer.invoke('fs:deletePath', folderPath, relativePath),
  openPdfAtPage: (relativePath: string, page: number) => ipcRenderer.invoke('pdf:openAtPage', relativePath, page),
  openGuide: () => ipcRenderer.invoke('guide:open'),
  ollamaRequest: (method: string, url: string, body?: string, timeoutMs?: number, authBearer?: string) =>
    ipcRenderer.invoke('ollama:request', method, url, body, timeoutMs, authBearer),
  cancelOllamaRequests: () => ipcRenderer.invoke('ollama:cancelAll'),
  searchLibrary: (query: string, limit?: number) => ipcRenderer.invoke('library:search', query, limit)
})

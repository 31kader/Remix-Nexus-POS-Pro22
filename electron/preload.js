const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printToPDF: (htmlContent, fileName) => ipcRenderer.invoke('print-to-pdf', htmlContent, fileName),
  openCashDrawer: () => ipcRenderer.invoke('open-cash-drawer'),
  printRawEscPos: (bytes) => ipcRenderer.invoke('print-raw-escpos', bytes),
  sqliteExecute: (sql, params) => ipcRenderer.invoke('sqlite-execute', sql, params),
  sqliteQuery: (sql, params) => ipcRenderer.invoke('sqlite-query', sql, params),
  sqliteBatch: (queries) => ipcRenderer.invoke('sqlite-batch', queries),
});

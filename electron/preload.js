const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printToPDF: (htmlContent, fileName) => ipcRenderer.invoke('print-to-pdf', htmlContent, fileName),
});

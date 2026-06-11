const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('metisPOS', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});

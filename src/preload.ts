import { contextBridge, ipcRenderer } from 'electron';

// This is the API that will be exposed to the renderer process
// under the `window.electronAPI` object.
const electronAPI = {
  startLogin: () => ipcRenderer.send('auth:start-login'),
  logout: () => ipcRenderer.send('auth:logout'),
  onAuthSuccess: (callback: (user: any) => void) => ipcRenderer.on('auth:success', (_event, user) => callback(user)),
  onLogout: (callback: () => void) => ipcRenderer.on('auth:logged-out', () => callback()),
  // Add this line for testing purposes
  send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
};

// Securely expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// To provide type safety, we can declare the API on the window object
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
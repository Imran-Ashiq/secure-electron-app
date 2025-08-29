
import { contextBridge, ipcRenderer } from 'electron';

/**
 * Secure API exposed to the renderer process via contextBridge
 * Only whitelisted methods are available to React/renderer code
 */
const electronAPI = {
  // Initiates the OIDC login flow (calls main process)
  startLogin: () => ipcRenderer.send('auth:start-login'),

  // Initiates logout (calls main process)
  logout: () => ipcRenderer.send('auth:logout'),

  // Listener: called when authentication succeeds
  onAuthSuccess: (callback: (user: any) => void) =>
    ipcRenderer.on('auth:success', (_event, user) => callback(user)),

  // Listener: called when logout completes
  onLogout: (callback: () => void) =>
    ipcRenderer.on('auth:logged-out', () => callback()),

  // Generic IPC send method (for testing and advanced usage)
  send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
};

// Expose the API to the renderer process as window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

/**
 * TypeScript: declare the API on the window object for type safety
 */
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
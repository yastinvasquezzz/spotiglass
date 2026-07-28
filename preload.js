const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spotifyAPI', {
  getClientId: () => ipcRenderer.invoke('get-client-id'),
  saveClientId: (clientId) => ipcRenderer.invoke('save-client-id', clientId),
  startLogin: (clientId) => ipcRenderer.invoke('start-login', clientId),
  hasValidSession: () => ipcRenderer.invoke('has-valid-session'),
  getCurrentlyPlaying: () => ipcRenderer.invoke('get-currently-playing'),
  togglePlayPause: (isPlaying) => ipcRenderer.invoke('toggle-play-pause', isPlaying),
  searchTracks: (query) => ipcRenderer.invoke('search-tracks', query),
  playTrackUri: (uri) => ipcRenderer.invoke('play-track-uri', uri),
  nextTrack: () => ipcRenderer.invoke('next-track'),
  previousTrack: () => ipcRenderer.invoke('previous-track'),
  toggleTaskbarDock: () => ipcRenderer.invoke('toggle-taskbar-dock'),
  setDockLyricsMode: (isLyricsActive) => ipcRenderer.invoke('set-dock-lyrics-mode', isLyricsActive),
  logout: () => ipcRenderer.invoke('logout'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  onAuthSuccess: (callback) => ipcRenderer.on('auth-success', () => callback()),
  onLogout: (callback) => ipcRenderer.on('logout-event', () => callback()),
  onTaskbarDockStatus: (callback) => ipcRenderer.on('taskbar-dock-status', (event, data) => callback(data))
});

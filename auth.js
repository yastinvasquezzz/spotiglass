const http = require('http');
const url = require('url');
const crypto = require('crypto');
const axios = require('axios');
const { BrowserWindow } = require('electron');

const DEFAULT_CLIENT_ID = 'e01e9424647c4d07a529d0238887ef1c';

class SpotifyAuth {
  constructor(store) {
    this.store = store;
    this.server = null;
    this.authWindow = null;
    this.redirectUri = 'http://127.0.0.1:8888/callback';
    this.codeVerifier = null;
    
    this.scopes = [
      'user-read-currently-playing',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-private',
      'user-read-email'
    ].join(' ');
  }

  getClientId() {
    return this.store.get('clientId') || DEFAULT_CLIENT_ID;
  }

  setClientId(clientId) {
    this.store.set('clientId', (clientId || DEFAULT_CLIENT_ID).trim());
  }

  generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
  }

  hasValidSession() {
    const refreshToken = this.store.get('refreshToken');
    return Boolean(refreshToken);
  }

  startAuthServer(onSuccess, onError) {
    if (this.server) {
      try { this.server.close(); } catch (e) {}
    }

    this.server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code;
        const error = parsedUrl.query.error;

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1 style="color:red;font-family:sans-serif;text-align:center;">Autenticación cancelada</h1>');
          if (onError) onError(error);
          this.cleanupAuthWindow();
          return;
        }

        if (code) {
          try {
            await this.exchangeCodeForTokens(code);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>¡Conectado con Spotify!</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #121212; color: #fff; text-align: center; padding-top: 50px; }
                  .card { background: #1e1e1e; display: inline-block; padding: 30px 50px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                  h1 { color: #1DB954; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>¡Sesión Iniciada con Éxito!</h1>
                  <p>Regresando al widget flotante...</p>
                </div>
              </body>
              </html>
            `);
            if (onSuccess) onSuccess();
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h1>Error en la autenticación: ${err.message}</h1>`);
            if (onError) onError(err);
          } finally {
            setTimeout(() => this.cleanupAuthWindow(), 1000);
          }
        }
      }
    });

    this.server.listen(8888, '127.0.0.1', () => {
      console.log('Servidor OAuth activo en http://127.0.0.1:8888/callback');
    });
  }

  cleanupAuthWindow() {
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      this.authWindow.close();
      this.authWindow = null;
    }
    if (this.server) {
      try { this.server.close(); } catch (e) {}
      this.server = null;
    }
  }

  async login(onSuccess, onError) {
    const clientId = this.getClientId();
    const { verifier, challenge } = this.generatePKCE();
    this.codeVerifier = verifier;

    this.startAuthServer(onSuccess, onError);

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&scope=${encodeURIComponent(this.scopes)}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&code_challenge_method=S256` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&show_dialog=true`;

    this.authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: true,
      title: 'Iniciar Sesión en Spotify',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    this.authWindow.loadURL(authUrl);

    this.authWindow.on('closed', () => {
      this.authWindow = null;
      if (this.server) {
        try { this.server.close(); } catch (e) {}
        this.server = null;
      }
    });
  }

  async exchangeCodeForTokens(code) {
    const clientId = this.getClientId();
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('code', code);
    params.append('redirect_uri', this.redirectUri);
    params.append('code_verifier', this.codeVerifier);

    const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = Date.now() + (expires_in * 1000);

    this.store.set('accessToken', access_token);
    if (refresh_token) {
      this.store.set('refreshToken', refresh_token);
    }
    this.store.set('expiresAt', expiresAt);

    return access_token;
  }

  async refreshAccessToken() {
    const clientId = this.getClientId();
    const refreshToken = this.store.get('refreshToken');
    if (!refreshToken) {
      throw new Error('No hay sesión guardada.');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', clientId);
    params.append('refresh_token', refreshToken);

    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, expires_in, refresh_token: newRefreshToken } = response.data;
      const expiresAt = Date.now() + (expires_in * 1000);

      this.store.set('accessToken', access_token);
      this.store.set('expiresAt', expiresAt);
      if (newRefreshToken) {
        this.store.set('refreshToken', newRefreshToken);
      }

      return access_token;
    } catch (error) {
      console.error('Error al renovar token de Spotify:', error.response?.data || error.message);
      this.logout();
      throw error;
    }
  }

  async getValidAccessToken() {
    const accessToken = this.store.get('accessToken');
    const expiresAt = this.store.get('expiresAt');
    const refreshToken = this.store.get('refreshToken');

    if (!accessToken || !expiresAt || Date.now() >= (expiresAt - 60000)) {
      if (refreshToken) {
        return await this.refreshAccessToken();
      }
      throw new Error('Sesión no autenticada.');
    }

    return accessToken;
  }

  async getAudioFeatures(trackId) {
    if (!trackId) return null;
    try {
      const token = await this.getValidAccessToken();
      const response = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return {
        tempo: response.data.tempo || 120,
        energy: response.data.energy || 0.7,
        danceability: response.data.danceability || 0.6,
        valence: response.data.valence || 0.5
      };
    } catch (e) {
      return { tempo: 120, energy: 0.7, danceability: 0.6, valence: 0.5 };
    }
  }

  async getCurrentlyPlaying() {
    try {
      const token = await this.getValidAccessToken();
      const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 204 || !response.data || !response.data.item) {
        return { isPlaying: false, track: null, hasSession: true };
      }

      const item = response.data.item;
      let audioFeatures = null;
      try {
        audioFeatures = await this.getAudioFeatures(item.id);
      } catch (e) {}

      return {
        hasSession: true,
        isPlaying: response.data.is_playing,
        progressMs: response.data.progress_ms,
        durationMs: item.duration_ms,
        audioFeatures: audioFeatures,
        track: {
          id: item.id,
          name: item.name,
          artist: item.artists.map(a => a.name).join(', '),
          album: item.album.name,
          albumArt: item.album.images[0]?.url || ''
        }
      };
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await this.refreshAccessToken();
          return this.getCurrentlyPlaying();
        } catch (e) {
          return { isPlaying: false, track: null, hasSession: false, error: 'Sesión no autenticada.' };
        }
      }
      return { isPlaying: false, track: null, hasSession: this.hasValidSession(), error: error.message };
    }
  }

  async searchTracks(query) {
    try {
      const token = await this.getValidAccessToken();
      const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const tracks = response.data.tracks.items.map(item => ({
        id: item.id,
        uri: item.uri,
        name: item.name,
        artist: item.artists.map(a => a.name).join(', '),
        albumArt: item.album.images[0]?.url || ''
      }));

      return { success: true, tracks };
    } catch (error) {
      return { success: false, error: error.message, tracks: [] };
    }
  }

  async playTrackUri(uri) {
    try {
      const token = await this.getValidAccessToken();
      await axios.put('https://api.spotify.com/v1/me/player/play', {
        uris: [uri]
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async nextTrack() {
    try {
      const token = await this.getValidAccessToken();
      await axios.post('https://api.spotify.com/v1/me/player/next', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async previousTrack() {
    try {
      const token = await this.getValidAccessToken();
      await axios.post('https://api.spotify.com/v1/me/player/previous', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  logout() {
    this.store.delete('accessToken');
    this.store.delete('refreshToken');
    this.store.delete('expiresAt');
  }
}

module.exports = SpotifyAuth;

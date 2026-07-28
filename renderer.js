let currentIsPlaying = false;
let pollingInterval = null;
let tickerInterval = null;
let isLoggingIn = false;

let currentTrackId = '';
let currentLottieFile = '';
let lastUsedCharacter = '';
let syncedLyricsItems = [];
let currentSyncedLyricIndex = -1;
let currentProgressMs = 0;
let lastSpotifyProgressMs = 0;
let lastSpotifyFetchTime = Date.now();
let searchDebounceTimeout = null;

const DEFAULT_CLIENT_ID = 'e01e9424647c4d07a529d0238887ef1c';

// DOM Elements
const widgetContainer = document.querySelector('.widget-container');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const searchBtn = document.getElementById('search-btn');
const lyricsBtn = document.getElementById('lyrics-btn');
const dockBtn = document.getElementById('dock-btn');
const duckLottie = document.getElementById('duck-lottie');

const lyricsInlineContainer = document.getElementById('lyrics-inline-container');
const explosiveParagraph = document.getElementById('explosive-paragraph');

const searchModal = document.getElementById('search-modal');
const closeSearchBtn = document.getElementById('close-search-btn');
const searchInput = document.getElementById('search-input');
const searchResultsList = document.getElementById('search-results-list');

const albumArt = document.getElementById('album-art');
const albumPlaceholder = document.getElementById('album-placeholder');
const trackTitle = document.getElementById('track-title');
const artistName = document.getElementById('artist-name');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

const setupModal = document.getElementById('setup-modal');
const loginSpotifyBtn = document.getElementById('login-spotify-btn');
const colorCanvas = document.getElementById('color-canvas');

// Window Controls
minimizeBtn.addEventListener('click', () => {
  window.spotifyAPI.minimizeWindow();
});

closeBtn.addEventListener('click', () => {
  window.spotifyAPI.closeWindow();
});

dockBtn.addEventListener('click', async () => {
  await window.spotifyAPI.toggleTaskbarDock();
});

// Listener de Acople Magnético a la Barra de Tareas de Windows
window.spotifyAPI.onTaskbarDockStatus((data) => {
  if (data && data.isDocked) {
    widgetContainer.classList.add('docked-taskbar');
    dockBtn.classList.add('active');
  } else {
    widgetContainer.classList.remove('docked-taskbar');
    dockBtn.classList.remove('active');
  }
});

// Reloj Adaptativo de Alta Precisión (Solo activo cuando las letras están visibles para ahorrar el 90% de CPU)
function startHighPrecisionTicker() {
  if (tickerInterval) clearInterval(tickerInterval);
  tickerInterval = setInterval(() => {
    if (!currentIsPlaying || !lyricsBtn.classList.contains('active')) return;
    const elapsedSinceFetch = Date.now() - lastSpotifyFetchTime;
    currentProgressMs = lastSpotifyProgressMs + elapsedSinceFetch;
    updateLyricsPosition();
  }, 50);
}

// Mantener animaciones continuas sin congelar al desenfocar
window.addEventListener('blur', () => {
  if (duckLottie && currentIsPlaying) {
    try { duckLottie.play(); } catch(e) {}
  }
});

window.addEventListener('focus', () => {
  if (duckLottie && currentIsPlaying) {
    try { duckLottie.play(); } catch(e) {}
  }
});

// Evaluador Ultra-Sensible de Personajes
function evaluateCharacterAnimation(audioFeatures, trackId) {
  const charactersPool = ['duck.json', 'total-eclipse.json', 'shiba-sad.json', 'meh-cat.json'];

  if (!audioFeatures) {
    let hash = 0;
    if (trackId) {
      for (let i = 0; i < trackId.length; i++) {
        hash = trackId.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    const idx = Math.abs(hash) % charactersPool.length;
    let selected = charactersPool[idx];
    if (selected === lastUsedCharacter) {
      selected = charactersPool[(idx + 1) % charactersPool.length];
    }
    lastUsedCharacter = selected;
    return selected;
  }

  const energy = typeof audioFeatures.energy === 'number' ? audioFeatures.energy : 0.5;
  const valence = typeof audioFeatures.valence === 'number' ? audioFeatures.valence : 0.5;
  const danceability = typeof audioFeatures.danceability === 'number' ? audioFeatures.danceability : 0.5;

  let candidates = [];

  if (energy > 0.65 || danceability > 0.65) {
    candidates.push('duck.json');
  }
  if (valence > 0.50 || energy > 0.55) {
    candidates.push('total-eclipse.json');
  }
  if (valence < 0.55 || energy < 0.55) {
    candidates.push('shiba-sad.json');
  }
  if (energy < 0.65 || valence < 0.65) {
    candidates.push('meh-cat.json');
  }

  if (candidates.length === 0) {
    candidates = charactersPool;
  }

  let hash = 0;
  if (trackId) {
    for (let i = 0; i < trackId.length; i++) {
      hash = trackId.charCodeAt(i) + ((hash << 5) - hash);
    }
  }

  let selectedIdx = Math.abs(hash) % candidates.length;
  let selectedCharacter = candidates[selectedIdx];

  if (selectedCharacter === lastUsedCharacter && candidates.length > 1) {
    selectedCharacter = candidates[(selectedIdx + 1) % candidates.length];
  }

  lastUsedCharacter = selectedCharacter;
  return selectedCharacter;
}

// Transición Suave y Carga Nativa Garantizada en Electron (.json)
function updateCharacterAnimation(targetFile) {
  if (!duckLottie) return;
  
  const jsonFile = targetFile.replace(/\.lottie$/, '.json');
  if (currentLottieFile === jsonFile) return;

  currentLottieFile = jsonFile;
  
  duckLottie.style.opacity = '0';
  setTimeout(() => {
    duckLottie.setAttribute('src', jsonFile);
    if (typeof duckLottie.load === 'function') {
      try { duckLottie.load(jsonFile); } catch (e) {}
    }
    setTimeout(() => {
      duckLottie.style.opacity = currentIsPlaying ? '1' : '0.4';
      if (currentIsPlaying) {
        try { duckLottie.play(); } catch (e) {}
      } else {
        try { duckLottie.pause(); } catch (e) {}
      }
    }, 120);
  }, 150);
}

// Letras Toggle
lyricsBtn.addEventListener('click', async () => {
  const isLyricsActive = lyricsBtn.classList.toggle('active');
  await window.spotifyAPI.setDockLyricsMode(isLyricsActive);

  if (isLyricsActive) {
    if (duckLottie) duckLottie.classList.add('hidden');
    lyricsInlineContainer.classList.remove('hidden');
    updateLyricsPosition();
  } else {
    lyricsInlineContainer.classList.add('hidden');
    if (duckLottie) duckLottie.classList.remove('hidden');
  }
});

// Búsqueda Toggle
searchBtn.addEventListener('click', () => {
  searchModal.classList.toggle('hidden');
  if (!searchModal.classList.contains('hidden')) {
    searchInput.focus();
  }
});

closeSearchBtn.addEventListener('click', () => {
  searchModal.classList.add('hidden');
});

// Búsqueda de Canciones Debounced
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimeout);
  const query = searchInput.value.trim();

  if (!query) {
    searchResultsList.innerHTML = '<div class="search-empty">Escribe arriba para buscar en Spotify</div>';
    return;
  }

  searchDebounceTimeout = setTimeout(async () => {
    searchResultsList.innerHTML = '<div class="search-empty">Buscando en Spotify...</div>';
    const res = await window.spotifyAPI.searchTracks(query);

    if (res.success && res.tracks && res.tracks.length > 0) {
      searchResultsList.innerHTML = '';
      res.tracks.forEach(track => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `
          <img class="search-thumb" src="${track.albumArt || ''}" alt="Cover">
          <div class="search-item-info">
            <div class="search-item-title">${escapeHtml(track.name)}</div>
            <div class="search-item-artist">${escapeHtml(track.artist)}</div>
          </div>
        `;
        item.addEventListener('click', async () => {
          searchModal.classList.add('hidden');
          await window.spotifyAPI.playTrackUri(track.uri);
          setTimeout(updateCurrentlyPlaying, 400);
        });
        searchResultsList.appendChild(item);
      });
    } else {
      searchResultsList.innerHTML = '<div class="search-empty">No se encontraron canciones</div>';
    }
  }, 300);
});

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Click en el widget para iniciar sesión si no hay sesión activa
[trackTitle, artistName, albumPlaceholder].forEach(el => {
  el.addEventListener('click', async () => {
    const hasSession = await window.spotifyAPI.hasValidSession();
    if (!hasSession) {
      triggerLogin();
    }
  });
});

// Playback Controls
playPauseBtn.addEventListener('click', async () => {
  const hasSession = await window.spotifyAPI.hasValidSession();
  if (!hasSession) {
    triggerLogin();
    return;
  }
  const success = await window.spotifyAPI.togglePlayPause(currentIsPlaying);
  if (success) {
    currentIsPlaying = !currentIsPlaying;
    updatePlayPauseUI(currentIsPlaying);
  }
});

prevBtn.addEventListener('click', async () => {
  await window.spotifyAPI.previousTrack();
  setTimeout(updateCurrentlyPlaying, 300);
});

nextBtn.addEventListener('click', async () => {
  await window.spotifyAPI.nextTrack();
  setTimeout(updateCurrentlyPlaying, 300);
});

// Handler de inicio de sesión directo sin Client ID visible
async function triggerLogin() {
  if (isLoggingIn) return;
  isLoggingIn = true;

  setupModal.classList.add('hidden');

  trackTitle.textContent = 'Iniciando sesión en Spotify...';
  artistName.textContent = 'Completa el login en la ventana flotante';

  const loginRes = await window.spotifyAPI.startLogin(DEFAULT_CLIENT_ID);
  if (!loginRes.success) {
    alert(`Error iniciando sesión: ${loginRes.error}`);
    setupModal.classList.remove('hidden');
    trackTitle.textContent = 'Esperando Spotify...';
    artistName.textContent = 'Haz clic para iniciar sesión';
  }
  isLoggingIn = false;
}

loginSpotifyBtn.addEventListener('click', () => {
  triggerLogin();
});

// Extracción de Colores Ultra Inteligente de la Portada del Álbum
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function updateColorsFromAlbumArt() {
  if (!albumArt || albumArt.classList.contains('hidden') || !albumArt.complete) return;

  try {
    const ctx = colorCanvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(albumArt, 0, 0, 32, 32);
    const imageData = ctx.getImageData(0, 0, 32, 32).data;

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness > 15 && brightness < 240) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }

    if (count > 0) {
      const avgR = Math.round(rSum / count);
      const avgG = Math.round(gSum / count);
      const avgB = Math.round(bSum / count);

      let [h, s, l] = rgbToHsl(avgR, avgG, avgB);
      
      s = Math.max(s, 0.90);
      l = Math.min(Math.max(l, 0.50), 0.65);

      const vividPrimary = `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      const vividGlow = `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, 0.85)`;
      const vividSecondary = `hsl(${Math.round((h + 40) % 360)}, 95%, 65%)`;

      document.documentElement.style.setProperty('--spotify-green', vividPrimary);
      document.documentElement.style.setProperty('--spotify-green-glow', vividGlow);
      document.documentElement.style.setProperty('--spotify-cyan', vividSecondary);
    }
  } catch (e) {
    console.log('Modo CORS activado o servidor distinto.');
  }
}

albumArt.addEventListener('load', () => {
  updateColorsFromAlbumArt();
});

// Sincronización de Animaciones según Tempo
function applyAudioFeatures(features) {
  if (!features) return;
  const tempo = features.tempo || 120;
  
  const eqSpeed = Math.min(Math.max((120 / tempo) * 1.0, 0.4), 2.0);
  const waveSpeed = Math.min(Math.max((120 / tempo) * 1.8, 0.8), 3.5);

  document.documentElement.style.setProperty('--eq-speed', `${eqSpeed.toFixed(2)}s`);
  document.documentElement.style.setProperty('--wave-speed', `${waveSpeed.toFixed(2)}s`);

  if (duckLottie) {
    try {
      duckLottie.speed = (tempo / 120).toFixed(2);
    } catch (e) {}
  }
}

// Parseador de Letras LRC Sincronizadas
async function loadTrackLyrics(trackName, artist) {
  syncedLyricsItems = [];
  currentSyncedLyricIndex = -1;
  explosiveParagraph.textContent = '🎤 Cargando letra...';

  try {
    const queryArtist = encodeURIComponent(artist.split(',')[0].trim());
    const queryTrack = encodeURIComponent(trackName.trim());
    const res = await fetch(`https://lrclib.net/api/get?artist_name=${queryArtist}&track_name=${queryTrack}`);
    
    if (res.ok) {
      const data = await res.json();
      const rawText = data.syncedLyrics || data.plainLyrics;

      if (rawText) {
        const lines = rawText.split('\n');
        lines.forEach(line => {
          const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
          if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const timeInSeconds = minutes * 60 + seconds;
            const text = match[3].trim();
            if (text) {
              syncedLyricsItems.push({ time: timeInSeconds, text });
            }
          } else {
            const cleanText = line.trim();
            if (cleanText) {
              syncedLyricsItems.push({ time: 0, text: cleanText });
            }
          }
        });
      }
    }
  } catch (err) {
    console.error('Error cargando letras:', err);
  }

  if (syncedLyricsItems.length === 0) {
    syncedLyricsItems = [
      { time: 0, text: `🎵 ${trackName}` },
      { time: 2, text: `🎤 ${artist}` },
      { time: 4, text: 'Siente la música' }
    ];
  }

  updateLyricsPosition();
}

function updateLyricsPosition() {
  if (syncedLyricsItems.length === 0) return;

  const currentSeconds = currentProgressMs / 1000;
  let activeIndex = 0;

  for (let i = 0; i < syncedLyricsItems.length; i++) {
    if (syncedLyricsItems[i].time <= currentSeconds) {
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeIndex !== currentSyncedLyricIndex) {
    currentSyncedLyricIndex = activeIndex;
    displayExplosiveParagraph(syncedLyricsItems[activeIndex].text);
  }
}

function displayExplosiveParagraph(text) {
  explosiveParagraph.classList.remove('explode');
  void explosiveParagraph.offsetWidth;
  explosiveParagraph.textContent = text;
  explosiveParagraph.classList.add('explode');
}

function updatePlayPauseUI(isPlaying) {
  if (isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    widgetContainer.classList.add('playing');
    if (duckLottie) {
      try { duckLottie.play(); } catch (e) {}
      duckLottie.style.opacity = '1';
    }
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    widgetContainer.classList.remove('playing');
    if (duckLottie) {
      try { duckLottie.pause(); } catch (e) {}
      duckLottie.style.opacity = '0.4';
    }
  }
}

async function updateCurrentlyPlaying() {
  if (isLoggingIn) return;

  try {
    const hasSession = await window.spotifyAPI.hasValidSession();
    
    if (!hasSession) {
      trackTitle.textContent = 'Spotify no conectado';
      artistName.textContent = 'Haz clic para iniciar sesión';
      albumArt.classList.add('hidden');
      albumPlaceholder.classList.remove('hidden');
      setupModal.classList.remove('hidden');
      currentIsPlaying = false;
      updatePlayPauseUI(false);
      scheduleNextPoll(2500);
      return;
    }

    setupModal.classList.add('hidden');

    const data = await window.spotifyAPI.getCurrentlyPlaying();

    if (!data || !data.track) {
      trackTitle.textContent = 'Sin reproducción activa';
      artistName.textContent = 'Abre Spotify y reproduce una canción';
      albumArt.classList.add('hidden');
      albumPlaceholder.classList.remove('hidden');
      currentIsPlaying = false;
      updatePlayPauseUI(false);
      scheduleNextPoll(2000);
      return;
    }

    const { track, isPlaying, progressMs, audioFeatures } = data;
    currentIsPlaying = isPlaying;

    lastSpotifyProgressMs = progressMs || 0;
    lastSpotifyFetchTime = Date.now();
    currentProgressMs = lastSpotifyProgressMs;

    trackTitle.textContent = track.name;
    artistName.textContent = track.artist;

    if (audioFeatures) {
      applyAudioFeatures(audioFeatures);
    }

    if (track.id !== currentTrackId) {
      currentTrackId = track.id;
      const targetLottieFile = evaluateCharacterAnimation(audioFeatures, track.id);
      updateCharacterAnimation(targetLottieFile);
      loadTrackLyrics(track.name, track.artist);
    } else {
      if (lyricsBtn.classList.contains('active')) {
        updateLyricsPosition();
      }
    }

    if (track.albumArt) {
      if (albumArt.src !== track.albumArt) {
        albumArt.src = track.albumArt;
      }
      albumArt.classList.remove('hidden');
      albumPlaceholder.classList.add('hidden');
    } else {
      albumArt.classList.add('hidden');
      albumPlaceholder.classList.remove('hidden');
    }

    updatePlayPauseUI(isPlaying);
    scheduleNextPoll(isPlaying ? 1000 : 2000);
  } catch (err) {
    console.error('Error actualizando canción:', err);
    scheduleNextPoll(2500);
  }
}

// Adaptativo de polling de red para menor consumo de recursos
function scheduleNextPoll(delayMs) {
  clearTimeout(pollingInterval);
  pollingInterval = setTimeout(updateCurrentlyPlaying, delayMs);
}

// Event Listeners de Autenticación
window.spotifyAPI.onAuthSuccess(() => {
  isLoggingIn = false;
  setupModal.classList.add('hidden');
  updateCurrentlyPlaying();
});

window.spotifyAPI.onLogout(() => {
  currentTrackId = '';
  currentIsPlaying = false;
  setupModal.classList.remove('hidden');
  trackTitle.textContent = 'Sesión cerrada';
  artistName.textContent = 'Haz clic para iniciar sesión';
  albumArt.classList.add('hidden');
  albumPlaceholder.classList.remove('hidden');
  updatePlayPauseUI(false);
});

// Inicialización
async function init() {
  startHighPrecisionTicker();

  const hasSession = await window.spotifyAPI.hasValidSession();
  if (hasSession) {
    setupModal.classList.add('hidden');
    updateCurrentlyPlaying();
  } else {
    setupModal.classList.remove('hidden');
    scheduleNextPoll(2500);
  }
}

init();

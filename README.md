# 💎 SpotiGlass v1.0.0-BETA

> **Desktop Spotify Glassmorphism Widget with Dynamic Lottie Characters & Taskbar Dock for Windows.**

[![GitHub Release](https://img.shields.io/github/v/release/yastinvasquezzz/spotiglass?color=1db954&label=SpotiGlass%20Release)](https://github.com/yastinvasquezzz/spotiglass/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-v29-47b5ff.svg)](https://www.electronjs.org/)

---

## ⚠️ Advertencia de Versión Beta

**SpotiGlass** se encuentra actualmente en versión **v1.0.0-BETA**.
Es un reproductor de escritorio ultraligero y dinámico diseñado para Windows 10/11 que sincroniza la música de Spotify en tiempo real.

👨‍💻 **Desarrollador Oficial**: [Yastin Vasquez](https://github.com/yastinvasquezzz)

---

## ✨ Características Destacadas

- 🎨 **Estética Glassmorphic & Ecualizador Adaptativo**: Extracción dinámica inteligente de los colores HSL de la portada del álbum.
- 🎭 **Reacción Dinámica de Personajes (Lottie)**:
  - 🦆 **Patito Bailarín (`duck.json`)**: Para canciones de alta energía y ritmo bailable.
  - ⚡ **Eclipse Fuego (`total-eclipse.json`)**: Para temas eufóricos y alegres.
  - 🥺 **Shiba Triste (`shiba-sad.json`)**: Reacción a baladas y temas melancólicos.
  - ☕ **Gato Meh (`meh-cat.json`)**: Para canciones chill, lo-fi o tranquilas.
- 🎤 **Letras Explosivas Sincronizadas (0ms Lag)**: Integración en tiempo real con LRCLib API.
- 📌 **Acople Magnético a la Barra de Tareas (230px / 310px)**: Se transforma en una píldora ceñida a la barra de tareas de Windows.
- 🛡️ **Inmunidad Absoluta a Minimización (DWM Watchdog)**: No se oculta ni se minimiza al presionar la tecla Windows (`🪟`), el buscador (`🔍`) o al cerrar pestañas.
- 🔑 **Persistencia Permanente de Sesión**: Inicias sesión 1 sola vez en Spotify y tu cuenta se guarda de forma segura.

---

## 📥 Descargas (Instalador & Versión Portable)

Visita la sección de [Releases de GitHub](https://github.com/yastinvasquezzz/spotiglass/releases) para descargar los ejecutables compilados de Windows:

- 📦 **`SpotiGlass-Setup-1.0.0-beta.exe`**: Instalador oficial con accesos directos automáticos.
- 💼 **`SpotiGlass-1.0.0-beta.exe`**: Versión portable sin instalación previa.

---

## 💻 Desarrollo Local

```powershell
# Clonar repositorio
git clone https://github.com/yastinvasquezzz/spotiglass.git
cd spotiglass

# Instalar dependencias
npm install

# Iniciar modo desarrollo
npm start

# Compilar instalador NSIS (.exe)
npm run build

# Compilar versión portable (.exe)
npm run dist
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).  
Desarrollado por **[Yastin Vasquez](https://github.com/yastinvasquezzz)**.

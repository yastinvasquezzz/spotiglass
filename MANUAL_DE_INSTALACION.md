# 🎵 SpotiGlass v1.0.0-BETA — Manual de Instalación & Uso

> [!WARNING]
> **ADVERTENCIA DE VERSIÓN BETA**:
> **SpotiGlass** se encuentra actualmente en versión **v1.0.0-BETA**. Es un widget de escritorio flotante con diseño Glassmorphic premium, sistema de reacción dinámica de personajes Lottie y acople magnético a la barra de tareas de Windows.
>
> 👨‍💻 **Desarrollador Oficial**: [Yastin Vasquez (GitHub)](https://github.com/yastinvasquezzz)

---

## 🚀 Opciones de Compilación e Instalación

### 📦 1. Compilación del Instalador Oficial de Windows (`Setup.exe`)
Para generar el instalador ejecutable **NSIS (`SpotiGlass-Setup-1.0.0.exe`)** con accesos directos automáticos en el Menú Inicio y Escritorio:

```powershell
npm run build
```
*El archivo ejecutable `SpotiGlass-Setup-1.0.0.exe` se generará automáticamente en la carpeta `dist/`.*

---

### 💼 2. Compilación de Versión Portable (`Portable.exe`)
Para generar una versión ejecutable sin instalación previa que puedes llevar en un USB o cualquier carpeta:

```powershell
npm run dist
```
*El archivo `SpotiGlass 1.0.0.exe` portable se generará en la carpeta `dist/`.*

---

## ⚡ Características Principales

1. **Arranque Automático con Windows**:
   - Registrado mediante `app.setLoginItemSettings()`.
   - Aparece en la pestaña **"Aplicaciones de arranque"** en el Administrador de Tareas de Windows.

2. **Inmunidad Total a Minimización**:
   - Resistente a clics en la tecla **Windows (`🪟`)**, **Buscador (`🔍`)**, cierres de pestañas de navegador y clics en la barra de tareas.
   - Las animaciones Lottie (`duck.json`, `total-eclipse.json`, `shiba-sad.json`, `meh-cat.json`) se mantienen **100% continuas y fluidas** en segundo plano sin pausarse.

3. **Acople Magnético a la Barra de Tareas (230px / 310px)**:
   - Presiona el botón de chincheta `📌` o arrastra el reproductor a la barra inferior para convertirlo en una píldora ultracompacta nativa de Windows.

4. **Sistema Tray Icon Personalizado**:
   - Icono oficial personalizado `icon.png` (de tu carpeta Descargas) en la bandeja del sistema.
   - Menú contextual con acceso rápido a:
     - 🟢 **Mostrar SpotiGlass**
     - 📌 **Acoplar a la Barra de Tareas**
     - 🌐 **Desarrollador: Yastin Vasquez (GitHub)**
     - 🚪 **Cerrar Sesión (Cambiar Cuenta)**
     - ❌ **Salir Completamente**

5. **Persistencia Permanente de Sesión**:
   - Inicias sesión 1 sola vez en Spotify y la cuenta queda guardada de forma permanente sin volver a pedir login al reiniciar la PC.

---

## 👨‍💻 Créditos y Soporte
- **Desarrollador**: Yastin Vasquez
- **GitHub**: [https://github.com/yastinvasquezzz](https://github.com/yastinvasquezzz)
- **Licencia**: MIT

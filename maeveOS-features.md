# maeveOS

**Desktop Environment in the Browser**

maeveOS is a personal fork of the acclaimed [daedalOS](https://github.com/DustinBrett/daedalOS) project by Dustin Brett. It delivers a complete, fully-featured desktop operating system experience that runs **entirely in the browser** — no installation, no server backend required beyond static hosting.

**Key differentiators in maeveOS**:
- Powered by **ZenFS** (modern successor to BrowserFS) for a more robust, performant virtual file system
- Built with **Yarn 4 (Berry)** for faster installs, better PnP support, and modern monorepo tooling
- **Future roadmap**: Migration to **Tauri** for a native desktop client (Windows/macOS/Linux) and experimental **Rust + WebAssembly** backend for core subsystems (file system, emulation) to achieve near-native performance while keeping the web version alive.

Inspired by classic Windows desktops but supercharged with modern web technologies, maeveOS brings file management, windowed applications, emulators, games, productivity tools, and even local AI directly to your browser tab.

> **Original Project Stats** (as of late 2024): 12.6k+ GitHub stars • 4+ years of development • 4,100+ commits • Nominated for Webby Awards

---

## 🌟 Key Features

### 🖥️ Core Desktop Experience
- **Familiar Window Manager** — Resizable, draggable, minimizable/maximizable windows with smooth Framer Motion animations and persistent state (size, position, maximized).
- **Start Menu** — Searchable launcher with app grid, folder support, recent items, and spotlight-style effects. Open with Windows key or Shift+Esc.
- **Taskbar** — Live previews, active window indicators, quick search, and integrated AI chat access.
- **Dynamic Clock & Calendar** — NTP-synchronized time (Web Worker + OffscreenCanvas), interactive calendar popup with fun Easter eggs (confetti on Nov 26, sheep spawning).
- **Animated Wallpapers & Screensavers** — Multiple dynamic backgrounds (Matrix rain, Hexells, coastal scenes, NASA APOD slideshows), video wallpapers, custom image/video sets, and classic 3D screensavers (FlowerBox, Maze, Pipes). AI-generated wallpapers via Stable Diffusion.
- **Deep Linking** — Load specific files or apps via URL query parameters (e.g., `?file=readme.md` or `?app=Terminal`).

### 📁 Advanced File System
**Powered by ZenFS** (modern BrowserFS successor) with **IndexedDB** persistence for true desktop-like behavior — a key differentiator for maeveOS offering improved performance, better API ergonomics, and enhanced compatibility with modern web standards:

- **File Explorer** — Icon view + new **Details/Column view** with sorting (name, size, date, type), group selection, drag-and-drop (internal + from your real OS), address bar, back/forward, recent locations.
- **Rich File Operations**:
  - Create, rename, delete, cut/copy/paste, properties
  - **Compression & Archiving**: ZIP creation, extraction of ZIP/7Z/RAR/TAR/GZ/ISO
  - **Live Directory Mounting** — Mount real folders (changes sync bidirectionally)
  - **File Conversion** — e.g., PNG ↔ JPEG, HEIF support
  - **Media Metadata** — EXIF/IPTC data via media-info WASM
  - Dynamic icons (animated GIFs, music waveforms, video thumbnails, emulator save states)
- **Keyboard Shortcuts** — Full Windows-like support (Ctrl+C/V/X/A, F2 rename, F5 refresh, etc.)
- **Screen Capture** — Built-in recorder for screenshots or video capture.

### 🛠️ Productivity & Development Tools
- **Terminal** — Full-featured `xterm.js` with:
  - Piping (`dir | lolcat`), autocomplete, command history
  - **Python runtime** (Pyodide + micropip for package installation, e.g., `snowball-stemmer`)
  - **JavaScript runtime** (QuickJS / qjs)
  - Git support via isomorphic-git
  - Weather (`wttr.in`), neofetch, eSheep, and more
- **Code Editors**:
  - **Monaco Editor** (VS Code engine) — syntax highlighting, Prettier formatting for JS/TS/CSS/HTML/Markdown/JSON, etc.
  - **Vim** — Full vim.js integration
- **Markdown Viewer** — Live rendering with Marked
- **WYSIWYG Editor** — TinyMCE for RTF and web content
- **Image Editor** — jspaint (classic MS Paint recreation) supporting BMP/GIF/ICO/JPG/PNG/TIFF/WebP
- **Photo Viewer** — Advanced support for HEIC/HEIF, JPEG XL, QOI, TIFF with pan/zoom (panzoom)

### 🌐 Applications & Connectivity
- **Built-in Browser** — Navigate the web with bookmarks, history, Google search, IPFS support, chrome://dino, and full **DevTools** (Eruda: Elements, Network, Console, Sources).
- **Winamp** — Authentic music player with skin support, playlist, streaming, and **Milkdrop visualizations**.
- **IRC Client** — WebSocket-powered (KiwiIRC) for real-time chat (e.g., Libera.chat).
- **Nostr Messenger** — Encrypted direct messaging (NIP-04) with auto key generation.
- **PDF Viewer** — PDF.js with zoom, print, and thumbnail support.
- **Video Player** — Video.js with YouTube embedding and keyboard controls.

### 🎮 Emulators & Retro Gaming
Run classic software and games directly in the browser:

- **DOS Emulator** (js-dos) — .exe, .jsdos, .zip files with auto state saving. Play Doom, Minesweeper, etc.
- **x86 Emulator** (v86) — Boot Linux ISOs (Tiny Core, etc.), old Windows, with network via Winsock proxy.
- **Console Emulator** (EmulatorJS) — NES, SNES, N64, Game Boy, Sega Genesis, Atari, and dozens more ROM formats.
- **Flash Player** (Ruffle) — Play classic .swf/.spl files.
- **Windows Executables** (BoxedWine) — Run 16/32-bit Windows apps and games from ZIPs (e.g., Notepad++).

**Featured Games**:
- Quake III Arena
- Space Cadet Pinball (full 3D recreation)
- DX-Ball
- ClassiCube (Minecraft Classic)
- And hundreds more via emulators!

### 🤖 AI-Powered Features (Talos)
- **Local AI Co-Pilot** — Runs entirely in-browser using **WebLLM + WebGPU** (or Chrome's experimental Prompt API).
- Chat, document summarization, and **on-device image generation** (Stable Diffusion via WebSD).
- Integrated into taskbar search and dedicated AI workspace.
- Privacy-first: nothing leaves your browser.

### ✨ Unique & Fun Touches
- **Persistent Emulator/Game States** — Save progress across sessions.
- **RSS Feed Generator** — Dynamic personal RSS from your files/folders.
- **Easter Eggs** — Hidden surprises throughout the UI.
- **Mobile-Responsive** — Wallpapers and UI adapt beautifully on touch devices.
- **Extensive Format Support** — JPEG-XL, QOI, HEIF, WebP, and many more.

### 🚀 Future Roadmap (maeveOS-specific)
- **Tauri Desktop Client** — Full migration from pure web to a native Tauri app (Rust backend + web frontend) delivering true desktop app experience with system tray, file system access, and better performance on Windows, macOS, and Linux.
- **Rust + WebAssembly Core** — Experimental rewrite of performance-critical subsystems (ZenFS-compatible file system layer, emulator cores, terminal) in Rust compiled to WASM. Goal: near-native speed in the browser while maintaining 100% web compatibility and dramatically reducing JavaScript bundle size.
- These changes position maeveOS as both the ultimate in-browser OS *and* a powerful cross-platform desktop environment.

---

## 🧰 Technology Stack

| Category          | Technologies |
|-------------------|--------------|
| **Frontend**      | Next.js, React, TypeScript, Framer Motion, react-rnd |
| **File System**   | **ZenFS** (maeveOS differentiator), IndexedDB, fflate, 7z-wasm, music-metadata-browser |
| **Build Tooling** | **Yarn 4 (Berry)** — Plug'n'Play, zero-installs, faster CI |
| **Performance**   | OffscreenCanvas, Web Workers, WebGPU |
| **Emulation**     | js-dos, v86, BoxedWine, EmulatorJS, Ruffle |
| **Editors**       | Monaco, xterm.js, vim.js, TinyMCE, jspaint, pdf.js, panzoom |
| **AI / ML**       | WebLLM, WebSD (Stable Diffusion), Prompt API |
| **Other**         | Pyodide, isomorphic-git, Nostr (NIP-04), Video.js, Winamp (Webamp) |

**Fully client-side** — all computation happens in your browser for maximum privacy and speed.

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js (LTS recommended)
- **Yarn 4 (Berry)** — the project uses modern Yarn with Plug'n'Play (PnP) and zero-installs for reproducible, fast setups

### Local Setup
```bash
git clone https://github.com/YOUR_USERNAME/maeveOS.git   # Replace with your fork
cd maeveOS
yarn install

# If you encounter OpenSSL errors:
export NODE_OPTIONS=--openssl-legacy-provider

yarn build:prebuild
yarn dev
```

Open http://localhost:3000 in your browser.

### Production Build
```bash
yarn build
yarn serve
```

### Docker
```bash
docker build -t maeveos .
docker run -dp 3000:3000 --rm --name maeveos maeveos
```

---

## 📍 Demo & Links

- **Live Demo** (Original): [https://dustinbrett.com](https://dustinbrett.com)
- **Original GitHub**: [DustinBrett/daedalOS](https://github.com/DustinBrett/daedalOS)
- **maeveOS Fork**: *(Add your repository link here)*
- **YouTube Review** (4th Annual Update): [Watch the video](https://www.youtube.com/watch?v=djCqHH0SCmA)

---

## 🙏 Credits & Acknowledgments

maeveOS is a fork of **daedalOS**, an incredible open-source project created and maintained by **Dustin Brett**.

Huge respect to Dustin for spending 4+ years building this masterpiece and sharing it with the community. This fork (maeveOS) aims to explore personal customizations, new features, and continued evolution while preserving the original vision.

Special thanks to all the open-source libraries and contributors that make this possible.

---

## 📄 License

MIT License — same as the original daedalOS project.

---

*Built with ❤️ in the browser. Fork it, customize it, make it yours.*

---

**Want to contribute or suggest features for maeveOS?** Open an issue or pull request on the repository!
# maeveOS

**Desktop Environment in the Browser**

maeveOS is a personal fork of [daedalOS](https://github.com/DustinBrett/daedalOS) by Dustin Brett — a complete desktop OS experience running **entirely in the browser** with no installation and no server backend beyond static hosting.

**Key differentiators:**
- Powered by **ZenFS** (modern successor to BrowserFS) for a more robust, performant virtual file system
- **Yarn 4 (Berry)** for faster installs, better PnP support, and modern monorepo tooling
- **Roadmap**: Migration to **Tauri** for a native desktop client and experimental **Rust + WebAssembly** backend for core subsystems

> **Original project stats** (late 2024): 12.6k+ GitHub stars · 4+ years · 4,100+ commits · Nominated for Webby Awards

[![Feature Overview](https://img.youtube.com/vi/djCqHH0SCmA/mqdefault.jpg)](https://www.youtube.com/watch?v=djCqHH0SCmA)

---

## System

### File System

Powered by **ZenFS** with **IndexedDB** persistence:

- **File Explorer** — Icon view and Details/Column view with sorting by name, size, type, date; address bar; back/forward; recent locations; search
- [Drag & Drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) from your real OS with loading progress dialog
- ZIP ([write support](https://www.npmjs.com/package/fflate)), ZIP/ISO read, [7Z/GZ/RAR/TAR/etc. extract](https://github.com/use-strict/7z-wasm)
- Group selection, drag to sort/arrange, persists icon positions and sort order
- Dynamic auto-cached icons for music, images, video, and emulator states
- Context menus: Cut, Copy, Create Shortcut, Delete, Rename, Add File(s), [Map Directory](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API), Open with, Open Terminal here, Download, Add to Archive, Extract Here, Set as Wallpaper, Convert, Properties
- Keyboard shortcuts: `Ctrl+C/V/X/A`, `Delete`, `F2`, `F5`, `Backspace`, Arrows, `Enter`, `Shift+Ctrl+R`, `Shift+F10/F12`

### Windows

- [Resizable and draggable](https://github.com/bokuweb/react-rnd) with minimize, maximize, and close
- Persists size, position, and maximized state across sessions
- [Smooth open/close animations](https://www.framer.com/motion/) via Framer Motion

### Start Menu

- Expandable sidebar with app grid, document/picture/video shortcuts, and Power (clears session)
- Spotlight visual effect and folder support
- Open with **Shift+Esc** or Windows Key (fullscreen)

### Taskbar

- [Window peek previews](https://github.com/bubkoo/html-to-image)
- Focused window indicator
- Search menu with recent files
- AI Chat Agent ([Prompt API](https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c) & [WebLLM](https://github.com/mlc-ai/web-llm)) with summarize and image generation

### Clock & Calendar

- Runs in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) drawn on [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- NTP-synchronized time with date tooltip and calendar popup
- Easter eggs: confetti on Nov 26, sheep spawning

### Wallpapers & Screensavers

- Dynamic animated wallpapers: [Waves](https://www.vantajs.com/?effect=waves), [Hexells](https://znah.net/hexells/), [Matrix](https://rezmason.github.io/matrix/), [Coastal Landscape](https://www.shadertoy.com/view/fstyD4)
- Set via image or video (Fill, Fit, Stretch, Tile, Center) or picture slideshow
- Remote sources: [NASA APOD](https://api.nasa.gov/#apod), [Art Institute of Chicago](https://api.artic.edu/docs/), [Lorem Picsum](https://picsum.photos/)
- AI-generated wallpapers via [Stable Diffusion](https://stability.ai/stable-diffusion)
- Screensavers: [3D FlowerBox](https://github.com/kevin-shannon/3D-FlowerBox), [3D Maze](https://github.com/ibid-11962/Windows-95-3D-Maze-Screensaver), [Pipes](https://github.com/1j01/pipes)

### Deep Linking

Load apps or files via URL query parameters: `/?url=/CREDITS.md` · `/?app=Browser`

---

## Apps

### [BoxedWine](http://www.boxedwine.org/) — `.exe` `.zip`

Runs 16/32-bit Windows applications in the browser.

### Browser — `.htm` `.html`

- Loads websites with CORS support; bookmark bar with favicon support
- Back/Forward/Reload; Google search via address bar
- IPFS protocol; [chrome://dino](https://github.com/wayou/t-rex-runner)

### [DevTools](https://eruda.liriliri.io/)

Console, Elements, Network, Resources, Sources, DOM. Open from Start Menu or **Shift+F12**.

### [EmulatorJS](https://github.com/ethanaobrien/emulatorjs) — `.32x` `.a26` `.a52` `.a78` `.gb` `.gba` `.gbc` `.gen` `.gg` `.j64` `.jag` `.lnx` `.n64` `.nds` `.nes` `.ngc` `.ngp` `.pce` `.sfc` `.smc` `.smd` `.sms` `.v64` `.vb` `.ws` `.wsc` `.z64`

Console game emulator — NES, SNES, N64, Game Boy, Sega, Atari, and more.

### [IRC](https://kiwiirc.com/)

WebSocket-powered IRC client; connects to networks like Libera.chat.

### [js-dos](https://js-dos.com/) — `.exe` `.jsdos` `.zip`

DOS emulator with automatic save states (`/Users/Public/Snapshots`) and automatic window resize.

### [Marked](https://marked.js.org/) — `.md`

Live Markdown viewer.

### Messenger

Encrypted direct messaging using [Nostr Protocol](https://nostr.com/) (NIP-04) with automatic key generation.

### [Monaco Editor](https://microsoft.github.io/monaco-editor/)

VS Code's editor engine — syntax highlighting for all file types, `Ctrl+S` save, cursor position, [Prettier](https://prettier.io/) formatting for JSON, JS/TS, CSS/Sass/Less, HTML, Markdown.

### [Paint](https://github.com/1j01/jspaint) — `.bmp` `.gif` `.ico` `.jpg` `.png` `.tiff` `.webp`

Full MS Paint recreation for creating and editing images.

### [PDF](https://mozilla.github.io/pdf.js/) — `.pdf`

Render and print PDFs with page count, zoom, and thumbnail support.

### Photos

- Standard web formats plus [HEIF](https://github.com/catdad-experiments/libheif-js) (`.heic` `.heif`), [JPEG XL](https://github.com/niutech/jxl.js) (`.jxl`), [QOI](https://gist.github.com/nicolaslegland/f0577cb49b1e56b729a2c0fc0aa151ba) (`.qoi`), [TIFF](https://github.com/photopea/UTIF.js) (`.tif` `.tiff`)
- Fullscreen and [pan/zoom](https://github.com/anvaka/panzoom)

### [Ruffle](https://ruffle.rs/) — `.swf` `.spl`

Flash Player emulator.

### [Stable Diffusion](https://stability.ai/stable-diffusion)

AI image generation (512×512) running locally via [WebSD](https://mlc.ai/web-stable-diffusion/). Privacy-first — nothing leaves your browser.

### [Terminal](https://xtermjs.org/)

- Full file system access; autocomplete and history; pipe commands (`dir | lolcat`)
- `help` for command list; open with **Shift+F10** or Start Menu
- [Git](https://isomorphic-git.org/) (checkout & clone)
- [Python](https://pyodide.org/) (`.py`) with micropip for package installation (e.g. `snowball-stemmer`)
- [WebAssembly Package Manager](https://wapm.io/) (e.g. `wapm cowsay moo`)
- Weather (`wttr.in`), neofetch, eSheep

### [TinyMCE](https://www.tiny.cloud/tinymce/) — `.rtf` `.whtml`

WYSIWYG editor with read and edit modes.

### [Virtual x86](https://copy.sh/v86/) — `.img` `.iso`

x86 emulator — boot Linux ISOs, old Windows; automatic save states and window resize.

### [Video Player](https://videojs.com/)

Plays all [standard video formats](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs), YouTube videos/shortcuts, with keyboard shortcuts for volume, seek, scale, and fullscreen.

### [Vim](https://github.com/coolwanglu/vim.js)

Full vim.js integration for all file types.

### [Webamp](https://webamp.org/) — `.mp3` `.wsz`

Authentic Winamp player with [skin support](https://skins.webamp.org/), playlist, streaming, and [Milkdrop](https://github.com/jberg/butterchurn) visualizations.

---

## Games

| Game | Description |
|---|---|
| [ClassiCube](https://www.classicube.net/) | Minecraft Classic compatible client |
| [DX-Ball](https://habr.com/en/post/147339/) | Arkanoid-style block breaker |
| [Space Cadet Pinball](https://github.com/alula/SpaceCadetPinball) | Reverse-engineered 3D Pinball from Windows |
| [Quake III Arena](https://github.com/lrusso/Quake3) | Classic first-person shooter port |
| + Hundreds more | Via EmulatorJS, js-dos, and v86 emulators |

---

## Technology Stack

| Category | Technologies |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Framer Motion, react-rnd |
| **File System** | **ZenFS**, IndexedDB, fflate, 7z-wasm, music-metadata-browser |
| **Build Tooling** | **Yarn 4 (Berry)** — Plug'n'Play, zero-installs |
| **Performance** | OffscreenCanvas, Web Workers, WebGPU |
| **Emulation** | js-dos, v86, BoxedWine, EmulatorJS, Ruffle |
| **Editors** | Monaco, xterm.js, vim.js, TinyMCE, jspaint, pdf.js, panzoom |
| **AI / ML** | WebLLM, WebSD (Stable Diffusion), Prompt API |
| **Other** | Pyodide, isomorphic-git, Nostr (NIP-04), Video.js, Webamp |

Fully client-side — all computation happens in your browser.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (LTS)
- **Yarn 4 (Berry)** — the project uses modern Yarn with Plug'n'Play

### Development

```bash
git clone https://github.com/k-wilkinson/maeveOS.git
cd maeveOS
yarn install

# If you hit OpenSSL errors:
export NODE_OPTIONS=--openssl-legacy-provider

yarn build:prebuild   # required once before yarn dev
yarn dev
```

Open http://localhost:3000.

### Production

```bash
yarn install
yarn build
yarn serve
```

### Docker

```bash
docker build -t maeveos .
docker run -dp 3000:3000 --rm --name maeveos maeveos
```

---

## Roadmap (maeveOS-specific)

- **Tauri Desktop Client** — Full migration to a native Tauri app (Rust backend + web frontend) for system tray, real file system access, and better performance on Windows, macOS, and Linux
- **Rust + WebAssembly Core** — Rewrite of performance-critical subsystems (ZenFS-compatible file system layer, emulator cores, terminal) in Rust compiled to WASM for near-native speed while maintaining full web compatibility

---

## Credits

maeveOS is a fork of **[daedalOS](https://github.com/DustinBrett/daedalOS)**, created and maintained by **Dustin Brett** over 4+ years. Huge respect to Dustin and all the open-source libraries that make this possible.

- **Live Demo** (original): [dustinbrett.com](https://dustinbrett.com)
- **YouTube** (4th Annual Update): [Watch](https://www.youtube.com/watch?v=djCqHH0SCmA)

---

MIT License — same as the original daedalOS project.

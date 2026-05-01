# 🚗 Car Showcase

> **Three.js · GSAP · Vanilla JS** — A luxury editorial 3D car viewer

A cinematic, dark-mode car showcase powered by Three.js r128 and GSAP 3. Each car has its own matte background colour, accent lighting, animated spec panel, and a smooth veil transition between models. Works as a standalone web page or embedded inside an Electron app.

---

## ✨ Features

- **3D GLB/GLTF model loading** with Draco compression support
- **Per-car matte backgrounds** — individual CSS colour per car, no bleed into 3D paint
- **Per-car accent lighting** — point light colour changes with each car
- **Animated spec panel** — horsepower, top speed, 0–100 km/h with GSAP stagger
- **Model caching** — each model is loaded once and cached for instant re-visits
- **Smooth veil transitions** between cars (configurable duration)
- **Auto-rotating OrbitControls** with mouse/touch drag and scroll-to-zoom
- **Responsive resize handler** — correct aspect ratio on window resize
- **Keyboard navigation** — `←` `→` arrow keys
- **Touch/swipe navigation** — swipe left / right
- **Nav pill bar** — click any pill to jump to that car
- **Custom CSS cursor** — gold dot follows the mouse

---

## 📁 File Structure

```
car-showcase/
├── index.html           ← Entry point — load this in a browser or Electron
├── css/
│   └── style.css        ← All styling. Edit CSS variables to re-theme.
├── js/
│   ├── carShowcase.js   ← Core engine. Edit only when customising the engine.
│   └── cars.js          ← ✏️  YOUR FILE — add/remove cars here.
└── models/              ← Drop your .glb / .gltf files here.
    ├── 2021_pagani_imola.glb
    ├── 2014_koenigsegg_one-1.glb
    ├── 2023_porsche_911_gt3_rs_2.7_carrera_tribute_992.glb
    ├── mclaren_f1_gtr_longtail__www.vecarz.com.glb
    ├── free_mclaren_p1_gtr.glb
    └── 1995_ferrari_f50.glb
```

---

## 🚀 Quick Start

### Browser (local server required)

Some browsers block `file://` CORS for `.glb` files. Use a local server:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code: use the "Live Server" extension
```

Then open `http://localhost:8080`.

### Electron

```js
// src/main.js
const path = require('path');
mainWindow.loadFile(path.join(__dirname, '..', 'car-showcase', 'index.html'));
```

---

## 🔧 Adding a Car

Open `js/cars.js` and add a `.addCar({...})` call **before** `showcase.init()`:

```js
showcase
  .addCar({
    name:      'Ferrari 488 GTB',
    brand:     'Ferrari',
    tagline:   'Born on the track.',
    modelPath: './models/ferrari_488.glb',

    matteColor:  '#14000a',    // flat matte background colour
    accentColor: '#ff1a35',    // accent light + nav highlight

    scale:         1.0,        // model scale multiplier
    offsetY:       -0.5,       // lift/lower the model (Y axis)
    offsetX:       0,          // shift model left/right
    rotateY:       0,          // initial Y rotation in radians

    shadowOpacity: 0.75,       // ground shadow darkness (0–1)
    shadowScale:   1.0,        // ground shadow footprint size

    specs: {
      hp:    '660 HP',
      speed: '330 KM/H',
      accel: '3.0 S',
    }
  })
  .addCar({ /* next car */ });

showcase.init();
```

> **Tip:** Keep `matteColor` very dark (e.g. `#080808` – `#1a0a00`). Light backgrounds will
> look washed out against the 3D lighting rig.

---

## 📖 `addCar()` Full API

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Car name — shown as large heading |
| `modelPath` | `string` | ✅ | Path to `.glb` or `.gltf` file |
| `brand` | `string` | — | Brand label above the name |
| `tagline` | `string` | — | Italic subtitle beneath the name |
| `matteColor` | `string` | — | **Recommended** — single flat CSS hex for background |
| `gradient` | `string[]` | — | Array of 1–5 hex stops → radial gradient (alternative to matteColor) |
| `solidColor` | `string` | — | Alias for `matteColor` (legacy) |
| `accentColor` | `string` | — | Accent light colour + CSS `--accent` var (default `#e8c97a`) |
| `scale` | `number` | — | Manual scale multiplier (default `1.0`) |
| `offsetY` | `number` | — | Move model up/down (default `-0.5`) |
| `offsetX` | `number` | — | Move model left/right (default `0`) |
| `rotateY` | `number` | — | Initial Y rotation in radians (default `0`) |
| `shadowOpacity` | `number` | — | Ground shadow darkness 0–1 (default `0.25`) |
| `shadowScale` | `number` | — | Ground shadow footprint size (default `1.0`) |
| `specs.hp` | `string` | — | Horsepower value in spec panel |
| `specs.speed` | `string` | — | Top speed value in spec panel |
| `specs.accel` | `string` | — | 0–100 km/h time in spec panel |

---

## ⚙️ `new CarShowcase(config)` — Global Options

| Option | Default | Description |
|---|---|---|
| `autoRotate` | `true` | Auto-spin the model |
| `autoRotateSpeed` | `0.3` | Spin speed (higher = faster) |
| `cameraDistance` | `5` | Starting camera distance |
| `cameraHeight` | `1.2` | Camera height above ground |
| `enableZoom` | `true` | Allow scroll-to-zoom |
| `transitionDuration` | `0.7` | Veil fade speed (seconds) |

---

## 🎮 Navigation

| Input | Action |
|---|---|
| `→` / `↓` arrow key | Next car |
| `←` / `↑` arrow key | Previous car |
| Swipe left | Next car |
| Swipe right | Previous car |
| Nav pill click | Jump to that car |
| `showcase.next()` | JS API — next car |
| `showcase.prev()` | JS API — previous car |
| `showcase.goTo(i)` | JS API — jump to index (0-based) |

---

## 🎨 Theming

All global colours live in `css/style.css` as CSS variables:

```css
:root {
  --accent: #e8c97a;               /* default gold accent (overridden per car) */
  --text:   #f0ece3;               /* body text colour */
  --dim:    rgba(240,236,227,0.4); /* subdued / label text */
  --dark:   #080808;               /* base background colour */
  --nav-h:  88px;                  /* bottom nav bar height */
}
```

Per-car accent colours are applied at runtime via `document.documentElement.style.setProperty('--accent', ...)`.

---

## 🛠️ Tech Stack

| Library | Version | CDN |
|---|---|---|
| [Three.js](https://threejs.org) | r128 | cdnjs |
| [GSAP](https://gsap.com) | 3.12.5 | cdnjs |
| GLTFLoader | (three@0.128) | unpkg |
| OrbitControls | (three@0.128) | unpkg |
| DRACOLoader | (three@0.128) | unpkg |
| RGBELoader | (three@0.128) | unpkg |

All dependencies are loaded from CDN — no build step required.

---

## 🔍 Troubleshooting

**Model doesn't appear**
- Check the browser console for 404 errors on the model path
- Ensure you're running a local server (not `file://`)
- Verify the `modelPath` is correct relative to `index.html`

**Model too big / too small**
- Adjust `scale` — try values between `0.5` and `5.0`
- Adjust `offsetY` if the car floats above or clips through the ground

**Background not changing between cars**
- Make sure you're using `matteColor` (hex string) or `gradient` (array of hex strings)
- Check the browser console — the engine will log `addCar` validation errors

**Slow initial load**
- Compress your models at [gltf.report](https://gltf.report/) — aim for under 5 MB per model
- Models are cached after first load; switching back to a visited car is instant

**CORS errors on `file://`**
- Always use a local HTTP server (see Quick Start above)

---

## 📦 Getting Free Car Models

| Source | Format | Notes |
|---|---|---|
| [Sketchfab.com](https://sketchfab.com) | `.glb` | Search "car free download" — hundreds of options |
| [Free3D.com](https://free3d.com) | `.obj` → convert | Use [gltf.report](https://gltf.report/) to convert |
| [TurboSquid](https://turbosquid.com) | `.glb` | Filter by "Free" |
| [CGTrader](https://cgtrader.com) | `.glb` | Filter by "Free" |

> Download `.glb` when available — it's a single self-contained binary. Compress large models at [gltf.report](https://gltf.report/) before use.

---

## 💡 Optional: HDR Environment Map

For maximum realism, add an HDR environment (gives reflections on car paint):

```js
// In carShowcase.js _initThree(), after scene setup:
const { RGBELoader } = window._THREE_EXTRAS;
new RGBELoader().load('./hdr/studio.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  this._scene.environment = texture;
  // this._scene.background = texture; // optional — shows HDR as BG
});
```

Free HDR maps: [polyhaven.com/hdris](https://polyhaven.com/hdris)

---

## 🏎️ Current Car List

| # | Car | HP | Top Speed | 0–100 |
|---|---|---|---|---|
| 01 | Pagani Imola 2021 | 827 HP | 300 KM/H | 2.7 S |
| 02 | Koenigsegg One:1 | 1,360 HP | 440 KM/H | 2.8 S |
| 03 | Porsche 911 GT3 RS | 525 HP | 296 KM/H | 3.2 S |
| 04 | McLaren F1 GTR Longtail | 668 HP | 391 KM/H | 3.2 S |
| 05 | McLaren P1 GTR | 1,000 HP | 350 KM/H | 2.4 S |
| 06 | Ferrari F50 | 513 HP | 325 KM/H | 3.7 S |

---

## 📄 License

All 3D models are sourced from Sketchfab under their respective free-download licenses.
The showcase engine and UI are original work — free to use and modify.

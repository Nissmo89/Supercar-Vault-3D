/* ─────────────────────────────────────────────────────────────────
   cars.js  —  Your car registry  (v2 — Cinematic Edition)
   This is the ONLY file you need to edit to add/remove cars.

   v2 changes:
     • Use  matteColor  instead of gradient (single flat matte bg)
     • shadowOpacity  (0–1)  — tweak how dark the blob shadow is
     • shadowScale    (float) — scale the shadow footprint
─────────────────────────────────────────────────────────────────── */

const showcase = new CarShowcase({
  autoRotate: true,
  autoRotateSpeed: 0.35,
  cameraDistance: 5,
  cameraHeight: 1.2,
  enableZoom: true,
  transitionDuration: 0.7,
});


// ─────────────────────────────────────────────────────────────────
// ADD YOUR CARS HERE
// matteColor = single flat CSS colour for the background.
// The renderer background is transparent so the CSS colour
// NEVER bleeds into the car's paint or reflections.
// ─────────────────────────────────────────────────────────────────

showcase

  // ── Car 1 — Pagani ───────────────────────────────────────────
  .addCar({
    name: 'Imola 2021',
    brand: 'Pagani',
    tagline: 'Where racing DNA meets the open road.',
    modelPath: './models/2021_pagani_imola.glb',

    matteColor: '#000000',
    accentColor: '#FFD166',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    // // ── Cinematic filters (all optional — remove any line to use defaults) ──
    // vignetteStrength: 0.80,    // 0 = none  →  1 = pitch-black corners
    // vignetteSoftness: 0.50,    // 0 = tight ring  →  1 = very gradual fade
    // vignetteColor:    '#000',  // corner colour (usually #000 or a dark hue)
    // filmGrain:        0.05,    // 0 = clean  →  0.12 = heavy cinematic grain
    // brightness:       1.0,     // 0.5 = dark  →  2.0 = overexposed
    // contrast:         1.05,    // 0.5 = flat  →  2.0 = punchy
    // saturation:       1.0,     // 0 = B&W  →  2.0 = vivid
    // hueRotate:        0,       // 0-360 degrees of hue shift
    // exposure:         1.2,     // Three.js ACES tone-mapping exposure
    // // colorTint:     { color: '#1a0a00', opacity: 0.08, blendMode: 'multiply' },

    specs: { hp: '827 HP', speed: '300 KM/H', accel: '2.7 S' }
  })

  // ── Car 2 — Koenigsegg ───────────────────────────────────────
  .addCar({
    name: 'One:1',
    brand: 'Koenigsegg',
    tagline: 'One megawatt. One megagram. One-to-one.',
    modelPath: './models/2014_koenigsegg_one-1.glb',

    matteColor: '#BEB7A4',
    accentColor: '#CED0CE',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    specs: {
      hp: '1,360 HP',
      speed: '440 KM/H',
      accel: '2.8 S',
    }
  })

  // ── Car 3 — Porsche ──────────────────────────────────────────
  .addCar({
    name: '911 GT3 RS',
    brand: 'Porsche',
    tagline: 'Motorsport engineering, undiluted.',
    modelPath: './models/2023_porsche_911_gt3_rs_2.7_carrera_tribute_992.glb',

    matteColor: '#2D3142',
    accentColor: '#694873',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    specs: {
      hp: '525 HP',
      speed: '296 KM/H',
      accel: '3.2 S',
    }
  })

  // ── Car 4 — McLaren F1 GTR ───────────────────────────────────
  .addCar({
    name: 'F1 GTR Longtail',
    brand: 'McLaren',
    tagline: 'The Le Mans legend, born on the limit.',
    modelPath: './models/mclaren_f1_gtr_longtail__www.vecarz.com.glb',

    matteColor: '#28231C',
    accentColor: '#ff6600',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    specs: {
      hp: '668 HP',
      speed: '391 KM/H',
      accel: '3.2 S',
    }
  })

  // ── Car 5 — McLaren P1 GTR ───────────────────────────────────
  .addCar({
    name: 'P1 GTR',
    brand: 'McLaren',
    tagline: 'Track-only perfection, no compromise.',
    modelPath: './models/free_mclaren_p1_gtr.glb',

    matteColor: '#0D1B2A',
    accentColor: '#FFE600',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,



    specs: {
      hp: '1,000 HP',
      speed: '350 KM/H',
      accel: '2.4 S',
    }
  })

  // ── Car 6 — Ferrari F50 ──────────────────────────────────────
  .addCar({
    name: 'F50',
    brand: 'Ferrari',
    tagline: 'A Formula 1 car built for the road.',
    modelPath: './models/1995_ferrari_f50.glb',

    matteColor: '#1C0118',
    accentColor: '#FF2400',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    specs: {
      hp: '513 HP',
      speed: '325 KM/H',
      accel: '3.7 S',
    }
  })


  // ── Car 6 — Nissan ──────────────────────────────────────
  .addCar({
    name: 'Caspita F1',
    brand: 'Jiotto',
    tagline: 'The legend that changed the game.',
    modelPath: './models/jiotto_caspita_f1_road_car_1989_by_alex.ka..glb',

    matteColor: '#2e2e2e',
    accentColor: '#b23a48',

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    // ── Cinematic vignette — deep dark corners, moody race-car feel ──
    vignetteStrength: 0.58,   // strong but not fully black
    vignetteSoftness: 0.42,   // tighter fade — corners darken sooner
    vignetteColor: '#000',
    contrast: 1.01,   // slight contrast boost to make the yellow pop

    specs: {
      hp: '513 HP',
      speed: '325 KM/H',
      accel: '3.7 S',
    }
  })

  // ── Car 7 — Ford Mustang Mach-1 ──────────────────────────────────────
  .addCar({
    name: 'Mach-1',
    brand: 'Ford',
    tagline: 'Ford Mustang Mach-1 428 Cobra Jet 1969',
    modelPath: './models/1969_ford_mustang_mach-1_428_cobra_jet.glb',


    matteColor: '#161618',    // Dark concrete grey
    accentColor: '#ff3366',   // Neon hot pink (or use #ff5500 for neon orange)

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    specs: {
      hp: '513 HP',
      speed: '325 KM/H',
      accel: '3.7 S',
    }
  })

  // ── Car 8 — Mercedes-AMG GT3 ──────────────────────────────────────
  .addCar({
    name: 'GT3',
    brand: 'Mercedes-AMG',
    tagline: 'Mercedes-AMG GT3 2016',
    modelPath: './models/mercedes-amg_gt3__www.vecarz.com.glb',


    matteColor: '#020603',    // Pitch black with a 1% green undertone
    accentColor: '#654236',    // Toxic/Neon green

    scale: 3.5,
    rotateY: 0.0,
    shadowOpacity: 0.75,
    shadowScale: 1.1,

    specs: {
      hp: '513 HP',
      speed: '325 KM/H',
      accel: '3.7 S',
    }
  })


  // ── Template: add more cars here ─────────────────────────────
  // .addCar({
  //   name:          'Your Car',
  //   brand:         'Brand',
  //   tagline:       'Your tagline.',
  //   modelPath:     './models/your_model.glb',
  //   matteColor:    '#080808',    // any dark hex — keep it very dark
  //   accentColor:   '#ffffff',
  //   shadowOpacity: 0.70,         // 0.5 (light) → 0.9 (very dark shadow)
  //   shadowScale:   1.0,          // 0.8 (compact) → 1.4 (long car)
  //   scale:         1.0,
  //   rotateY:       0,
  //   specs: { hp: '??? HP', speed: '??? KM/H', accel: '?.? S' }
  // })

  ;

// ─────────────────────────────────────────────────────────────────
// LAUNCH
// ─────────────────────────────────────────────────────────────────
showcase.init();

// ─────────────────────────────────────────────────────────────────
// Optional programmatic control:
//   showcase.goTo(2);   // jump to index
//   showcase.next();
//   showcase.prev();
//   window.carShowcase = showcase;   // expose for IPC / other scripts
// ─────────────────────────────────────────────────────────────────

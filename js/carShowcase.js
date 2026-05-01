/* ─────────────────────────────────────────────────────────────────
   carShowcase.js  —  Core Engine
   Requires: Three.js r128, GSAP 3, window._THREE_EXTRAS
   Usage:    See cars.js for integration examples
───────────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  /* ── Helpers ─────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);
  const pad = (n) => String(n + 1).padStart(2, '0');

  /* ─────────────────────────────────────────────────
     CarShowcase Class
  ───────────────────────────────────────────────── */
  class CarShowcase {
    constructor(config = {}) {
      // Optional global config
      this.config = {
        container: config.container || '#canvas-container',
        autoRotate: config.autoRotate !== false,   // default true
        autoRotateSpeed: config.autoRotateSpeed || 0.3,
        cameraDistance: config.cameraDistance || 5,
        cameraHeight: config.cameraHeight || 1.2,
        enableZoom: config.enableZoom !== false,
        transitionDuration: config.transitionDuration || 0.7,
      };

      this._cars = [];           // registered car configs
      this._currentIndex = -1;   // active car index
      this._isTransitioning = false;
      this._loadedModels = {};   // cache: modelPath → THREE.Group
      this._activeModel = null;  // currently visible model

      // DOM refs (populated in _buildDOM)
      this._dom = {};

      // Three.js objects
      this._renderer = null;
      this._scene = null;
      this._camera = null;
      this._controls = null;
      this._lights = {};
      this._clock = new THREE.Clock();
      this._animId = null;

      this._accentColor = '#e8c97a';

      // Create transition veil
      this._veil = document.createElement('div');
      this._veil.id = 'transition-veil';
      document.body.appendChild(this._veil);

      // Track cursor
      document.addEventListener('mousemove', (e) => {
        document.documentElement.style.setProperty('--cx', e.clientX + 'px');
        document.documentElement.style.setProperty('--cy', e.clientY + 'px');
      });
    }

    /* ──────────────────────────────────────────────
       PUBLIC API — addCar()
       Call this once per car before calling init()

       config = {
         name:     'Ferrari 488 GTB',    // car name shown in UI
         brand:    'Ferrari',             // brand label (optional)
         tagline:  'Born on the track.',  // subtitle (optional)
         modelPath: './models/car.glb',   // path to .glb / .gltf file

         // Background — choose ONE of these:
         gradient: ['#0d0005','#2a000f','#ff0020'],  // radial gradient stops
         solidColor: '#0a0a0a',                       // plain solid bg color

         accentColor: '#ff0020',    // accent color for this car (optional)

         // 3D model tweaks (optional)
         scale:    1.0,             // scale the model
         offsetY: -0.5,             // move model up/down (Y axis)
         offsetX:  0,               // move model left/right
         rotateY:  0,               // initial Y rotation in radians

         // Spec panel values (optional — omit to hide)
         specs: {
           hp:    '660 HP',
           speed: '330 KM/H',
           accel: '3.0 S',
         }
       }
    ────────────────────────────────────────────── */
    addCar(config) {
      if (!config.name || !config.modelPath) {
        console.error('[CarShowcase] addCar requires at least { name, modelPath }');
        return this;
      }
      // Support matteColor as an alias for solidColor (v2 API)
      const resolvedSolidColor = config.solidColor || config.matteColor || null;
      this._cars.push({
        name: config.name,
        brand: config.brand || '',
        tagline: config.tagline || '',
        modelPath: config.modelPath,
        gradient: config.gradient || null,
        solidColor: resolvedSolidColor,
        accentColor: config.accentColor || '#e8c97a',
        scale: config.scale || 1.0,
        offsetY: config.offsetY !== undefined ? config.offsetY : -0.5,
        offsetX: config.offsetX || 0,
        rotateY: config.rotateY || 0,
        specs: config.specs || null,
        shadowOpacity: config.shadowOpacity !== undefined ? config.shadowOpacity : 0.25,
        shadowScale: config.shadowScale || 1.0,

        // ── Cinematic filter params (undefined = not set = scene unchanged) ──
        vignetteStrength: config.vignetteStrength,   // undefined → vignette off
        vignetteSoftness: config.vignetteSoftness,   // undefined → use default if strength set
        vignetteColor:    config.vignetteColor,      // undefined → #000
        filmGrain:        config.filmGrain,          // undefined → CSS original (0.035)
        brightness:       config.brightness,         // undefined → no CSS filter
        contrast:         config.contrast,           // undefined → no CSS filter
        saturation:       config.saturation,         // undefined → no CSS filter
        hueRotate:        config.hueRotate,          // undefined → no CSS filter
        exposure:         config.exposure,           // undefined → keep renderer default (1.2)
        colorTint:        config.colorTint || null,  // null → tint overlay hidden
      });
      return this; // chainable
    }

    /* ──────────────────────────────────────────────
       PUBLIC API — init()
       Call after all addCar() calls.
    ────────────────────────────────────────────── */
    init() {
      if (this._cars.length === 0) {
        console.error('[CarShowcase] No cars registered. Call addCar() first.');
        return;
      }

      this._collectDOM();
      this._buildNav();
      this._initThree();
      this._bindEvents();
      this._startRenderLoop();

      // Restore last-viewed car from sessionStorage (survives dev-server reloads)
      let startIndex = 0;
      try {
        const saved = parseInt(sessionStorage.getItem('cs_index') || '0', 10);
        if (!isNaN(saved) && saved >= 0 && saved < this._cars.length) {
          startIndex = saved;
        }
      } catch (_) {}

      // Expose globally so the dev hot-update client can reach us
      window._showcase = this;

      this.goTo(startIndex);
    }

    /* ──────────────────────────────────────────────
       PUBLIC API — goTo(index)
       Navigate to a specific car index.
    ────────────────────────────────────────────── */
    goTo(index) {
      if (this._isTransitioning) return;
      const total = this._cars.length;
      const i = ((index % total) + total) % total;
      if (i === this._currentIndex) return;

      // Persist selection so a hot-reload drops back on the same car
      try { sessionStorage.setItem('cs_index', i); } catch (_) {}

      this._isTransitioning = true;

      // Veil flash in
      gsap.timeline()
        .to(this._veil, {
          opacity: 1,
          duration: this.config.transitionDuration * 0.4,
          ease: 'power2.in'
        })
        .call(() => {
          this._swapCar(i);
        })
        .to(this._veil, {
          opacity: 0,
          duration: this.config.transitionDuration * 0.7,
          ease: 'power2.out',
          onComplete: () => { this._isTransitioning = false; }
        });
    }

    /* ──────────────────────────────────────────────
       PUBLIC API — next() / prev()
    ────────────────────────────────────────────── */
    next() { this.goTo(this._currentIndex + 1); }
    prev() { this.goTo(this._currentIndex - 1); }

    /* ──────────────────────────────────────────────
       PUBLIC API — hotUpdate(newCars)
       Called by the dev server SSE client when cars.js
       has metadata-only changes (no modelPath changes).
       Patches car configs in memory and smoothly refreshes
       the current car's UI — zero reload, zero 3D re-load.
    ────────────────────────────────────────────── */
    hotUpdate(newCars) {
      if (!Array.isArray(newCars)) return;

      newCars.forEach((cfg, i) => {
        if (!this._cars[i]) return;
        const resolvedSolid = cfg.solidColor || cfg.matteColor || null;
        Object.assign(this._cars[i], {
          name:         cfg.name         ?? this._cars[i].name,
          brand:        cfg.brand        ?? this._cars[i].brand,
          tagline:      cfg.tagline      ?? this._cars[i].tagline,
          gradient:     cfg.gradient     || null,
          solidColor:   resolvedSolid    || this._cars[i].solidColor,
          accentColor:  cfg.accentColor  || this._cars[i].accentColor,
          scale:        cfg.scale        || this._cars[i].scale,
          offsetY:      cfg.offsetY      ?? this._cars[i].offsetY,
          offsetX:      cfg.offsetX      ?? this._cars[i].offsetX,
          rotateY:      cfg.rotateY      ?? this._cars[i].rotateY,
          specs:        cfg.specs        || null,
          shadowOpacity: cfg.shadowOpacity ?? this._cars[i].shadowOpacity,
          shadowScale:   cfg.shadowScale   ?? this._cars[i].shadowScale,
          // Cinematic filter props
          vignetteStrength: cfg.vignetteStrength ?? this._cars[i].vignetteStrength,
          vignetteSoftness: cfg.vignetteSoftness ?? this._cars[i].vignetteSoftness,
          vignetteColor:    cfg.vignetteColor    ?? this._cars[i].vignetteColor,
          filmGrain:        cfg.filmGrain        ?? this._cars[i].filmGrain,
          brightness:       cfg.brightness       ?? this._cars[i].brightness,
          contrast:         cfg.contrast         ?? this._cars[i].contrast,
          saturation:       cfg.saturation       ?? this._cars[i].saturation,
          hueRotate:        cfg.hueRotate        ?? this._cars[i].hueRotate,
          exposure:         cfg.exposure         ?? this._cars[i].exposure,
          colorTint:        cfg.colorTint !== undefined ? cfg.colorTint : this._cars[i].colorTint,
        });
      });

      // Rebuild nav pills in case names changed
      this._buildNav();
      this._updateNav(this._currentIndex);

      // Refresh the currently displayed car smoothly
      const i = this._currentIndex;
      if (i >= 0 && i < this._cars.length) {
        const car = this._cars[i];
        this._updateBackground(car);
        this._lights.accent.color.set(car.accentColor);
        this._accentColor = car.accentColor;
        const shadowAlpha = car.shadowOpacity !== undefined ? car.shadowOpacity : 0.75;
        this._contactShadow.material.opacity = shadowAlpha;
        this._groundShadow.material.opacity = Math.min(shadowAlpha * 0.65, 0.6);
        this._applyFilters(car);
        this._refreshUI(car, i);
      }

      console.log('[CarShowcase] hot-updated', newCars.length, 'car(s) — no reload needed');
    }

    /* ──────────────────────────────────────────────
       PRIVATE — DOM collection
    ────────────────────────────────────────────── */
    _collectDOM() {
      this._dom = {
        bg: $('#bg-gradient'),
        carName: $('#car-name'),
        carBrand: $('#car-brand'),
        carTagline: $('#car-tagline'),
        carInfo: $('#car-info'),
        carSpecs: $('#car-specs'),
        specHp: $('#spec-hp .spec-value'),
        specSpeed: $('#spec-speed .spec-value'),
        specAccel: $('#spec-accel .spec-value'),
        currentIndex: $('#current-index'),
        totalCount: $('#total-count'),
        navTrack: $('#nav-track'),
        btnPrev: $('#btn-prev'),
        btnNext: $('#btn-next'),
        accentLine: $('#accent-line'),
        loading: $('#loading-screen'),
        loadingFill: $('#loading-bar-fill'),
        // Filter / overlay refs
        canvas:    document.querySelector('#canvas-container'),
        vignette:  $('#vignette-overlay'),
        colorTint: $('#color-tint'),
        noise:     $('#noise-overlay'),
      };

      // Update total count — display as 1-based (e.g. "06" for 6 cars)
      if (this._dom.totalCount) {
        this._dom.totalCount.textContent = String(this._cars.length).padStart(2, '0');
      }
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Build nav pills
    ────────────────────────────────────────────── */
    _buildNav() {
      const track = this._dom.navTrack;
      if (!track) return;
      track.innerHTML = '';

      this._cars.forEach((car, i) => {
        const el = document.createElement('div');
        el.className = 'nav-pill';
        el.textContent = car.name.toUpperCase();
        el.addEventListener('click', () => this.goTo(i));
        el.dataset.index = i;
        track.appendChild(el);
      });
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Three.js setup
    ────────────────────────────────────────────── */
    _initThree() {
      const container = document.querySelector(this.config.container);

      // Renderer
      this._renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this._renderer.setSize(window.innerWidth, window.innerHeight);
      this._renderer.shadowMap.enabled = true;
      this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this._renderer.outputEncoding = THREE.sRGBEncoding;
      this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this._renderer.toneMappingExposure = 1.2;
      container.appendChild(this._renderer.domElement);

      // Scene
      this._scene = new THREE.Scene();
      this._scene.background = null;

      // Camera
      const w = window.innerWidth, h = window.innerHeight;
      this._camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
      this._camera.position.set(this.config.cameraDistance, this.config.cameraHeight, this.config.cameraDistance);

      // Controls
      const { OrbitControls } = window._THREE_EXTRAS;
      this._controls = new OrbitControls(this._camera, this._renderer.domElement);
      this._controls.enableDamping = true;
      this._controls.dampingFactor = 0.05;
      this._controls.autoRotate = this.config.autoRotate;
      this._controls.autoRotateSpeed = this.config.autoRotateSpeed;
      this._controls.enableZoom = this.config.enableZoom;
      this._controls.enablePan = false;
      this._controls.minDistance = 2;
      this._controls.maxDistance = 12;
      this._controls.maxPolarAngle = Math.PI / 2 + 0.1;
      this._controls.target.set(0, 0.3, 0);
      this._controls.update();

      // Large invisible floor that catches real-time cast shadows
      const groundGeo = new THREE.PlaneGeometry(30, 30);
      const groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = -0.01;
      groundMesh.receiveShadow = true;
      this._scene.add(groundMesh);
      this._groundShadow = groundMesh;

      // Soft contact shadow — canvas radial gradient (photo-studio blob)
      const csCvs = document.createElement('canvas');
      csCvs.width = csCvs.height = 512;
      const csCtx = csCvs.getContext('2d');
      const csGrad = csCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
      csGrad.addColorStop(0, 'rgba(0,0,0,0.72)');
      csGrad.addColorStop(0.35, 'rgba(0,0,0,0.45)');
      csGrad.addColorStop(0.70, 'rgba(0,0,0,0.12)');
      csGrad.addColorStop(1, 'rgba(0,0,0,0)');
      csCtx.fillStyle = csGrad;
      csCtx.fillRect(0, 0, 512, 512);
      const csTex = new THREE.CanvasTexture(csCvs);
      const csGeo = new THREE.PlaneGeometry(5, 5);
      const csMat = new THREE.MeshBasicMaterial({
        map: csTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      });
      const csMesh = new THREE.Mesh(csGeo, csMat);
      csMesh.rotation.x = -Math.PI / 2;
      csMesh.position.y = 0.001; // just above the shadow plane
      this._scene.add(csMesh);
      this._contactShadow = csMesh;

      // Lights
      this._setupLights();

      // Resize handler
      window.addEventListener('resize', () => this._onResize());
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Lighting rig
    ────────────────────────────────────────────── */
    _setupLights() {
      // Hemisphere light — warm sky / cool ground bounce (studio infinite-floor feel)
      const hemi = new THREE.HemisphereLight(0xfff5e0, 0x080808, 0.55);
      this._scene.add(hemi);
      this._lights.hemi = hemi;

      // Key light — slightly warm white, strong, casts shadows
      const key = new THREE.DirectionalLight(0xfff8f0, 2.2);
      key.position.set(5, 9, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 0.1;
      key.shadow.camera.far = 30;
      key.shadow.camera.left = key.shadow.camera.bottom = -6;
      key.shadow.camera.right = key.shadow.camera.top = 6;
      key.shadow.bias = -0.0008;
      this._scene.add(key);
      this._lights.key = key;

      // Fill light — cool-white, opposite side, softens harsh shadows
      const fill = new THREE.DirectionalLight(0xe8f0ff, 0.7);
      fill.position.set(-5, 5, -2);
      this._scene.add(fill);
      this._lights.fill = fill;

      // Rim light — back edge separation
      const rim = new THREE.DirectionalLight(0xffffff, 1.4);
      rim.position.set(-1, 4, -7);
      this._scene.add(rim);
      this._lights.rim = rim;

      // Ground rim — very low, front-below, bounces warm light on the sills
      const groundRim = new THREE.DirectionalLight(0xffe0a0, 0.4);
      groundRim.position.set(0, -1, 3);
      this._scene.add(groundRim);
      this._lights.groundRim = groundRim;

      // Accent point light — colour-matched to current car
      const accent = new THREE.PointLight(0xe8c97a, 2.5, 7);
      accent.position.set(0, 2.5, -2);
      this._scene.add(accent);
      this._lights.accent = accent;
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Swap car (called mid-veil)
    ────────────────────────────────────────────── */
    _swapCar(index) {
      this._currentIndex = index;
      const car = this._cars[index];

      // Update accent colour
      this._accentColor = car.accentColor;
      this._lights.accent.color.set(car.accentColor);

      // Drive contact shadow opacity from per-car shadowOpacity config
      const shadowAlpha = car.shadowOpacity !== undefined ? car.shadowOpacity : 0.75;
      this._contactShadow.material.opacity = shadowAlpha;
      // Also keep the ShadowMaterial plane tuned (cast-shadow darkness)
      this._groundShadow.material.opacity = Math.min(shadowAlpha * 0.65, 0.6);

      // Apply cinematic filters (vignette, grain, CSS filters, exposure, tint)
      this._applyFilters(car);

      // Update background
      this._updateBackground(car);

      // Update UI
      this._updateUI(car, index);

      // Update nav
      this._updateNav(index);

      // Load / show 3D model
      this._showModel(car);
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Update CSS background gradient
    ────────────────────────────────────────────── */
    _updateBackground(car) {
      let bg;
      if (car.solidColor) {
        bg = car.solidColor;
      } else if (car.gradient && car.gradient.length) {
        const stops = car.gradient;
        if (stops.length === 1) {
          bg = stops[0];
        } else if (stops.length === 2) {
          bg = `radial-gradient(ellipse 80% 60% at 65% 50%, ${stops[0]} 0%, ${stops[1]} 100%)`;
        } else {
          // 3+ stops
          const pct = stops.map((c, i) => `${c} ${Math.round(i / (stops.length - 1) * 100)}%`).join(', ');
          bg = `radial-gradient(ellipse 80% 60% at 65% 50%, ${pct})`;
        }
      } else {
        bg = 'radial-gradient(ellipse 80% 60% at 65% 50%, #111 0%, #050505 100%)';
      }

      if (this._dom.bg) {
        this._dom.bg.style.background = bg;
      }
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Apply cinematic filters per car
       undefined param = feature OFF / scene unchanged.
       Only cars that explicitly set a param get that effect.
    ────────────────────────────────────────────── */
    _applyFilters(car) {

      // ── Vignette ──────────────────────────────────────────────────
      // undefined → opacity 0 (no vignette)
      // set       → apply radial gradient with given strength/softness
      if (this._dom.vignette) {
        if (car.vignetteStrength === undefined || car.vignetteStrength === 0) {
          this._dom.vignette.style.opacity = '0';
        } else {
          const strength = car.vignetteStrength;
          const softness = car.vignetteSoftness !== undefined ? car.vignetteSoftness : 0.55;
          const color    = car.vignetteColor || '#000000';
          // softness 0→1 maps to ellipse size 40%→95%
          const pct = Math.round(40 + softness * 55);
          this._dom.vignette.style.background =
            `radial-gradient(ellipse ${pct}% ${Math.round(pct * 0.75)}% at 50% 50%, ` +
            `transparent 0%, ${color} 100%)`;
          this._dom.vignette.style.opacity = strength;
        }
      }

      // ── Film grain ────────────────────────────────────────────────
      // undefined → restore CSS stylesheet value (0.035 — the original)
      if (this._dom.noise) {
        this._dom.noise.style.opacity =
          car.filmGrain !== undefined ? car.filmGrain : '0.035';
      }

      // ── CSS canvas filter ─────────────────────────────────────────
      // If none of the four params are set → 'none' (no CSS filter applied)
      // If any are set → build filter string (unset ones default to neutral)
      if (this._dom.canvas) {
        const anySet = car.brightness !== undefined || car.contrast   !== undefined ||
                       car.saturation !== undefined || car.hueRotate  !== undefined;
        if (!anySet) {
          this._dom.canvas.style.filter = 'none';
        } else {
          const b = car.brightness !== undefined ? car.brightness : 1.0;
          const c = car.contrast   !== undefined ? car.contrast   : 1.0;
          const s = car.saturation !== undefined ? car.saturation : 1.0;
          const h = car.hueRotate  !== undefined ? car.hueRotate  : 0;
          this._dom.canvas.style.filter =
            `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${h}deg)`;
        }
      }

      // ── Three.js scene exposure ───────────────────────────────────
      // undefined → keep renderer default (1.2)
      if (this._renderer) {
        this._renderer.toneMappingExposure =
          car.exposure !== undefined ? car.exposure : 1.2;
      }

      // ── Colour tint overlay ───────────────────────────────────────
      // null / undefined → overlay hidden
      if (this._dom.colorTint) {
        const tint = car.colorTint;
        if (tint && tint.color && tint.opacity > 0) {
          this._dom.colorTint.style.background  = tint.color;
          this._dom.colorTint.style.opacity      = tint.opacity;
          this._dom.colorTint.style.mixBlendMode = tint.blendMode || 'normal';
        } else {
          this._dom.colorTint.style.opacity = '0';
        }
      }
    }


    /* ──────────────────────────────────────────────
       PRIVATE — Update text UI with GSAP stagger
    ────────────────────────────────────────────── */
    _updateUI(car, index) {
      const { carBrand, carName, carTagline, carInfo,
        currentIndex, specHp, specSpeed, specAccel, carSpecs } = this._dom;

      // Counter
      if (currentIndex) currentIndex.textContent = pad(index);

      // Accent CSS var
      document.documentElement.style.setProperty('--accent', car.accentColor);

      // Animate info in
      gsap.fromTo([carBrand, carName, carTagline],
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out', delay: 0.15 }
      );

      if (carBrand) carBrand.textContent = car.brand.toUpperCase();
      if (carName) carName.textContent = car.name;
      if (carTagline) carTagline.textContent = car.tagline;

      // Specs
      const hasSpecs = car.specs && Object.keys(car.specs).length;
      if (carSpecs) carSpecs.style.opacity = hasSpecs ? '1' : '0';

      if (hasSpecs) {
        gsap.fromTo([specHp, specSpeed, specAccel],
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', delay: 0.2 }
        );
        if (specHp) specHp.textContent = car.specs.hp || '—';
        if (specSpeed) specSpeed.textContent = car.specs.speed || '—';
        if (specAccel) specAccel.textContent = car.specs.accel || '—';
      }
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Gentle in-place UI refresh (used by hotUpdate)
       Crossfades text instead of the hard fly-in used by _updateUI.
       Keeps the user reading without visual interruption.
    ────────────────────────────────────────────── */
    _refreshUI(car, index) {
      const { carBrand, carName, carTagline,
              currentIndex, specHp, specSpeed, specAccel, carSpecs } = this._dom;

      if (currentIndex) currentIndex.textContent = pad(index);
      document.documentElement.style.setProperty('--accent', car.accentColor);

      // Dim → swap text → brighten
      const infoEls = [carBrand, carName, carTagline].filter(Boolean);
      gsap.to(infoEls, {
        opacity: 0.4, duration: 0.18,
        onComplete: () => {
          if (carBrand)   carBrand.textContent   = car.brand.toUpperCase();
          if (carName)    carName.textContent     = car.name;
          if (carTagline) carTagline.textContent  = car.tagline;
          gsap.to(infoEls, { opacity: 1, duration: 0.32, ease: 'power2.out' });
        }
      });

      const hasSpecs = car.specs && Object.keys(car.specs).length;
      if (carSpecs) carSpecs.style.opacity = hasSpecs ? '1' : '0';
      if (hasSpecs) {
        const specEls = [specHp, specSpeed, specAccel].filter(Boolean);
        gsap.to(specEls, {
          opacity: 0.4, duration: 0.18,
          onComplete: () => {
            if (specHp)    specHp.textContent    = car.specs.hp    || '—';
            if (specSpeed) specSpeed.textContent = car.specs.speed || '—';
            if (specAccel) specAccel.textContent = car.specs.accel || '—';
            gsap.to(specEls, { opacity: 1, duration: 0.32, ease: 'power2.out' });
          }
        });
      }
    }


    /* ──────────────────────────────────────────────
       PRIVATE — Update nav active state
    ────────────────────────────────────────────── */
    _updateNav(index) {
      const pills = this._dom.navTrack.querySelectorAll('.nav-pill, .nav-dot');
      pills.forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });

      // Scroll active pill into view
      const active = pills[index];
      if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Load & show 3D model
    ────────────────────────────────────────────── */
    _showModel(car) {
      // Hide current model
      if (this._activeModel) {
        this._scene.remove(this._activeModel);
        this._activeModel = null;
      }

      // Check cache first
      if (this._loadedModels[car.modelPath]) {
        this._attachModel(this._loadedModels[car.modelPath], car);
        return;
      }

      // Show loading bar
      this._showLoading();

      // Load model
      const { GLTFLoader, DRACOLoader } = window._THREE_EXTRAS;
      const loader = new GLTFLoader();

      // Optional Draco compression support
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);

      loader.load(
        car.modelPath,
        (gltf) => {
          const model = gltf.scene;

          // Enable shadows on all meshes
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              // Boost metalness slightly for shiny cars
              if (child.material) {
                child.material.envMapIntensity = 1.5;
              }
            }
          });

          // Cache it
          this._loadedModels[car.modelPath] = model;

          this._hideLoading();
          this._attachModel(model, car);
        },
        // Progress
        (xhr) => {
          if (xhr.total > 0) {
            const pct = (xhr.loaded / xhr.total) * 100;
            this._setLoadingProgress(pct);
          }
        },
        // Error
        (err) => {
          console.error('[CarShowcase] Failed to load model:', car.modelPath, err);
          this._hideLoading();
        }
      );
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Attach loaded model to scene
    ────────────────────────────────────────────── */
    _attachModel(model, car) {
      // Clone so same model can be re-used
      const clone = model.clone();

      // Auto-center & scale
      const box = new THREE.Box3().setFromObject(clone);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Normalise to fit in a ~2 unit box
      const maxDim = Math.max(size.x, size.y, size.z);
      const normalScale = (2 / maxDim) * car.scale;
      clone.scale.setScalar(normalScale);

      // Center on X/Z, sit on ground
      clone.position.x = -center.x * normalScale + car.offsetX;
      clone.position.y = -box.min.y * normalScale + (car.offsetY + 0.5);
      clone.position.z = -center.z * normalScale;

      // Initial rotation
      clone.rotation.y = car.rotateY;

      this._scene.add(clone);
      this._activeModel = clone;

      // Animate in
      clone.scale.setScalar(0);
      gsap.to(clone.scale, {
        x: normalScale, y: normalScale, z: normalScale,
        duration: 0.9,
        ease: 'elastic.out(1, 0.6)',
        delay: 0.05,
      });

      // Reset camera smoothly
      gsap.to(this._camera.position, {
        x: this.config.cameraDistance,
        y: this.config.cameraHeight,
        z: this.config.cameraDistance,
        duration: 1.1,
        ease: 'power3.out',
        onUpdate: () => this._controls.update(),
      });
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Loading bar
    ────────────────────────────────────────────── */
    _showLoading() {
      if (!this._dom.loading) return;
      this._setLoadingProgress(0);
      gsap.to(this._dom.loading, { opacity: 1, duration: 0.3, pointerEvents: 'all' });
    }
    _hideLoading() {
      if (!this._dom.loading) return;
      this._setLoadingProgress(100);
      gsap.to(this._dom.loading, { opacity: 0, duration: 0.4, delay: 0.2, pointerEvents: 'none' });
    }
    _setLoadingProgress(pct) {
      if (this._dom.loadingFill) this._dom.loadingFill.style.width = pct + '%';
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Event bindings
    ────────────────────────────────────────────── */
    _bindEvents() {
      const { btnPrev, btnNext } = this._dom;
      if (btnPrev) btnPrev.addEventListener('click', () => this.prev());
      if (btnNext) btnNext.addEventListener('click', () => this.next());

      // Keyboard arrows
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.next();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.prev();
      });

      // Swipe
      let touchStartX = 0;
      document.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
      document.addEventListener('touchend', (e) => {
        const dx = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(dx) > 50) dx > 0 ? this.next() : this.prev();
      });
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Render loop
    ────────────────────────────────────────────── */
    _startRenderLoop() {
      const tick = () => {
        this._animId = requestAnimationFrame(tick);
        this._controls.update();
        this._renderer.render(this._scene, this._camera);
      };
      tick();
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Resize handler
    ────────────────────────────────────────────── */
    _onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
    }

    /* ──────────────────────────────────────────────
       PRIVATE — Utility: darken a hex colour
    ────────────────────────────────────────────── */
    _shadeColor(hex, amount) {
      if (!hex || !hex.startsWith('#')) return null;
      const clean = hex.replace('#', '');
      if (clean.length !== 3 && clean.length !== 6) return null;
      // Expand 3-char shorthand to 6-char
      const full = clean.length === 3
        ? clean.split('').map(c => c + c).join('')
        : clean;
      const num = parseInt(full, 16);
      if (isNaN(num)) return null;
      const r = Math.max(0, Math.min(255, (num >> 16) + amount * 255));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount * 255));
      const b = Math.max(0, Math.min(255, (num & 0xff) + amount * 255));
      return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    }

    /* ──────────────────────────────────────────────
       PUBLIC — Destroy
    ────────────────────────────────────────────── */
    destroy() {
      if (this._animId) cancelAnimationFrame(this._animId);
      this._renderer.dispose();
    }
  }

  // Expose globally
  global.CarShowcase = CarShowcase;

})(window);

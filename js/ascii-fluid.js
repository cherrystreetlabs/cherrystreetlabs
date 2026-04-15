/* ASCII Fluid Distortion — Cherry Street Labs
 * Dense monospace character grid with flowing fluid blobs
 * Neon magenta / electric blue color scheme
 */

'use strict';

(function asciiFluid() {
    const canvas = document.getElementById('grain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- Config ---
    const CHARS = ' .,:;+*?%S#@';
    const BASE_CELL = window.innerWidth < 768 ? 14 : 10;
    const FONT = `${BASE_CELL - 1}px 'Courier New',monospace`;

    // Neon palette
    const MAGENTA = [255, 0, 200];
    const CYAN    = [0, 240, 255];
    const PURPLE  = [140, 20, 255];
    const BG      = '#0c0c0c';

    const BLOB_COUNT = 6;
    const TIME_SPEED = 0.00035;

    let w, h, cols, rows;
    let time = 0;
    let blobs = [];
    let lastFrame = 0;
    const TARGET_FPS = window.innerWidth < 768 ? 24 : 30;
    const FRAME_TIME = 1000 / TARGET_FPS;

    // --- Noise (gradient noise, permutation-based) ---
    const perm = new Uint8Array(512);
    const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];

    (function seed() {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = (i * 16807 + 37) & 255; // deterministic shuffle
            const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
        }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    })();

    function noise2d(x, y) {
        const xi = x | 0, yi = y | 0;
        const xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);

        const dot = (h, fx, fy) => { const g = grad2[h & 7]; return g[0]*fx + g[1]*fy; };

        const aa = perm[(perm[xi & 255] + yi) & 255];
        const ba = perm[(perm[(xi+1) & 255] + yi) & 255];
        const ab = perm[(perm[xi & 255] + yi + 1) & 255];
        const bb = perm[(perm[(xi+1) & 255] + yi + 1) & 255];

        const x1 = dot(aa, xf, yf)     + (dot(ba, xf-1, yf)     - dot(aa, xf, yf)) * u;
        const x2 = dot(ab, xf, yf-1)   + (dot(bb, xf-1, yf-1)   - dot(ab, xf, yf-1)) * u;
        return x1 + (x2 - x1) * v;
    }

    function fbm(x, y) {
        return noise2d(x, y) * 0.6 +
               noise2d(x * 2, y * 2) * 0.25 +
               noise2d(x * 4, y * 4) * 0.15;
    }

    // --- Blobs ---
    function initBlobs() {
        blobs = [];
        for (let i = 0; i < BLOB_COUNT; i++) {
            blobs.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                r: 100 + Math.random() * 180,
                phase: Math.random() * 6.28
            });
        }
    }

    function updateBlobs(dt) {
        for (const b of blobs) {
            const n1 = noise2d(b.x * 0.001 + time * 0.4, b.y * 0.001);
            const n2 = noise2d(b.x * 0.001, b.y * 0.001 + time * 0.4);
            b.vx += n1 * 0.015;
            b.vy += n2 * 0.015;
            b.vx *= 0.996;
            b.vy *= 0.996;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.x < -b.r) b.x = w + b.r;
            if (b.x > w + b.r) b.x = -b.r;
            if (b.y < -b.r) b.y = h + b.r;
            if (b.y > h + b.r) b.y = -b.r;
            b.phase += 0.004 * dt;
        }
    }

    // --- Mouse ---
    let mx = -9999, my = -9999;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    window.addEventListener('mouseleave', () => { mx = my = -9999; }, { passive: true });
    window.addEventListener('touchmove', e => {
        if (e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; }
    }, { passive: true });
    window.addEventListener('touchend', () => { mx = my = -9999; }, { passive: true });

    // --- Resize ---
    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        cols = Math.ceil(w / BASE_CELL);
        rows = Math.ceil(h / BASE_CELL);
        initBlobs();
    }

    // --- Pre-compute color LUT (256 entries) ---
    const colorLUT = new Array(256);
    (function buildLUT() {
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;
            if (t < 0.5) {
                const s = t * 2;
                r = MAGENTA[0] + (PURPLE[0] - MAGENTA[0]) * s;
                g = MAGENTA[1] + (PURPLE[1] - MAGENTA[1]) * s;
                b = MAGENTA[2] + (PURPLE[2] - MAGENTA[2]) * s;
            } else {
                const s = (t - 0.5) * 2;
                r = PURPLE[0] + (CYAN[0] - PURPLE[0]) * s;
                g = PURPLE[1] + (CYAN[1] - PURPLE[1]) * s;
                b = PURPLE[2] + (CYAN[2] - PURPLE[2]) * s;
            }
            colorLUT[i] = [Math.round(r), Math.round(g), Math.round(b)];
        }
    })();

    // --- Render ---
    function draw(timestamp) {
        requestAnimationFrame(draw);

        const delta = timestamp - lastFrame;
        if (delta < FRAME_TIME) return;
        lastFrame = timestamp - (delta % FRAME_TIME);

        time += TIME_SPEED * delta;
        updateBlobs(delta * 0.06);

        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, w, h);
        ctx.font = FONT;
        ctx.textBaseline = 'top';

        const charLen = CHARS.length - 1;
        const mouseR2 = 180 * 180;

        for (let row = 0; row < rows; row++) {
            const py = row * BASE_CELL + BASE_CELL * 0.5;
            const ny = py * 0.007;

            for (let col = 0; col < cols; col++) {
                const px = col * BASE_CELL + BASE_CELL * 0.5;
                const nx = px * 0.007;

                // Noise field
                const distortion = fbm(nx + time * 0.8, ny + time * 0.5);

                // Metaball field (inlined for speed)
                let field = 0;
                for (let i = 0; i < BLOB_COUNT; i++) {
                    const b = blobs[i];
                    const dx = px - b.x;
                    const dy = py - b.y;
                    const r = b.r * (1 + 0.2 * Math.sin(b.phase));
                    field += (r * r) / (dx * dx + dy * dy + 1);
                }

                // Mouse interaction
                const mdx = px - mx;
                const mdy = py - my;
                const md2 = mdx * mdx + mdy * mdy;
                if (md2 < mouseR2) {
                    const mf = 1 - Math.sqrt(md2) / 180;
                    field += 2.5 * mf * mf;
                }

                // Combine
                const noiseVal = (distortion + 1) * 0.5;
                const blobVal = field * 0.0008;
                let intensity = noiseVal * 0.25 + (blobVal > 1 ? 1 : blobVal) * 0.75;
                if (intensity > 1) intensity = 1;
                if (intensity < 0) intensity = 0;

                // Character
                const ch = CHARS[(intensity * charLen + 0.5) | 0];
                if (ch === ' ') continue;

                // Color from LUT
                const colorT = Math.sin(px * 0.004 + time * 2) * 0.25 + 0.5 +
                               Math.cos(py * 0.006 - time * 1.5) * 0.15 +
                               distortion * 0.1;
                const ci = (colorT < 0 ? 0 : colorT > 1 ? 255 : (colorT * 255) | 0);
                const c = colorLUT[ci];

                const alpha = 0.25 + intensity * 0.75;
                ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(2)})`;
                ctx.fillText(ch, col * BASE_CELL, row * BASE_CELL);
            }
        }
    }

    // --- Init ---
    resize();
    window.addEventListener('resize', resize);

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        requestAnimationFrame(draw);
    }
})();

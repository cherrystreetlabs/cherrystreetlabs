/* Cherry Street Labs — main.js */

'use strict';

/* ── Viewport Height Fix (iOS Safari) ─────────────────────────── */
function setVh() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

setVh();

const onVhChange = () => requestAnimationFrame(setVh);
window.addEventListener('resize', onVhChange);
window.addEventListener('orientationchange', () => setTimeout(setVh, 300));

/* ── Reduced Motion Preference ──────────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════════════════════════════════
   Manhattan Grid Particle System
   Bird's-eye NYC traffic: lane flow, motion trails, mouse disruption.
   ═══════════════════════════════════════════════════════════════════ */
class ManhattanGrid {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.raf = null;
        this.mouse = { x: -2000, y: -2000 };
        this.tick = 0;

        // Fewer lanes, more particles per lane — visible coverage
        this.numLanes = 22;
        this.particlesPerLane = 10;

        // NYC street grid angle (~28°)
        this.gridAngle = 29 * (Math.PI / 180);
        this.cosA = Math.cos(this.gridAngle);
        this.sinA = Math.sin(this.gridAngle);

        // Trail fade
        this.trailAlpha = 0.055;

        this._resize();
        window.addEventListener('resize', () => {
            this._resize();
        });

        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        document.addEventListener('mouseleave', () => {
            this.mouse.x = -2000;
            this.mouse.y = -2000;
        });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            }
        }, { passive: true });
        document.addEventListener('touchend', () => {
            this.mouse.x = -2000;
            this.mouse.y = -2000;
        });
    }

    _resize() {
        this.W = this.canvas.width = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;
    }

    /* Spawn a particle within visible screen bounds, flowing in grid direction */
    _spawn(speedClass, direction) {
        // Speed: class 0=side streets (slow), 1=avenues (medium), 2=faster avenues
        const speedMap = [0.6, 1.4, 2.4];
        const speed = speedMap[speedClass] * (0.7 + Math.random() * 0.5);

        // Spawn at a random screen position, flowing in the lane direction
        let x, y;
        const startSide = Math.random();
        if (direction > 0) {
            // Flowing right and down — spawn on left edge
            x = Math.random() * this.W * 0.6;
            y = this.H + 10;
        } else {
            // Flowing left and up — spawn on right edge
            x = this.W * 0.4 + Math.random() * this.W * 0.6;
            y = -10;
        }

        // Add perpendicular scatter so lanes aren't a single line
        const perpOff = (Math.random() - 0.5) * 30;

        const vx = this.cosA * speed * direction;
        const vy = this.sinA * speed * direction;

        // Color: white headlights / amber streetlights / red taillights / blue windows
        const roll = Math.random();
        let color, radius;
        if (roll < 0.42) {
            color = { r: 255, g: 248, b: 235 }; radius = Math.random() * 1.4 + 0.5; // warm white
        } else if (roll < 0.65) {
            color = { r: 255, g: 175, b: 50 };  radius = Math.random() * 1.6 + 0.5; // amber
        } else if (roll < 0.82) {
            color = { r: 255, g: 55, b: 35 };   radius = Math.random() * 1.2 + 0.4; // red tail
        } else {
            color = { r: 190, g: 215, b: 255 }; radius = Math.random() * 0.8 + 0.3; // blue-white
        }

        return {
            x, y,
            vx, vy,
            baseVx: vx, baseVy: vy,
            perpOff,
            radius,
            color,
            alpha: Math.random() * 0.45 + 0.2,
            flicker: 0,
            flickerDir: Math.random() > 0.5 ? 1 : -1,
            speedClass,
            direction,
        };
    }

    init() {
        this.particles = [];
        const total = this.numLanes * this.particlesPerLane;

        for (let i = 0; i < total; i++) {
            const laneIdx = i % this.numLanes;
            // Alternate directions in pairs so adjacent lanes flow opposite
            const direction = laneIdx % 2 === 0 ? 1 : -1;
            // Speed class cycles every 3 lanes
            const speedClass = laneIdx % 3;
            const p = this._spawn(speedClass, direction);
            // Scatter initial positions so they're not all at the edge
            p.x = Math.random() * this.W;
            p.y = Math.random() * this.H;
            this.particles.push(p);
        }

        this.canvas.classList.add('visible');
    }

    update() {
        const { W, H, mouse } = this;
        this.tick++;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Mouse disruption — push away from cursor
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const disruptR = 120;
            if (distSq < disruptR * disruptR && distSq > 0.01) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / disruptR) * 2.0;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // Return to lane flow
            p.vx += (p.baseVx - p.vx) * 0.04;
            p.vy += (p.baseVy - p.vy) * 0.04;

            p.x += p.vx;
            p.y += p.vy;

            // Flicker
            p.flicker += 0.04 * p.flickerDir;
            if (p.flicker > 1 || p.flicker < -1) p.flickerDir *= -1;

            // Respawn when out of bounds
            const margin = 80;
            if (p.x < -margin || p.x > W + margin || p.y < -margin || p.y > H + margin) {
                const speedClass = Math.floor(Math.random() * 3);
                const direction = Math.random() > 0.5 ? 1 : -1;
                const np = this._spawn(speedClass, direction);
                // Scatter new particle somewhere visible
                np.x = Math.random() * W;
                np.y = Math.random() * H;
                this.particles[i] = np;
            }
        }
    }

    draw() {
        const { ctx, W, H } = this;

        // Trail fade — dark overlay creates motion streak effect
        ctx.fillStyle = `rgba(10, 10, 14, ${this.trailAlpha})`;
        ctx.fillRect(0, 0, W, H);

        for (const p of this.particles) {
            const flicker = Math.sin(p.flicker) * 0.06;
            const alpha = Math.max(0.08, Math.min(0.7, p.alpha + flicker));
            const { r, g, b } = p.color;

            // Motion trail — length proportional to speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const trailLen = Math.min(speed * 2.8, 10);
            const nx = p.vx / speed;
            const ny = p.vy / speed;
            const tx = p.x - nx * trailLen;
            const ty = p.y - ny * trailLen;

            // Streak
            ctx.save();
            ctx.globalAlpha = alpha * 0.75;
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            ctx.lineWidth = p.radius * 1.1;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            // Bright head dot
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${Math.min(255, r + 25)},${Math.min(255, g + 18)},${Math.min(255, b + 10)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    start() {
        if (this.raf) return;
        const loop = () => {
            this.update();
            this.draw();
            this.raf = requestAnimationFrame(loop);
        };
        loop();
    }

    stop() {
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = null;
        }
    }
}

/* ── Mouse Parallax Tilt ────────────────────────────────────────── */
class ParallaxTilt {
    constructor(el) {
        this.el = el;
        this.raf = null;
        this.current = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this._strength = 8;

        document.addEventListener('mousemove', (e) => this._onMove(e));
        document.addEventListener('mouseleave', () => this._onLeave());
    }

    _onMove(e) {
        const { innerWidth: W, innerHeight: H } = window;
        this.target.x = (e.clientX / W - 0.5);
        this.target.y = (e.clientY / H - 0.5);
        if (!this.raf) this._loop();
    }

    _onLeave() {
        this.target.x = 0;
        this.target.y = 0;
    }

    _loop() {
        this.current.x += (this.target.x - this.current.x) * 0.06;
        this.current.y += (this.target.y - this.current.y) * 0.06;

        const rx = -(this.current.y * this._strength);
        const ry = (this.current.x * this._strength);
        const tz = Math.abs(this.current.x) * 4 + Math.abs(this.current.y) * 4;

        this.el.style.transform =
            `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;

        // Keep looping if still active
        if (Math.abs(this.target.x) > 0.001 || Math.abs(this.target.y) > 0.001 ||
            Math.abs(this.current.x) > 0.001 || Math.abs(this.current.y) > 0.001) {
            this.raf = requestAnimationFrame(() => this._loop());
        } else {
            this.raf = null;
        }
    }
}

/* ── Who We Are Overlay ────────────────────────────────────────── */
const whoWeAreBtn = document.getElementById('whoWeAreBtn');
const overlay     = document.getElementById('whoWeAreOverlay');
const closeBtn    = document.getElementById('closeOverlay');
let gridInstance  = null;

function openOverlay(e) {
    if (e) e.preventDefault();
    overlay.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    overlay.offsetHeight;
    overlay.classList.add('active');
    closeBtn.focus();
    if (gridInstance) gridInstance.stop();
}

function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        if (!overlay.classList.contains('active')) {
            overlay.style.visibility = 'hidden';
        }
    }, 500);
    if (gridInstance) {
        gridInstance.raf = null;
        gridInstance.start();
    }
}

whoWeAreBtn.addEventListener('click', openOverlay);
closeBtn.addEventListener('click', closeOverlay);
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
});

/* ── Init ─────────────────────────────────────────────────────── */
requestAnimationFrame(() => {
    const canvas = document.getElementById('particle-canvas');
    if (canvas && !prefersReducedMotion) {
        gridInstance = new ManhattanGrid(canvas);
        gridInstance.init();
        gridInstance.start();
    }

    const panel = document.getElementById('brand-panel');
    if (panel && !prefersReducedMotion) {
        new ParallaxTilt(panel);
    }
});

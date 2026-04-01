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
   Simulates the view from above the NYC street grid at night.
   Particles flow in lanes along the city's street grid angle (~28°).
   ═══════════════════════════════════════════════════════════════════ */
class ManhattanGrid {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.lanes = [];
        this.raf = null;
        this.mouse = { x: -2000, y: -2000 };
        this.tick = 0;

        this.count = window.innerWidth < 768 ? 120 : 240;
        // NYC street grid is rotated ~28° from horizontal
        this.gridAngle = 28 * (Math.PI / 180);
        // cos/sin of grid angle for lane-aligned movement
        this.cosA = Math.cos(this.gridAngle);
        this.sinA = Math.sin(this.gridAngle);
        // Perpendicular (cross-street direction)
        this.cosP = Math.cos(this.gridAngle + Math.PI / 2);
        this.sinP = Math.sin(this.gridAngle + Math.PI / 2);

        // Trail fade alpha — higher = shorter trails
        this.trailAlpha = 0.045;

        this._resize();
        window.addEventListener('resize', () => {
            this._resize();
            this._buildLanes();
        });

        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        document.addEventListener('mouseleave', () => {
            this.mouse.x = -2000;
            this.mouse.y = -2000;
        });

        // Touch support
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

    /* Build lane structure — evenly spaced across viewport */
    _buildLanes() {
        this.lanes = [];
        const diagonal = Math.sqrt(this.W * this.W + this.H * this.H);
        const numLanes = Math.floor(diagonal / 40); // ~40px between lanes

        for (let i = 0; i < numLanes; i++) {
            // Position along the perpendicular axis (cross-streets)
            const t = (i / numLanes); // 0..1
            // Spread lanes across the perpendicular axis of the grid
            const perpPos = (t - 0.5) * diagonal;

            // x,y of a point along the perpendicular axis (center of viewport)
            const cx = this.W / 2 + perpPos * this.cosP;
            const cy = this.H / 2 + perpPos * this.sinP;

            this.lanes.push({
                // Lane runs in grid direction through the center point
                cx, cy,
                // Direction: alternating uptown/downtown vs east/west
                direction: i % 4 < 2 ? 1 : -1,
                // Speed class: 0=slow (local), 1=medium, 2=fast (avenues)
                speedClass: i % 3,
            });
        }
    }

    /* Spawn a particle in a given lane */
    _spawnInLane(lane, atEnd) {
        const { cx, cy, direction, speedClass } = lane;
        // Speed: avenues are fast, side streets are slow
        const speedMap = [0.5, 1.2, 2.2];
        const speed = speedMap[speedClass] * (0.7 + Math.random() * 0.6);

        // Project position along the lane's direction
        const diagonal = Math.sqrt(this.W * this.W + this.H * this.H);
        const offset = atEnd ? (direction > 0 ? -diagonal / 2 : diagonal / 2) : (Math.random() - 0.5) * diagonal;
        const x = cx + offset * this.cosA * direction;
        const y = cy + offset * this.sinA * direction;

        // Color: white headlights, amber streetlights, warm taillights
        const colorRoll = Math.random();
        let color, radius;
        if (colorRoll < 0.45) {
            // White headlights — slightly warm
            color = { r: 255, g: 250, b: 240 };
            radius = Math.random() * 1.4 + 0.5;
        } else if (colorRoll < 0.7) {
            // Amber streetlights / taillights
            color = { r: 255, g: 180, b: 60 };
            radius = Math.random() * 1.6 + 0.5;
        } else if (colorRoll < 0.88) {
            // Red taillights
            color = { r: 255, g: 60, b: 40 };
            radius = Math.random() * 1.2 + 0.4;
        } else {
            // Faint blue-white (building lights, windows)
            color = { r: 200, g: 220, b: 255 };
            radius = Math.random() * 0.8 + 0.3;
        }

        return {
            x, y,
            vx: this.cosA * speed * direction,
            vy: this.sinA * speed * direction,
            baseVx: this.cosA * speed * direction,
            baseVy: this.sinA * speed * direction,
            radius,
            color,
            // Per-particle alpha variation for flicker
            alpha: Math.random() * 0.5 + 0.25,
            flickerPhase: Math.random() * Math.PI * 2,
            flickerSpeed: Math.random() * 0.05 + 0.01,
            lane,
        };
    }

    init() {
        this._buildLanes();
        this.particles = [];

        for (let i = 0; i < this.count; i++) {
            const lane = this.lanes[i % this.lanes.length];
            this.particles.push(this._spawnInLane(lane, true));
        }

        this.canvas.classList.add('visible');
    }

    update() {
        const { W, H, mouse } = this;
        const diagonal = Math.sqrt(W * W + H * H);
        this.tick++;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Mouse disruption — push particles away from cursor
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const disruptRadius = 130;
            if (distSq < disruptRadius * disruptRadius && distSq > 0.01) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / disruptRadius) * 1.8;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // Ease velocity back to base (lane flow) — particles want to return
            p.vx += (p.baseVx - p.vx) * 0.035;
            p.vy += (p.baseVy - p.vy) * 0.035;

            p.x += p.vx;
            p.y += p.vy;

            // Flicker — subtle alpha variation like headlights through traffic
            p.flickerPhase += p.flickerSpeed;
            const flicker = Math.sin(p.flickerPhase) * 0.08;

            // Respawn when particle leaves viewport
            const margin = 60;
            if (
                p.x < -margin || p.x > W + margin ||
                p.y < -margin || p.y > H + margin
            ) {
                // Respawn at the opposite end of the lane, in a random lane
                const newLane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
                p.lane = newLane;
                p.baseVx = newLane.cosA * Math.abs(p.baseVx) * newLane.direction * (Math.random() > 0.5 ? 1 : -1);
                p.baseVy = newLane.sinA * Math.abs(p.baseVy) * newLane.direction * (Math.random() > 0.5 ? 1 : -1);
                // Place at opposite edge
                const sign = (p.x < -margin || p.y < -margin) ? 1 : -1;
                p.x = W / 2 + sign * (diagonal / 2) * this.cosA * -1;
                p.y = H / 2 + sign * (diagonal / 2) * this.sinA * -1;
                p.vx = p.baseVx;
                p.vy = p.baseVy;
            }
        }
    }

    draw() {
        const { ctx, W, H, trailAlpha } = this;

        // Trail fade — semi-transparent black overlay instead of full clear
        ctx.fillStyle = `rgba(10, 10, 10, ${trailAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Draw each particle as a small line segment (streak = motion trail)
        for (const p of this.particles) {
            const flicker = Math.sin(p.flickerPhase) * 0.08;
            const alpha = Math.max(0.05, Math.min(0.75, p.alpha + flicker));

            // Trail: draw line from current position back along velocity
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const trailLen = Math.min(speed * 3.5, 8); // max 8px trail
            const tx = p.x - (p.vx / speed) * trailLen;
            const ty = p.y - (p.vy / speed) * trailLen;

            const { r, g, b } = p.color;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            ctx.lineWidth = p.radius * 1.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            // Bright head dot at the front
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = `rgb(${Math.min(255, r + 30)},${Math.min(255, g + 20)},${Math.min(255, b + 15)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
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

    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.W, this.H);
        }
    }
}

/* ── Mouse Parallax Tilt ────────────────────────────────────────── */
class ParallaxTilt {
    constructor(el) {
        this.el = el;
        this.active = false;
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
        if (!this.active) {
            this.active = true;
            this._loop();
        }
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

        if (this.active) {
            this.raf = requestAnimationFrame(() => this._loop());
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
    // Stop grid when reading
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
    // Resume grid after reading
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
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeOverlay();
    }
});

/* ── Init Effects ──────────────────────────────────────────────── */
requestAnimationFrame(() => {
    // Manhattan grid particle field
    const canvas = document.getElementById('particle-canvas');
    if (canvas && !prefersReducedMotion) {
        gridInstance = new ManhattanGrid(canvas);
        gridInstance.init();
        gridInstance.start();
    }

    // Parallax tilt on brand panel (desktop only)
    const panel = document.getElementById('brand-panel');
    if (panel && !prefersReducedMotion) {
        new ParallaxTilt(panel);
    }
});

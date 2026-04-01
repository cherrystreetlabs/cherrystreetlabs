/* Cherry Street Labs — main.js */

'use strict';

/* ── Viewport Height Fix (iOS Safari) ─────────────────────────── */
function setVh() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setVh();
window.addEventListener('resize', () => requestAnimationFrame(setVh));
window.addEventListener('orientationchange', () => setTimeout(setVh, 300));

/* ── Reduced Motion ─────────────────────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════════════════════════════════
   NYC Grid Traffic — Bird's Eye View

   Manhattan streets run at ~29° from cardinal north.
   Looking straight down: lanes appear diagonal but traffic
   flows CARDINALLY (up/down/left/right relative to the grid),
   not scattered at random angles.

   Each "lane" = a pair of opposing-direction traffic streams.
   Particles are car headlights/taillights: bright dots, short trails.
   ═══════════════════════════════════════════════════════════════════ */
class NYCTraffic {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.raf = null;
        this.mouse = { x: -2000, y: -2000 };
        this.W = 0; this.H = 0;
        this._resize();

        // 16 grid lanes, 18 particles each = 288 particles
        this.numLanes = 16;
        this.particlesPerLane = 18;
        // Extra stationary ambient lights (street lamps, building windows)
        this.ambientCount = 200;

        // Off-white headlights + amber streetlights (no long red streaks)
        this.trailAlpha = 0.03;

        window.addEventListener('resize', () => this._resize());
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

    _spawnTraffic(lane) {
        const { W, H } = this;
        // Speed classes: 0=slow (side streets), 1=medium, 2=avenues
        const speeds = [0.55, 1.1, 1.9];
        const speed = speeds[lane.speedClass] * (0.75 + Math.random() * 0.5);

        let x, y, vx, vy;

        if (lane.orientation === 'v') {
            // Vertical lanes — traffic goes UP or DOWN
            x = lane.x + (Math.random() - 0.5) * 24;
            vx = 0;
            vy = lane.direction * speed;
            if (vy > 0) {
                // Going down — start at top
                y = lane.direction > 0 ? -8 : H + 8;
            } else {
                y = lane.direction > 0 ? -8 : H + 8;
            }
        } else {
            // Horizontal lanes — traffic goes LEFT or RIGHT
            y = lane.y + (Math.random() - 0.5) * 24;
            vy = 0;
            vx = lane.direction * speed;
            if (vx > 0) {
                x = W + 8;
            } else {
                x = -8;
            }
        }

        // Color: off-white headlights (75%), warm amber streetlights (25%)
        const isHeadlight = Math.random() < 0.75;
        const color = isHeadlight
            ? { r: 255, g: 248, b: 235 }
            : { r: 255, g: 185, b: 70 };

        // Short trail: length based on speed, max 2px
        const trailLen = Math.min(speed * 0.6, 2.5);

        return {
            x, y, vx, vy,
            baseVx: vx, baseVy: vy,
            speed,
            color,
            radius: isHeadlight ? (Math.random() * 0.7 + 0.5) : (Math.random() * 1.1 + 0.7),
            alpha: isHeadlight ? 0.75 : 0.6,
            trailLen,
            flickerPhase: Math.random() * Math.PI * 2,
            flickerSpeed: Math.random() * 0.06 + 0.01,
            lane,
        };
    }

    _spawnAmbient() {
        const { W, H } = this;
        const x = Math.random() * W;
        const y = Math.random() * H;
        const roll = Math.random();
        // Mostly warm streetlight amber, some blue-white building windows
        const color = roll < 0.65
            ? { r: 255, g: 175, b: 55, a: 0.15 }
            : { r: 180, g: 210, b: 255, a: 0.1 };
        return {
            x, y,
            color,
            radius: Math.random() * 1.2 + 0.3,
            flicker: Math.random() * Math.PI * 2,
            flickerSpeed: Math.random() * 0.02 + 0.005,
        };
    }

    _buildLanes() {
        const { W, H } = this;
        this.lanes = [];

        // Vertical lanes (N-S traffic)
        const numV = Math.floor(this.numLanes / 2);
        for (let i = 0; i < numV; i++) {
            const x = (i / numV) * W + (Math.random() * 30 - 15);
            this.lanes.push({
                orientation: 'v',
                x: Math.max(20, Math.min(W - 20, x)),
                direction: i % 2 === 0 ? 1 : -1,
                speedClass: i % 3,
            });
        }

        // Horizontal lanes (E-W traffic)
        const numH = this.numLanes - numV;
        for (let i = 0; i < numH; i++) {
            const y = (i / numH) * H + (Math.random() * 30 - 15);
            this.lanes.push({
                orientation: 'h',
                y: Math.max(20, Math.min(H - 20, y)),
                direction: i % 2 === 0 ? 1 : -1,
                speedClass: i % 3,
            });
        }
    }

    init() {
        this._buildLanes();
        this.particles = [];
        this.ambient = [];

        // Traffic particles
        for (const lane of this.lanes) {
            for (let i = 0; i < this.particlesPerLane; i++) {
                const p = this._spawnTraffic(lane);
                // Scatter initial positions so traffic fills the screen
                if (lane.orientation === 'v') {
                    p.y = Math.random() * this.H;
                } else {
                    p.x = Math.random() * this.W;
                }
                this.particles.push(p);
            }
        }

        // Ambient stationary lights (street lamps, building windows)
        for (let i = 0; i < this.ambientCount; i++) {
            this.ambient.push(this._spawnAmbient());
        }

        this.canvas.classList.add('visible');
    }

    update() {
        const { W, H, mouse } = this;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const { orientation } = p.lane;

            // Mouse disruption — soft radial push
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const disruptR = 110;
            if (distSq < disruptR * disruptR && distSq > 0.01) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / disruptR) * 1.8;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // Return to lane flow
            p.vx += (p.baseVx - p.vx) * 0.05;
            p.vy += (p.baseVy - p.vy) * 0.05;

            p.x += p.vx;
            p.y += p.vy;

            // Flicker
            p.flickerPhase += p.flickerSpeed;

            // Respawn when out of bounds
            const margin = 60;
            if (p.x < -margin || p.x > W + margin || p.y < -margin || p.y > H + margin) {
                this.particles[i] = this._spawnTraffic(p.lane);
            }
        }

        // Ambient flicker
        for (const a of this.ambient) {
            a.flicker += a.flickerSpeed;
            if (a.flicker > Math.PI) a.flicker = 0;
        }
    }

    draw() {
        const { ctx, W, H } = this;

        // Dark trail fade — this creates the comet streak effect
        ctx.fillStyle = `rgba(8, 8, 12, ${this.trailAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Ambient lights (static city glow — no trails, just dots)
        for (const a of this.ambient) {
            const fa = 0.5 + Math.sin(a.flicker) * 0.3;
            ctx.save();
            ctx.globalAlpha = a.color.a * fa;
            ctx.shadowColor = `rgb(${a.color.r},${a.color.g},${a.color.b})`;
            ctx.shadowBlur = 6;
            ctx.fillStyle = `rgb(${a.color.r},${a.color.g},${a.color.b})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Traffic particles — bright head dot with very short trail
        for (const p of this.particles) {
            const flicker = Math.sin(p.flickerPhase) * 0.05;
            const alpha = Math.max(0.4, Math.min(0.9, p.alpha + flicker));
            const { r, g, b } = p.color;

            // Short tail — just 1-2px in direction of travel
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const tLen = p.trailLen;
            const nx = speed > 0.01 ? p.vx / speed : 0;
            const ny = speed > 0.01 ? p.vy / speed : 0;
            const tx = p.x - nx * tLen;
            const ty = p.y - ny * tLen;

            ctx.save();

            // Soft glow around the light
            ctx.shadowColor = `rgb(${r},${g},${b})`;
            ctx.shadowBlur = 7;

            // Trail segment
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            ctx.lineWidth = p.radius * 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();

            // Bright head dot
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 15)},${Math.min(255, b + 8)})`;
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

/* ── Mouse Parallax Tilt ───────────────────────────────────────── */
class ParallaxTilt {
    constructor(el) {
        this.el = el;
        this.raf = null;
        this.current = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this._strength = 8;

        document.addEventListener('mousemove', (e) => {
            this.target.x = (e.clientX / window.innerWidth - 0.5);
            this.target.y = (e.clientY / window.innerHeight - 0.5);
            if (!this.raf) this._loop();
        });
        document.addEventListener('mouseleave', () => {
            this.target.x = 0;
            this.target.y = 0;
        });
    }

    _loop() {
        this.current.x += (this.target.x - this.current.x) * 0.06;
        this.current.y += (this.target.y - this.current.y) * 0.06;

        const rx = -(this.current.y * this._strength);
        const ry = (this.current.x * this._strength);
        const tz = Math.abs(this.current.x) * 4 + Math.abs(this.current.y) * 4;

        this.el.style.transform =
            `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;

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
let trafficInstance = null;

function openOverlay(e) {
    if (e) e.preventDefault();
    overlay.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    overlay.offsetHeight;
    overlay.classList.add('active');
    closeBtn.focus();
    if (trafficInstance) trafficInstance.stop();
}

function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        if (!overlay.classList.contains('active')) {
            overlay.style.visibility = 'hidden';
        }
    }, 500);
    if (trafficInstance) {
        trafficInstance.raf = null;
        trafficInstance.start();
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
        trafficInstance = new NYCTraffic(canvas);
        trafficInstance.init();
        trafficInstance.start();
    }

    const panel = document.getElementById('brand-panel');
    if (panel && !prefersReducedMotion) {
        new ParallaxTilt(panel);
    }
});

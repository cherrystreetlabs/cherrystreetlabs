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

/* ── Particle System ───────────────────────────────────────────── */
class ParticleField {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -1000, y: -1000 };
        this.raf = null;
        this.count = window.innerWidth < 768 ? 30 : 60;

        this._resize();
        window.addEventListener('resize', () => this._resize());

        // Throttle mousemove to ~60fps naturally via rAF
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        document.addEventListener('mouseleave', () => {
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        });
    }

    _resize() {
        this.W = this.canvas.width = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;
    }

    _spawn(x, y) {
        return {
            x: x !== undefined ? x : Math.random() * this.W,
            y: y !== undefined ? y : this.H + 10,
            r: Math.random() * 1.8 + 0.4,         // radius
            vx: (Math.random() - 0.5) * 0.35,    // horizontal drift
            vy: -(Math.random() * 0.6 + 0.25),   // upward speed
            alpha: Math.random() * 0.5 + 0.15,   // opacity
            alphaDir: Math.random() > 0.5 ? 1 : -1, // fade direction
        };
    }

    init() {
        // Seed initial particles spread across the viewport
        for (let i = 0; i < this.count; i++) {
            const p = this._spawn();
            p.y = Math.random() * this.H; // scatter vertically on init
            this.particles.push(p);
        }
        this.canvas.classList.add('visible');
    }

    update() {
        const { W, H, mouse } = this;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Mouse repulsion — soft push away from cursor
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                const force = (100 - dist) / 100;
                p.vx += (dx / dist) * force * 0.8;
                p.vy += (dy / dist) * force * 0.5;
            }

            // Gentle damping so particles settle back
            p.vx *= 0.98;
            p.vy *= 0.99;

            p.x += p.vx;
            p.y += p.vy;

            // Alpha pulsing — subtle breathe effect
            p.alpha += p.alphaDir * 0.004;
            if (p.alpha > 0.65 || p.alpha < 0.1) {
                p.alphaDir *= -1;
            }

            // Respawn if out of bounds
            if (p.y < -10 || p.x < -10 || p.x > W + 10) {
                this.particles[i] = this._spawn();
            }
        }
    }

    draw() {
        const { ctx, W, H } = this;
        ctx.clearRect(0, 0, W, H);

        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    start() {
        const loop = () => {
            this.update();
            this.draw();
            this.raf = requestAnimationFrame(loop);
        };
        loop();
    }

    stop() {
        if (this.raf) cancelAnimationFrame(this.raf);
    }
}

/* ── Mouse Parallax Tilt ────────────────────────────────────────── */
class ParallaxTilt {
    constructor(el) {
        this.el = el;
        this.active = false;
        this.raf = null;

        // Smooth current values (separate from target)
        this.current = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this._strength = 8; // degrees max tilt

        document.addEventListener('mousemove', (e) => this._onMove(e));
        document.addEventListener('mouseleave', () => this._onLeave());
    }

    _onMove(e) {
        const { innerWidth: W, innerHeight: H } = window;
        // Normalize: -0.5 to 0.5
        this.target.x = (e.clientX / W - 0.5);
        this.target.y = (e.clientY / H - 0.5);

        if (!this.active) {
            this.active = true;
            this._loop();
        }
    }

    _onLeave() {
        // Ease back to center
        this.target.x = 0;
        this.target.y = 0;
    }

    _loop() {
        // Lerp toward target — 0.06 = smooth follow
        this.current.x += (this.target.x - this.current.x) * 0.06;
        this.current.y += (this.target.y - this.current.y) * 0.06;

        const rx = -(this.current.y * this._strength);
        const ry = (this.current.x * this._strength);

        // Slight z-translate for depth feel
        const tz = Math.abs(this.current.x) * 4 + Math.abs(this.current.y) * 4;

        this.el.style.transform =
            `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;

        // Keep looping if still active
        if (this.active) {
            this.raf = requestAnimationFrame(() => this._loop());
        }
    }
}

/* ── Who We Are Overlay ────────────────────────────────────────── */
const whoWeAreBtn    = document.getElementById('whoWeAreBtn');
const overlay        = document.getElementById('whoWeAreOverlay');
const closeBtn       = document.getElementById('closeOverlay');

function openOverlay(e) {
    if (e) e.preventDefault();
    overlay.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    overlay.offsetHeight; // force reflow
    overlay.classList.add('active');
    closeBtn.focus();
}

function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        if (!overlay.classList.contains('active')) {
            overlay.style.visibility = 'hidden';
        }
    }, 500);
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
if (!prefersReducedMotion) {
    // Wait for DOM + fonts to settle
    requestAnimationFrame(() => {
        // Particle field
        const canvas = document.getElementById('particle-canvas');
        if (canvas) {
            const pf = new ParticleField(canvas);
            pf.init();
            pf.start();

            // Kill particles when overlay is open (reduce distraction)
            whoWeAreBtn.addEventListener('click', () => pf.stop());
            closeBtn.addEventListener('click', () => {
                setTimeout(() => pf.start(), 600);
            });
        }

        // Parallax tilt on brand panel
        const panel = document.getElementById('brand-panel');
        if (panel) {
            new ParallaxTilt(panel);
        }
    });
}

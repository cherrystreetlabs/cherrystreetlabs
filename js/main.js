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

if (prefersReducedMotion) {
    document.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('autoplay');
    });
}

/* ── Who We Are Overlay ────────────────────────────────────────── */
const whoWeAreBtn    = document.getElementById('whoWeAreBtn');
const overlay        = document.getElementById('whoWeAreOverlay');
const closeBtn       = document.getElementById('closeOverlay');

function openOverlay(e) {
    if (e) e.preventDefault();
    overlay.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    // Force reflow so CSS transition fires
    overlay.offsetHeight;
    overlay.classList.add('active');
    // Focus the close button for accessibility
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

// Close on backdrop click
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeOverlay();
    }
});

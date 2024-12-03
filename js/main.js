document.addEventListener('DOMContentLoaded', function() {
    const videos = document.querySelectorAll("video");
    
    // Handle reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion)').matches) {
        videos.forEach(video => {
            video.removeAttribute("autoplay");
            video.pause();
        });
    }

    // Initial viewport height calculation
    updateViewportHeight();
});

// Function to update viewport height
function updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Handle resize and orientation changes
window.addEventListener('resize', () => {
    updateViewportHeight();
});

// Handle iOS Safari address bar hiding/showing
window.addEventListener('scroll', () => {
    // Small timeout to let the address bar hide/show
    setTimeout(updateViewportHeight, 100);
});

// Handle orientation change explicitly
window.addEventListener('orientationchange', () => {
    // Small timeout to let the orientation change complete
    setTimeout(updateViewportHeight, 200);
});
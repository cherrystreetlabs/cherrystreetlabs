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

    // Who We Are Overlay Functionality
    const whoWeAreBtn = document.getElementById('whoWeAreBtn');
    const whoWeAreOverlay = document.getElementById('whoWeAreOverlay');
    const closeOverlayBtn = document.getElementById('closeOverlay');

    // Open overlay
    whoWeAreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        whoWeAreOverlay.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
        // Force a reflow
        whoWeAreOverlay.offsetHeight;
        whoWeAreOverlay.classList.add('active');
    });

    // Close overlay function
    const closeOverlay = () => {
        whoWeAreOverlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            whoWeAreOverlay.style.visibility = 'hidden';
        }, 500); // Match the transition duration
    };

    // Close button click
    closeOverlayBtn.addEventListener('click', closeOverlay);

    // Click outside to close
    whoWeAreOverlay.addEventListener('click', (e) => {
        if (e.target === whoWeAreOverlay) {
            closeOverlay();
        }
    });
});

// Function to update viewport height
function updateViewportHeight() {
    // Get the viewport height
    let vh = window.innerHeight * 0.01;
    // Set the value in the --vh custom property
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Initial set on page load
updateViewportHeight();

// Handle resize and orientation changes
window.addEventListener('resize', () => {
    requestAnimationFrame(updateViewportHeight);
});

// Handle iOS Safari specifically
if (/iPhone|iPod|iPad/.test(navigator.platform) || navigator.userAgent.includes("iPhone")) {
    // Handle scroll events (address bar show/hide)
    window.addEventListener('scroll', () => {
        requestAnimationFrame(updateViewportHeight);
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        // Need a longer timeout for orientation changes
        setTimeout(updateViewportHeight, 250);
    });
    
    // Additional check for height changes
    let lastHeight = window.innerHeight;
    const checkHeight = () => {
        const newHeight = window.innerHeight;
        if (newHeight !== lastHeight) {
            lastHeight = newHeight;
            updateViewportHeight();
        }
    };
    setInterval(checkHeight, 50);
}
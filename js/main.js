document.addEventListener('DOMContentLoaded', function() {
    const videos = document.querySelectorAll("video");
    
    // Handle reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion)').matches) {
        videos.forEach(video => {
            video.removeAttribute("autoplay");
            video.pause();
        });
    }
});

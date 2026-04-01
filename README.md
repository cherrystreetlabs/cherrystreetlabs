# Cherry Street Labs

LLC website for Cherry Street Labs — a software studio inspired by the generational spirit of Italian immigrants who built New York City.

## Site

- **Live:** https://cherrystreetlabs.com
- **Video background** with CSS frosted glass text panel
- **Responsive** — mobile-optimized with iOS Safari viewport handling
- **SEO-optimized** — meta descriptions, Open Graph, Twitter Card, sitemap, robots.txt

## Stack

Plain HTML/CSS/JS — no build step required, deploys directly to GitHub Pages.

## Development

```bash
# Clone and serve locally
git clone https://github.com/mikebatts/cherrystreetlabs.git
cd cherrystreetlabs
python3 -m http.server 8000
# Open http://localhost:8000
```

## Assets

| File | Size | Purpose |
|------|------|---------|
| `assets/videos/background.webm` | 3.8 MB | Looping background video (VP9) |
| `assets/images/poster.jpg` | 362 KB | Video poster / fallback frame |
| `assets/images/cherryimg.jpg` | 303 KB | OG image (social sharing) |
| `assets/images/whoweare.jpg` | 390 KB | "Who We Are" overlay photo |

## Architecture

```
cherrystreetlabs/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── assets/
│   ├── images/
│   │   ├── cherryimg.jpg    # OG / social card
│   │   ├── poster.jpg       # Video poster frame
│   │   └── whoweare.jpg     # About overlay photo
│   └── videos/
│       └── background.webm  # Background video (WebM/VP9)
├── favicon.svg
├── sitemap.xml
└── robots.txt
```

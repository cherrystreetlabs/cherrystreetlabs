// Cherry Street Labs — Shaders.com Rolling Shadows preset (CSL warm colors)
// MultiPointGradient + WaveDistortion + Bulge + Paper texture
// Mouse tracking: cherry accent follows cursor, bulge effect on hover
import { createShader } from 'https://esm.sh/shaders@2.5.94/js'

function initShader() {
  const canvas = document.getElementById('heroShader')
  if (!canvas) return

  createShader(canvas, {
    components: [
      {
        type: 'MultiPointGradient',
        id: 'idmnugm1723oyu2rxxm',
        props: {
          colorA: '#F5F2ED',     // warm cream
          colorB: '#D4A574',     // warm sand
          colorC: '#E8DDD0',     // light cream
          colorD: '#C41E3A',     // cherry red (mouse-following)
          colorE: '#C9A88C',     // warm taupe
          positionA: { x: 0.16, y: 0.38 },
          positionB: { x: 0.61, y: 0.81 },
          positionC: { x: 0.82, y: 0.45 },
          positionD: {
            type: 'mouse-position',
            originX: 0.445,
            originY: 0.2816725978647687,
            momentum: 0.2,
            smoothing: 0.6
          },
          positionE: { x: 0.53, y: 0.69 },
        },
      },
      {
        type: 'WaveDistortion',
        id: 'idmnugqtmdlruhxq3vg',
      },
      {
        type: 'Bulge',
        id: 'idmnugorjh9ehk29e3o',
        props: {
          center: {
            type: 'mouse-position',
            originX: 0.37,
            originY: 0.6642984014209592,
            momentum: 0.3,
            smoothing: 0.8
          },
          falloff: 2,
          radius: 2,
        },
      },
      {
        type: 'Paper',
        id: 'idmnugq5fkhnw1lku1y',
        props: {
          displacement: 0.24,
          grainScale: 3,
          roughness: 0.1,
        },
      }
    ],
  }).then(() => {
    console.log('Shader loaded successfully')
  }).catch((err) => {
    console.error('Shader init failed:', err)
    canvas.style.background = '#F5F2ED'
    canvas.style.opacity = '1'
  })
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initShader, 100)
})

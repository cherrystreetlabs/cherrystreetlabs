// Cherry Street Labs — Shaders.com Liquid Silver preset (CSL colors)
// FlowingGradient: Liquid silk gradient with organic flowing color bands
import { createShader } from 'https://esm.sh/shaders@2.5.94/js'

function initShader() {
  const canvas = document.getElementById('heroShader')
  if (!canvas) return

  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = rect.height * window.devicePixelRatio

  canvas.style.animation = 'none'

  createShader(canvas, {
    components: [
      {
        type: 'FlowingGradient',
        props: {
          colorA: '#F5F2ED',    // CSL cream
          colorB: '#C41E3A',    // CSL cherry red
          colorC: '#E8D5C4',    // warm cream accent
          colorD: '#8B1428',    // dark cherry accent
          speed: 0.4,
          distortion: 0.5,
          colorSpace: 'oklch'
        }
      }
    ]
  }).then(() => {
    canvas.style.animation = 'shaderFadeIn 2.5s ease-out forwards'
    console.log('Shader loaded successfully')
  }).catch((err) => {
    console.error('Shader init failed:', err)
    canvas.style.background = '#F5F2ED'
    canvas.style.opacity = '1'
    canvas.style.animation = 'none'
  })
}

// Wait for fonts and layout, then init
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initShader, 100)
})

// Resize handler
window.addEventListener('resize', () => {
  const canvas = document.getElementById('heroShader')
  if (canvas && canvas.width) {
    const rect = canvas.parentElement.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
  }
})

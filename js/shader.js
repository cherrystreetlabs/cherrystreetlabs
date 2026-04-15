// Cherry Street Labs — Shaders.com Liquid Silver preset (CSL colors)
// FlowingGradient: "Liquid silk gradient with organic flowing color bands"
import { createShader } from 'https://esm.sh/shaders@2.5.94/js'

const canvas = document.getElementById('heroShader')
if (canvas) {
  // Hold animation until shader is ready
  canvas.style.animation = 'none'

  try {
    const shader = await createShader(canvas, {
      components: [
        {
          type: 'FlowingGradient',
          props: {
            colorA: '#F5F2ED',   // CSL cream
            colorB: '#C41E3A',   // CSL cherry red
            colorC: '#E8D5C4',   // warm cream accent
            colorD: '#8B1428',   // dark cherry accent
            speed: 0.4,
            distortion: 0.5,
            colorSpace: 'oklch'
          }
        }
      ]
    })

    // Reveal with fade-in
    canvas.style.animation = 'shaderFadeIn 2.5s ease-out forwards'
  } catch (err) {
    console.error('Shader init failed:', err)
    // Graceful fallback to solid cream
    canvas.style.background = '#F5F2ED'
    canvas.style.opacity = '1'
    canvas.style.filter = 'none'
    canvas.style.animation = 'none'
  }
}

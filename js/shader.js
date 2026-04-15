// Cherry Street Labs — Shaders.com Liquid Silver preset (CSL colors)
// Swirl + WaveDistortion + FilmGrain via shaders.com export
import { createShader } from 'https://esm.sh/shaders@2.5.94/js'

function initShader() {
  const canvas = document.getElementById('heroShader')
  if (!canvas) return

  createShader(canvas, {
    components: [
      {
        type: 'Swirl',
        id: 'idmgjtc8f83glwcml20',
        props: {
          blend: 35,
          colorA: '#F5F2ED',
          colorB: '#C41E3A',
          colorSpace: 'oklch',
          detail: 1.7,
          speed: 0.8,
        },
      },
      {
        type: 'WaveDistortion',
        id: 'idmh46tfzzha4wp1moq',
        props: {
          angle: 203,
          edges: 'mirror',
          frequency: 2.8,
          speed: 2.5,
          strength: 0.5,
          visible: true,
        },
      },
      {
        type: 'FilmGrain',
        id: 'idmgjtgt7qxgeuyzgaz',
        props: {
          strength: 0.15,
        },
      },
    ],
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

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initShader, 100)
})

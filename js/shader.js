// Cherry Street Labs — Exact Shaders.com Liquid Silver export
// Swirl + WaveDistortion + FilmGrain + CursorRipples (silver tones)
import { createShader } from 'https://esm.sh/shaders@2.5.94/js'

async function initShader() {
  const canvas = document.getElementById('heroShader');
  if (!canvas) {
    console.error('[CSL Shader] Canvas #heroShader not found in DOM');
    return;
  }

  try {
    const shader = await createShader(canvas, {
      components: [
        {
          type: 'Swirl',
          id: 'idmgjtc8f83glwcml20',
          props: {
            blend: 47,
            colorA: '#e6e6e6',
            colorB: '#b5b5b5',
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
        {
          type: 'CursorRipples',
          id: 'idmli7wlt5z755vzxhu',
          props: {
            chromaticSplit: 0,
            decay: 5,
            intensity: 3,
            radius: 2,
          },
        }
      ]
    });

    canvas.style.animation = 'shaderFadeIn 2.5s ease-out forwards';
    console.log('[CSL Shader] Loaded successfully (Shaders.com Liquid Silver)');
  } catch (err) {
    console.error('[CSL Shader] FAILED to initialize:', err);
    console.error('[CSL Shader] Stack:', err.stack);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShader);
} else {
  initShader();
}

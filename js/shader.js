// Cherry Street Labs — Liquid Silver Shader (Shaders.com)
// Adapted from "Liquid Silver" preset with CSL cream + cherry color scheme
import { createShader } from 'https://esm.sh/shaders@2.5.94/js';

(async function () {
  'use strict';

  var canvas = document.getElementById('heroShader');
  if (!canvas) return;

  // Hold off CSS fade-in until shader renders
  canvas.style.animation = 'none';

  try {
    await createShader(canvas, {
      components: [
        {
          type: 'Swirl',
          id: 'csl-swirl',
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
          id: 'csl-wave',
          props: {
            angle: 203,
            edges: 'mirror',
            frequency: 2.8,
            speed: 2.5,
            strength: 0.5,
          },
        },
        {
          type: 'FilmGrain',
          id: 'csl-grain',
          props: {
            strength: 0.15,
          },
        },
        {
          type: 'CursorRipples',
          id: 'csl-ripples',
          props: {
            chromaticSplit: 0,
            decay: 5,
            intensity: 3,
            radius: 2,
          },
        },
      ],
    });

    // Shader mounted — trigger fade-in
    canvas.style.animation = 'shaderFadeIn 2.5s ease-out forwards';
  } catch (err) {
    console.error('Shader init failed:', err);
    canvas.style.background = '#F5F2ED';
    canvas.style.opacity = '1';
  }
})();

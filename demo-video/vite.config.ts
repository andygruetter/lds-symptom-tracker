import { defineConfig } from 'vite'
import mc from '@motion-canvas/vite-plugin'

const motionCanvas = mc.default ?? mc

export default defineConfig({
  plugins: [
    motionCanvas({
      project: ['./src/project.ts'],
    }),
  ],
})

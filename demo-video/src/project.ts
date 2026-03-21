import { makeProject } from '@motion-canvas/core'
import problem from './scenes/problem?scene'
import solution from './scenes/solution?scene'
import aiMagic from './scenes/ai-magic?scene'
import insights from './scenes/insights?scene'
import doctor from './scenes/doctor?scene'
import cta from './scenes/cta?scene'

export default makeProject({
  scenes: [problem, solution, aiMagic, insights, doctor, cta],
  background: '#F2EDE7',
})

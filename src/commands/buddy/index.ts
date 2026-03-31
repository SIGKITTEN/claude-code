import type { Command } from '../../commands.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Hatch or visit your companion',
  supportsNonInteractive: false,
  isEnabled: () => true,
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy

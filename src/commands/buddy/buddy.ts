import type { LocalCommandResult } from '../../types/command.js'
import {
  companionUserId,
  getCompanion,
  roll,
} from '../../buddy/companion.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { RARITY_STARS } from '../../buddy/types.js'

export async function call(args: string): Promise<LocalCommandResult> {
  const sub = args.trim().split(/\s+/)[0]

  if (sub === 'pet') {
    const companion = getCompanion()
    if (!companion) {
      return { type: 'text', value: 'You don\'t have a companion yet! Run /buddy to hatch one.' }
    }
    return { type: 'text', value: `${companion.name} purrs contentedly. ❤️` }
  }

  if (sub === 'stats') {
    const companion = getCompanion()
    if (!companion) {
      return { type: 'text', value: 'You don\'t have a companion yet! Run /buddy to hatch one.' }
    }
    const stars = RARITY_STARS[companion.rarity]
    const stats = Object.entries(companion.stats)
      .map(([k, v]) => `  ${k}: ${'█'.repeat(Math.floor(v / 5))} ${v}`)
      .join('\n')
    return {
      type: 'text',
      value: `${companion.name} — ${companion.species} ${stars}${companion.shiny ? ' ✨ SHINY' : ''}\n${companion.personality}\n\n${stats}`,
    }
  }

  if (sub === 'mute') {
    saveGlobalConfig((c) => ({ ...c, companionMuted: true }))
    return { type: 'text', value: 'Companion muted. Run /buddy unmute to bring them back.' }
  }

  if (sub === 'unmute') {
    saveGlobalConfig((c) => ({ ...c, companionMuted: false }))
    return { type: 'text', value: 'Companion unmuted!' }
  }

  // Default: hatch or show companion
  const existing = getCompanion()
  if (existing) {
    const stars = RARITY_STARS[existing.rarity]
    return {
      type: 'text',
      value: `🥚 ${existing.name} the ${existing.species} ${stars}${existing.shiny ? ' ✨ SHINY' : ''}\n${existing.personality}\n\nCommands: /buddy stats, /buddy pet, /buddy mute`,
    }
  }

  // Hatch a new companion
  const userId = companionUserId()
  const { bones } = roll(userId)
  const stars = RARITY_STARS[bones.rarity]

  // Generate a name (simple deterministic approach since we can't call the API from a local command)
  const names: Record<string, string[]> = {
    duck: ['Quackers', 'Waddles', 'Ducky', 'Mallard', 'Peep'],
    goose: ['Honkers', 'Goosebert', 'Noodle', 'Cobra', 'Feathers'],
    blob: ['Blobby', 'Globule', 'Squish', 'Gelato', 'Puddle'],
    cat: ['Whiskers', 'Mittens', 'Shadow', 'Luna', 'Pixel'],
    dragon: ['Ember', 'Spark', 'Scales', 'Blaze', 'Wyrm'],
    octopus: ['Inky', 'Tentacles', 'Cthulu Jr', 'Octavia', 'Squidward'],
    owl: ['Hootsworth', 'Owlbert', 'Minerva', 'Hedwig', 'Sage'],
    penguin: ['Tux', 'Waddle', 'Flipper', 'Frosty', 'Linux'],
    turtle: ['Shelldon', 'Tortuga', 'Slowpoke', 'Terrapin', 'Mossy'],
    snail: ['Turbo', 'Slime', 'Escargot', 'Gary', 'Slugsworth'],
    ghost: ['Boo', 'Phantom', 'Casper', 'Spooky', 'Wraith'],
    axolotl: ['Axel', 'Lotl', 'Gilly', 'Mudkip', 'Newt'],
    capybara: ['Cappy', 'Bara', 'Chillbert', 'Coconut', 'Zen'],
    cactus: ['Prickles', 'Spike', 'Needles', 'Verde', 'Ouch'],
    robot: ['Beep', 'Circuit', 'Botty', 'Rusty', 'Chrome'],
    rabbit: ['Bun', 'Hopscotch', 'Clover', 'Thumper', 'Mochi'],
    mushroom: ['Shroom', 'Fungi', 'Truffle', 'Spore', 'Cap'],
    chonk: ['Chunk', 'Thicc', 'Chungus', 'Boulder', 'Absolute Unit'],
  }

  const speciesNames = names[bones.species] || ['Buddy']
  const nameIdx = Math.floor((bones.stats.CHAOS + bones.stats.WISDOM) / 2) % speciesNames.length
  const name = speciesNames[nameIdx]!

  const personalities = [
    `A ${bones.rarity} ${bones.species} who loves debugging sessions.`,
    `A mysterious ${bones.species} that appears when code compiles successfully.`,
    `An enthusiastic ${bones.species} who cheers during git pushes.`,
    `A chill ${bones.species} that naps between test runs.`,
    `A mischievous ${bones.species} who rearranges your tabs.`,
  ]
  const persIdx = (bones.stats.SNARK + bones.stats.PATIENCE) % personalities.length
  const personality = personalities[persIdx]!

  saveGlobalConfig((c) => ({
    ...c,
    companion: { name, personality, hatchedAt: Date.now() },
  }))

  return {
    type: 'text',
    value: `🥚 *crack* ✨\n\nA ${bones.rarity} ${bones.species} hatched! ${stars}${bones.shiny ? ' ✨ SHINY!' : ''}\n\nMeet ${name}!\n${personality}\n\nCommands: /buddy stats, /buddy pet, /buddy mute`,
  }
}

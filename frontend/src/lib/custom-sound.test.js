import { describe, expect, it } from 'vitest'
import { soundFileProblem, soundDurationProblem, MAX_SOUND_BYTES, MAX_SOUND_SECONDS } from './custom-sound.js'

describe('soundFileProblem', () => {
  it('accepts an ordinary audio file', () => {
    expect(soundFileProblem({ name: 'bell.mp3', type: 'audio/mpeg', size: 40_000 })).toBe(null)
  })

  // Android file pickers often hand over an empty MIME type; the extension has to be enough.
  it('accepts a known audio extension when the type is missing', () => {
    expect(soundFileProblem({ name: 'Grabación 12.m4a', type: '', size: 40_000 })).toBe(null)
  })

  it('refuses something that is not audio', () => {
    expect(soundFileProblem({ name: 'photo.jpg', type: 'image/jpeg', size: 40_000 })).toBe('not-audio')
    expect(soundFileProblem({})).toBe('not-audio')
  })

  it('refuses an empty or oversized file', () => {
    expect(soundFileProblem({ name: 'a.mp3', type: 'audio/mpeg', size: 0 })).toBe('empty')
    expect(soundFileProblem({ name: 'a.mp3', type: 'audio/mpeg', size: MAX_SOUND_BYTES + 1 })).toBe('too-big')
  })
})

// The alert is scheduled to END on zero, so its length decides when it starts. A clip that
// cannot be measured (0) would silently fire late; one that is too long would fire at once.
describe('soundDurationProblem', () => {
  it('accepts a short clip, up to the limit', () => {
    expect(soundDurationProblem(2.4)).toBe(null)
    expect(soundDurationProblem(MAX_SOUND_SECONDS)).toBe(null)
  })

  it('refuses a clip it could not measure', () => {
    expect(soundDurationProblem(0)).toBe('unreadable')
    expect(soundDurationProblem(NaN)).toBe('unreadable')
  })

  it('refuses a clip longer than the limit', () => {
    expect(soundDurationProblem(MAX_SOUND_SECONDS + 0.5)).toBe('too-long')
  })
})

import { describe, expect, it } from 'vitest'
import { restBetweenExercisesSec, restExLabel, settingChoice } from './rest-between.js'

const t = (s, ...a) => s.replace(/\{(\d+)\}/g, (_, i) => a[i])

describe('restBetweenExercisesSec', () => {
  // Nobody has chosen anything: the break is exactly what it was before the setting existed.
  it('falls back to the rest the closing set earned', () => {
    expect(restBetweenExercisesSec(90, undefined, null)).toBe(90)
    expect(restBetweenExercisesSec(150, undefined, undefined)).toBe(150)
  })

  it('uses the Settings time when the workout has no override', () => {
    expect(restBetweenExercisesSec(90, undefined, 180)).toBe(180)
  })

  it('lets the running workout override Settings', () => {
    expect(restBetweenExercisesSec(90, 240, 180)).toBe(240)
  })

  // 'sets' in the workout is a real choice, not "no override": it must beat a Settings time.
  it('lets the workout go back to the between-sets rest even when Settings sets a time', () => {
    expect(restBetweenExercisesSec(90, 'sets', 180)).toBe(90)
  })

  // 0 is "no rest", and must not be mistaken for "not set" and fall through to Settings.
  it('treats 0 as no rest at either level', () => {
    expect(restBetweenExercisesSec(90, 0, 180)).toBe(0)
    expect(restBetweenExercisesSec(90, undefined, 0)).toBe(0)
  })

  // The global rest timer set to Off gives restSecFor 0 — an explicit between-exercises time
  // still applies, the same way an exercise's own rest overrides the Off default.
  it('still rests between exercises when the between-sets timer is Off', () => {
    expect(restBetweenExercisesSec(0, undefined, 120)).toBe(120)
    expect(restBetweenExercisesSec(0, undefined, null)).toBe(0)
  })

  it('ignores garbage from an old or hand-edited backup', () => {
    expect(restBetweenExercisesSec(90, 'x', -5)).toBe(90)
    expect(restBetweenExercisesSec(90, null, NaN)).toBe(90)
  })
})

describe('restExLabel / settingChoice', () => {
  it('labels every kind of choice', () => {
    expect(restExLabel('sets', t)).toBe('Same as between sets')
    expect(restExLabel(0, t)).toBe('Off')
    expect(restExLabel(120, t)).toBe('120s')
  })

  it('reads a missing Settings value as "same as between sets"', () => {
    expect(settingChoice(null)).toBe('sets')
    expect(settingChoice(undefined)).toBe('sets')
    expect(settingChoice(60)).toBe(60)
  })
})

import { describe, it, expect } from 'vitest'
import {
  EFFECTIVE_RIR, VOLUME_TARGET, VOLUME_GROUPS,
  isEffectiveSet, groupVolume, cycleVolume, volumeStatus, volumeColor,
} from './volume.js'

// A work set with an optional RIR. Inline exercise metadata (tg/mg/sm) resolves through
// musclesOf exactly as a catalogue entry would; ids here are intentionally not in EXIDX.
const set = (rir, extra = {}) => ({ done: true, w: 50, r: 8, ...(rir == null ? {} : { rir }), ...extra })
const entry = (meta, sets) => ({ id: meta.id || 'x', ...meta, sets })
const workout = (d, entries) => ({ d, start: Date.parse(d + 'T10:00:00'), entries })

// Single-muscle exercises so the group value equals the effective set count exactly.
const curl = sets => entry({ id: 'curl', tg: 'biceps' }, sets)          // biceps primary
const squat = sets => entry({ id: 'squat', tg: 'quads', sm: ['glutes', 'hamstrings'] }, sets)

describe('effective-set rule', () => {
  it('counts a set at or below RIR 4, and any unrated set', () => {
    expect(isEffectiveSet(set(0))).toBe(true)
    expect(isEffectiveSet(set(4))).toBe(true)
    expect(isEffectiveSet(set(null))).toBe(true)   // unrated is counted, per product
    expect(EFFECTIVE_RIR).toBe(4)
  })
  it('drops a set logged further than 4 reps from failure', () => {
    expect(isEffectiveSet(set(5))).toBe(false)
    expect(isEffectiveSet(set(6))).toBe(false)
  })
  it('reads RPE the same way (RPE 6 == RIR 4 counts, RPE 5 does not)', () => {
    expect(isEffectiveSet({ done: true, rpe: 6 })).toBe(true)
    expect(isEffectiveSet({ done: true, rpe: 5 })).toBe(false)
  })
})

describe('groupVolume', () => {
  it('sums one effective set per single-muscle set', () => {
    const { groups } = groupVolume([workout('2026-09-01', [curl([set(2), set(2), set(3)])])])
    expect(groups.biceps).toBe(3)
    expect(groups.legs).toBe(0)
  })

  it('credits a group with the strongest muscle per set, never the sum of its muscles', () => {
    // A squat trains quads (1) plus glutes and hamstrings as secondaries (0.4). All three
    // fold into "legs": one squat set must weigh 1 leg set, not 1.8.
    const { groups } = groupVolume([workout('2026-09-01', [squat([set(1), set(1)])])])
    expect(groups.legs).toBe(2)
  })

  it('excludes warm-ups and sets past the RIR threshold from the volume', () => {
    const { groups } = groupVolume([workout('2026-09-01', [curl([
      set(2),
      set(8),                          // too easy — not effective
      set(2, { phase: 'warmup' }),     // warm-up — never volume
    ])])])
    expect(groups.biceps).toBe(1)
  })

  it('reports rated/unrated coverage over every done work set, regardless of the pick', () => {
    const { rated, unrated, total } = groupVolume([workout('2026-09-01', [curl([
      set(2), set(8), set(null), set(null),
    ])])])
    expect(rated).toBe(2)      // the RIR-2 and RIR-8 sets are both rated
    expect(unrated).toBe(2)
    expect(total).toBe(4)
  })

  it('folds back as upper+lower and side delts as the whole deltoids group', () => {
    const row = entry({ id: 'pull', primaries: ['upper-back', 'lower-back'], secondaries: ['deltoids'] }, [set(2)])
    const { groups } = groupVolume([workout('2026-09-01', [row])])
    expect(groups.back).toBe(1)          // one set toward back (max of upper/lower = 1)
    expect(groups.delts).toBeCloseTo(0.4)
  })
})

describe('cycleVolume', () => {
  // Six sessions close a PPL block, so the seventh opens a new one and the count restarts:
  // the panel reports the block being built, not a rolling six.
  const S = n => ({
    program: { strategy: 'ppl', seq: ['a', 'b', 'c', 'd', 'e', 'f'], cycleStart: '2026-09-01' },
    workouts: Array.from({ length: n }, (_, i) =>
      workout(`2026-09-${String(i + 1).padStart(2, '0')}`, [curl([set(2)])])),
  })

  it('sums only the sessions logged since the block opened', () => {
    expect(cycleVolume(S(3))).toMatchObject({ sessions: 3 })
    expect(cycleVolume(S(3)).groups.biceps).toBe(3)
  })

  it('restarts at the block boundary instead of rolling', () => {
    expect(cycleVolume(S(6)).sessions).toBe(0)      // block closed, next one empty
    expect(cycleVolume(S(7)).sessions).toBe(1)
    expect(cycleVolume(S(7)).groups.biceps).toBe(1)
  })
})

describe('volume status', () => {
  it('bands against the 10–20 target', () => {
    expect(VOLUME_TARGET).toEqual({ min: 10, max: 20 })
    expect(volumeStatus(9.9)).toBe('low')
    expect(volumeStatus(10)).toBe('ok')
    expect(volumeStatus(20)).toBe('ok')
    expect(volumeStatus(20.1)).toBe('high')
  })
  it('maps each status to a colour token', () => {
    expect(volumeColor('ok')).toBe('var(--green)')
    expect(volumeColor('low')).toBe('var(--orange)')
    expect(volumeColor('high')).toBe('var(--red)')
  })
  it('exposes the seven home groups in order', () => {
    expect(VOLUME_GROUPS.map(g => g.key)).toEqual(
      ['legs', 'chest', 'back', 'delts', 'biceps', 'triceps', 'abs'])
  })
})

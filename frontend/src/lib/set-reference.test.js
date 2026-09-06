import { describe, it, expect } from 'vitest'
import { workIndexOf, referenceSet, suggestionFor, extraSetsWanted } from './set-reference.js'

const work = (w, r, done = false) => ({ w, r, done })
const warm = (w, r) => ({ w, r, phase: 'warmup', done: false })

describe('workIndexOf', () => {
  it('counts work rows only, so the first work set after two warm-ups is position 0', () => {
    const sets = [warm(30, 5), warm(45, 3), work(60, 10), work(60, 10)]
    expect(workIndexOf(sets, 2)).toBe(0)
    expect(workIndexOf(sets, 3)).toBe(1)
  })
  it('gives a warm-up no position of its own', () => {
    expect(workIndexOf([warm(30, 5), work(60, 10)], 0)).toBe(null)
  })
  it('returns null off the ends of the list', () => {
    expect(workIndexOf([work(60, 10)], -1)).toBe(null)
    expect(workIndexOf([work(60, 10)], 9)).toBe(null)
  })
})

describe('referenceSet', () => {
  const prev = [work(60, 10, true), work(60, 9, true), work(57.5, 8, true)]
  it('pairs each position with the set that sat there last session', () => {
    expect(referenceSet(prev, 0)).toEqual(prev[0])
    expect(referenceSet(prev, 2)).toEqual(prev[2])
  })
  // You added a fourth set today: the honest reference is still the last one you actually did.
  it('keeps the final set as the reference past the end of last session', () => {
    expect(referenceSet(prev, 3)).toEqual(prev[2])
  })
  it('ignores last session’s warm-ups when lining the positions up', () => {
    expect(referenceSet([warm(30, 5), work(60, 10, true)], 0)).toEqual(work(60, 10, true))
  })
  it('has nothing to say with no history', () => {
    expect(referenceSet([], 0)).toBe(null)
    expect(referenceSet(undefined, 0)).toBe(null)
  })
})

describe('suggestionFor', () => {
  it('follows the prescription over last time when the policy decided one', () => {
    const s = suggestionFor({ plan: { kind: 'up', weight: 62.5 }, row: work(60, 10), reference: work(60, 10, true) })
    expect(s).toEqual({ w: 62.5 })
  })
  it('falls back to last time’s numbers when progression is off', () => {
    const s = suggestionFor({ plan: { kind: 'off' }, row: work(0, 0), reference: work(60, 10, true) })
    expect(s).toEqual({ w: 60, r: 10 })
  })
  // The chip only earns its place when tapping it would change something.
  it('says nothing when the row already carries the target', () => {
    expect(suggestionFor({ plan: { weight: 60, reps: 10 }, row: work(60, 10), reference: work(60, 10, true) })).toBe(null)
  })
  it('never speaks to a logged set or a warm-up', () => {
    expect(suggestionFor({ plan: { weight: 62.5 }, row: work(60, 10, true), reference: work(60, 10, true) })).toBe(null)
    expect(suggestionFor({ plan: { weight: 62.5 }, row: warm(30, 5), reference: work(60, 10, true) })).toBe(null)
  })
  it('carries a bodyweight rep target with no weight to add', () => {
    const s = suggestionFor({ plan: { kind: 'up', weight: 0, reps: 13 }, row: work(0, 12), reference: work(0, 12, true) })
    expect(s).toEqual({ r: 13 })
  })
  it('works in seconds for a timed hold', () => {
    const s = suggestionFor({ mode: 'time', plan: { kind: 'up', sec: 50 }, row: { sec: 45, w: 0 }, reference: { sec: 45, w: 0, done: true } })
    expect(s).toEqual({ sec: 50 })
  })
  it('leaves cardio alone — the engine has no overload rule for it', () => {
    expect(suggestionFor({ mode: 'cardio', row: { min: 20, speed: 8 }, reference: { min: 25, speed: 9, done: true } })).toBe(null)
  })
  it('has nothing to suggest with neither a plan nor history', () => {
    expect(suggestionFor({ row: work(0, 0), reference: null })).toBe(null)
  })
})

describe('extraSetsWanted', () => {
  it('asks for the set a bodyweight progression decided to add', () => {
    expect(extraSetsWanted({ kind: 'up', sets: 4 }, [work(0, 10), work(0, 10), work(0, 10)], [])).toBe(1)
  })
  it('falls back to last session’s set count when the plan has no opinion', () => {
    expect(extraSetsWanted(null, [work(60, 10), work(60, 10)], [work(60, 10, true), work(60, 10, true), work(60, 9, true)])).toBe(1)
  })
  it('stays quiet when the list already has the sets', () => {
    expect(extraSetsWanted({ sets: 3 }, [work(60, 10), work(60, 10), work(60, 10)], [])).toBe(0)
    expect(extraSetsWanted(null, [work(60, 10), work(60, 10)], [work(60, 10, true)])).toBe(0)
  })
  it('does not count warm-ups on either side', () => {
    expect(extraSetsWanted(null, [warm(30, 5), work(60, 10)], [warm(30, 5), work(60, 10, true), work(60, 10, true)])).toBe(1)
  })
})

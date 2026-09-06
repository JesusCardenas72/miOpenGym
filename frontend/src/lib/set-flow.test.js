import { describe, it, expect } from 'vitest'
import { supersetUnits } from './history.js'
import { setSteps, stepIndexOf, roundsIn, firstUnfinishedRound } from './set-flow.js'

const sets = (n, done = 0) => Array.from({ length: n }, (_, i) => ({ w: 20, r: 5, done: i < done }))
const ex = (n, done) => ({ id: '1', sets: sets(n, done) })
// `sg` is what pairs two neighbouring entries into a superset.
const paired = (n, done, sg = 'a') => ({ id: '2', sg, sets: sets(n, done) })

describe('setSteps', () => {
  it('walks a plain exercise one set at a time, then on to the next exercise', () => {
    const entries = [ex(2), ex(1)]
    const steps = setSteps(entries, supersetUnits(entries))
    expect(steps).toEqual([
      { unit: 0, round: 0, rows: [{ entry: 0, set: 0 }] },
      { unit: 0, round: 1, rows: [{ entry: 0, set: 1 }] },
      { unit: 1, round: 0, rows: [{ entry: 1, set: 0 }] },
    ])
  })

  // The point of the superset rule: two linked exercises are done back to back, so their
  // matching sets are one screen — you should not have to swipe between them mid-round.
  it('puts a superset round on one screen, whichever exercise it belongs to', () => {
    const entries = [paired(2), paired(2)]
    const steps = setSteps(entries, supersetUnits(entries))
    expect(steps).toHaveLength(2)
    expect(steps[0].rows).toEqual([{ entry: 0, set: 0 }, { entry: 1, set: 0 }])
    expect(steps[1].rows).toEqual([{ entry: 0, set: 1 }, { entry: 1, set: 1 }])
  })

  it('lets an uneven superset run on with only the member that has sets left', () => {
    const entries = [paired(3), paired(1)]
    const steps = setSteps(entries, supersetUnits(entries))
    expect(steps).toHaveLength(3)
    expect(steps[0].rows).toHaveLength(2)
    expect(steps[1].rows).toEqual([{ entry: 0, set: 1 }])
    expect(steps[2].rows).toEqual([{ entry: 0, set: 2 }])
  })

  // Otherwise an exercise whose last set was just deleted could not be reached to add one.
  it('still gives an exercise with no sets a screen of its own', () => {
    const entries = [{ id: '1', sets: [] }]
    expect(setSteps(entries, supersetUnits(entries))).toEqual([{ unit: 0, round: 0, rows: [] }])
  })

  it('has nothing to walk through without a session', () => {
    expect(setSteps([], [])).toEqual([])
    expect(setSteps(undefined, undefined)).toEqual([])
  })
})

describe('stepIndexOf', () => {
  it('finds the screen a group and round land on', () => {
    const entries = [ex(2), ex(2)]
    const steps = setSteps(entries, supersetUnits(entries))
    expect(stepIndexOf(steps, 0, 1)).toBe(1)
    expect(stepIndexOf(steps, 1, 0)).toBe(2)
    expect(stepIndexOf(steps, 1, 5)).toBe(-1)
  })
})

describe('roundsIn', () => {
  it('counts the longest member, so an uneven superset runs to its end', () => {
    const entries = [paired(3), paired(1)]
    expect(roundsIn(entries, [0, 1])).toBe(3)
    expect(roundsIn(entries, [1])).toBe(1)
    expect(roundsIn(entries, [])).toBe(0)
  })
})

describe('firstUnfinishedRound', () => {
  it('opens a group on the round still to be done', () => {
    const entries = [ex(3, 2)]
    expect(firstUnfinishedRound(entries, [0])).toBe(2)
  })
  it('counts a superset round as done only when every member of it is', () => {
    const entries = [paired(2, 2), paired(2, 1)]
    expect(firstUnfinishedRound(entries, [0, 1])).toBe(1)
  })
  // A finished group is behind you; its last round is where a set you might want to fix is.
  it('lands on the last round when everything is done', () => {
    const entries = [ex(3, 3)]
    expect(firstUnfinishedRound(entries, [0])).toBe(2)
  })
  it('is the first round when there is nothing at all', () => {
    expect(firstUnfinishedRound([{ id: '1', sets: [] }], [0])).toBe(0)
  })
})

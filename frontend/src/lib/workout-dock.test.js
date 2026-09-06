import { describe, it, expect } from 'vitest'
import { dockItems, unitDone, dropSlot, hashSg, SUPERSET_HUES } from './workout-dock.js'

const set = done => ({ w: 20, r: 5, done })
const entry = (id, sg, done = [false]) => ({ id, ...(sg ? { sg } : {}), sets: done.map(set) })

describe('dockItems', () => {
  it('gives one item per exercise, in session order', () => {
    const items = dockItems([entry('a'), entry('b'), entry('c')])
    expect(items.map(i => i.indices)).toEqual([[0], [1], [2]])
    expect(items.map(i => i.position)).toEqual([0, 1, 2])
    expect(items.every(i => i.sg === null && i.hue === null)).toBe(true)
  })

  it('folds a superset into one item carrying both exercises', () => {
    const items = dockItems([entry('a'), entry('b', 'sg-1-2'), entry('c', 'sg-1-2'), entry('d')])
    expect(items.map(i => i.indices)).toEqual([[0], [1, 2], [3]])
    expect(items[1].sg).toBe('sg-1-2')
    expect(SUPERSET_HUES).toContain(items[1].hue)
  })

  it('never gives two supersets in one session the same colour', () => {
    const items = dockItems([
      entry('a', 'sg-0-1'), entry('b', 'sg-0-1'),
      entry('c', 'sg-2-3'), entry('d', 'sg-2-3'),
      entry('e', 'sg-4-5'), entry('f', 'sg-4-5'),
    ])
    const hues = items.map(i => i.hue)
    expect(hues).toHaveLength(3)
    expect(new Set(hues).size).toBe(3)
  })

  it('keeps a group on its colour and varies the palette between sessions', () => {
    const one = dockItems([entry('a', 'sg-0-1'), entry('b', 'sg-0-1')])
    expect(dockItems([entry('a', 'sg-0-1'), entry('b', 'sg-0-1')])[0].hue).toBe(one[0].hue)
    // a session whose first group has a different id opens on a different colour
    const other = dockItems([entry('a', 'sg-3-4'), entry('b', 'sg-3-4')])
    expect(other[0].hue).not.toBe(one[0].hue)
  })

  it('marks a unit done only when every set of every member is checked off', () => {
    const items = dockItems([
      entry('a', null, [true, true]),
      entry('b', null, [true, false]),
      entry('c', 'sg', [true]), entry('d', 'sg', [false]),
    ])
    expect(items.map(i => i.done)).toEqual([true, false, false])
  })

  it('survives an empty or missing session', () => {
    expect(dockItems([])).toEqual([])
    expect(dockItems(undefined)).toEqual([])
  })
})

describe('unitDone', () => {
  it('is false for a unit with no sets at all', () => {
    expect(unitDone([{ id: 'a', sets: [] }], [0])).toBe(false)
  })
})

describe('hashSg', () => {
  it('is stable and stays a usable palette index', () => {
    expect(hashSg('sg-0-1')).toBe(hashSg('sg-0-1'))
    expect(hashSg('sg-0-1') % SUPERSET_HUES.length).toBeGreaterThanOrEqual(0)
  })
})

describe('dropSlot', () => {
  it('counts the units the pointer has passed', () => {
    const centers = [50, 150, 250]
    expect(dropSlot(centers, 10)).toBe(0)
    expect(dropSlot(centers, 100)).toBe(1)
    expect(dropSlot(centers, 200)).toBe(2)
    expect(dropSlot(centers, 900)).toBe(3)
  })

  it('has one slot when everything else was lifted out', () => {
    expect(dropSlot([], 123)).toBe(0)
  })
})

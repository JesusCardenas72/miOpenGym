// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'

vi.mock('../lib/sound.js', () => ({
  beep: vi.fn(), vibrate: vi.fn(), playClips: vi.fn(), stopClips: vi.fn(),
  clipsDuration: vi.fn(() => Promise.resolve(0)),
}))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = value => JSON.parse(JSON.stringify(value))

let root
let container

// Last session: three sets at 60, the last one a rep short.
const lastSession = {
  id: 'w1', d: '2026-08-04', entries: [{
    id: 'a', target: { sets: 3, reps: 10 },
    sets: [{ w: 60, r: 10, done: true }, { w: 60, r: 10, done: true }, { w: 60, r: 9, done: true }],
  }],
}

function renderWorkout({ sets = 3, plan = null, workouts = [lastSession], rows = null } = {}) {
  const S = clone(DEF)
  S.workouts = clone(workouts)
  S.active = {
    id: 'ref-test', d: '2026-08-11', start: Date.now(), routineId: null,
    name: 'Reference test', bw: null, cur: 0,
    entries: [{
      id: 'a', target: { sets, reps: 10 }, plan: plan ? clone(plan) : undefined,
      sets: rows ? clone(rows) : Array.from({ length: sets }, () => ({ w: 60, r: 10, done: false })),
    }],
  }
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Workout /></MemoryRouter>))
}

const prevLine = () => container.querySelector('.setprev')
const applyChip = () => prevLine()?.querySelector('.chip.add')
const activeSets = () => useStore.getState().S.active.entries[0].sets
const click = node => act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))

beforeEach(() => {
  localStorage.clear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
  useStore.setState({ S: clone(DEF), user: null })
  root = null
  container = null
})

afterEach(() => {
  if (root) act(() => root.unmount())
  if (container) container.remove()
})

describe('per-set reference in the running workout', () => {
  it('shows what the same set position did last session', () => {
    renderWorkout()
    expect(prevLine().textContent).toContain('60×10')
  })

  it('offers the progression’s number as a chip, and writes it into the row when tapped', () => {
    renderWorkout({ plan: { policy: 'linear', kind: 'up', weight: 62.5, why: ['Every rep last time — {0} {1} more.', 2.5, 'kg'] } })
    expect(applyChip().textContent).toContain('62.5×10')
    click(applyChip())
    // The weight cascades down the phase the same way typing it into the stepper does, so the
    // whole exercise moves up together rather than one row at a time.
    expect(activeSets().map(s => s.w)).toEqual([62.5, 62.5, 62.5])
  })

  it('offers last time’s numbers when the exercise has no progression plan', () => {
    renderWorkout({ plan: null, rows: [{ w: 0, r: 0, done: false }] })
    expect(applyChip().textContent).toContain('60×10')
    click(applyChip())
    expect(activeSets()[0]).toMatchObject({ w: 60, r: 10 })
  })

  it('says nothing to apply once the row already carries the target', () => {
    renderWorkout({ plan: { policy: 'linear', kind: 'hold', weight: 60, why: ['x'] } })
    expect(prevLine().textContent).toContain('60×10')
    expect(applyChip()).toBe(null)
  })

  it('has no reference line for an exercise never trained before', () => {
    renderWorkout({ workouts: [] })
    expect(prevLine()).toBe(null)
  })

  it('offers the extra set a progression asked for, and adds it when tapped', () => {
    renderWorkout({ sets: 3, plan: { policy: 'double', kind: 'up', weight: 60, reps: 10, sets: 4, why: ['x'] } })
    const chip = [...container.querySelectorAll('.setextra .chip.add')].find(c => /Add set/.test(c.textContent))
    expect(chip).toBeTruthy()
    click(chip)
    expect(activeSets()).toHaveLength(4)
  })
})

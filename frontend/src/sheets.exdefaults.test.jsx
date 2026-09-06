// @vitest-environment happy-dom
// The exercise-config sheet's half of the global/local split. The rules themselves are unit
// tested in lib/exercise-defaults.test.js; what is checked here is the wiring: a new instance
// really does start from what the exercise was given elsewhere, and a change to one of those
// values cannot get past the sheet without being shown and accepted.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { EXDB } from './lib/exercises.js'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { exConfigSheet } from './sheets.jsx'

const ex = EXDB.find(e => e.id === '0009')
const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

const stepper = (host, label) => [...host.querySelectorAll('.stp-w')]
  .find(el => el.querySelector('.stp-l')?.textContent === label)

const value = (host, label) => stepper(host, label)?.querySelector('input').value

const button = (host, re) => [...host.querySelectorAll('button')]
  .find(b => re.test(b.textContent.trim()))

const bump = (host, label, dir) => act(() => {
  stepper(host, label).querySelectorAll('button')[dir === 'up' ? 1 : 0].click()
})

describe('exercise config: fields that belong to the exercise', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    useUI.setState({ sheets: [] })
    useStore.setState(s => ({ S: { ...s.S, unit: 'kg', exDefaults: {} } }))
    document.body.innerHTML = ''
  })

  afterEach(() => {
    act(() => { mounted.splice(0).forEach(root => root.unmount()) })
  })

  it('starts a new instance from what the exercise was given in another routine', () => {
    useStore.setState(s => ({ S: { ...s.S, exDefaults: { [ex.id]: { reps: 6, restSec: 180, bodyweight: false } } } }))
    exConfigSheet(ex, null, vi.fn())
    const host = renderTop()
    expect(value(host, 'Reps')).toBe('6')
    expect(value(host, 'Rest (s)')).toBe('180')
    // Sets is the routine's own business — it comes from the dataset default, not from
    // whatever the last routine happened to ask for.
    expect(value(host, 'Sets')).toBe('3')
  })

  it('marks the exercise-wide fields, and only those, in their own colour', () => {
    exConfigSheet(ex, null, vi.fn())
    const host = renderTop()
    expect(stepper(host, 'Reps').querySelector('.stp').className).toContain('gfield')
    expect(stepper(host, 'Rest (s)').querySelector('.stp').className).toContain('gfield')
    expect(stepper(host, 'Sets').querySelector('.stp').className).not.toContain('gfield')
    expect(host.querySelector('.gfield-key')).toBeTruthy()
  })

  it('saves a first configuration straight through — there is nothing to overwrite yet', () => {
    const onSave = vi.fn()
    exConfigSheet(ex, null, onSave)
    const host = renderTop()
    act(() => { button(host, /^add to routine$/i).click() })
    expect(onSave).toHaveBeenCalledOnce()
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(useStore.getState().S.exDefaults[ex.id]).toMatchObject({ reps: 10 })
  })

  it('saves a routine-local change without asking', () => {
    useStore.setState(s => ({ S: { ...s.S, exDefaults: { [ex.id]: { reps: 10, bodyweight: false } } } }))
    const onSave = vi.fn()
    exConfigSheet(ex, { sets: 3, reps: 10, weight: 0, mode: 'reps' }, onSave)
    const host = renderTop()
    bump(host, 'Sets', 'up')
    act(() => { button(host, /^save$/i).click() })
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sets: 4, reps: 10 }))
    expect(useUI.getState().sheets).toHaveLength(0)
  })

  it('asks before rewriting a value every routine shares, and cancelling changes nothing', () => {
    useStore.setState(s => ({ S: { ...s.S, exDefaults: { [ex.id]: { reps: 10, bodyweight: false } } } }))
    const onSave = vi.fn()
    exConfigSheet(ex, { sets: 3, reps: 10, weight: 0, mode: 'reps' }, onSave)
    const host = renderTop()
    bump(host, 'Reps', 'up')
    act(() => { button(host, /^save$/i).click() })

    // The config sheet stays open underneath, so a change can be corrected rather than retyped.
    expect(useUI.getState().sheets).toHaveLength(2)
    expect(onSave).not.toHaveBeenCalled()
    const dialog = renderTop()
    expect(dialog.textContent).toContain('Change this for every routine?')
    expect(dialog.querySelector('.gfield-diff').textContent).toContain('10 → 11')

    act(() => { button(dialog, /^cancel$/i).click() })
    expect(onSave).not.toHaveBeenCalled()
    expect(useStore.getState().S.exDefaults[ex.id].reps).toBe(10)
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('accepting writes the value for every routine and saves this one', () => {
    useStore.setState(s => ({ S: { ...s.S, exDefaults: { [ex.id]: { reps: 10, bodyweight: false } } } }))
    const onSave = vi.fn()
    exConfigSheet(ex, { sets: 3, reps: 10, weight: 0, mode: 'reps' }, onSave)
    const host = renderTop()
    bump(host, 'Reps', 'up')
    act(() => { button(host, /^save$/i).click() })
    const dialog = renderTop()
    act(() => { button(dialog, /^accept$/i).click() })

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reps: 11 }))
    expect(useStore.getState().S.exDefaults[ex.id].reps).toBe(11)
    expect(useUI.getState().sheets).toHaveLength(0)
  })
})

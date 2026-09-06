import { describe, it, expect } from 'vitest'
import { TAB_ROUTES, tabIndexOf, neighbourTab, screenDirection } from './screen-nav.js'

describe('tabIndexOf', () => {
  it('places each tab at its position in the bar', () => {
    expect(TAB_ROUTES.map(tabIndexOf)).toEqual([0, 1, 2, 3])
  })
  it('counts a sub-page as the tab it was reached from', () => {
    expect(tabIndexOf('/plan/r/abc')).toBe(1)
  })
  it('is -1 for anything the bar does not own', () => {
    expect(tabIndexOf('/workout')).toBe(-1)
    expect(tabIndexOf('/settings')).toBe(-1)
    expect(tabIndexOf('/')).toBe(-1)
    expect(tabIndexOf('')).toBe(-1)
    expect(tabIndexOf(undefined)).toBe(-1)
  })
})

describe('neighbourTab', () => {
  it('walks along the bar in the order it is drawn', () => {
    expect(neighbourTab('/home', 1)).toBe('/plan')
    expect(neighbourTab('/plan', -1)).toBe('/home')
    expect(neighbourTab('/stats', 1)).toBe('/library')
  })
  it('stops at both ends rather than wrapping round', () => {
    expect(neighbourTab('/home', -1)).toBe(null)
    expect(neighbourTab('/library', 1)).toBe(null)
  })
  // A routine half-edited is a level down, not a neighbour: paging sideways out of it is
  // never what the finger meant.
  it('refuses to swipe away from a sub-page or a screen outside the bar', () => {
    expect(neighbourTab('/plan/r/abc', 1)).toBe(null)
    expect(neighbourTab('/workout', 1)).toBe(null)
  })
  it('is nothing at all without a direction', () => {
    expect(neighbourTab('/home', 0)).toBe(null)
  })
})

describe('screenDirection', () => {
  it('follows the bar between two tabs, whichever way the navigation came', () => {
    expect(screenDirection('/home', '/library', false)).toBe(1)
    expect(screenDirection('/library', '/home', true)).toBe(-1)
  })
  // Anywhere else the slide reads as depth rather than as position in a row.
  it('enters from the right going deeper and from the left coming back', () => {
    expect(screenDirection('/plan', '/plan/r/1', false)).toBe(1)
    expect(screenDirection('/plan/r/1', '/plan', true)).toBe(-1)
    expect(screenDirection('/home', '/workout', false)).toBe(1)
    expect(screenDirection('/workout', '/home', true)).toBe(-1)
  })
})

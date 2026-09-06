import { describe, it, expect } from 'vitest'
import { dragOffsets, settlePlan, edgeOffset, EDGE_MAX } from './slide.js'

const W = 400

describe('dragOffsets', () => {
  it('moves both screens together, the neighbour a screen away from the current one', () => {
    // Dragging left (dx < 0) towards the next screen: it waits off the right border.
    expect(dragOffsets({ current: 'a', peek: 'b', dir: 1, dx: -120 }, W)).toEqual({ a: -120, b: 280 })
    // And the previous one waits off the left border.
    expect(dragOffsets({ current: 'a', peek: 'b', dir: -1, dx: 120 }, W)).toEqual({ a: 120, b: -280 })
  })
  it('is one screen at rest, and one while a drag has nowhere to go', () => {
    expect(dragOffsets({ current: 'a', peek: null, dir: 0, dx: 0 }, W)).toEqual({ a: 0 })
    expect(dragOffsets({ current: 'a', peek: null, dir: 1, dx: -30 }, W)).toEqual({ a: -30 })
  })
})

describe('settlePlan', () => {
  const dragged = { current: 'a', peek: 'b', dir: 1, offsets: { a: -120, b: 280 } }

  it('carries a committed swipe on from where the finger let go', () => {
    // Not from the border: picking up mid-drag is what makes it one movement, not two.
    expect(settlePlan(dragged, 'b', 0, W)).toEqual([
      { id: 'a', from: -120, to: -W },
      { id: 'b', from: 280, to: 0 },
    ])
  })

  it('sends the neighbour back and the current screen home when the drag is cancelled', () => {
    expect(settlePlan(dragged, 'a', 0, W)).toEqual([
      { id: 'a', from: -120, to: 0 },
      { id: 'b', from: 280, to: W },
    ])
  })

  it('starts a gestureless navigation at the border, using the direction it is given', () => {
    const idle = { current: 'a', peek: null, dir: 0, offsets: { a: 0 } }
    expect(settlePlan(idle, 'b', 1, W)).toEqual([
      { id: 'a', from: 0, to: -W },
      { id: 'b', from: W, to: 0 },
    ])
    expect(settlePlan(idle, 'b', -1, W)).toEqual([
      { id: 'a', from: 0, to: W },
      { id: 'b', from: -W, to: 0 },
    ])
  })

  it('has nothing to animate when nothing moved', () => {
    const idle = { current: 'a', peek: null, dir: 0, offsets: { a: 0 } }
    expect(settlePlan(idle, 'a', 1, W)).toBe(null)   // still on the same screen
    expect(settlePlan(idle, 'b', 0, W)).toBe(null)   // no direction to travel in
  })

  // A drag that never left the resting position, released: there is no distance to cover, and
  // animating zero would still cost a frame of the outgoing layer sitting on top.
  it('has nothing to animate when a cancelled drag never moved', () => {
    const still = { current: 'a', peek: 'b', dir: 1, offsets: { a: 0, b: W } }
    expect(settlePlan(still, 'a', 0, W)).toBe(null)
  })
})

describe('edgeOffset', () => {
  it('follows the finger a fraction of the way at the end of the row', () => {
    expect(edgeOffset(100)).toBeCloseTo(30, 5)
    expect(edgeOffset(-100)).toBeCloseTo(-30, 5)
  })
  it('stops well short of uncovering the page, however hard it is pulled', () => {
    expect(edgeOffset(10000)).toBe(EDGE_MAX)
    expect(edgeOffset(-10000)).toBe(-EDGE_MAX)
  })
})

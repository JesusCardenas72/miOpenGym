// @vitest-environment happy-dom
// useUI pulls in api.js, which reads navigator.userAgent at module scope.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { useUI } from './useUI.js'
import { useStore } from './useStore.js'
import { beep, clipsDuration, playClips, stopClips } from '../lib/sound.js'

vi.mock('../lib/sound.js', () => ({
  beep: vi.fn(), vibrate: vi.fn(), playClips: vi.fn(), stopClips: vi.fn(),
  clipsDuration: vi.fn(() => Promise.resolve(0)), setAudioFocusHooks: vi.fn(), forgetClip: vi.fn(),
}))

// "Off" has to hold at the timer itself, not at the four places that start one — the same
// reason the rest-after-a-set rule is a shared condition rather than four copies.
describe('rest timer set to Off', () => {
  beforeEach(() => { vi.useFakeTimers(); useUI.setState({ timer: null }) })
  afterEach(() => { useUI.getState().stopRest(); vi.useRealTimers() })

  it('starts nothing', () => {
    useUI.getState().startRest(0)
    expect(useUI.getState().timer).toBe(null)
  })

  it('stops a rest that is already running', () => {
    useUI.getState().startRest(90)
    expect(useUI.getState().timer).not.toBe(null)
    useUI.getState().startRest(0)
    expect(useUI.getState().timer).toBe(null)
  })

  it('still runs for a real duration', () => {
    useUI.getState().startRest(90)
    expect(useUI.getState().timer.total).toBe(90)
  })
})

// The alert has to LAND on zero, not start there: it is the end of the bell that marks the end
// of the rest. That makes its start time a function of how long the clips run, which is the one
// thing here that can be silently wrong — the sound still plays, just in the wrong place.
describe('rest alert lands on the end of the rest', () => {
  const CLIP_SECONDS = 14
  let originalSettings

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(clipsDuration).mockResolvedValue(CLIP_SECONDS)
    vi.mocked(playClips).mockClear()
    vi.mocked(stopClips).mockClear()
    vi.mocked(beep).mockClear()
    originalSettings = useStore.getState().S
    useStore.setState({ S: { ...originalSettings, sound: true } })
    useUI.setState({ timer: null })
  })
  afterEach(() => {
    useUI.getState().stopRest()
    useStore.setState({ S: originalSettings })
    vi.useRealTimers()
  })

  it('starts the clips exactly their own length before the rest ends', async () => {
    useUI.getState().startRest(90)
    await vi.advanceTimersByTimeAsync(0)          // let the duration lookup resolve

    await vi.advanceTimersByTimeAsync((90 - CLIP_SECONDS) * 1000 - 1)
    expect(playClips).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(playClips).toHaveBeenCalledTimes(1)
    expect(playClips.mock.calls[0][0]).toBe(true)  // gated on the sound setting
    expect(playClips.mock.calls[0][1]).toHaveLength(1)
  })

  it('does not start it again when the countdown reaches zero', async () => {
    useUI.getState().startRest(90)
    await vi.advanceTimersByTimeAsync(90_000)
    expect(playClips).toHaveBeenCalledTimes(1)
    expect(useUI.getState().timer).toBe(null)
  })

  it('no longer beeps through the last seconds of a rest', async () => {
    useUI.getState().startRest(20)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(beep).not.toHaveBeenCalled()
  })

  it('fires immediately when the rest is shorter than the clips', async () => {
    useUI.getState().startRest(5)
    await vi.advanceTimersByTimeAsync(0)
    expect(playClips).toHaveBeenCalledTimes(1)
  })

  it('respects a mute that happened after the rest started', async () => {
    useUI.getState().startRest(90)
    await vi.advanceTimersByTimeAsync(0)
    useStore.setState({ S: { ...useStore.getState().S, sound: false } })
    await vi.advanceTimersByTimeAsync((90 - CLIP_SECONDS) * 1000)
    expect(playClips.mock.calls[0][0]).toBe(false)
  })

  it('skipping a rest before the alert begins cancels it', async () => {
    useUI.getState().startRest(90)
    await vi.advanceTimersByTimeAsync(0)
    useUI.getState().stopRest()
    await vi.advanceTimersByTimeAsync(90_000)
    expect(playClips).not.toHaveBeenCalled()
  })

  it('re-times the alert when the rest is extended', async () => {
    useUI.getState().startRest(90)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(60_000)     // 30s left, alert not due yet
    expect(playClips).not.toHaveBeenCalled()

    useUI.getState().addRest(30)                  // 60s left now
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync((60 - CLIP_SECONDS) * 1000 - 1)
    expect(playClips).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(playClips).toHaveBeenCalledTimes(1)
  })
})

describe('opt-in timer screen flash', () => {
  let originalSettings

  beforeEach(() => {
    vi.useFakeTimers()
    originalSettings = useStore.getState().S
    useStore.setState({ S: { ...originalSettings, sound: false, timerFlash: false } })
    useUI.setState({ timer: null, work: null, timerFlashId: 0 })
  })

  afterEach(() => {
    useUI.getState().stopRest()
    useUI.getState().stopWork()
    useStore.setState({ S: originalSettings })
    vi.useRealTimers()
  })

  it('stays off unless enabled in Settings', () => {
    useUI.getState().startRest(1)
    vi.advanceTimersByTime(1000)
    expect(useUI.getState().timerFlashId).toBe(0)
  })

  it('flashes when the rest timer finishes', () => {
    useStore.setState({ S: { ...useStore.getState().S, timerFlash: true } })
    useUI.getState().startRest(1)
    vi.advanceTimersByTime(1000)
    expect(useUI.getState().timerFlashId).toBe(1)
  })

  it('flashes when a timed exercise finishes', () => {
    useStore.setState({ S: { ...useStore.getState().S, timerFlash: true } })
    useUI.getState().startWork(1, 'Plank', vi.fn())
    vi.advanceTimersByTime(1000)
    expect(useUI.getState().timerFlashId).toBe(1)
  })
})

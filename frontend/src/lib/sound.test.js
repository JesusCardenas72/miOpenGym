// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { clipsDuration, playClips, stopClips } from './sound.js'

// A stand-in for HTMLAudioElement: records what was asked of it and lets a test decide when a
// clip "ends", how long it claims to be, or whether play() is refused (the autoplay case).
class FakeAudio {
  constructor(src) {
    this.src = src
    this.paused = true
    this.currentTime = 0
    this.onended = null
    this.playCalls = 0
    this.refuse = FakeAudio.refuse.has(src)
    this.listeners = {}
    // readyState 1 (HAVE_METADATA) means clipsDuration can read the length without waiting.
    this.duration = FakeAudio.durations.get(src) ?? 0
    this.readyState = this.duration > 0 ? 1 : 0
    FakeAudio.made.push(this)
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn) }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn)
  }
  emit(type) { (this.listeners[type] || []).slice().forEach(fn => fn()) }
  play() {
    this.playCalls++
    if (this.refuse) return Promise.reject(new Error('blocked'))
    this.paused = false
    return Promise.resolve()
  }
  pause() { this.paused = true }
  end() { this.onended?.() }
}
FakeAudio.made = []
FakeAudio.refuse = new Set()
FakeAudio.durations = new Map()

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const madeFor = src => FakeAudio.made.filter(a => a.src === src)

// sound.js caches one element per source for the lifetime of the module — that reuse is the
// point (it preloads the alert), but it means a source name used in one test would not create
// a new element in the next. Every test therefore works on its own source names.
let n = 0
const srcs = (...names) => names.map(name => `t${n}-${name}.mp3`)

describe('playClips', () => {
  beforeEach(() => {
    n++
    FakeAudio.made = []
    FakeAudio.refuse = new Set()
    FakeAudio.durations = new Map()
    vi.stubGlobal('Audio', FakeAudio)
  })
  afterEach(() => {
    stopClips()
    vi.unstubAllGlobals()
  })

  test('plays the sequence one clip at a time, each starting when the last ends', async () => {
    const [a, b] = srcs('a', 'b')
    playClips(true, [a, b])
    expect(FakeAudio.made).toHaveLength(1)
    expect(FakeAudio.made[0].src).toBe(a)

    FakeAudio.made[0].end()
    await settle()
    expect(FakeAudio.made).toHaveLength(2)
    expect(FakeAudio.made[1].src).toBe(b)
  })

  test('plays nothing when sound is off', () => {
    playClips(false, srcs('a', 'b'))
    expect(FakeAudio.made).toHaveLength(0)
  })

  test('tolerates an empty or missing source list', () => {
    playClips(true, [])
    playClips(true, undefined)
    playClips(true, [null, ''])
    expect(FakeAudio.made).toHaveLength(0)
  })

  test('advances past a clip the browser refuses to play', async () => {
    // The autoplay policy rejects play() on the first clip; the bell must still ring.
    const [a, b] = srcs('a', 'b')
    FakeAudio.refuse.add(a)
    playClips(true, [a, b])
    await settle()
    expect(madeFor(b)).toHaveLength(1)
  })

  test('stopClips silences the sequence and prevents the next clip', async () => {
    const [a, b] = srcs('a', 'b')
    playClips(true, [a, b])
    const first = FakeAudio.made[0]
    stopClips()
    expect(first.paused).toBe(true)
    expect(first.currentTime).toBe(0)

    // An 'ended' event that arrives after the cancel must not start the second clip.
    first.end()
    await settle()
    expect(madeFor(b)).toHaveLength(0)
  })

  test('a new sequence cancels the one still playing', async () => {
    const [a, b, c] = srcs('a', 'b', 'c')
    playClips(true, [a, b])
    const first = FakeAudio.made[0]
    playClips(true, [c])
    expect(first.paused).toBe(true)

    first.end()
    await settle()
    expect(madeFor(b)).toHaveLength(0)
    expect(madeFor(c)).toHaveLength(1)
  })

  test('reuses one element per source instead of refetching it every rest', async () => {
    const [a] = srcs('a')
    playClips(true, [a])
    const first = FakeAudio.made[0]
    first.end()
    await settle()

    playClips(true, [a])
    expect(madeFor(a)).toHaveLength(1)   // same element, played a second time
    expect(first.playCalls).toBe(2)
  })
})

// The rest alert is scheduled to *finish* as the rest hits zero, so its total length is what
// decides when it starts. Getting this wrong is silent — the sound just lands in the wrong
// place — so the arithmetic is pinned here rather than left to the caller.
describe('clipsDuration', () => {
  beforeEach(() => {
    n++
    FakeAudio.made = []
    FakeAudio.refuse = new Set()
    FakeAudio.durations = new Map()
    vi.stubGlobal('Audio', FakeAudio)
  })
  afterEach(() => {
    stopClips()
    vi.unstubAllGlobals()
  })

  test('adds up every clip in the sequence', async () => {
    const [a, b] = srcs('a', 'b')
    FakeAudio.durations.set(a, 5.71)
    FakeAudio.durations.set(b, 8.25)
    await expect(clipsDuration([a, b])).resolves.toBeCloseTo(13.96, 5)
  })

  test('is zero for an empty or missing sequence', async () => {
    await expect(clipsDuration([])).resolves.toBe(0)
    await expect(clipsDuration(undefined)).resolves.toBe(0)
    await expect(clipsDuration([null, ''])).resolves.toBe(0)
  })

  test('waits for metadata that has not arrived yet', async () => {
    const [a] = srcs('a')
    const pending = clipsDuration([a])
    await settle()
    const el = FakeAudio.made[0]
    expect(el.readyState).toBe(0)          // nothing to read at the time of the call
    el.duration = 4.5
    el.emit('loadedmetadata')
    await expect(pending).resolves.toBe(4.5)
  })

  // A clip that fails contributes 0, which makes the caller fall back to firing on zero rather
  // than leaving the rest with no alert at all.
  test('counts a clip that fails to load as zero', async () => {
    const [a, b] = srcs('a', 'b')
    FakeAudio.durations.set(b, 3)
    const pending = clipsDuration([a, b])
    await settle()
    FakeAudio.made[0].emit('error')
    await expect(pending).resolves.toBe(3)
  })
})

// WebAudio beeps + haptics (ported from the vanilla app). `enabled` gates sound.
let audioCtx = null
export function beep(enabled, freq, dur, when) {
  if (!enabled) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    o.frequency.value = freq || 880; o.type = 'sine'
    const t0 = audioCtx.currentTime + (when || 0)
    g.gain.setValueAtTime(0.001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18))
    o.start(t0); o.stop(t0 + (dur || 0.18) + 0.05)
  } catch (e) { /* */ }
}
export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p) } catch (e) { /* */ } }

/* ---- sample playback (rest-over alert) ----
   Recorded clips rather than the oscillator above, played one after another. HTMLAudioElement
   is the right tool here and WebAudio is not: these are long files that only ever play back to
   back, so none of the sample-accurate scheduling `beep` needs applies — and an <audio> element
   keeps its own decoded buffer, so replaying costs nothing after the first time.

   One element per source is cached and reused, which doubles as the preload: the second rest of
   a session starts its alert instantly instead of waiting on the network. */
const clipCache = new Map()
let playing = null

function clipFor(src) {
  let el = clipCache.get(src)
  if (!el) {
    el = new Audio(src)
    el.preload = 'auto'
    clipCache.set(src, el)
  }
  return el
}

/* How long a clip runs, in seconds, once the browser has read its metadata. Measured rather
   than hardcoded: the alert is scheduled to *finish* as the rest hits zero, so swapping either
   file for a longer or shorter one has to move the start automatically. Resolves 0 for a clip
   that will not load, and gives up after METADATA_TIMEOUT_MS so a stalled request can never
   leave a rest with no alert at all — a 0 makes the caller fall back to firing at zero. */
const METADATA_TIMEOUT_MS = 3000

function durationOf(el) {
  return new Promise(resolve => {
    if (el.readyState >= 1 && el.duration > 0) { resolve(el.duration); return }
    let settled = false
    const finish = value => {
      if (settled) return
      settled = true
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('error', onError)
      resolve(value)
    }
    const onLoaded = () => finish(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0)
    const onError = () => finish(0)
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('error', onError)
    setTimeout(() => finish(0), METADATA_TIMEOUT_MS)
  })
}

/** Total seconds `playClips(sources)` will run for. 0 when nothing is playable. */
export async function clipsDuration(sources) {
  const queue = (sources || []).filter(Boolean)
  if (!queue.length) return 0
  let total = 0
  for (const src of queue) {
    let el
    try { el = clipFor(src) } catch (e) { return 0 }
    total += await durationOf(el)
  }
  return total
}

/** Stop whatever sequence is mid-flight. A rest that ends must not ring into the next set. */
export function stopClips() {
  const cur = playing
  playing = null
  if (!cur || !cur.el) return
  try { cur.el.pause(); cur.el.currentTime = 0 } catch (e) { /* */ }
}

/**
 * Play `sources` in order, each starting when the previous one ends. `enabled` gates it the
 * same way it gates `beep`. Returns immediately — playback is asynchronous.
 *
 * A clip the browser refuses to play (autoplay policy, decode failure, missing file) advances
 * to the next one rather than stranding the rest of the sequence in silence.
 */
export function playClips(enabled, sources) {
  stopClips()
  if (!enabled) return
  const queue = (sources || []).filter(Boolean)
  if (!queue.length) return
  // Identity token: a sequence started later must be able to tell that this one is stale,
  // since an 'ended' handler can outlive the stopClips() that cancelled it.
  const token = { el: null }
  playing = token
  const step = i => {
    if (playing !== token || i >= queue.length) return
    let el
    try { el = clipFor(queue[i]) } catch (e) { return }
    token.el = el
    el.onended = () => { if (playing === token) step(i + 1) }
    try {
      el.currentTime = 0
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => step(i + 1))
    } catch (e) { step(i + 1) }
  }
  step(0)
}

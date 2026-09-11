/* ---- the rest-end sound ----
   The bundled boxing bell, or an audio file the user picked from their own device.

   The picked file lives in IndexedDB on this device, not in S: S is localStorage-backed (a few
   MB for everything), exported as a JSON backup and PUT to the server on every change, and a
   song clip has no business in any of those. The price is that the choice is per device, which
   is also true of the file itself — it came from this phone's storage.

   Stored as an ArrayBuffer plus its type rather than as a File/Blob: older WebKit could not keep
   Blobs in IndexedDB, and bytes round-trip everywhere. */
import { clipsDuration, forgetClip } from './sound.js'
import defaultRestClip from '../assets/boxing-bell-single_CORTO.mp3'

const DB_NAME = 'hipertrofit-media'
const STORE = 'sounds'
const KEY = 'rest-end'

export const MAX_SOUND_BYTES = 5 * 1024 * 1024
// The alert is scheduled to *finish* on zero, so it starts its own length before the end of the
// rest. A whole song would start ringing the moment the rest began — cap it at something that
// still reads as an alert.
export const MAX_SOUND_SECONDS = 30
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|caf|amr)$/i

/** Cheap checks on the file itself: 'not-audio' | 'empty' | 'too-big' | null. */
export function soundFileProblem({ name, type, size } = {}) {
  if (!(typeof type === 'string' && type.startsWith('audio/')) && !AUDIO_EXT.test(name || '')) return 'not-audio'
  if (!(size > 0)) return 'empty'
  if (size > MAX_SOUND_BYTES) return 'too-big'
  return null
}

/** Checks on the decoded length: 'unreadable' | 'too-long' | null. */
export function soundDurationProblem(seconds) {
  if (!(seconds > 0)) return 'unreadable'
  if (seconds > MAX_SOUND_SECONDS) return 'too-long'
  return null
}

/** Everything that would stop `file` from working as the alert, or null when it is fine. */
export async function customSoundProblem(file) {
  const early = soundFileProblem(file)
  if (early) return early
  let url = null
  try {
    url = URL.createObjectURL(file)
    return soundDurationProblem(await clipsDuration([url]))
  } catch (e) {
    return 'unreadable'
  } finally {
    if (url) { forgetClip(url); try { URL.revokeObjectURL(url) } catch (e) { /* */ } }
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || !indexedDB) { reject(new Error('IndexedDB unavailable')); return }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function withStore(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
  }))
}

let current = null   // { name, url } while a custom sound is in use
let loaded = null    // Promise of the first read from IndexedDB

function adopt(record) {
  if (current) {
    forgetClip(current.url)
    try { URL.revokeObjectURL(current.url) } catch (e) { /* */ }
  }
  current = record && record.data
    ? { name: record.name || '', url: URL.createObjectURL(new Blob([record.data], { type: record.type || '' })) }
    : null
}

/** Name of the custom sound in use, or null for the default bell. Synchronous: null until loaded. */
export function customSoundName() { return current ? current.name : null }

/** The clips the rest alert plays right now. */
export function restAlertClips() { return [current ? current.url : defaultRestClip] }

/** Read the saved choice once. Resolves to its name (null for the bell); never rejects. */
export function loadCustomSound() {
  if (!loaded) {
    loaded = withStore('readonly', s => s.get(KEY))
      .then(adopt, () => {})
      .then(customSoundName)
  }
  return loaded
}

/** Save `file` as the rest-end sound. Run customSoundProblem first; this only stores it. */
export async function saveCustomSound(file) {
  const record = { name: file.name || '', type: file.type || '', data: await file.arrayBuffer() }
  await withStore('readwrite', s => s.put(record, KEY))
  adopt(record)
  loaded = Promise.resolve(customSoundName())
  return customSoundName()
}

/** Back to the bundled bell. */
export async function clearCustomSound() {
  await withStore('readwrite', s => s.delete(KEY))
  adopt(null)
  loaded = Promise.resolve(null)
  return null
}

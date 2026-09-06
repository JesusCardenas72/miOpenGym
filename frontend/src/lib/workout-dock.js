import { supersetUnits } from './history.js'

/**
 * The workout dock: the strip of exercise thumbnails under the session, one entry per
 * thumbnail, grouped into a coloured capsule wherever consecutive entries are supersetted.
 *
 * Everything here is pure — the geometry the strip measures comes in as plain numbers — so the
 * grouping, the colour assignment and the drop-slot arithmetic can be pinned by tests instead
 * of by dragging a thumbnail across a phone.
 */

// Hues far enough apart that two capsules on screen never read as the same group. Kept as
// hues rather than finished colours so the capsule can mix its own tint/border/ring from one
// number and stay legible in both themes.
export const SUPERSET_HUES = [212, 145, 32, 280, 0, 190, 96, 328]

/** Stable small hash of a superset id — the same group keeps its colour across a reload. */
export function hashSg(sg) {
  const text = String(sg ?? '')
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash
}

/**
 * One item per display unit, in session order:
 * `{ position, indices, sg, hue, done }`. `sg`/`hue` are null unless the unit is a superset.
 *
 * Colours are handed out by order of appearance rather than straight from the hash, so two
 * supersets in the same session are always different colours; the starting point of the walk
 * comes from the first group's id, which is what makes the palette look arbitrary from one
 * session to the next instead of always opening on the same blue.
 */
export function dockItems(entries) {
  const list = Array.isArray(entries) ? entries : []
  const units = supersetUnits(list)
  const groups = []
  units.forEach(unit => {
    const sg = unit.length > 1 ? list[unit[0]]?.sg : null
    if (sg && !groups.includes(sg)) groups.push(sg)
  })
  const offset = groups.length ? hashSg(groups[0]) : 0
  return units.map((indices, position) => {
    const sg = indices.length > 1 ? (list[indices[0]]?.sg ?? null) : null
    return {
      position,
      indices,
      sg,
      hue: sg ? SUPERSET_HUES[(offset + groups.indexOf(sg)) % SUPERSET_HUES.length] : null,
      done: unitDone(list, indices),
    }
  })
}

/** A unit is done when every set of every exercise in it is checked off. */
export function unitDone(entries, indices) {
  const list = Array.isArray(entries) ? entries : []
  const sets = indices.flatMap(index => list[index]?.sets || [])
  return sets.length > 0 && sets.every(set => set.done)
}

/**
 * Which gap a thumbnail dropped at `x` belongs in. `centers` are the horizontal midpoints of
 * the units still in the strip (the dragged one removed), so the answer is already a slot in
 * the same "after the source is lifted out" numbering `reorderRoutineUnit` expects.
 */
export function dropSlot(centers, x) {
  return centers.reduce((count, center) => count + (x > center ? 1 : 0), 0)
}

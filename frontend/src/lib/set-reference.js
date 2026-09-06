// What the same exercise looked like LAST time, set by set, and what to put in the row today.
//
// The card already prints one aggregate "Last time: 60×10, 60×10, 60×8" line. That answers
// "how did it go", not "what do I put in THIS row" — which is the question you are actually
// holding the bar over. These helpers pair each work row of the live session with the set that
// sat in the same position last session, and turn the session's progression plan (or, with no
// plan, last time's own numbers) into the values that row should carry.
//
// Pure on purpose: deciding what you lift next is exactly the logic CONTRIBUTING.md says must
// live here with a test beside it, not inside a component.

import { isWarmupRow } from './workout-model.js'

const num = v => (v == null || v === '' ? null : Number(v))
const same = (a, b) => {
  const x = num(a), y = num(b)
  if (x == null || y == null) return x === y
  return Math.abs(x - y) < 1e-9
}

/**
 * Position of a row among the work rows of its list — the number the reference is keyed by.
 * Warm-ups are prep, not the session (the same rule lastEntryFor applies to history), so they
 * are skipped in the count and have no work index of their own.
 */
export function workIndexOf(sets, i) {
  const rows = Array.isArray(sets) ? sets : []
  if (i < 0 || i >= rows.length || isWarmupRow(rows[i])) return null
  let n = 0
  for (let k = 0; k < i; k++) if (!isWarmupRow(rows[k])) n++
  return n
}

/**
 * Last session's set for a work position.
 *
 * Positions line up one-to-one while both sessions have the same number of sets. Past the end —
 * you are on set 4 and last time you did 3 — the last set carries on being the reference rather
 * than the row going blank: the question "what did I do on the final set" is the one that still
 * has an answer, and a blank there is the row where the extra work is decided.
 */
export function referenceSet(prevSets, workIndex) {
  const rows = (Array.isArray(prevSets) ? prevSets : []).filter(s => s && !isWarmupRow(s))
  if (!rows.length || workIndex == null || workIndex < 0) return null
  return rows[Math.min(workIndex, rows.length - 1)]
}

/**
 * The values this row should carry to follow the progressive overload the app decided on.
 *
 * The session's prescription (`plan`, from nextPrescription) wins wherever it has an opinion —
 * that is the policy the user picked in the exercise's progression settings. Anything it left
 * open falls back to what was done last time, so an exercise with progression off still gets
 * "what you lifted last time" as its reference instead of nothing.
 *
 * Returns only the fields that differ from what the row already holds, or null when the row is
 * already right — the caller uses that to decide whether the "apply" chip is worth showing at
 * all. A logged set and a warm-up return null: neither is a row a prescription speaks to.
 */
export function suggestionFor({ mode = 'reps', plan = null, row = {}, reference = null } = {}) {
  if (!row || row.done || isWarmupRow(row)) return null
  // Cardio has no overload rule in the engine (nextPrescription only decides weight/reps/sec),
  // so there is nothing to suggest beyond what the plan already wrote into the row.
  if (mode === 'cardio') return null
  const want = {}
  if (mode === 'time') {
    const sec = plan?.sec != null ? plan.sec : num(reference?.sec)
    const w = plan?.weight != null ? plan.weight : num(reference?.w)
    if (sec != null && sec > 0) want.sec = sec
    if (w != null) want.w = w
  } else {
    const w = plan?.weight != null ? plan.weight : num(reference?.w)
    const r = plan?.reps != null ? plan.reps : num(reference?.r)
    if (w != null) want.w = w
    if (r != null && r > 0) want.r = r
  }
  const diff = {}
  for (const k of Object.keys(want)) if (!same(row[k], want[k])) diff[k] = want[k]
  return Object.keys(diff).length ? diff : null
}

/**
 * How many work sets today's list is short of.
 *
 * A policy may decide the next step is a set rather than a plate — that is how bodyweight work
 * progresses once reps top out (see nextPrescription). Sessions are built with that already
 * applied, so this normally reads 0; it speaks up when the plan was decided after the rows were
 * built, when a set was removed by hand, or when last session simply had more sets than today's
 * list does and dropping one was not deliberate.
 */
export function extraSetsWanted(plan, sets, prevSets) {
  const rows = (Array.isArray(sets) ? sets : []).filter(s => !isWarmupRow(s))
  const prev = (Array.isArray(prevSets) ? prevSets : []).filter(s => s && !isWarmupRow(s))
  const target = plan?.sets > 0 ? plan.sets : prev.length
  return Math.max(0, target - rows.length)
}

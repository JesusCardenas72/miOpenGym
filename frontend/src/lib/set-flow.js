/**
 * A session read as a sequence of screens, one set at a time.
 *
 * The workout used to page by exercise, with every set of it listed at once. Paging by *set*
 * needs a different unit of travel, and a superset is what makes it more than counting: its
 * exercises are done back to back, so the second set of A and the second set of B are one
 * screen — one **round** — not two. A plain exercise is a group of one, and a round of it is
 * just a set, which is why both are described here by the same shape.
 *
 * `units` is the grouping from `supersetUnits` (arrays of entry indices); everything below is
 * arithmetic over those and the entries' set counts, so the order a finger walks through can
 * be pinned by a test rather than by swiping through a phone.
 */

/** How many rounds a group has: the longest member's set count — a member that ran out of sets
 *  simply has no row in the later rounds, which is what an uneven superset looks like. */
export function roundsIn(entries, unit) {
  return (unit || []).reduce((most, idx) => Math.max(most, entries[idx]?.sets?.length || 0), 0)
}

/**
 * Every screen of the session, in the order they are travelled: `{ unit, round, rows }`, where
 * `unit` indexes into `units` and `rows` are the `{ entry, set }` pairs shown together.
 *
 * A group with no sets at all still gets one screen — otherwise an exercise could not be
 * reached to add a set to it.
 */
export function setSteps(entries, units) {
  const steps = []
  if (!Array.isArray(entries) || !Array.isArray(units)) return steps
  units.forEach((unit, unitIdx) => {
    const rounds = roundsIn(entries, unit)
    if (!rounds) { steps.push({ unit: unitIdx, round: 0, rows: [] }); return }
    for (let round = 0; round < rounds; round++) {
      const rows = unit
        .filter(entry => entries[entry]?.sets?.[round])
        .map(entry => ({ entry, set: round }))
      steps.push({ unit: unitIdx, round, rows })
    }
  })
  return steps
}

/** Where a given round of a given group sits in that sequence, or -1. */
export function stepIndexOf(steps, unitIdx, round) {
  return steps.findIndex(step => step.unit === unitIdx && step.round === round)
}

/**
 * The round to open a group on: the first one with work left in it. Everything done means the
 * group is behind you, and its last round is the one worth looking at — that is where the sets
 * you might want to correct are.
 */
export function firstUnfinishedRound(entries, unit) {
  const rounds = roundsIn(entries, unit)
  for (let round = 0; round < rounds; round++) {
    if ((unit || []).some(idx => entries[idx]?.sets?.[round] && !entries[idx].sets[round].done)) return round
  }
  return Math.max(0, rounds - 1)
}

/**
 * Where a sideways swipe inside a session lands: the neighbouring **group**, not the next set.
 *
 * A swipe is for looking at what is coming up or going back over what was done, so it travels
 * exercise by exercise — the set in progress and any rest counting down are left exactly where
 * they were. Walking a group set by set is what the Prev/Next buttons are for.
 *
 * `dir` is +1 for the group to the right and -1 for the one to the left. Returns the index of
 * the screen that opens that group — its first unfinished round, the same one it would open on
 * from a tap in the dock — or null when there is nothing on that side.
 */
export function neighbourUnitStep(entries, units, steps, unitIdx, dir) {
  const target = unitIdx + dir
  if (!dir || !Array.isArray(units) || !units[target]) return null
  const index = stepIndexOf(steps, target, firstUnfinishedRound(entries, units[target]))
  return index >= 0 ? index : null
}

/**
 * Horizontal swipe gestures inside a workout (issue: swipe to delete a set / change exercise).
 *
 * Two gestures share one surface, so the decision of which one a drag *is* lives here as pure
 * functions rather than inside the pointer handlers: a leftward drag that started on a
 * removable set row peels that row open to a red delete track, anything else horizontal pages
 * between exercises. Everything below is plain arithmetic on a delta — no DOM, no React — so
 * the thresholds can be pinned by a test instead of by dragging a finger across a phone.
 */

/** How far a drag has to travel before it commits to being horizontal at all. */
export const SWIPE_LOCK_DISTANCE = 12
/** How far a *navigation* swipe has to travel to page to the next/previous exercise. */
export const SWIPE_MIN_DISTANCE = 48
/** Horizontal has to beat vertical by this much — a diagonal scroll stays a scroll. */
export const SWIPE_AXIS_RATIO = 1.25
/** How far a set row has to be pulled left before letting go deletes it. */
export const ROW_DELETE_DISTANCE = 96
/** The row stops following the finger here, so the track can't be pulled off-screen. */
export const ROW_MAX_OFFSET = 132

/**
 * What a drag has turned into, given how far it has moved so far.
 * `row` is truthy when the drag started on a set row that can actually be removed.
 *
 * Returns `'row'` (peel the row open), `'nav'` (page between exercises), `'none'` (a vertical
 * scroll — leave it to the browser) or `null` while the drag is still too small to call.
 */
export function swipeLock({ dx, dy, row }) {
  if (Math.abs(dy) >= SWIPE_LOCK_DISTANCE && Math.abs(dy) > Math.abs(dx)) return 'none'
  if (Math.abs(dx) < SWIPE_LOCK_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO) return null
  return row && dx < 0 ? 'row' : 'nav'
}

/** How far the row is drawn from its resting place: leftwards only, and never past the track. */
export function rowOffset(dx) {
  return Math.max(-ROW_MAX_OFFSET, Math.min(0, dx))
}

/** Whether letting go at this offset deletes the set (the track turns solid red when it does). */
export function rowArmed(dx) {
  return rowOffset(dx) <= -ROW_DELETE_DISTANCE
}

/**
 * Which way a navigation swipe goes: +1 for the next thing, -1 for the previous one, 0 when
 * the drag was too short or too diagonal to count.
 *
 * Dragging *left* moves forward, which is the platform habit on both phones and the only
 * direction that survives an animation: the next screen has to arrive from the right border,
 * so the finger has to be travelling that way. (An earlier version of this had it the other
 * way round, matching the Prev/Next buttons' positions rather than the motion.)
 */
export function navDirection(dx, dy = 0) {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO) return 0
  return dx < 0 ? 1 : -1
}

/**
 * Which screen a sideways swipe on a tab page lands on.
 *
 * The tab bar's four destinations are a row, so a horizontal swipe walks along it — the same
 * order left to right as the buttons themselves, which is what makes the gesture guessable
 * without being taught. Sub-pages reached from a tab (a routine being edited, the history
 * list) are deliberately *not* swipeable: they are a level down, not a neighbour, and paging
 * sideways out of a half-finished edit is not what the finger meant.
 */

/** The tab bar's destinations, in the order it draws them (see components/TabBar.jsx). */
export const TAB_ROUTES = ['/home', '/plan', '/stats', '/library']

/** Which tab a path belongs to (sub-pages included), or -1 for anything outside the bar. */
export function tabIndexOf(pathname) {
  const root = '/' + String(pathname || '').split('/').filter(Boolean)[0]
  return TAB_ROUTES.indexOf(root)
}

/**
 * The route a swipe goes to, or null when there is none: `dir` is +1 for the tab to the right
 * and -1 for the one to the left, and only an exact tab route can be swiped away from.
 */
export function neighbourTab(pathname, dir) {
  if (!dir || !TAB_ROUTES.includes(pathname)) return null
  return TAB_ROUTES[TAB_ROUTES.indexOf(pathname) + dir] || null
}

/**
 * Which way a navigation should slide when no gesture drove it — a tab pressed in the bar, a
 * routine opened, the Android back button. Between two tabs it follows their order, so the
 * animation agrees with what a swipe would have done. Anywhere else it reads as depth: going
 * somewhere new enters from the right, going back returns from the left.
 */
export function screenDirection(from, to, isPop) {
  const a = tabIndexOf(from)
  const b = tabIndexOf(to)
  if (a >= 0 && b >= 0 && a !== b) return b > a ? 1 : -1
  return isPop ? -1 : 1
}

/* Exercise display names.

   Three inputs decide what an exercise is called on screen, in this order of authority:

   1. A manual override — the name *you* typed for this exercise. It wins outright, because a
      name you chose by hand is a deliberate correction of everything below it; second-guessing
      it with a parenthesis would defeat the point of typing it.
   2. The translated catalogue name, when a name pack for the active language is loaded.
   3. The canonical English catalogue name, which is always there.

   `style` picks between the two ways of showing (2): 'bilingual' keeps the English term in
   parentheses (useful while you still recognise exercises by their English name), 'local' drops
   it. Pure and framework-free — the module state that feeds it lives in i18n-core.js. */

export const NAME_STYLES = ['bilingual', 'local']
export const DEFAULT_NAME_STYLE = 'bilingual'

/** An override is only an override once it has a non-blank name in it. */
export const cleanOverride = value => (typeof value === 'string' ? value.trim() : '')

/**
 * The name to show.
 *
 * `base`       canonical English catalogue name (ex.n)
 * `translated` name from the active language pack, or falsy when there is none
 * `override`   manually typed name, or falsy
 * `style`      'bilingual' | 'local' — anything else is read as the default, 'bilingual'
 * `lang`       active language tag, used for its casing rules in the loanword check
 */
export function displayName({ base, translated, override, style, lang } = {}) {
  const manual = cleanOverride(override)
  if (manual) return manual
  const original = base || ''
  const local = typeof translated === 'string' ? translated.trim() : ''
  if (!local) return original
  if (style === 'local') return local
  // Some names (Burpee, Pilates, brand/model terms) are the established term in the target
  // language too. Repeating an identical loanword in parentheses adds noise rather than
  // context. Compared in the active language's own casing rules, not hardcoded to one —
  // this only ever differs from ordinary casing for languages with locale-specific rules
  // (e.g. Turkish dotless i), which does not include any language shipped here today.
  return local.toLocaleLowerCase(lang || 'en') === original.toLocaleLowerCase('en')
    ? local
    : `${local} (${original})`
}

/**
 * Everything a search should match against: whatever is on screen *plus* the names it replaced.
 * Renaming an exercise must not make it unfindable by the name you have been typing for months,
 * and picking 'local' must not stop "bench press" from finding "press de banca".
 */
export function searchText({ base, translated, override } = {}) {
  const manual = cleanOverride(override)
  const local = typeof translated === 'string' ? translated.trim() : ''
  return [manual, local, base || ''].filter(Boolean).join(' ')
}

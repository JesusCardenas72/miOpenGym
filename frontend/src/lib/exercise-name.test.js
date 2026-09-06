import { describe, it, expect } from 'vitest'
import { displayName, searchText, cleanOverride, NAME_STYLES, DEFAULT_NAME_STYLE } from './exercise-name.js'

const es = { base: 'barbell bench press', translated: 'press de banca con barra', lang: 'es' }

describe('displayName', () => {
  it('shows the English name when no pack is loaded', () => {
    expect(displayName({ base: 'barbell bench press', style: 'bilingual' })).toBe('barbell bench press')
    expect(displayName({ base: 'barbell bench press', style: 'local' })).toBe('barbell bench press')
  })

  it('appends the English term in bilingual style', () => {
    expect(displayName({ ...es, style: 'bilingual' })).toBe('press de banca con barra (barbell bench press)')
  })

  it('drops the English term in local style', () => {
    expect(displayName({ ...es, style: 'local' })).toBe('press de banca con barra')
  })

  it('defaults to bilingual for an absent or unknown style', () => {
    expect(displayName(es)).toBe('press de banca con barra (barbell bench press)')
    expect(displayName({ ...es, style: 'nonsense' })).toBe('press de banca con barra (barbell bench press)')
    expect(DEFAULT_NAME_STYLE).toBe('bilingual')
    expect(NAME_STYLES).toEqual(['bilingual', 'local'])
  })

  it('never repeats a loanword that is identical in both languages', () => {
    const loan = { base: 'burpee', translated: 'Burpee', lang: 'es' }
    expect(displayName({ ...loan, style: 'bilingual' })).toBe('Burpee')
    expect(displayName({ ...loan, style: 'local' })).toBe('Burpee')
  })

  it('lets a manual name win over both styles and over the pack', () => {
    expect(displayName({ ...es, style: 'bilingual', override: 'Press banca' })).toBe('Press banca')
    expect(displayName({ ...es, style: 'local', override: 'Press banca' })).toBe('Press banca')
    expect(displayName({ base: 'barbell bench press', override: 'Press banca' })).toBe('Press banca')
  })

  it('treats a blank or whitespace override as no override at all', () => {
    // Clearing the field in the rename sheet is how you restore the catalogue name; it must
    // not leave the exercise showing an empty title.
    expect(displayName({ ...es, style: 'local', override: '   ' })).toBe('press de banca con barra')
    expect(displayName({ ...es, style: 'local', override: '' })).toBe('press de banca con barra')
    expect(displayName({ ...es, style: 'local', override: null })).toBe('press de banca con barra')
  })

  it('trims a manual name rather than storing the stray spaces', () => {
    expect(displayName({ ...es, override: '  Press banca  ' })).toBe('Press banca')
  })

  it('survives being handed nothing', () => {
    expect(displayName()).toBe('')
    expect(displayName({})).toBe('')
  })
})

describe('searchText', () => {
  it('matches the English name even when only the translation is shown', () => {
    expect(searchText(es)).toBe('press de banca con barra barbell bench press')
  })

  it('keeps the names a manual rename replaced findable', () => {
    expect(searchText({ ...es, override: 'Press banca' }))
      .toBe('Press banca press de banca con barra barbell bench press')
  })

  it('falls back to the English name alone', () => {
    expect(searchText({ base: 'burpee' })).toBe('burpee')
    expect(searchText()).toBe('')
  })
})

describe('cleanOverride', () => {
  it('normalizes anything that is not a usable name to the empty string', () => {
    expect(cleanOverride('  x ')).toBe('x')
    expect(cleanOverride('   ')).toBe('')
    expect(cleanOverride(undefined)).toBe('')
    expect(cleanOverride(42)).toBe('')
  })
})

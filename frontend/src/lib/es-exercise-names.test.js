import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import es from '../exercise-names/es.js'
import { EXDB } from './exercises-data.js'
import {
  EXERCISE_NAME_LANGS, _setLangState, exerciseNameFor, exerciseNameSearchText
} from './i18n-core.js'

describe('Spanish exercise names', () => {
  const source = JSON.parse(readFileSync(new URL('../../../scripts/exercise-name-sources/es-ES.json', import.meta.url), 'utf8'))
  afterEach(() => _setLangState('en', {}, null, null))

  test('matches the curated source and covers the complete built-in catalogue', () => {
    expect(Object.keys(es)).toHaveLength(EXDB.length)
    expect(es).toEqual(source)
    expect(EXERCISE_NAME_LANGS).toContain('es')
  })

  test('contains a non-empty translation for every known exercise', () => {
    for (const exercise of EXDB) {
      expect(es[exercise.id]?.trim(), exercise.id).toBeTruthy()
    }
  })

  // This pack was converted from the Brazilian Portuguese one and arrived carrying a layer of
  // Portuguese that had to be cleaned out by hand. These are the deterministic tells, so a
  // future re-import (or a hand edit copied from pt-BR.json) cannot quietly bring them back.
  test('carries no Portuguese left over from the pack it was derived from', () => {
    for (const exercise of EXDB) {
      const name = es[exercise.id]
      // Spanish uses none of these characters. ü is the one legitimate diaeresis (cigüeña).
      expect(name, exercise.id).not.toMatch(/[çãõâêô]/)
      // nh / lh are Portuguese digraphs; Spanish spells those sounds ñ and ll.
      expect(name, exercise.id).not.toMatch(/\p{L}*(?:nh|lh)\p{L}*/u)
      expect(name, exercise.id).not.toMatch(/(?<!\p{L})(?:assistid[oa]s?|abert[oa]s?|polias?|apoios|quatro|maior|adutores|isquiotibiais|corda|ereto|descida|joelhos?|tornozelos?|panturrilha|movimento|melhor)(?!\p{L})/iu)
      // Stray Portuguese articles: "sob as duas piernas", "abraçar os rodillas", "sem agarre".
      expect(name, exercise.id).not.toMatch(/(?<!\p{L})(?:os|as|sem|sob)\s+(?:\p{L})/iu)
    }
  })

  test('leaves no empty qualifier parentheses or duplicated words', () => {
    for (const exercise of EXDB) {
      // The (male)/(female) markers were dropped in conversion and left a bare "()" behind.
      expect(es[exercise.id], exercise.id).not.toMatch(/\(\s*\)/)
      expect(es[exercise.id], exercise.id).not.toMatch(/(?<!\p{L})(\p{L}+) \1(?!\p{L})/iu)
      expect(es[exercise.id], exercise.id).not.toMatch(/\s{2,}/)
    }
  })

  test('preserves identity-changing qualifiers and equipment', () => {
    const rules = [
      [/assisted/iu, /asistid/iu],
      [/weighted/iu, /(?:lastre|lastrad|peso|carga|ponderad)/iu],
      [/(?<!\p{L})male(?!\p{L})/iu, /masculino/iu],
      [/(?<!\p{L})female(?!\p{L})/iu, /femenino/iu],
      [/barbell/iu, /barra/iu],
      [/dumbbell/iu, /mancuerna/iu],
      [/kettlebell/iu, /(?:kettlebell|pesa rusa)/iu],
      [/smith/iu, /smith/iu],
      [/cable/iu, /(?:cable|polea)/iu],
      [/stability ball/iu, /(?:fitball|pelota|bal[oó]n|esfera)/iu],
      [/medicine ball/iu, /(?:bal[oó]n|pelota) medicinal/iu],
    ]
    for (const exercise of EXDB) {
      for (const [english, spanish] of rules) {
        if (english.test(exercise.n)) expect(es[exercise.id], `${exercise.id}: ${english}`).toMatch(spanish)
      }
    }
  })

  test('shows Spanish first and preserves the canonical English title', () => {
    const exercise = EXDB[0]
    _setLangState('es', {}, null, es)
    expect(exerciseNameFor(exercise)).toBe(`${es[exercise.id]} (${exercise.n})`)
    expect(exerciseNameSearchText(exercise)).toContain(es[exercise.id])
    expect(exerciseNameSearchText(exercise)).toContain(exercise.n)
  })

  test('never translates custom exercises or changes other languages', () => {
    const custom = { id: 'custom-1', n: 'Mi ejercicio' }
    _setLangState('es', {}, null, es)
    expect(exerciseNameFor(custom)).toBe('Mi ejercicio')
    _setLangState('en', {}, null, null)
    expect(exerciseNameFor(EXDB[0])).toBe(EXDB[0].n)
  })
})

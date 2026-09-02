# Translated exercise names

Each JSON file here is the editable source for one language's exercise-name pack.
It maps every built-in EXDB exercise ID to a translated title. The app combines
that title with the unchanged English source at runtime:

```text
Elevação assistida das pernas deitada (assisted lying leg raise)
elevación de piernas tumbado asistida (assisted lying leg raise)
```

Custom exercise names are never translated. IDs, plan data, workout history,
imports and exports continue to use the canonical catalogue entries.

| Source | Locale key | Runtime pack | Build |
| --- | --- | --- | --- |
| `pt-BR.json` | `pt-BR` | `frontend/src/exercise-names/pt-BR.js` | `node scripts/build-pt-br-exercise-names.mjs` |
| `hu.json` | `hu` | `frontend/src/exercise-names/hu.js` | `node scripts/build-hu-exercise-names.mjs` |
| `es-ES.json` | `es` | `frontend/src/exercise-names/es.js` | `node scripts/build-es-exercise-names.mjs` |

The Spanish source keeps the `es-ES` region tag it was curated under, while the
locale key is plain `es` — the same pairing `DATE_LOCALES` already makes in
`i18n-core.js`. The other two file names match their locale key directly.

A build refuses to write a pack that is missing an ID, carries an unknown one, or
has a blank name, so a partial source cannot silently ship. Adding a language also
needs its key in `EXERCISE_NAME_LANGS` (`frontend/src/lib/i18n-core.js`) — the pack
is lazy-loaded and simply stays unused until the key is listed there.

The initial translations were produced from the English EXDB titles with LLM
assistance and must not be described as reviewed by a native speaker unless a
named human reviewer completes that review. They are original translations and
were not copied from another dataset in the target language.

**The Spanish source additionally started life as a conversion of `pt-BR.json`**
and arrived with roughly 230 entries still carrying Portuguese — dropped
`(male)`/`(female)` markers left as empty `()`, words like `assistido`, `polia`,
`lançamento`, `moinho de vento`, and stray articles (`sob as duas piernas`). Those
were cleaned out by hand and are pinned by regression assertions in
`frontend/src/lib/es-exercise-names.test.js`. Beyond those deterministic checks the
pack has had no native-speaker review, so wording and gender agreement across the
remaining 1,324 names are unverified.

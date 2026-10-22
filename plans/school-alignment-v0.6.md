# School alignment v0.6: follow what the learner meets at school

**Status:** 🟡 implemented on branch `feat/school-alignment`, 8/8 slices, pending review and a live run. Design:
[docs/SCHOOL.md](../docs/SCHOOL.md).

Method: slice discipline, as in [learning-loop-v0.4](archive/learning-loop-v0.4.md): every slice ships something,
names the files it touches and has a real done test.

## Why

The learner in this deployment is a 2nd grader at High Peaks Elementary (Boulder Valley School District, Colorado), a
Core Knowledge focus school. A review of the app against that found:

1. **Quests ignore the school year.** The nightly author sees weak spots, strengths, the frontier and coverage, but
   nothing about what the class is doing this month, so quests cannot reinforce or anticipate it.
2. **The taxonomy has gaps for this curriculum.** Marble has no U.S. history, civics or map skills, which are most of
   the school's social studies year (maps and globes, the Constitution, the War of 1812, immigration and citizenship,
   civil rights). Science, math and literacy are well covered and already carry the Common Core / NGSS codes that the
   Colorado standards cite.
3. **The engine assumes upper elementary.** Placement probes came from topics for ages 9-11, Play penalised anything
   under age 8, the "harder/easier" fallbacks used age 10 and the first question was a fraction, whatever
   `LEARNER_AGE` said. With `LEARNER_AGE=8` the learner was placed on 4th-5th grade material.
4. **The parent can't see school progress.** The report shows subjects, areas and quests, not "what the class is on
   and how the learner is doing in it".

## Design

- **D1 School profile** (`data/school/<id>.json`, bundled to `public/school.json`): per grade, units with subject,
  title, program, `months`, `standards` codes and `topics`. Validated at build time. Selected by `SCHOOL_PROFILE`;
  the grade by `LEARNER_GRADE` ("2nd grade"). Pacing is explicitly approximate and editable.
- **D2 Local topics** (`data/local-topics/topics.json`, ids `lt_`): Marble-shaped topics with an inline kid MCQ,
  prereqs and standards codes, merged into `tax.json` by `build.mjs`. Three new History areas with icons. Original
  text only; standards and the Core Knowledge Sequence referenced by code.
- **D3 Shared module** `src/school.js`: `gradeKey`, `unitsFor` (now/next by month, summer = break), `schoolView`
  (states, counts, starters), `schoolTopicIds`, `validateProfile`.
- **D4 Export + rules:** `school` section, frontier flags, LESSONS.md rule 8 "Follow the school year", NIGHTLY.md.
- **D5 Validator:** "school units: N" in the summary; a warning (never an error) at 0 while units run, mirroring the
  coverage rule's frozen decision.
- **D6 Play + parent report:** +20 focus bonus for current-unit topics; "At school this month" section.
- **D7 Age-relative engine:** placement window, Play penalty, fallbacks and first question follow `LEARNER_AGE`;
  stale probes are dropped. No change for the default learner (age 10): existing tests pass unchanged.
- **D8 Example and tests:** `packs/examples/example-quest-grade2.json`; `test/school.test.mjs`.

**Frozen decisions**
- A quest that touches no school unit is a **warning**, never an error (same as coverage).
- Pacing lives in the data file, not in code; the classroom wins over the map.
- Local topics never copy standards or Core Knowledge text; codes only.

## Slices

| # | Slice | Files | Done test | Status |
|---|---|---|---|---|
| 1 | Local topics merged into the taxonomy | `data/local-topics/topics.json`, `build.mjs`, `data/glossary.txt` | `npm run build` prints "21 local"; `test/school.test.mjs` "local topics are in the taxonomy" | ✅ |
| 2 | School profile schema and the BVSD / High Peaks grade 2 profile | `data/school/bvsd-high-peaks.json`, `src/school.js`, `build.mjs` | build validates it; "profile is valid" test | ✅ |
| 3 | Export shows this month's units | `export-progress.mjs`, `lib-cli.mjs` | "export-progress.mjs --local: school.now" test | ✅ |
| 4 | Validator reports school units | `publish-lessons.mjs` | "validator: the grade-2 example quest…" test | ✅ |
| 5 | Play bonus and parent report | `src/engine.js`, `src/worker.js`, `server/index.mjs`, `src/parent.js`, `public/parent.js` | "Play: topics in this month's school units get +SCHOOL_BONUS" test; `/parent` shows the section | ✅ |
| 6 | Placement and Play follow the target age | `src/engine.js` | "a learner aged 8" and "default learner" tests; all v0.4 tests unchanged | ✅ |
| 7 | Docs and rules | `docs/SCHOOL.md`, `LESSONS.md`, `docs/NIGHTLY.md`, `README.md`, `INSTALL.md`, `CHANGELOG.md`, `LICENSING.md`, `CONTRIBUTING.md`, `wrangler.toml.example` | `node publish-lessons.mjs packs/examples/example-quest-grade2.json --dry-run --offline` is valid | ✅ |
| 8 | Grade 2 example quest | `packs/examples/example-quest-grade2.json` | validator: 0 errors, "school units: 1" | ✅ |

## Live run (to do after review)

1. Set `LEARNER_GRADE = "2nd grade"` and `SCHOOL_PROFILE = "bvsd-high-peaks"` in `wrangler.toml` `[vars]`.
2. `node backup-progress.mjs`, then `./deploy.sh`.
3. `node export-progress.mjs` and confirm the `school` section lists this month's units.
4. Open `/parent` and check **At school this month**.
5. Write tonight's quest with one stage from `school.now` (LESSONS.md rule 8).

## Open questions

- **Q1 Pacing.** The month placement of math and literacy units is estimated from unit lengths. Resolve by checking
  the class newsletter and editing `months`.
- **Q2 Grade 3.** Add the `"3"` grade before August 2027 (see docs/SCHOOL.md "Next grade").

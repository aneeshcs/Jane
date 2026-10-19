# Learning loop v0.4: shorter quests, review gates, honest medals

**Status:** in progress on branch `feat/learning-loop-v0.4`, 7/17 slices done. Tracking issue: #18.

Method: slice discipline (every slice ships something, names the files it touches, has a real done test and an owner, and carries an `Execute` brief). During execution, read only the current slice's brief plus the design section it points to.

## Why

A usage review of real play found six problems with the learning loop. They are described generically here: this
plan and its issues are public and contain no learner data.

1. Quests are too long. The rules aim for about 28 graded questions, and real quests ran well past that (high 30s to
   40s items, often more than 10 minutes).
2. Spaced review starves during quests. A started quest switches off the engine's own reviews and relies on the
   quest's `review` stages, so in real use dozens of reviews went overdue.
3. Medals are too easy. A single "👍 Got it!" self-check marks a topic mastered, a one-question boss can award a
   legendary medal, and the trophy list showed a duplicate.
4. Grading ignores the asked form: "as a percent" accepted 0.27, "as a decimal" accepted 52/100, and a whole-number
   answer accepted 12/4.
5. Coverage is narrow. Only a few of the 12 math areas and 19 science areas (Marble domains) were ever touched.
6. Finished quests can change. A stage was added to a completed pack, and the finished quest then showed 86%.

## Design

### D1 Shorter quests
- **Budget: about 8 minutes, at most 20 graded answers per quest.** That is at most **16 graded pack questions**
  plus at most **4 review-gate items** that the app adds at runtime (D2). Aim for 12-16 pack questions over
  **4-6 stages** (7 at most).
- The publisher **enforces** it: more than 16 graded questions or more than 7 stages is an error (today it only
  warns above 30 and 9). It prints an estimate (graded × 25 s + cards × 10 s) and warns above 8 minutes.
- Deep dives shrink to 3-4 graded questions (3 minimum). Bosses stay at 3 or more (D3).
- Catch-up boosts keep working as they do now.
- **Frozen (Q3, resolved):** Kent approved this budget as proposed.

### D2 Review gates built into quests
Kent: *"You should have to do something from the past to make it to the future, reinforcing your learning along
the way."*
- **Gates.** In a started quest, a 🗝️ gate sits before stage 2, before the middle stage and before the boss
  (deduplicated for short quests, at most 3 per quest). To open a gate the learner answers 1-2 review items.
- **Drawn at runtime** from the engine's due Leitner queue, most overdue first, directly shown topics before inferred
  ones. The nightly pack does not pick them, so reviews can't starve. If nothing is due, the gate uses a direct
  mastered topic in box 0-1 that is due within 2 days. If there is none, the gate is open for free.
- **Gates count.** Gate items are graded like normal engine reviews: a first-try right answer moves the topic up a
  Leitner box, and a miss demotes it as a missed review does today.
- **A gate never strands the learner.** It opens once its items are answered, whether right, a learning moment or
  skipped. The reinforcement comes from doing them; the scheduling consequence comes from Leitner.
- **Spot-checks of inferred topics.** About 1 in 3 gate items checks a topic the app only *inferred* (never shown
  directly). It picks the one with the most dependents on the learner's frontier, then the lowest confidence. Right →
  verified (`how: 'direct'`). Wrong → back to learning, and topics inferred from it are withdrawn (`failUp`).
- Gates are not part of the quest's `total`/`pct` (keeps D6 simple). They show as keys on the quest path.
- `review: true` stages stay valid but are discouraged, and the 15-20% review-share rule is retired.

### D3 Honest medals
- **No mastery, inference or medal from a self-check alone.** "Got it!" earns its kind words and points, then a
  graded check follows.
- **Mastery needs at least 2 first-try correct graded answers.** There is no single-question shortcut, and an
  identical repeated question counts at most once per day.
- **A medal needs 3 first-try correct graded answers** on a directly mastered topic. A placement (diagnostic) answer
  can still mark a topic mastered for placement and inference, but awards no medal.
- **Legendary only for a multi-question boss:** a boss won with at least 3 graded boss answers. Non-math Play items
  are never bosses, and the validator requires at least 3 graded questions in a boss stage.
- **One trophy per achievement:** one per topic, one per quest. Duplicates are collapsed on migrate.
- **Existing medals are re-earned under the new rules (Q1, resolved: option c).** A one-time migration
  (slice 9) recomputes all existing mastery and medals and removes or downgrades the ones that don't qualify.
  Topics that lose mastery go back into the review queue, due now, so review gates re-verify them. It needs a
  backup first, runs on Cloudflare and `--local` storage, has a `--dry-run`, and the live run needs Kent's go-ahead
  at execution time.

### D4 Answer in the asked form
- A question's form comes from `form` on a pack question (`percent | decimal | fraction | whole`). Otherwise it is
  read from the prompt ("as a percent", "as a decimal", "as a fraction"), and an integer answer means whole.
- **Right value, wrong form → a nudge, not a miss.** For example: "Right value! Now write it as a percent (like 27%)."
  No try is used, and no heart, streak, points or Leitner change. After the 2nd nudge on the same item, the nudge also
  shows the expected answer in the asked form.
- Same treatment as the existing "can you simplify it?" retry for fractions, which stays as it is.

### D5 Coverage: rotate in untouched areas
- **Area = Marble domain** (12 in Mathematics, 19 in Science, and so on). An area is **seen** when it has at least 1
  graded answer (not a self-check) or a topic with a direct record and at least 1 correct answer. Inferred-only
  topics don't count.
- One shared `src/coverage.js` feeds the export, the validator, Play and the parent report.
- The nightly quest includes at least one stretch stage from an untouched area (math and science first, rotating).
  The validator reports "new areas: N" and warns at 0. **Frozen (Q2, resolved): a warning only, never an error.**
- Play gives ready topics in unseen areas a +10 frontier bonus (below the +40 pack bonus, so quests still lead).
  "Something different" tries an unseen area first.

### D6 Finished quests are locked
- When a quest completes, the engine stores a snapshot (`stages: [{topicId, n}]`, `total`). From then on the quest
  reports 100% from that snapshot everywhere: app, Quests tab, parent report and export.
- A finished quest's pack serves no more items.
- `publish-lessons.mjs` refuses (exit 4) to overwrite or boost a finished quest, even with `--force`. New material goes
  in the next quest.
- Legacy finished quests (finished before the snapshot existed) report 100%.

## Order and dependencies
Trust fixes come first because they are small and independent: size (1), quest lock (2-3), answer form (4-5),
medals (6-8) and re-earning existing medals (9). Gates come next (10-13) so that gate results land on honest mastery
rules. Coverage comes last (14-17).
Dependencies: 5 needs 4; 9 needs 6-8, and its live run waits for 10 and 12; 11, 12 and 13 need 10 (13 also needs 12);
15, 16 and 17 need 14. Everything else is independent.

## Decisions (open questions resolved by Kent, 2026-10-19)
- **Q1 (medals): resolved, option (c).** Kent: "Update all with new rules." All existing medals and mastery are
  recomputed under the new rules, and the ones that don't qualify are removed or downgraded. Topics that lose mastery
  go back into the review queue for gates to re-verify. This is a new slice: slice 9, "Existing medals re-earned
  under the new rules". The live run needs Kent's go-ahead at execution time.
- **Q2 (coverage): resolved, a warning only.** A quest that adds no new area gets a validator warning, never an
  error (slice 15). Frozen.
- **Q3 (quest size): resolved, yes as proposed.** At most 16 graded pack questions plus at most 4 gate items (about 20
  answers, about 8 minutes), 4-6 stages, 7 at most (slice 1). Frozen.

## Out of scope
- Live Cloudflare data is not touched while planning. The only live write in this plan is slice 9's one-time medal
  migration, and only with a matching backup and Kent's go-ahead at execution time. Other engine migrations run
  lazily on the next request, as today.
- The built-in nightly generator (`docs/NIGHTLY.md` "Planned"). These slices change the rules it would follow, not
  the generator itself.

## Slices (in order)

| # | Slice | Area | Issue |
|---|---|---|---|
| 1 | Quests fit in about eight minutes | quests | #2 ✅ |
| 2 | A finished quest stays finished | integrity | #3 ✅ |
| 3 | Publishing never changes a finished quest | integrity | #4 ✅ |
| 4 | Asked for a percent? Write a percent | grading | #5 ✅ |
| 5 | Pack authors declare the answer form | grading | #6 ✅ |
| 6 | Mastery takes real answers, not a thumbs-up | medals | #7 ✅ |
| 7 | Legendary medals come from a real boss fight | medals | #8 ✅ |
| 8 | One trophy per achievement | medals | #9 |
| 9 | Existing medals re-earned under the new rules | medals | #19 |
| 10 | Review gates between quest stages | review | #10 |
| 11 | Gates show on the quest path | review | #11 |
| 12 | Gates spot-check guessed skills | review | #12 |
| 13 | Nightly hands spaced review to the gates | review | #13 |
| 14 | See which areas have been explored | coverage | #14 |
| 15 | Nightly quests visit new areas | coverage | #15 |
| 16 | Play wanders into new areas | coverage | #16 |
| 17 | Parent report shows coverage by area | coverage | #17 |

### Slice 1: Quests fit in about eight minutes (#2) — ✅ done
Area: `quests` · Design: [D1](#d1-shorter-quests)

- **Ships:** A nightly quest is short enough to finish in one sitting (about 8 minutes). The publisher refuses a quest over the budget instead of only warning, so long quests can't reach the learner.
- **Touches:**
  - `publish-lessons.mjs`: size rules (the `nGraded>30` / `>9 stops` warnings near the end), deep-dive min/max, summary line (add a time estimate)
  - `packs/examples/example-quest.json`: trim to the new budget (it must still pass the teach → guided → boss case in `test/stuck.test.mjs`)
  - `LESSONS.md`: rule 6 "Keep it short", deep-dive wording, schema comments
  - `docs/NIGHTLY.md`: step 4 "Size" bullet
  - new `test/quest-size.test.mjs`
- **Done test:** `node --test test/quest-size.test.mjs && npm test`, with these new cases:
  - a quest with 17 graded questions is refused (exit 1, message says "too long")
  - a quest with 8 stages is refused (exit 1)
  - the example quest passes and its summary prints an estimate of 8 min or less
  - a deep dive with 3 graded questions passes; one with 2 fails
- **Owner:** `delegate(task="Apply the D1 quest budget to publish-lessons.mjs, the example quest and the docs", verify="node --test test/quest-size.test.mjs && npm test")`

#### Execute (Slice 1)
- Budget frozen (Q3, Kent: yes as proposed): ≤ 16 graded pack questions + ≤ 4 gate items (~20 answers, ~8 min), 4-6 stages, max 7.
- In `publish-lessons.mjs`, replace the soft size warnings with the D1 budget: error when graded > 16 or stages > 7; warn when graded < 10.
- Add the D1 time estimate (graded × 25 s + cards × 10 s) to the summary line; warn above 8 min.
- Deep dives: error below 3 graded, warn above 4 (was 4-5).
- Trim `packs/examples/example-quest.json` to ≤ 16 graded questions while keeping learn card → guided → graded → boss.
- Update `LESSONS.md` (rule 6, deep-dive text, schema comments) and `docs/NIGHTLY.md` (Size).
- Write `test/quest-size.test.mjs` using the temp-file + `spawnSync(... '--dry-run','--offline')` pattern from the validator test in `test/stuck.test.mjs`.
- Done test: `node --test test/quest-size.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D1.)

### Slice 2: A finished quest stays finished (#3) — ✅ done
Area: `integrity` · Design: [D6](#d6-finished-quests-are-locked)

- **Ships:** Once a quest is finished it stays at 100% with its medal everywhere (kid app, Quests tab, parent report, export), even if its pack changes later. A finished quest's pack never serves new items.
- **Touches:**
  - `src/engine.js`: new exported `completeQuest(S,g,pack,now)` (snapshot), `questInfo` (read the snapshot for done quests), `next()` / `packQ` (a done quest serves nothing), `migrate` (legacy done quests)
  - `src/worker.js`: `questCheck` calls `E.completeQuest`
  - new `test/quest-lock.test.mjs`
- **Done test:** `node --test test/quest-lock.test.mjs && npm test`, with these new cases:
  - finish a quest, then append a stage to the pack: `questInfo` still reports 100%, `completed` set, only the original stages
  - after that, `next()` never serves an item from the appended stage (Play falls through to placement or the frontier)
  - a done quest stored before this change (no snapshot) still reports 100%
  - the parent report's quest list (`parentData`) shows the same 100%
- **Owner:** `self`

#### Execute (Slice 2)
- Add `E.completeQuest`: set `done`, store `snap = {stages: [{topicId, n}], total}` and push the quest medal (move that logic out of `questCheck` in `src/worker.js`).
- `questInfo`: for a done quest, compute from `snap` (pct 100) and ignore stages that are not in it.
- `packQ` / `packNext`: a pack whose quest is done returns no items.
- `migrate`: done quests without `snap` get `legacy: true`; `questInfo` reports 100% for them.
- Write `test/quest-lock.test.mjs` (engine unit tests, same setup as `test/stuck.test.mjs`).
- Done test: `node --test test/quest-lock.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D6.)

### Slice 3: Publishing never changes a finished quest (#4) — ✅ done
Area: `integrity` · Design: [D6](#d6-finished-quests-are-locked)

- **Ships:** The nightly author can't add material to a finished quest: `publish-lessons.mjs` refuses (exit 4) to overwrite `lessons:<date>` or write `boost:<date>` for a completed quest, and says to put the new material in the next quest. `--force` does not override this.
- **Touches:**
  - `publish-lessons.mjs`: lock check before `kvPut` in both the quest and the boost branch (uses the read-only progress it already loads)
  - `lib-cli.mjs`: small `questDone(progress, date)` helper if useful
  - `LESSONS.md` (Publishing, Quest cap) and `docs/NIGHTLY.md` (step 5): document exit code 4
  - new `test/publish-lock.test.mjs` (`--local` with a temp `DATA_DIR`)
- **Done test:** `node --test test/publish-lock.test.mjs && npm test`, with these new cases:
  - republishing a finished quest exits 4 and leaves `lessons%3A<date>.json` byte-for-byte unchanged
  - a boost for a finished quest exits 4
  - `--force` does not unlock a finished quest
  - republishing a started, unfinished quest still works, with a warning for each stage that already has answers
- **Owner:** `delegate(task="Make publish-lessons.mjs refuse to modify a completed quest pack or boost it (exit 4), per plan D6", verify="node --test test/publish-lock.test.mjs && npm test")`

#### Execute (Slice 3)
- Before writing, read progress (read-only). If `quests[date].done` is set, print "⛔ quest <date> is finished and locked; put new material in the next quest" and exit 4.
- Apply the same check in the boost branch (`boostFor`).
- `--dry-run` reports the lock too (exit 4) when progress is readable; `--offline` skips it.
- For a started, unfinished quest: warn per stage that already has answers and whose questions changed or was removed.
- Document exit 4 in `LESSONS.md` and `docs/NIGHTLY.md`.
- Write `test/publish-lock.test.mjs`: publish the example quest `--local`, write a `progress.json` that marks it done, republish.
- Done test: `node --test test/publish-lock.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D6.)

### Slice 4: Asked for a percent? Write a percent (#5) — ✅ done
Area: `grading` · Design: [D4](#d4-answer-in-the-asked-form)

- **Ships:** When a question asks for a percent, a decimal or a whole number, only that form counts. The right value in another form (0.27 for "as a percent", 52/100 for "as a decimal", 12/4 for a whole number) gets a gentle "Right value! Now write it as a percent (like 27%)" nudge. The nudge is not a miss: no try used, no heart, no streak lost.
- **Touches:**
  - `src/engine.js`: new `formOf(it)` and `formOk(answer, form)` helpers; `grade()` math, numeric and bonus branches return `'wrongForm'`; `submit()` handles it next to `'notSimplest'`; log field `formNudge`
  - `prototype/server.js` generators (source of the generated `src/gen.js`): only where a prompt doesn't name its form clearly
  - `public/app.js`: show the nudge as a retry (check that the existing retry path covers it)
  - new `test/answer-form.test.mjs`
- **Done test:** `node --test test/answer-form.test.mjs && npm test`, with these new cases:
  - "What is 27/100 as a percent?": `0.27` → wrongForm nudge with `tries` still 0; then `27%` → correct on the first try (full points)
  - "Write 13/25 as a decimal.": `52/100` → nudge; `0.52` → correct
  - a whole-number answer 3: `12/4` → nudge; `3` → correct
  - the decimal bonus ("write that as a decimal"): `3/8` → nudge, `0.375` → correct
  - fractions are unchanged: an unsimplified fraction still gets the `notSimplest` retry
  - the log entry for a nudge has `formNudge: true` and does not count as a first-try miss
- **Owner:** `self`

#### Execute (Slice 4)
- Add `formOf(it)`: `it.form` if set (slice 5), else from the prompt (`as a percent` → percent, `as a decimal` → decimal, `as a fraction` → fraction), else whole when the expected answer is an integer, else none.
- Add `formOk`: percent needs `%` or the word percent; decimal needs a decimal point or an integer, never `/`; whole has no `/` and no fractional part; fraction needs `/`.
- In `grade()`: value right but form wrong → `'wrongForm'` (math, numeric pack items and the bonus).
- In `submit()`: `'wrongForm'` → retry with the D4 nudge text and no change to `tries`, streak, points or Leitner; the log entry gets `formNudge: true`.
- Per D4, after the 2nd nudge on the same item the nudge also shows the expected answer written in the asked form.
- Write `test/answer-form.test.mjs` (engine unit tests with hand-built `S.current` items, like `boss316()` in `test/stuck.test.mjs`).
- Done test: `node --test test/answer-form.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D4.)

### Slice 5: Pack authors declare the answer form (#6) — ✅ done
Area: `grading` · Design: [D4](#d4-answer-in-the-asked-form)

- **Ships:** A nightly pack can say exactly which form a numeric answer must take (`"form": "percent" | "decimal" | "fraction" | "whole"`). The publisher catches packs whose prompt and answer disagree (e.g. "as a percent" with answer 0.27), so pack questions grade by the same rule as generated ones.
- **Touches:**
  - `publish-lessons.mjs`: `numeric` case (allow answers like `27%`; validate `form`; prompt/answer consistency)
  - `src/engine.js`: `packItem` numeric passes `q.form` through as `it.form`
  - `LESSONS.md`: Formats table (numeric row) plus a short "Answer form" note
  - `test/answer-form.test.mjs` (new cases)
- **Done test:** `node --test test/answer-form.test.mjs && npm test`, with these new cases:
  - validator: an "as a percent" prompt with answer `0.27` → exit 1 mentioning "answer form"
  - validator: `form: "percent"` with answer `27%` passes
  - validator: an unknown `form` value → exit 1
  - engine: a pack numeric item with `form: "decimal"` nudges `52/100` and accepts `0.52`
- **Owner:** `delegate(task="Add the optional numeric `form` field to the pack validator, engine packItem and LESSONS.md, per plan D4 (needs slice 4 merged)", verify="node --test test/answer-form.test.mjs && npm test")`

#### Execute (Slice 5)
- Needs slice 4 (`formOf` / `formOk` in the engine).
- Validator: accept `%` answers for numeric items; `form` must be one of percent|decimal|fraction|whole; error when the prompt names a form and the answer is written in another one.
- `packItem`: pass `q.form` as `it.form`.
- Document it in the `LESSONS.md` Formats table.
- Add the cases to `test/answer-form.test.mjs`.
- Done test: `node --test test/answer-form.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D4.)

### Slice 6: Mastery takes real answers, not a thumbs-up (#7) — ✅ done
Area: `medals` · Design: [D3](#d3-honest-medals)

- **Ships:** A topic is only mastered, and only earns a medal, through graded answers. A "👍 Got it!" self-check alone never masters, infers or awards anything. One right answer never masters a topic, and a medal needs 3 first-try correct graded answers.
- **Touches:**
  - `src/engine.js`: `submit()` self-check branch (no `setMastered` / `inferDown` on "yes"), the mastery threshold `need` (kid MCQ 1 → 2, pack minimum 2), the diagnostic branch (no medal), `award()` gated on a new `rec.ft` (first-try correct count)
  - `LESSONS.md`: the mastery paragraph after Schema; `README.md` "Medals & trophies" bullet
  - new `test/medals.test.mjs`
- **Done test:** `node --test test/medals.test.mjs && npm test`, with these new cases:
  - self-check "yes": the topic stays `learning`, no `inferred` event, no medal, and the next item for it is a graded check (kid MCQ or generator)
  - kid MCQ: one first-try right → not mastered; right again on another day → mastered
  - diagnostic first-try right → mastered for placement (inference still runs) but no medal
  - a medal is awarded on the 3rd first-try correct graded answer, not before
  - the existing `test/stuck.test.mjs` cases still pass
- **Owner:** `self`

#### Execute (Slice 6)
- Self-check "yes": keep +5 points and the kind message, set `rec.st='learning'`, `rec.selfYes=now`, `S.focus=id` so a graded check comes next. No mastery, inference or medal.
- Count first-try correct graded answers in `rec.ft`.
- Per D3: mastery needs ≥ 2 first-try correct graded answers (no `packN` shortcut below 2); a repeated identical question counts at most once per PT day.
- Diagnostic: keep `setMastered` + `inferDown` for placement, remove `award()` there.
- `award()` only when the topic is directly mastered and `rec.ft ≥ 3`.
- Existing medals and mastery are recomputed by slice 9 (Q1, resolved); this slice only changes new awards.
- Write `test/medals.test.mjs`.
- Done test: `node --test test/medals.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D3.)

### Slice 7: Legendary medals come from a real boss fight (#8) — ✅ done
Area: `medals` · Design: [D3](#d3-honest-medals)

- **Ships:** A legendary medal means a boss of at least 3 graded questions was beaten. One-question bosses are gone: non-math Play bosses (a kid MCQ with 1 heart) no longer happen, and a quest boss stage needs at least 3 graded questions.
- **Touches:**
  - `src/engine.js`: `buildItem` format choice and boss HP (no boss format for `quiz` / `self` items), `tierOf` / `award` (legendary only after ≥ 3 graded boss answers in that fight)
  - `publish-lessons.mjs`: a boss stage with < 3 graded questions is an error
  - `LESSONS.md`: boss rules; `packs/examples/example-quest.json` if its boss is short
  - `test/medals.test.mjs` (new cases)
- **Done test:** `node --test test/medals.test.mjs && npm test`, with these new cases:
  - a non-math boss topic built in Play is never `format: 'boss'`
  - a pack boss stage won with 1 graded question awards the topic's normal tier, not legendary
  - a Play math boss won after 3 hits awards legendary
  - validator: a boss stage with 2 graded questions → exit 1
- **Owner:** `self`

#### Execute (Slice 7)
- `buildItem`: kid MCQ and self-check items never get the boss format (they become `quest` / `minigame`).
- Track graded boss answers in the current fight; `award(..., boss)` gives legendary only when there were ≥ 3, otherwise the topic's normal tier.
- Validator: error when the boss stage has < 3 graded questions.
- Update the `LESSONS.md` boss rules and the example quest if needed.
- Add the cases to `test/medals.test.mjs`.
- Done test: `node --test test/medals.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D3.)

### Slice 8: One trophy per achievement (#9)
Area: `medals` · Design: [D3](#d3-honest-medals)

- **Ships:** Trophies and the parent report list each medal once: one per topic and one per quest. Duplicates already stored are collapsed (the earliest is kept) without losing a real medal.
- **Touches:**
  - `src/engine.js`: new exported `trophies(S,g)` (deduped list + counts); `migrate` dedupes `S.medals` by topic id and `S.questMedals` by quest date; guard in `award` / `completeQuest`
  - `src/worker.js`: `/api/trophies` uses `E.trophies`
  - `src/parent.js`: `medals` and `head.medals` use `E.trophies`
  - new `test/trophies.test.mjs`
- **Done test:** `node --test test/trophies.test.mjs && npm test`, with these new cases:
  - progress with one topic medal twice and one quest medal twice → `trophies()` lists each once and the counts match
  - `migrate` collapses the duplicates and keeps the earliest `at`
  - the parent report `head.medals` equals the `trophies()` length
  - completing the same quest twice adds one quest medal
- **Owner:** `delegate(task="Find how duplicate trophies get stored, guard it, and add a deduped E.trophies() used by /api/trophies and the parent report", verify="node --test test/trophies.test.mjs && npm test")`

#### Execute (Slice 8)
- Reproduce how a duplicate gets in (sandbox reset copy, re-completion, backfill) and note the cause in this issue's Progress.
- Add the guard where it happens.
- Add `E.trophies(S,g)`: topic medals keyed by id, quest medals keyed by date, newest first, plus counts.
- Use it in `/api/trophies` and `parentData`.
- `migrate`: collapse stored duplicates, keeping the earliest.
- Write `test/trophies.test.mjs`.
- Done test: `node --test test/trophies.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D3.)

### Slice 9: Existing medals re-earned under the new rules (#19)
Area: `medals` · Design: [D3](#d3-honest-medals)

- **Ships:** Medals and mastery awarded under the old rules are recomputed once under the new ones (Q1, Kent: "Update all with new rules"). Topics that don't qualify lose mastery or their medal, legendary medals without a real boss fight drop to the topic's normal tier, and duplicates are collapsed. Every topic that loses mastery goes back into the review queue (due now), so review gates re-verify it.
- **Touches:**
  - new `migrate-medals.mjs` (one-time script: `--dry-run`, `--local`, `--backup <file>`), using `kvGet` / `kvPut` / `kvList` from `lib-cli.mjs` so it runs against both Cloudflare KV and `--local` storage
  - `src/engine.js`: new exported pure `rescore(S, g, logs)` → `{S2, before, after, changes}` that applies the slice 6-8 rules (reuses `trophies()` from slice 8)
  - `backup-progress.mjs`: print the sha256 of the saved record so the migration can check the backup
  - `LESSONS.md` / `README.md`: one line on the medal re-check; `CHANGELOG.md` entry
  - new `test/rescore.test.mjs` with a synthetic fixture `test/fixtures/rescore-progress.json` (made-up records only, no real data)
- **Done test:** `node --test test/rescore.test.mjs && npm test`, plus `node migrate-medals.mjs --local --dry-run` on the fixture showing the before/after table, with these new cases:
  - fixture: a topic mastered by self-check only (`how: 'self'`) → loses mastery, ends up due now in the review queue, and its medal is removed
  - a topic with 1 first-try correct graded answer → loses mastery; with 2 it stays mastered but its medal is removed; with 3 it keeps its medal
  - a legendary medal won with a 1-question boss → downgraded to the topic's normal tier
  - duplicate topic and quest medals → one each; quest medals are otherwise kept
  - a placement (diagnostic) first-try mastery stays mastered without a medal; inferred topics are left inferred
  - running `rescore` twice changes nothing the second time (idempotent, `S.rules >= 2`)
  - `migrate-medals.mjs --local --dry-run` prints before/after counts and writes nothing (file mtime unchanged)
  - `migrate-medals.mjs --local` without `--backup`, or with a backup whose sha256 doesn't match the current record, exits 5 and writes nothing
- **Owner:** `self`

#### Execute (Slice 9)
- Needs slices 6, 7 and 8. Run it live only after slices 10 and 12 (gates and spot-checks) have shipped, so re-queued topics are re-verified.
- Write `E.rescore(S, g, logs)`: count first-try correct graded answers per topic from all `log:*` entries (not self-checks, not form nudges). If a topic has no log history, fall back to `rec.c` and flag it as `fallback` in the report.
- Rules (D3): `how: 'self'` or < 2 first-try correct answers (and no placement first-try correct) → not mastered; < 3 → no medal; legendary only with ≥ 3 graded boss answers in one fight, otherwise the normal tier; dedupe via `trophies()`. Inferred topics are unchanged.
- A topic that loses mastery becomes `{st: 'mastered', how: 'inferred', reverify: true, box: 0, due: now}`: it stays on the map, but it is due now and counts as unverified, so gates (slices 10 and 12) re-check it. Set `S.rules = 2`.
- `migrate-medals.mjs`: load progress and logs; `--dry-run` prints a before/after table (directly mastered, self-mastered, medals by tier, legendary, quest medals, duplicates removed, topics re-queued, fallbacks) and writes nothing.
- Without `--dry-run`, require `--backup <file>` from `node backup-progress.mjs` (same storage flag) whose sha256 matches the current record; otherwise exit 5. Write only `progress` and never touch `sandbox:*` keys.
- The live Cloudflare run needs Kent's explicit go-ahead at execution time. Until then, run only `--dry-run` against live data, and the full run only on `--local` fixtures.
- Write `test/rescore.test.mjs` and the synthetic fixture.
- Done test: `node --test test/rescore.test.mjs && npm test`, plus `node migrate-medals.mjs --local --dry-run` on the fixture showing the before/after table
- Decisions frozen: design sections and resolved open questions apply as written. (Design D3.)

### Slice 10: Review gates between quest stages (#10)
Area: `review` · Design: [D2](#d2-review-gates-built-into-quests)

- **Ships:** In a started quest, before some later stages, the learner opens a 🗝️ gate by answering 1-2 spaced-review items picked at runtime from the engine's due Leitner queue (most overdue first). Gate answers move Leitner boxes exactly like reviews, so due reviews stop piling up while quests run.
- **Touches:**
  - `src/engine.js`: `next()` gets a gate step before `packNext` while `questActive`; new `gateNext(S,g,pack,now)`; gate state in `S.quests[date].gates`; gate items are built with `buildItem(..., 'review', ...)`, `format: 'gate'`, `it.gate = {k, n, of}`; `submit()` review branches unchanged so Leitner counts
  - `LESSONS.md` ("How the app uses it", Quests) and `docs/NIGHTLY.md` ("Spaced review"): describe gates
  - new `test/review-gates.test.mjs`
- **Done test:** `node --test test/review-gates.test.mjs && npm test`, with these new cases:
  - with 5 overdue topics, finishing stage 1 serves a gate item (`mode: 'review'`, `format: 'gate'`) for the most overdue direct topic before stage 2's first item
  - a first-try right gate answer moves the topic up a box and pushes `due` out
  - a missed gate item demotes the topic like a missed review, and the gate still opens
  - no due topics → no gate, and the quest goes straight to the next stage
  - at most 3 gates × 2 items per quest; quest `total` and `pct` are unchanged by gates
  - outside quests, Play's own review cadence is unchanged
- **Owner:** `self`

#### Execute (Slice 10)
- Implement D2 gate placement: gates before stage 2, before the middle stage and before the boss (deduped for short quests), max 3 per quest.
- `gateNext`: due topics sorted by `due`, direct before inferred; 2 items per gate (1 if ≤ 2 are due); the soon-due fallback from D2; otherwise no gate.
- Store `S.quests[date].gates[k] = {items, right, open}`; a gate opens once its items are answered (right, learning moment or skipped).
- Gate items go through the existing review grading, so boxes and demotion work as they do now.
- Gates are not counted in quest `total` or `pct`.
- Update the `LESSONS.md` / `docs/NIGHTLY.md` text that says quest review stages replace engine reviews.
- Write `test/review-gates.test.mjs` (engine unit tests with a small hand-built quest pack).
- Done test: `node --test test/review-gates.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D2.)

### Slice 11: Gates show on the quest path (#11)
Area: `review` · Design: [D2](#d2-review-gates-built-into-quests)

- **Ships:** The learner sees 🗝️ keys between stages on the quest path and a clear gate card ("Unlock the gate with something you learned before!"). The parent report's quest view shows each gate's results.
- **Touches:**
  - `src/engine.js`: `questInfo` adds `gates: [{before, state: 'locked'|'open', items, right}]`; `publicItem` exposes `gate`
  - `public/app.js`: quest path in the reveal / Quests tab (the `stages` rendering) and the item header for `format: 'gate'`; `public/app.css`
  - `src/parent.js` + `public/parent.js`: gate results in the quest stages
  - new `test/gates-server.test.mjs` (standalone server with a seeded `DATA_DIR/progress.json` that has due topics)
- **Done test:** `node --test test/gates-server.test.mjs && npm test`, with these new cases:
  - seeded server: start the example quest and finish stage 1 via `/api/answer`; `/api/state` has `item.format === 'gate'` and `quest.gates[0].state === 'locked'`
  - after answering the gate items, `quest.gates[0].state === 'open'` and the next item is from stage 2
  - the `/parent` embedded data includes the gate results
  - plus a sandbox screenshot of the path with keys, attached in Progress
- **Owner:** `delegate(task="Render review gates on the quest path, gate card and parent quest view (needs slice 10)", verify="node --test test/gates-server.test.mjs && npm test")`

#### Execute (Slice 11)
- Needs slice 10.
- `questInfo`: add `gates`; `publicItem`: add `gate`.
- `app.js`: draw a 🗝️ node between stages (locked or open) and a gate header on gate items.
- Parent report: show each gate's items and how many were right.
- Write `test/gates-server.test.mjs` following `test/server.test.mjs`, seeding `progress.json` (no real data: synthetic topic records only).
- Done test: `node --test test/gates-server.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D2.)

### Slice 12: Gates spot-check guessed skills (#12)
Area: `review` · Design: [D2](#d2-review-gates-built-into-quests)

- **Ships:** About one gate item in three is a quick spot-check of a skill the app only inferred (credited but never seen). Right → the skill is verified and counts as shown directly. Wrong → it goes back to learning, and the guesses built on it are withdrawn. A spot-check never awards a medal.
- **Touches:**
  - `src/engine.js`: `gateNext` mixes in inferred topics; `submit()` for `it.spot`: right → `how='direct'`, `verified=now`, event `verified`; miss → `st='learning'`, `failUp`, event `spotMiss`
  - `src/parent.js`: verified vs inferred counts; `export-progress.mjs`: `unverifiedInferred`
  - `test/review-gates.test.mjs` (new cases)
- **Done test:** `node --test test/review-gates.test.mjs && npm test`, with these new cases:
  - with inferred-only topics available, about 1 in 3 gate items is a spot-check, picked by the D2 rule (most dependents, then lowest confidence)
  - spot-check right → `how: 'direct'`, `verified` set, no medal event
  - spot-check miss → `learning`, topics inferred from it are removed (`failUp`), a `spotMiss` event is logged
  - nothing due but inferred topics exist → the gate is all spot-checks (gates never come up empty)
- **Owner:** `self`

#### Execute (Slice 12)
- Needs slice 10.
- In `gateNext`, target 1 in 3 gate items from inferred, never-verified topics (D2 picking rule); spot-checks use the review item builder.
- Handle the result as in Ships, logging `verified` / `spotMiss`.
- Leitner: a verified topic keeps its box; a missed one resets like a missed review.
- Add `unverifiedInferred` to the export and the parent head.
- Add the cases to `test/review-gates.test.mjs`.
- Done test: `node --test test/review-gates.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D2.)

### Slice 13: Nightly hands spaced review to the gates (#13)
Area: `review` · Design: [D2](#d2-review-gates-built-into-quests)

- **Ships:** The nightly author stops spending quest budget on review stages, and the export shows review health so starvation is visible: due, overdue, oldest overdue, gate items and spot-checks in the last 7 days, and unverified inferred topics.
- **Touches:**
  - `publish-lessons.mjs`: replace the 15-20% review-share warning with a warning on `review: true` stages ("review runs through gates now"); summary line
  - `export-progress.mjs`: new `reviewHealth` block
  - `LESSONS.md` (rule 4, "How the app uses it") and `docs/NIGHTLY.md` (step 4 bullet, "Spaced review" section)
  - `test/quest-size.test.mjs` and `test/server.test.mjs` (export case)
- **Done test:** `node --test test/quest-size.test.mjs test/server.test.mjs && npm test`, with these new cases:
  - a pack with a `review: true` stage passes with a "review gates" warning
  - a pack with no review stages gets no review-share warning
  - `export-progress.mjs --local` output has `reviewHealth` with numeric `due`, `overdue`, `oldestOverdueDays`, `gateItems7d`, `spotChecks7d`, `unverifiedInferred`
- **Owner:** `delegate(task="Retire review-share rules in the validator, add reviewHealth to the export and rewrite the spaced-review docs for gates (needs slices 10 and 12)", verify="node --test test/quest-size.test.mjs test/server.test.mjs && npm test")`

#### Execute (Slice 13)
- Needs slices 10 and 12.
- Validator: drop the review-share warning; warn on `review: true` stages (still valid, for backward compatibility).
- Export: add `reviewHealth` (fields in the done test) from progress and the 7-day logs.
- Rewrite the spaced-review text in `LESSONS.md` and `docs/NIGHTLY.md` for gates.
- Add the test cases.
- Done test: `node --test test/quest-size.test.mjs test/server.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D2.)

### Slice 14: See which areas have been explored (#14)
Area: `coverage` · Design: [D5](#d5-coverage-rotate-in-untouched-areas)

- **Ships:** The nightly export shows coverage by area: for every subject, how many of its areas (Marble domains) have been touched by real graded answers or direct mastery, which are untouched, and up to 3 ready starter topics near the target age for each untouched area.
- **Touches:**
  - new `src/coverage.js`: `coverage(S, g, logs, {age})` → `{subjects: [{name, total, seen, domains: [{name, seen, answered, mastered, starters}]}], untouched}`
  - `export-progress.mjs`: add `coverage`
  - new `test/coverage.test.mjs`
- **Done test:** `node --test test/coverage.test.mjs && npm test`, with these new cases:
  - blank learner: Mathematics 0/12 and Science 0/19 seen
  - a directly mastered topic in one math area → Mathematics 1/12; an inferred-only topic does not count
  - a graded answer in the log marks its area seen; a self-check does not
  - each untouched area lists ≤ 3 starters that are ready and not below target age − 2
  - `export-progress.mjs --local` output includes `coverage`
- **Owner:** `self`

#### Execute (Slice 14)
- Write `src/coverage.js` using the D5 definition of "seen".
- Starters: ready topics in the area, closest to the target age first, never below age − 2.
- Add `coverage` to the export.
- Write `test/coverage.test.mjs`.
- Done test: `node --test test/coverage.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D5.)

### Slice 15: Nightly quests visit new areas (#15)
Area: `coverage` · Design: [D5](#d5-coverage-rotate-in-untouched-areas)

- **Ships:** Every nightly quest brings in at least one untouched area. The publisher reports which areas a quest touches and warns when it adds no untouched area while some exist. `LESSONS.md` asks for one stretch stage from `coverage.untouched` per quest, rotating subjects with math and science first.
- **Touches:**
  - `publish-lessons.mjs`: coverage report using `src/coverage.js` and the read-only progress it already loads (`--offline` skips it)
  - `LESSONS.md` ("How to plan tomorrow's quest") and `docs/NIGHTLY.md` (step 4)
  - `test/coverage.test.mjs` (validator cases with a temp `DATA_DIR`, `--local --dry-run`)
- **Done test:** `node --test test/coverage.test.mjs && npm test`, with these new cases:
  - with seeded progress, a quest only in seen areas → warning "no new area"
  - adding a stage from an untouched area → summary shows "new areas: 1" and no warning
  - `--offline` skips the coverage check
- **Owner:** `delegate(task="Report quest coverage in publish-lessons.mjs and add the rotate-untouched-areas rule to LESSONS.md and NIGHTLY.md (needs slice 14)", verify="node --test test/coverage.test.mjs && npm test")`

#### Execute (Slice 15)
- Needs slice 14.
- Frozen (Q2, Kent): no new area is a WARNING only, never an error.
- Validator: compute the quest's areas, compare with `coverage()`; print "new areas: N"; warn when N = 0 and untouched areas exist.
- Add the rotation rule to `LESSONS.md` and `docs/NIGHTLY.md`.
- Add the validator cases to `test/coverage.test.mjs`.
- Done test: `node --test test/coverage.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D5.)

### Slice 16: Play wanders into new areas (#16)
Area: `coverage` · Design: [D5](#d5-coverage-rotate-in-untouched-areas)

- **Ships:** Free Play (outside quests) mixes in topics from untouched areas: ready topics in unseen areas get a frontier score bonus, and the "Something different" choice picks an untouched area first.
- **Touches:**
  - `src/engine.js`: `score()` (bonus), `pickFocus`, `choose('different')`; uses the seen-area set from `src/coverage.js`
  - `test/coverage.test.mjs` (new cases)
- **Done test:** `node --test test/coverage.test.mjs && npm test`, with these new cases:
  - with `Math.random` stubbed, a ready topic in an unseen area outranks an otherwise equal one in a seen area
  - `choose('different')` focuses an unseen area when one has a ready topic
  - no unseen areas → the same pick as before
- **Owner:** `self`

#### Execute (Slice 16)
- Needs slice 14.
- Add the D5 bonus to `score()` for topics in unseen areas.
- `choose('different')`: try unseen areas (other subject first), then the current behaviour.
- Add the cases to `test/coverage.test.mjs`.
- Done test: `node --test test/coverage.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D5.)

### Slice 17: Parent report shows coverage by area (#17)
Area: `coverage` · Design: [D5](#d5-coverage-rotate-in-untouched-areas)

- **Ships:** `/parent` gets a "Coverage by area" section: per subject, areas explored out of total, with the untouched areas listed, so a parent can see breadth at a glance.
- **Touches:**
  - `src/parent.js`: `parentData` adds `coverage` (from `src/coverage.js` with the 14-day logs)
  - `public/parent.js` + `public/parent.css`: render the section
  - `test/server.test.mjs` (the `/parent` case)
- **Done test:** `node --test test/server.test.mjs && npm test`, with these new cases:
  - `test/server.test.mjs` "parent report includes coverage": the embedded data JSON has `coverage.subjects` with Mathematics total 12 and Science total 19
  - plus a sandbox screenshot of the section, attached in Progress
- **Owner:** `delegate(task="Add a Coverage by area section to the parent report (needs slice 14)", verify="node --test test/server.test.mjs && npm test")`

#### Execute (Slice 17)
- Needs slice 14.
- `parentData`: add `coverage`.
- `public/parent.js`: render explored / total per subject with untouched areas listed.
- Extend the `/parent` case in `test/server.test.mjs`.
- Done test: `node --test test/server.test.mjs && npm test`
- Decisions frozen: design sections and resolved open questions apply as written. (Design D5.)

## Progress log

One entry per slice once its done test passes: what shipped, the done test and its result, anything deferred or discovered.

### Slice 1 (#2) ✅
- Shipped: publish-lessons.mjs enforces the quest budget: error above 16 graded questions or 7 stages, warning below 10 graded, a time estimate (graded × 25 s + cards × 10 s) in the summary with a warning above 8 min; deep dives need 3-4 graded questions. The example quest is trimmed to 16 graded (≈ 7.5 min). LESSONS.md rule 6 and NIGHTLY.md Size updated. New shared test/helpers.mjs.
- Done test: `node --test test/quest-size.test.mjs && npm test`: 4/4 new cases pass, 13/13 in npm test.
- Deferred / discovered: Already-published packs are not re-validated by the app (grandfathered): the engine plays whatever is in KV.

### Slice 2 (#3) ✅
- Shipped: New E.completeQuest stores a completion snapshot (stages + total) and the quest medal once; worker questCheck uses it. questInfo reads the snapshot for done quests (100%, original stages only); E.questLocked makes a done quest's pack serve nothing (packQ). migrate marks pre-snapshot finished quests legacy (they report 100% over the stages that were played). parent.js and export use stage topicIds instead of indexes.
- Done test: `node --test test/quest-lock.test.mjs && npm test`: 4/4 new cases pass, 17/17 in npm test. Also checked on a read-only copy of the live record: the finished quest that showed 86% now reports 100% (9 of its 10 stages: the added stage is ignored).
- Deferred / discovered: -

### Slice 3 (#4) ✅
- Shipped: publish-lessons.mjs reads progress read-only up front and refuses (exit 4, nothing written) to overwrite lessons:<date> or write boost:<date> for a finished quest; --force does not override; --dry-run reports it too; --offline skips it. Republishing a started, unfinished quest warns for each answered stage that changed or was removed. LESSONS.md has a new 'Finished quests are locked' section; NIGHTLY.md step 5 and the script header document exit 4.
- Done test: `node --test test/publish-lock.test.mjs && npm test`: 4/4 new cases pass, 21/21 in npm test.
- Deferred / discovered: -

### Slice 4 (#5) ✅
- Shipped: engine: formOf/formOk/formCheck; grade() returns 'wrongForm' for math items, numeric pack items and the decimal bonus when the value is right but the form isn't (incl. 27 for a percent). submit() answers with a kind nudge ('Right value! Now write it as a percent (like 50%). ✍️'), no try/streak/points/Leitner change; the 3rd nudge on an item also shows the expected answer. Nudges are logged as {event:'formNudge'} so reports never count them as answers or misses. app.js: no shake on a nudge.
- Done test: `node --test test/answer-form.test.mjs && npm test`: 6/6 new cases pass, 27/27 in npm test.
- Deferred / discovered: No generator prompt needed rewording: they already say 'as a percent' / 'as a decimal' / 'What fraction'. The nudge examples are generic (like 50%) so the first nudge never gives the answer away.

### Slice 5 (#6) ✅
- Shipped: Numeric pack questions take an optional form (percent|decimal|fraction|whole), passed to the engine by packItem. The validator accepts answers like 27%, rejects an unknown form, and fails a question whose prompt (or form) asks for one form while the answer is written in another ('answer form: ...'). LESSONS.md: numeric row + an 'Answer form' note.
- Done test: `node --test test/answer-form.test.mjs && npm test`: 4/4 new cases pass (10/10 in the file), 31/31 in npm test.
- Deferred / discovered: Already-published packs (incl. the in-progress one) are over the new size budget; they are grandfathered: the app never re-validates a published pack.

### Slice 6 (#7) ✅
- Shipped: Self-check 'yes' no longer masters, infers or medals: the topic stays learning (selfYes noted), keeps its +5 and kind words, and a graded check comes next (S.focus). New rec.ft counts first-try correct graded answers (not guided; an identical question at most once per Pacific day, kid MCQs keyed by their base question). Mastery needs ≥ 2 (MASTERY_MIN; kid MCQ 1 → 2, pack minimum 2). Medals come from maybeMedal(): directly mastered + ft ≥ 3 (MEDAL_MIN), on any first-try right (also in review). Diagnostic first-try rights master for placement (rec.placed) without a medal. A mastered-direct topic no longer re-triggers 'MASTERED' and a box reset in later quest stages. LESSONS.md 'Mastery and medals', README bullet.
- Done test: `node --test test/medals.test.mjs && npm test`: 4/4 new cases pass, 35/35 in npm test (stuck tests unchanged).
- Deferred / discovered: Existing medals are untouched here; slice 9 re-scores them.

### Slice 7 (#8) ✅
- Shipped: Kid-MCQ and self-check items are never bosses (no 1-heart bosses). New rec.bossRun counts first-try right boss answers per skill per Pacific day (a boss miss resets it); a boss win awards legendary only with bossRun ≥ 3 (BOSS_LEGEND), otherwise the topic's normal tier. The validator fails a quest boss stage with < 3 graded questions. LESSONS.md teach→boss rules: new 'Real bosses' rule.
- Done test: `node --test test/medals.test.mjs && npm test`: 4/4 new cases pass (8/8 in the file), 39/39 in npm test.
- Deferred / discovered: The example quest's boss already has 4 graded questions; no change needed.

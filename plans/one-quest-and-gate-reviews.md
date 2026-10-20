# One quest at a time, and reviews that reach the learner (v0.5)

**Status:** in progress on branch `feat/one-quest-and-gate-reviews`, 2/4 slices done. Tracking issue: #29.

## Why
- **Reviews.** The nightly export said the review gates served 0 review items in the last 7 days while many
  topics were due. Diagnosis (read-only, live data + a local sim on a copy): the gate code does pick due Leitner
  items (in the sim, the in-flight quest serves gate reviews after about 7 items), and in real use the learner
  hadn't played since gates shipped. So the 0 means "not reached yet", and the export metric didn't say so. Two real problems
  remain:
  1. **Starvation in a long quest.** In a started quest, Play serves no reviews of its own, so reviews only come
     through gates at fixed stages. A session that stops between gates serves none, and a multi-day (or refreshed)
     quest makes that common.
  2. **Budget discrepancy.** v0.4 froze "at most 4 gate items" per sitting, but the code allows 3 gates × 2 = 6.
- **Quests.** With up to 3 active quests, a learner gets a "New quest!" alert while still mid-quest. That spreads
  effort across stories instead of finishing one.

## Design
- **D1 Gate budget and warm-up.** At most **4 gate items per quest per Pacific day** (the frozen v0.4 budget, read
  per sitting so multi-day quests keep getting reviews). The first item boundary of each day in a started quest is
  a **warm-up gate**: 1-2 due reviews before the quest continues, never interrupting an item in flight. Stage gates
  (before stage 2, the middle stage and the boss) use what's left of today's budget; when nothing is left they
  open for free. Gates never block (unchanged), spot-checks unchanged.
- **D2 Honest review metric.** `reviewHealth` adds `reviewsServed7d` (every review answer, Play or gate),
  `gatesOpened7d`, `gatesAhead` (gates not reached yet in the current quest), `lastPlayed` and
  `daysSinceLastPlay`, plus a plain `note` that tells "not played / gates not reached yet" from "played but no
  reviews served".
- **D3 One active quest.** The **current quest** is the started, unfinished quest (the focused one, else the
  oldest). With none started, it is the newest unstarted quest pack. Every other unfinished quest pack is
  **queued**: not listed as a quest to do, no "New quest!" alert, and `/api/quest/start` refuses it. The Quests tab
  shows the current quest prominently, a "Next up: ???" teaser when something is queued, and finished quests as
  history. The cap of 3 is gone.
- **D4 Nightly refresh.** With a started, unfinished quest, the nightly **refreshes** it instead of publishing a new
  one: `node publish-lessons.mjs <pack.json> --refresh --date <quest date>` re-authors only the **unreached**
  stages. A stage is reached once it has an answer, or holds the item in flight, and so is every stage before it.
  Reached stages and the `quest` block must stay byte-identical (error otherwise, exit 6). The size budget applies
  to the remaining stages. A new quest while one is unfinished is refused (exit 3, use `--refresh`). Finished
  quests stay locked (exit 4). **Catch-up boosts are retired:** a refresh does the same job better. The validator
  refuses new boosts, and the app still applies any existing `boost:*` key.
- **D5 Live state.** The older started quest stays the single active quest. The newer unstarted one is not
  folded in (different story, and it would push the remaining stages over budget). It stays **queued** and becomes
  the next quest once the current one is finished, unless the nightly publishes a newer one first. No progress
  data changes; reached stages and answers are untouched.

## Slices
| # | Slice | Area | Issue |
|---|---|---|---|
| 1 | Reviews reach the learner in every quest session | review | #25 ✅ |
| 2 | The export tells "not reached yet" from "broken" | review | #26 ✅ |
| 3 | One active quest at a time | quests | #27 |
| 4 | The nightly refreshes the unreached stages | quests | #28 |

### Slice 1: Reviews reach the learner in every quest session (#25) — ✅ done
- **Ships:** The first time a learner continues a quest each day, 1-2 due reviews come first (a warm-up gate),
  and gates never add more than 4 review items per quest per day. A session that stops between stage gates still
  gets reviews.
- **Touches:** `src/engine.js` (gate budget, warm-up gate, `questInfo`), `public/app.js` (warm-up frame text),
  `test/review-gates.test.mjs`, `LESSONS.md` "Review gates", `docs/NIGHTLY.md`.
- **Done test:** `node --test test/review-gates.test.mjs && npm test`, with these new cases:
  - **Repro:** a learner resumes a started quest mid-stage with reviews due and plays 6 items before the next
    gate. The old rules served 0 reviews; now the warm-up serves 1-2 first.
  - a 7-stage quest serves at most 4 gate items in one day
  - a second day of the same quest gets a new warm-up
  - an item in flight is never interrupted
  - plus a local sim on a copy of real data (`plans`-external script) where due reviews get served
- **Owner:** `self`

#### Execute (Slice 1)
- Add a per-quest, per-PT-day gate counter (`S.quests[d].gateDay = {day, n}`); `GATE_DAY_MAX = 4`.
- Warm-up: in `next()`, for a started quest whose `gateDay.day` isn't today, serve up to 2 due reviews (spot-check
  rules apply) as gate items `{k:'w', …}` before the next stage item.
- Stage gates take `min(GATE_ITEMS, 4 − today's n)` items; open for free at 0.
- Done test: `node --test test/review-gates.test.mjs && npm test`
- Decisions frozen: D1 as written (gates never block, budget 4 per sitting).

### Slice 2: The export tells "not reached yet" from "broken" (#26) — ✅ done
- **Ships:** The nightly sees whether reviews are flowing: reviews served by Play and gates, gates opened, gates
  still ahead in the current quest, the last play date, and a plain note.
- **Touches:** `export-progress.mjs` (`reviewHealth`), `docs/NIGHTLY.md`, `test/server.test.mjs`.
- **Done test:** `node --test test/server.test.mjs && npm test`, with the export case checking the new numeric
  fields and a `note` of "not played since …" for a learner with no answers in the window.
- **Owner:** `self`

#### Execute (Slice 2)
- Compute the fields from the 7-day logs and the current quest's `questInfo().gates`.
- `note`: no answers in the window → `not played since <date>: gates not reached yet`; answers but 0 reviews
  while due > 0 → `played but no reviews served: check the gates`; else `ok`.
- Done test: `node --test test/server.test.mjs && npm test`
- Decisions frozen: D2 as written.

### Slice 3: One active quest at a time (#27)
- **Ships:** The app has exactly one current quest. A newer quest pack waits hidden (no alert, can't be started)
  until the current one is finished, then appears as the new quest. The Quests tab shows the current quest big,
  "Next up: ???" when one is waiting, and finished quests below.
- **Touches:** `src/engine.js` (`questLineup`), `src/worker.js` (state, `/api/quest/start`, `/api/quests`),
  `public/app.js` + `public/app.css` (Quests tab, strip), `export-progress.mjs` (quests block),
  `test/one-quest.test.mjs` (new), README.
- **Done test:** `node --test test/one-quest.test.mjs && npm test`:
  - started quest A + newer unstarted quest B → current A, B queued, no `newQuest`, starting B is refused (409)
  - after A is finished → B is current and `newQuest` is true
  - no started quest + two unstarted → the newest is current
  - the Node server's `/api/quests` lists one current quest, `nextUp: true`, and no other quest to play
- **Owner:** `self`

#### Execute (Slice 3)
- `E.questLineup(S, packsByDate, today)` → `{current, queued, newQuest}` per D3; the Worker uses it everywhere the
  cap logic was.
- Quests tab: one big card, teaser, finished list; remove the "x/3 active" chip and the paused messages.
- Done test: `node --test test/one-quest.test.mjs && npm test`
- Decisions frozen: D3 and D5 as written.

### Slice 4: The nightly refreshes the unreached stages (#28)
- **Ships:** While a quest is unfinished, the nightly re-authors only the stages the learner hasn't reached, from
  that day's performance, with one command. The publisher rejects any change to reached stages.
- **Touches:** `publish-lessons.mjs` (`--refresh`, new-quest refusal, boost retirement, remaining-stage budget),
  `lib-cli.mjs` (`questReached`), `export-progress.mjs` (`quests.nextStep`, reached/remaining stages),
  `LESSONS.md`, `docs/NIGHTLY.md`, `test/refresh.test.mjs` (new).
- **Done test:** `node --test test/refresh.test.mjs && npm test`:
  - a refresh that changes only unreached stages passes and publishes
  - a refresh that changes a reached stage (or the quest block) fails with exit 6, nothing written
  - a new quest while one is unfinished fails with exit 3 and points to `--refresh`
  - the remaining-stage budget is enforced (17 graded in unreached stages → too long)
  - a refresh of a finished quest still exits 4; a boost file is refused
  - the export's `quests.nextStep` says REFRESH with the reached and remaining stages
- **Owner:** `self`

#### Execute (Slice 4)
- Reached = indexes ≤ max(last stage with a `packSeen` answer, the in-flight item's stage).
- `--refresh` requires a started, unfinished quest at `--date`; compare against the published pack.
- Document the exact nightly commands in LESSONS.md and docs/NIGHTLY.md.
- Done test: `node --test test/refresh.test.mjs && npm test`
- Decisions frozen: D4 as written.

## Release (tracking issue)
PR → merge → v0.5.0 → tag/release → `npm run deploy` (backs up first). Live check: points, solved, medals, answers
and the current quest's position unchanged; only the intended quest-state view changes (one active quest, the newer
quest queued). gitleaks clean.

## Progress log

### Slice 1 (#25) ✅
- Shipped: Warm-up gate: the first item boundary of each Pacific day in a resumed, started quest serves 1-2 due reviews (spot-check rules apply), never mid-item. Gates (warm-up + stage) serve at most 4 review items per quest per day (GATE_DAY_MAX, the frozen v0.4 budget per sitting); a stage gate reached after that opens for free. This also fixes a discrepancy: v0.4 allowed 3 gates × 2 = 6 items. Kid frame: '🔥 Warm-up! A quick one you learned before (1/2)'. LESSONS.md and docs/NIGHTLY.md updated. Diagnosis of the 0 gate items: the gate picker does select due items (including the re-scored ones); the learner simply hadn't played since gates shipped, and in-quest Play serves no reviews of its own, so a session ending between gates got none.
- Done test: `node --test test/review-gates.test.mjs && npm test`: 12/12, including the repro (resume mid-stage with reviews due, 6 items: 0 reviews before, warm-up first now), the 4-a-day cap, a new warm-up on a new day, and no interruption of an item in flight; 86/86 in npm test. Local sim on a copy of real data: the item in flight, then 2 warm-up reviews, then 2 gate reviews before the next stage gate stage (4 that day), and the boss gate opens for free.
- Deferred / discovered: Two slice-10 tests were updated for the 4-a-day budget (previously 6 gate items in one day).

### Slice 2 (#26) ✅
- Shipped: export-progress.mjs reviewHealth adds reviewsServed7d, gatesOpened7d (gates and warm-ups that served items; answer logs now record the gate key), gatesAhead (stage gates not reached in active quests), lastPlayed, daysSinceLastPlay and a note: 'ok' / 'not played since <date>: gates not reached yet' / 'played but no reviews served: check the gates'. docs/NIGHTLY.md and LESSONS.md describe the fields.
- Done test: `node --test test/server.test.mjs && npm test`: 6/6 server tests (the export case checks all numeric fields and note 'ok'; a new case with no answers in the window gets 'not played since …: gates not reached yet'), 87/87 in npm test. On a local state with reviews due and no recent answers: reviewsServed7d 0, gatesAhead > 0, note 'not played since <date>: gates not reached yet'.
- Deferred / discovered: None.

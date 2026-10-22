# School alignment: BVSD and High Peaks Elementary

Jane's quests pick topics from the Marble Skill Taxonomy by the learner's weak spots, strengths, review queue and
target age. That is a good engine, but it knows nothing about what the learner is doing at school *this month*. A
**school profile** fixes that: it tells the export, the nightly author, Play and the parent report which units the
learner meets at school in each month of the year, and which taxonomy topics teach them. Quests can then reinforce
what school is teaching, get a little ahead of it, and use its stories (the War of 1812, a magnet marsh) as the setting.

This document describes the profile that ships, `data/school/bvsd-high-peaks.json`: **High Peaks Elementary**, a
Core Knowledge focus school in the **Boulder Valley School District** (Boulder, Colorado), **grade 2**. It also
explains how the mapping was built so you can check it, adjust the pacing to your child's classroom, and add the next
grade when the time comes.

## How it works

```
data/school/bvsd-high-peaks.json ─┐
data/local-topics/topics.json ────┤ build.mjs ──► public/tax.json (Marble + local topics), public/school.json
                                  ┘                  │
                                     ┌───────────────┼──────────────────┐
                                     ▼               ▼                  ▼
                           export-progress.mjs   publish-lessons.mjs   src/worker.js
                           school.now / .next    "school units: N"     Play +20 bonus, /parent "At school this month"
```

- **Profile** (`data/school/*.json`): per grade, a list of **units**. Each unit has a subject, a title, the program it
  comes from, the **months** it runs (1-12), **standards codes** and the **topics** (Marble `mt_` or local `lt_` ids)
  that teach it. `build.mjs` validates every topic id and bundles the profiles into `public/school.json`.
- **Settings:** `LEARNER_GRADE` written like `2nd grade` (or `Grade 3`, `K`) picks the grade. `SCHOOL_PROFILE` picks
  the profile when more than one ships (default: the only one). Both go in `wrangler.toml` `[vars]` or the environment.
- **Export** (`node export-progress.mjs`): a `school` section with `now` (this month's units) and `next` (next
  month's), each with its topics, their states in Jane and up to 3 `starters`. Frontier topics in a current unit are
  listed first and flagged `school: true`.
- **Nightly rule** ([LESSONS.md](../LESSONS.md) rule 8): every quest includes at least one stage from a current unit.
  The validator prints `school units: N` and warns (never fails) at 0 while units are running.
- **Play:** topics in this month's units get a +20 focus bonus, between the day's pack (+40) and unseen areas (+10).
- **Parent report** (`/parent`): an **At school this month** section with each unit's program, standards, topics
  colored by Jane's state, and what is coming next month.
- **Summer:** in June and July no units run (`now` is empty) and `next` shows August.

**Pacing is approximate.** Months come from the school's published curriculum maps and typical unit lengths; a
classroom can run a few weeks ahead or behind. If the teacher's newsletter says the class is on a different unit,
edit the `months` arrays (and run `npm run build`). Nothing else needs to change.

## What the learner meets at school (grade 2)

### Programs (BVSD board-adopted materials, as listed by the district)

| Subject | Program | Notes |
|---|---|---|
| Mathematics | **Illustrative Mathematics K-5** (Imagine Learning) | District core adoption, 2025. Supplemental: IXL. The Colorado Department of Education also provides free access to Zearn Math. (A few BVSD schools keep Math Expressions until fall 2026; High Peaks lists the Illustrative Math units.) |
| Literacy | **HMH Into Reading** (K-5) + **Fundations** (K-3) | Into Reading adopted 2023 and in all schools from 2024-25; Fundations phonics since 2018. Supplemental: IXL, Lexia Core5. Screening: Amplify mCLASS / DIBELS 8. |
| Science | **FOSS Next Generation** (grades 1-5) + **Core Knowledge** science units | District core adoption 2022. Grade 2 FOSS modules: *Pebbles, Sand, and Silt*; *Solids and Liquids*; *Insects and Plants*. |
| Social studies | **Core Knowledge Sequence** | High Peaks is a Core Knowledge focus school: the Sequence is taught alongside the district curriculum and the Colorado standards. |
| SEL | **Second Step** | Plus a daily class "campfire". |

### Month by month

The High Peaks 2nd grade team lists its Core Knowledge topics as: magnetism/electricity, landforms/changing land,
insects, the U.S. Constitution, the War of 1812, the human body (digestive system), Ancient Greece, and civil rights /
changemakers. The school's Core Knowledge curriculum maps place them in the months below. Math and literacy units are
sequential (Illustrative Math units 1-9, Into Reading modules 1-10), so their months are estimates from unit lengths.

| Month | Math (Illustrative Math) | Literacy (Into Reading; Fundations all year) | Science | Social studies (Core Knowledge) | SEL (Second Step) |
|---|---|---|---|---|---|
| Aug | U1 Adding, subtracting, and working with data | M1 Be a Super Citizen | Landforms and changing land (FOSS Pebbles, Sand, and Silt) | | Growth mindset and goal-setting |
| Sep | U1 → U2 Adding and subtracting within 100 | M1 → M2 Look Around and Explore | Landforms → Magnets and electricity | Maps and globes | Growth mindset and goal-setting |
| Oct | U2 → U3 Measuring length | M2 → M3 Meet in the Middle | Magnets and electricity | The Constitution and the War of 1812 | Growth mindset and goal-setting |
| Nov | U3 → U4 Addition and subtraction on the number line | M4 Once Upon a Time | Solids, liquids and states of matter (FOSS Solids and Liquids) | | Emotion management |
| Dec | U4 → U5 Numbers to 1,000 | M5 Lead the Way | States of matter | Economics and personal finance | Emotion management |
| Jan | U5 → U6 Geometry, time, and money | M6 Weather Wise | | | Emotion management |
| Feb | U6 → U7 Adding and subtracting within 1,000 | M7 Everyone Has a Story | Science biographies | Immigration and citizenship | Empathy and kindness |
| Mar | U7 → U8 Equal groups | M8 Time to Grow | Insects and plants (FOSS Insects and Plants) | Civil rights and changemakers | Empathy and kindness |
| Apr | U8 → U9 Putting it all together | M9 Home Sweet Habitat | Insects and plants (Insect Museum) | Ancient Greece (Greek plays) | Problem-solving |
| May | U9 | M10 Many Cultures, One World | The digestive system and healthy eating | | Problem-solving |

Grammar and punctuation, the writing genres (narrative, informational, opinion, poetry, letters), vocabulary and
Fundations phonics run all year as their own units in the profile, so a quest can always draw an English stage from
them.

### Standards

Colorado's math and reading/writing standards cite the Common Core codes, and its science standards cite the NGSS
performance expectations, so the Marble topics' own `standards` field (`ccss-math:2.NBT.1`, `ngss-k5:2-PS1-1`, …)
gave most of the mapping directly: 28 Marble topics carry grade 2 math codes, 32 carry grade 2 ELA codes and 13 carry
grade 2 NGSS codes. Each unit lists the Colorado grade-level expectation codes it covers (`cas-ma-2020:MA.2.NBT.A`,
`cas-rw-2020:RW.2.2.3`, `cas-sc-2020:SC.2.1.1`, `cas-ss-2022:SS.2.4.2`) plus the Common Core / NGSS codes and the Core
Knowledge Sequence section (`ck-seq:G2.AH.II`). Codes only: no standards text is copied into the repo.

## Local topics: what Marble does not cover

The Marble taxonomy has no U.S. history, civics or map skills (its History subject is Ancient Egypt, Greece and Rome,
and medieval times). `data/local-topics/topics.json` adds **21 local topics** (`lt_` ids) in the same shape as a Marble
topic, each with a 3-option kid question, prerequisites and standards codes:

| Area (History subject) | Topics |
|---|---|
| 🗺️ Maps & Geography | Map keys and symbols · Compass rose and directions · Seven continents and five oceans · Equator, hemispheres and poles · Landform words · Our place: Colorado, the U.S. and its neighbors |
| 🇺🇸 American History | The Constitution: We the People · The War of 1812 · Fort McHenry and The Star-Spangled Banner · Immigration: coming to America · Fighting for a cause: equal rights · Rosa Parks and Martin Luther King Jr. · Jackie Robinson and Cesar Chavez · Susan B. Anthony, Eleanor Roosevelt and Mary McLeod Bethune |
| 🏛️ Civics & Government | What government does · Leaders: mayor, governor, president · Being a citizen · Making your community better |
| Life Skills / Money & Finance | Scarcity: not enough for everyone |
| Science / Scientific Inquiry, Forces & Motion | Science heroes (Leeuwenhoek, Elijah McCoy, Florence Nightingale, Daniel Hale Williams) · Earth is a magnet: how a compass works |

They work everywhere a Marble topic does: in packs (`topicId`, `teaches`, `skill`), on the island map (three new
History areas with their own icons), in coverage, medals and the parent report. Prerequisites link them to each other
and to Marble (the compass topic needs *Magnetic Poles* first). 23 matching glossary words were added
(`constitution`, `compass rose`, `scarcity`, …).

Everything in these two files is original text written for this project (ODbL 1.0 / CC BY-SA 4.0, see
[LICENSING.md](../LICENSING.md)). Unit titles follow the school's public maps and the publishers' public unit names;
the Core Knowledge Sequence is referenced by section code only (it is free for noncommercial use, and no text from it
is copied). NGSS is a registered trademark of WestEd; neither WestEd nor the lead states were involved in this project
and do not endorse it (see `data/marble/PROVENANCE.md`).

## Younger learners: what changed in the engine

Jane was written for upper elementary, and a few rules were hard-coded for a 10-year-old regardless of `LEARNER_AGE`.
With a 2nd grader (age 8) they served the wrong level, so v0.5 makes them relative to the target age:

| Before | Now |
|---|---|
| Placement probes were drawn only from topics for ages 9-11 | Topics within a year of the target age (within 3 years as a fallback) |
| Play penalised every topic starting under age 8 by 30 points | Penalty applies under target age − 2 |
| "Harder" / "easier" fell back to age 10 | Fall back to the target age |
| First question: 3/8 of a pizza as a fraction, bonus as a decimal | Under age 9: "8 slices, you eat 3, a friend eats 2, how many are left?", with the fraction as the bonus |
| A placement queue seeded under the old rule kept its age 9-11 probes | Probes more than 2 years above the target age are dropped |

The nightly rules were already relative (`LEARNER_AGE`, the "2 years below" warning), and the quest budget, gates and
medals are unchanged.

## Writing a school-aligned quest

1. Run `node export-progress.mjs` and read `school.now`. Each unit shows its `starters` (ready or learning topics,
   closest to the target age) and `counts`.
2. Give the quest one or two stages from current units, ideally one that is also in `weakSpots.goDeeper`, and use the
   unit's setting for the hook and stage names. Keep the teach → guided → graded → boss order: a local topic's boss
   can only test skills an earlier stage `teaches`.
3. A stretch stage from `school.next` gets the learner ahead of class (a good use of the "visit a new area" slot when
   the unit's area is untouched).
4. `node publish-lessons.mjs packs/<date>.json --dry-run` prints `school units: N (…)`.

`packs/examples/example-quest-grade2.json` is a complete October example: the Constitution (local topic, taught then
tested), magnetic poles (Marble), measuring in centimeters (Illustrative Math unit 3), the War of 1812 (local), and a
Fort McHenry boss that only tests what the quest taught.

## Maintaining the profile

- **Pacing:** edit `months` in `data/school/bvsd-high-peaks.json`, then `npm run build` (it validates the file) and
  redeploy. The parent report and the export follow immediately.
- **Next grade:** add a `"3"` key under `grades` with the same shape. High Peaks' Core Knowledge maps already list the
  3rd grade science and social studies units (ecology, life cycles, the human body, Earth's minerals, forces and
  motion; Ancient Rome, the Vikings, the earliest Americans, exploration of North America, the 13 colonies); the
  Illustrative Math grade 3 units and Into Reading modules follow the same pattern. Marble has rich coverage of Rome,
  the human body and forces, and the Civics and Maps areas carry over; new local topics are only needed for U.S.
  history units.
- **Another school:** copy the file, give it a new `id` and set `SCHOOL_PROFILE`. The schema is validated by
  `validateProfile` in `src/school.js` and exercised by `test/school.test.mjs`.

## Sources

- High Peaks Elementary, *About* (Core Knowledge focus school): https://hpe.bvsd.org/about
- High Peaks Second Grade, *Academics* (Into Reading, the nine Illustrative Math units, the Core Knowledge topics,
  Second Step): https://sites.google.com/bvsd.org/highpeakssecondgrade/academics
- High Peaks Core Knowledge curriculum maps, science and social studies (linked from the High Peaks Educational Team
  open-enrollment page): https://www.highpeaksedteam.org/open-enrollment.html
- BVSD, *Instructional Materials, Board Adopted*; *Math*; *Literacy*; *Science*:
  https://www.bvsd.org/parents-students/academics/board-adopted-materials
- Illustrative Mathematics K-5, grade 2 units: https://accessim.org/k-5/grade-2
- FOSS Next Generation grade 2 modules: https://fossnextgeneration.com
- Colorado Academic Standards (2020 mathematics, reading/writing and science; 2022 social studies), grade 2 family
  guide and CSV downloads: https://ed.cde.state.co.us/standardsandinstruction/guidestostandards/cas-2-guide and
  https://www.cde.state.co.us/apps/standards/
- Core Knowledge Sequence (K-8), grade 2: https://www.coreknowledge.org/core-knowledge-sequence/
- Marble Skill Taxonomy v1 standards links (`data/marble/topics.json`, `standards` field) and
  `data/marble/PROVENANCE.md`.

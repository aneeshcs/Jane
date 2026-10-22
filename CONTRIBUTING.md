# Contributing

Thanks for helping! A few ground rules:

## Licenses of contributions
By contributing, you agree that your contribution is licensed under the license of the path you change
(see [LICENSING.md](LICENSING.md)):

- **Code** (`src/`, `server/`, `test/`, `public/*.js|css|html`, `prototype/`, Docker files, scripts): **MIT**.
- **Data** (`data/`, generated `tax.json`/`glossary.json`): **ODbL 1.0** for the database, **CC BY-SA 4.0** for text.
  Don't edit `data/marble/` (it's the unchanged upstream dataset); put changes in the derived files instead, or
  send taxonomy fixes upstream to https://github.com/withmarbleapp/os-taxonomy. Topics a school curriculum needs that
  Marble lacks go in `data/local-topics/topics.json` (`lt_` ids, with a kid question and prereqs); school profiles go
  in `data/school/` (see [docs/SCHOOL.md](docs/SCHOOL.md)). `npm run build` validates both.
- **Content** (`packs/examples/`, `LESSONS.md`, `docs/`): **CC BY-SA 4.0**.

## Privacy (important: this is a kids' app)
Never commit a child's data: no `progress` records, answer logs, exports, backups, screenshots of real progress,
or lesson packs written from a real child's answers. Real nightly packs live in `packs/*.json`, which is gitignored;
only generic examples go in `packs/examples/`. Never commit `local-data/`, `wrangler.toml`, `CLOUDFLARE_API_TOKEN` or any `.env`.

## Before you open a PR
```bash
npm run build                       # rebuilds tax.json, glossary.json, gen.js (also validates kid prompts and the glossary)
node publish-lessons.mjs packs/examples/example-quest.json --dry-run --offline
npm test                            # Node server smoke test (no Cloudflare needed)
./deploy.sh --dry-run --outdir /tmp/jane-dist
```
Kid-facing text follows the voice rules in [LESSONS.md](LESSONS.md): talk to the kid as "you", ≤ 15 words, grade-level words, and write
`{name}` instead of a real name (the app fills in `LEARNER_NAME`).

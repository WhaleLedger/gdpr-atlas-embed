# Country Factsheets — gdpr.com.tr Knowledge Hub

This folder holds the verified factsheet database that powers the dashboard's right-side card (summary tier) and the deep-dive view (details tier).

## Layout

```
factsheets/
├── schema.json     ← JSON Schema describing every {CODE}.json
├── README.md       ← this file
├── {CODE}.json     ← structured, machine-readable factsheet
└── {CODE}.md       ← bilingual long-form deep dive (TR section + EN section)
```

`{CODE}` is the ISO 3166-1 alpha-2 country code (`TR`, `DE`, `FR`…), or `EU` for the GDPR umbrella entry.

## Tiers

Each `{CODE}.json` contains two tiers of content, both bilingual:

- **`summary`** — compact, dashboard-shaped. Drives the right-card and chips. Mirrors the legacy `data.js` shape but is the new source of truth.
- **`details`** — long-form, citation-bearing. Drives a future "Detaylı görünüm / Deep dive" expansion in the side card and the standalone `{CODE}.md` document.

The Markdown sibling (`{CODE}.md`) is the human-edit-friendly version. JSON is generated from / kept in sync with Markdown manually for now; a future build step may automate it.

## Source standards

Every factual claim in `details.*` should carry a footnote marker `[^id]` that resolves to an entry in the `sources` array. Source quality, in order of preference:

1. **Official law text** (mevzuat.gov.tr, EUR-Lex, national gazettes).
2. **Regulator publications** (KVK Kurumu, EDPB, national DPA decisions and guidelines).
3. **Court rulings** (CJEU, national constitutional / administrative courts).
4. **High-quality secondary** (Kluwer, IAPP, Bird & Bird GDPR Tracker).
5. Avoid blogs and news summaries unless they're the only contemporaneous source for a recent decision.

The `lastUpdated` field is the date a maintainer (re-)verified every source link and confirmed no later development supersedes the content.

## Bilingual rules

- **Law titles** stay in the original language even inside an English `details` block (e.g. `Bundesdatenschutzgesetz (BDSG)` is never translated).
- **Regulator names** stay in the original, with a parenthetical English translation on first mention if the local name isn't transparent.
- **Quotations** from official guidance stay in the source language; a translation can follow in parentheses.
- Both `summary.tr` and `summary.en` must be writable as standalone documents — neither references the other.

## Pilot countries

The first batch (template + 5 anchors): `TR`, `EU`, `DE`, `FR`, `IE`, `ES`. Once the schema and voice are validated, the remaining 25 jurisdictions follow.

## Disclaimer

These factsheets are general legal information, not advice. They reflect the law as understood at the `lastUpdated` date; readers facing concrete matters should consult counsel.

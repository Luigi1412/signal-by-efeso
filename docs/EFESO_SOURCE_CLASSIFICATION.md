# EFESO source classification

Private files live in `private/efeso-knowledge-sources/` and are gitignored. The reviewable inventory is `data/efeso-knowledge/source-manifest.json`.

## Types

- `official_website` — current public EFESO pages; canonical for current positioning.
- `institutional_deck` — historical/internal decks; versioned if they diverge from the live site.
- `public_case` — approved public cases.
- `commercial_proposal` — reusable method/problem only after sanitization; never a completed case.
- `prime_twin_report` — benchmark/reference only.
- `internal_email` — restricted.
- `internal_case_material` — internal, approval required.
- `canonical_taxonomy` — product catalog keys, not a client document.

## Official website snapshots

Official About / Services / Industries / Client Results / Awards pages are snapshotted with the existing `safeFetch` helper into `data/efeso-knowledge/official-website-snapshots.json` (URL, title, fetched_at, content hash, excerpt). Current pages remain canonical public sources; older decks remain historical or internal when they diverge.

Refresh with `npm run snapshot:efeso-official`.

## Proposals may contribute

Reusable, de-identified: methodology, business problem, approach, standard deliverable, engagement stage, capability relationship.

Restricted account context stays off the member catalog: prices, investment, fees, contacts, consultant names, proposal validity, and confidential operating detail.

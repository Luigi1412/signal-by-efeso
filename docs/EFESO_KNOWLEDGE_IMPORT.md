# EFESO knowledge import

## Pre-flight

```bash
npm run check:efeso-knowledge-sources
```

Confirms the 19 required private filenames (Unicode-normalized). Prints present / missing / duplicate names only. Never prints file contents. Exit code is non-zero when a required file is missing.

## Pack files

- `data/efeso-knowledge/source-manifest.json`
- `data/efeso-knowledge/efeso-knowledge-pack.v1.json`

The v1 pack is a curated catalog: canonical taxonomy plus official-website proofs and sanitized reusable methods. It does not include prices, contacts, full documents, or completed cases derived from proposals. PrimeTwin emails are historical benchmarks only.

Regenerate the JSON from the TypeScript catalog:

```bash
npm run write:efeso-knowledge-data
```

## Import

```bash
npm run import:efeso-knowledge -- --dry-run
npm run import:efeso-knowledge
```

The importer is idempotent, schema-validated, and does not call Ollama, OpenAI, or Tavily. Duplicate stable keys and aliases fail the run. Existing objects with a changed content hash are archived and superseded instead of overwritten in place. When real catalog objects are imported, `demo_seed` knowledge is archived.

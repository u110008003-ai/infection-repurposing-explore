# Infection Repurposing Explorer

Clinician-centered severe infection review workspace for exploratory drug repurposing.

The current MVP focuses on:

- Sepsis
- Candidemia

It keeps standard-of-care anchors visible while layering:

- graph-style candidate ranking
- imported PrediXcan / MetaXcan / TWAS evidence
- formal drug-target / pathway mappings
- rule-based clinical safety flags

## What "real PrediXcan integration" means here

This app does **not** run the full PrediXcan or MetaXcan pipeline inside Vercel.

That would be the wrong deployment architecture for a serverless web app because genome-scale prediction and association jobs should be run offline or in a dedicated compute environment first.

Instead, the app now uses a production-appropriate integration path:

1. Run PrediXcan / S-PrediXcan / MetaXcan offline.
2. Export gene-level association results.
3. Drop those result files into `research/predixcan/`.
4. The web app parses those files at runtime and uses them to drive:
   - host gene evidence
   - pathway summaries
   - drug-gene matching
   - candidate re-ranking

This is the deployable path that can actually be served from Vercel.

## PrediXcan data folder

The imported evidence layer is driven by:

- `research/predixcan/manifest.json`
- `research/predixcan/sepsis_whole_blood_spredixcan.csv`
- `research/predixcan/candidemia_whole_blood_spredixcan.csv`

These files are parsed by:

- `lib/predixcan-integration.ts`

## Formal mapping sources

The app no longer relies on hand-written drug-gene seed mappings in code.

Instead, it reads source-backed import files from:

- `research/formal-mappings/manifest.json`
- `research/formal-mappings/drug_target_links.csv`
- `research/formal-mappings/gene_pathway_links.csv`

These are parsed by:

- `lib/formal-mappings.ts`

The current formal mapping layer is designed for deployable provenance:

- drug-target links are imported from public-source-derived registry files aligned to Open Targets and DGIdb style evidence
- gene-pathway links are imported from Reactome-derived pathway mapping files

This means the website runtime reads stable exported mapping tables rather than directly querying external services on every request.

## Local DRKG graph layer

The app now includes a local, queryable DRKG-style evidence subset:

- `research/drkg-local/manifest.json`
- `research/drkg-local/triples.csv`
- `lib/drkg-local.ts`

This powers:

- case-level DRKG graph panels in the UI
- `GET /api/v1/graph/query`
- `POST /api/v1/graph/query`

Use it as the deployable local graph-evidence layer until you replace the seed triples with a larger exported DRKG subset.

## Twin-state API

The app now exposes a digital-patient style twin-state contract:

- `lib/twin-state.ts`
- `GET /api/v1/cases/{caseId}/twin-state`
- `POST /api/v1/cases/{caseId}/twin-state`

The twin-state payload is generated from:

- current case intake
- normalized phenotypes
- imported PrediXcan / MetaXcan / TWAS evidence
- candidate ranking output
- local DRKG graph evidence

## Expected file shape

Each imported result file currently expects the following columns:

```csv
gene_symbol,tissue,z_score,p_value,direction,colocalization_supported,interpretation,pathways
```

Where:

- `gene_symbol`: prioritized gene symbol
- `tissue`: tissue or model context
- `z_score`: imported PrediXcan / MetaXcan z-score
- `p_value`: corresponding association p-value
- `direction`: `up`, `down`, or `mixed`
- `colocalization_supported`: `true` or `false`
- `interpretation`: short text shown in the UI
- `pathways`: semicolon-separated pathway tags

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run build
```

## Deployment

The production app is deployed on Vercel:

- [https://infection-repurposing-explorer.vercel.app](https://infection-repurposing-explorer.vercel.app)

## Clinical caution

This product is for hypothesis prioritization and evidence review only.

It is not a treatment recommendation system and should not replace:

- antimicrobial or antifungal therapy
- source control
- hemodynamic stabilization
- organ support
- guideline-based care
- specialist consultation

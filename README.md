# Infection Repurposing Explorer

Clinician-centered severe infection review workspace for exploratory drug repurposing.

The current MVP focuses on:

- Sepsis
- Candidemia

It keeps standard-of-care anchors visible while layering:

- graph-style candidate ranking
- imported PrediXcan / MetaXcan / TWAS evidence
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

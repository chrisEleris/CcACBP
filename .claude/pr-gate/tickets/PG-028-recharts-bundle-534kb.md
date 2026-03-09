---
id: PG-028
title: Recharts bundled as 534 kB monolithic chunk impacting load performance
severity: low
status: open
files: [vite.config.ts]
created_by: qa-engineer
updated_by: qa-engineer
---

## Summary

The Vite build produces a recharts vendor chunk of 534.61 kB (160.22 kB gzipped). This is a single monolithic chunk that must be downloaded before any charting page renders.

## Evidence

- Build output: `dist/public/assets/recharts-BSrohh5L.js 534.61 kB │ gzip: 160.22 kB`
- Vite build warning: "Some chunks are larger than 500 kB after minification"

## Why this matters

- On slow connections, 160 kB compressed JavaScript delays Time-to-Interactive
- Users visiting non-chart pages still download the full library if it's in the main bundle
- Exceeds Vite's recommended chunk size limit

## Proposed fix

Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to isolate recharts, or use dynamic `import()` on pages that use charts so recharts is only loaded when needed.

## Acceptance checks

- [ ] Recharts chunk is isolated or lazy-loaded
- [ ] No build warning about chunk size
- [ ] Non-chart pages don't download recharts

## Debate

### Gatekeeper claim

Performance optimization for initial load. Not blocking but impactful for user experience.

### Author response

_Not yet provided._

### Gatekeeper reply

_Not yet provided._

## Final resolution

Pending.

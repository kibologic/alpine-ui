# DRR-001 — Frontend test infrastructure (vitest + jsdom + @swissjs/vite-plugin)

**Date:** 2026-07-21
**Requested by:** TEST-001-frontend-test-infrastructure (queue task, ratified `fable/FABLE-DECISIONS-2026-07-21.md`)
**Decision:** APPROVED

---

## Packages

| Package | Version | Kind |
|---|---|---|
| `vitest` | `^3.2.4` | devDependency (test runner) |
| `jsdom` | `^25.x` | devDependency (DOM environment) |
| `vite` | `^5.4.19` | devDependency (peer of `@swissjs/vite-plugin`) |
| `@swissjs/vite-plugin` | `workspace:*` (sibling-linked to `../swiss-lib/plugins/vite`) | devDependency, first-party |
| `@swissjs/core` | `workspace:*` (sibling-linked to `../swiss-lib/runtime`) | devDependency, first-party |

---

## Purpose

alpine-ui's 29 `.uix` components currently have zero automated tests (measured
`fable/framework/FABLE-FRAME-003-framework-surface-is-unexercised.md`). This is the platform's
highest-fan-out, least-safeguarded code — every vertical depends on it. TEST-001 stands up the
harness here first (pure, mountable without a backend) so alpine-core/business-alpine/
hospitality-alpine can copy the pattern.

`vitest`+`jsdom` is not a new choice — it's the exact stack `swiss-lib`'s own runtime tests
already run against real framework primitives (see `swiss-lib/runtime/vitest.config.ts`). Matching
it, rather than choosing independently, is what TEST-001's own `never_touch` list requires, so
framework and platform tests stay mutually legible.

`@swissjs/vite-plugin` solves the actual unknown this task named: compiling `.uix` source outside
swite's dev-server. It already exists (`swiss-lib/plugins/vite`, ratified
`FABLE-DECISIONS-2026-07-11` A6, already proven in `swiss-devtools/capability-explorer`) — pure
delegation to `@swissjs/compiler`'s own transform, zero new compilation logic. Vitest's transform
pipeline is Vite-compatible, so the same plugin that unblocked capability-explorer's standalone
Vite build applies directly here with no new code in either package.

`@swissjs/core` was already an implicit runtime dependency of every `.uix` file in this repo (every
component imports `SwissComponent` from it) — it resolved only because consuming apps
(business-alpine, alpine-core) install it themselves and alpine-ui's source compiles into their
bundle. Running alpine-ui's own tests standalone requires it as a real, explicit devDependency for
the first time. This DRR formalizes an existing dependency, not a new one.

---

## Alternatives considered

- **`@testing-library/*`**: rejected for this pass. TEST-001's `never_touch` explicitly requires a
  DRR before adding it, and plain DOM assertions (`container.querySelector`, `.textContent`,
  native `dispatchEvent`) are sufficient for the 3 pilot components and match how swiss-lib's own
  runtime tests already interact with DOM nodes. Revisit only if the pilot proves the plain-DOM
  approach doesn't scale to the full 246-component migration.
- **A bespoke `.uix` compile step (esbuild plugin written from scratch)**: rejected — would
  duplicate `@swissjs/vite-plugin`, which already exists and is already proven. Building a second
  implementation is exactly the anti-pattern Article 18 forbids.
- **Playwright/browser-based component testing**: out of scope — that's `CROSS-001-B`'s territory
  (real-engine testing), a separate initiative with its own DRR gate already flagged in that task.
  This pass is jsdom-based unit/mount testing, not cross-engine validation.

---

## Security Risk: LOW

All five packages are either official Vite-ecosystem tooling (`vitest`, `vite`, `jsdom` — widely
adopted, no known active CVEs) or first-party packages already built and used elsewhere in this
organization (`@swissjs/vite-plugin`, `@swissjs/core`). No new external attack surface.

## Maintenance Risk: LOW

`vitest`/`vite`/`jsdom` are extremely widely adopted with active maintenance. The two `@swissjs/*`
packages are maintained in this same organization's `swiss-lib` repo.

## License: MIT ✅

All five packages are MIT-licensed, compatible with alpine-ui's own MIT license.

## Transitive dependency impact

`@swissjs/vite-plugin` pulls `esbuild` (already a `vite` transitive dependency, no new footprint).
`@swissjs/core` is the runtime alpine-ui components already assume exists at the consumer level —
no new transitive surface beyond what every consuming app already installs.

---

## Recommendation: APPROVED

Add to `alpine-ui`'s `packages/ui/package.json` devDependencies, link `swiss-lib/plugins/vite` and
`swiss-lib/runtime` as sibling workspace packages in `pnpm-workspace.yaml` (matching the existing
live-link pattern used for `alpine-shell` in `business-alpine`/`alpine-core`/`hospitality-alpine`,
not a published/patched snapshot).

# Frontend testing pattern (TEST-001)

How this repo's `.uix` components get tested, and how to copy this into `alpine-core`,
`business-alpine`, or `hospitality-alpine`.

## Stack

`vitest` + `jsdom`, matching `swiss-lib`'s own `runtime/vitest.config.ts` exactly (see
`fable/DECISIONS-2026-07-21.md` / TEST-001's `never_touch`: no bespoke test runner). `.uix`/`.ui`
files compile via `@swissjs/vite-plugin` (`swiss-lib/plugins/vite`) — pure delegation to
`@swissjs/compiler`'s own transform, the same one swite's dev-engine calls. Vitest's transform
pipeline is Vite-compatible, so this "just works" as a `plugins: [swissjs()]` entry in
`vitest.config.ts`; no bespoke compile step was written for this.

## Why sibling-linked, not npm-installed

`@swissjs/vite-plugin` and `@swissjs/core` are pulled in via `pnpm-workspace.yaml` sibling paths
(`../swiss-lib/plugins/vite`, `../swiss-lib/runtime`, `../swiss-lib/compiler`) — the same
live-link pattern already used for `alpine-shell` in `business-alpine`/`alpine-core`/
`hospitality-alpine`. `@swissjs/vite-plugin` has never successfully published to npm, so this is
the only way to consume it today. **This means CI must check out `swiss-lib` as a sibling
directory** — see `.github/workflows/ci.yml`'s `test` job. Any repo copying this pattern needs the
same second checkout step, or `pnpm install` will fail to resolve the workspace deps in an
isolated single-repo CI run.

## Mounting a component

`mount.ts` exports two helpers:

- `mountComponent(ComponentClass, props)` — instantiates the class directly and returns
  `{ container, instance, unmount }`. Use this whenever a test needs to mutate props/state after
  mount and re-render deterministically via `instance.performUpdate()` (synchronous — no `await`,
  no `requestAnimationFrame` polling needed, unlike `scheduleUpdate()` which is RAF-scheduled).
- `mountViaSwissApp(ComponentClass, props)` — goes through `SwissApp.mount()`, the exact entry
  point every real app's `main.ui` calls. Use this when a test only needs a single static render
  and doesn't need the instance back.

Both attach the container to `document.body` — components that check `element.isConnected` or
measure layout behave differently on a detached node, so don't test against a detached container.

## What the three pilots prove, and why those three

- **`StatusBadge.test.ts`** — simplest possible case (no state, no async, pure props-in/DOM-out).
  Proves the harness itself works before trusting it on anything harder.
- **`Modal.test.ts`** — conditional *visibility* without conditional *mount/unmount*. Modal.uix
  deliberately never `return null`s when closed (see its own comment) as a workaround for a real,
  reproduced framework defect where repeated null-return placeholder-swaps corrupt a sibling's DOM
  commits. The core test here (`keeps the backdrop node in the DOM when closed`) is a regression
  guard for that exact invariant — if someone "simplifies" it back to `if (!open) return null`,
  this is what catches it. Relevant to `FRONT-SHELL-002` (overlay portal root): whatever that work
  produces needs to preserve this same contract.
- **`DataTable.test.ts`** — the loading → loaded transition, the same shape as the platform's most
  persistent bug class (the stuck-loading investigation, `registry/fable/loading-state/`). The
  test flips `loading` off with real row data via `performUpdate()` and asserts the skeleton is
  gone AND real data is on screen — not just that the `loading` flag changed.

## Every pilot test was verified fail-before/pass-after (Article 17)

Not just written and left green. For each pilot, the underlying `.uix` source was temporarily
broken (removing the `type` fallback in StatusBadge, restoring the `return null` Modal explicitly
avoids, forcing `isLoading` to always be `true` in DataTable), the test suite was re-run to confirm
the relevant test(s) actually go red, then the source was reverted and confirmed green again. This
is why the plain-DOM assertions (no `@testing-library`) were trusted for this pass — each was
individually proven sensitive to the behavior it claims to guard, not just plausible-looking.

## What this pilot deliberately did NOT cover

- The other 243 components across the platform (26 more in this repo alone). This pass builds and
  proves the harness; mass test-writing is explicitly out of scope per TEST-001's `never_touch`.
- `@testing-library` — not added. Plain DOM queries (`querySelector`, `textContent`,
  `dispatchEvent`) were sufficient for these three. If the eventual full migration finds that
  doesn't scale, that's its own DRR, not a retrofit onto this pass.
- Focus-trap/restore behavior in `Modal.uix` (`_captureFocus`/`_restoreFocus`) — jsdom's focus
  model is limited enough that a reliable assertion here would need more investigation than this
  pilot's scope justified. Flagged, not silently skipped.
- Cross-engine behavior — this is jsdom, not a real browser engine. That gap is `CROSS-001-B`'s
  territory (Article 19), not this task's.

## Copying this to another repo

1. Add the same three `pnpm-workspace.yaml` sibling paths (adjust the `../` depth if the repo
   isn't a direct sibling of `swiss-lib` on disk).
2. Copy `vitest.config.ts`, `mount.ts`, and the devDependency block from
   `packages/ui/package.json`.
3. Add the same two-checkout CI job shape.
4. Write your own DRR — don't just reference this one; the dependency-governance rule is
   per-repo, no exceptions.

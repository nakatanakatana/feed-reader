# Frontend Testing

Frontend tests run in separate Vitest projects. Browser tests use Chromium,
jsdom tests cover browser-independent DOM behavior, API tests exercise real
clients and MSW handlers without Chromium, and Node tests cover code that does
not need a DOM.

## Authoring Browser Tests

A Browser test has two files with different responsibilities:

- A case module under `frontend/src` ends in `.browser.case.ts` or
  `.browser.case.tsx` and contains the suites and assertions.
- An entrypoint under `frontend/src/browser-tests` ends in `.test.ts` and owns
  each case through one static side-effect import.

Browser discovery includes only `src/browser-tests/**/*.test.ts`. A case module
is therefore not collected on its own. To add a Browser test:

1. Add the `.browser.case.ts` or `.browser.case.tsx` case module.
2. Add exactly one side-effect import for it to an entrypoint. Entrypoints may
   contain comments, but no bindings, dynamic imports, executable statements,
   ordinary `.test` imports, or imports of other entrypoints.
3. Use a singleton entrypoint unless the case has been shown to share process
   state safely with every other case in a group.
4. Run the entrypoint, the related-test command, and the Node ownership check.

The ownership check compares every case below `frontend/src` with all imports
from Browser entrypoints. It fails for unowned cases, duplicate owners,
unresolvable targets, unsupported statements, and chained entrypoints:

```bash
npm run test -- --project node src/test-utils/browser-entrypoints.node.test.ts
```

This is a filesystem integrity check, not proof that Vitest registered or ran
the tests. Browser collection and test-result comparisons are separate
acceptance checks.

## Running Browser Tests

Run an entrypoint directly for the shortest feedback loop:

```bash
npm run test -- --project browser src/browser-tests/modal-interaction.test.ts
```

Run tests related to a case module or a production dependency with
`test:related`:

```bash
npm run test:related -- src/components/ItemDetailModal.Focus.browser.case.tsx --project browser --run
```

Paths passed to `test:related` are relative to the Vitest root, `frontend`.
Do not prefix them with `frontend/`. The former `.test.tsx` path no longer
selects a migrated case: direct runs target its owning entrypoint, while
related runs target the case module or a production dependency.

For watch mode, omit the final one-shot `--run` and invoke Vitest without the
repository's `vitest run` script:

```bash
npx vitest --project browser src/browser-tests/modal-interaction.test.ts
```

A test-name filter can narrow assertions, but it does not bypass entrypoint
imports or their setup:

```bash
npm run test -- --project browser src/browser-tests/modal-interaction.test.ts -t "closes on Escape"
```

## Snapshots

Browser snapshots belong to the owning entrypoint, not to the case module.
Store them in `frontend/src/browser-tests/__snapshots__` using Vitest's
entrypoint-derived filename. When moving a case, move its snapshot without
changing snapshot keys or values, then run the owning entrypoint without
`-u`. Investigate path or resolver failures before updating snapshots.

Use `-u` only when the rendered output is intentionally changing, and review
the snapshot diff together with the production change. jsdom snapshots remain
with their jsdom test owners.

## Shared State, Mocks, and Cleanup

Every case must restore the state it changes. Dispose rendered roots, clear
temporary DOM nodes, restore timers and mocks, reset storage and MSW handlers,
and undo event listeners, viewport changes, styles, and router mutations.
Grouping does not create isolation between imported case modules: top-level
hooks and hoisted `vi.mock` or `vi.unmock` calls can affect the whole
entrypoint.

Keep a case in a singleton entrypoint when it uses module mocks or module
singletons, mutates router or global state, owns snapshots, changes the
viewport, or has cleanup that cannot be demonstrated to be independent. To
approve a group, run its entrypoint in both import orders and compare the test
identities and statuses. If either order changes behavior, retain singleton
ownership instead of weakening assertions or adding unrelated cleanup.

## Entrypoint Migration Validation

The 2026-09-16 migration retained 80 Browser case modules behind 67
entrypoints. Six grouped entrypoints own 19 compatible cases, while 61
singleton entrypoints preserve isolation for the remaining cases. The final
ownership inventory has 80 static imports, with no missing or duplicate owner.
All 80 case bodies and the seven relocated snapshots are byte-identical to
their pre-migration files.

The Task 1 Browser baseline was 216 passed and one skipped test across 80
source files. Its three process-time samples had a 37.51 second median and a
37.49–37.61 second range; Vitest reported a 35.73 second median and a
35.69–35.88 second range. The setup marker was evaluated 80 times per run.
The migrated suite still has 216 passed and one skipped test, and owner-level
comparison found the same full test-name/status multiset. It evaluates setup
67 times, a reduction of 13 evaluations (16.25%).

Two initial validation processes accidentally ran the Browser timing samples at
the same time. Their 47.61–50.83 second observations are retained for audit but
excluded from the conclusion. A subsequent uncontended warmup and three-run
sample used the same Browser settings with a temporary port: process times were
35.46, 35.17, and 35.39 seconds (median 35.39 seconds), versus the baseline
median 37.51 seconds. This is approximately a 5.7% reduction in this
three-run comparison; setup evaluations fell from 80 to 67. The result is
directional evidence, not a guarantee, because the temporary ports differed
and only three runs were measured. The separately measured complete,
non-coverage suite took 34.50 seconds and reported 474 passed and one skipped
test: 217 original Browser tests, 247 existing non-Browser tests, and 11
ownership tests.

Coverage excludes `src/**/*.browser.case.{ts,tsx}` because case modules are
imported implementation details rather than application source. Before this
exclusion, all 80 case modules appeared in `lcov.info`; afterward none did,
while the application-source file and denominator counts remained unchanged.
Oxlint likewise ignores `**/*.browser.case.ts` and
`**/*.browser.case.tsx`, preserving the same test-source treatment that the
pre-migration `.test.ts` and `.test.tsx` files received.

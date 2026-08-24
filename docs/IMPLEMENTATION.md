# Implementation

## Objective

A dispatch board where a job can be dragged between crews and between
days, where every move is optimistic and every rejection rolls back
cleanly, and where the server, not the client, is the source of truth on
scheduling conflicts. The board reads through GraphQL with no N+1, and the
whole thing is covered by tests that exercise the unhappy paths, not just
the happy one.

## Deliverable

Two apps in one repo. `apps/web` is the board (Next.js, Apollo, dnd-kit).
`apps/api` is the GraphQL backend (Flask, Graphene, SQLAlchemy). They
deploy to Vercel and Railway. A README explains how to run it locally and
how to reproduce the concurrency conflict by hand.

## The rule

If a move can end in something other than "it worked", that outcome is
part of the feature and gets built, not left for later. The optimistic
update, the rollback, the conflict rejection, and the toast that explains
it are the feature. The successful drag is the easy half.

---

## Why this shape

Each choice below is here because it maps to a specific problem worth
showing, not because it's the default.

GraphQL with Graphene and Flask, so the N+1 problem is real and has to be
solved with a DataLoader rather than described. The board is nested lists,
jobs inside crews inside days, which is the exact shape that turns one
query into hundreds if a resolver queries per item.

Apollo beyond the basics: a normalised cache, an optimistic mutation, and
the part most tutorials skip, which is what to do when the server rejects
and the UI has to walk itself back without looking broken.

Real drag-and-drop with dnd-kit, including the hard case: moving an item
between two groups that aren't both on screen at once (switching day mid
drag), and the accessible keyboard equivalent for that same move.

Concurrency without a WebSocket. Two people editing the same resource at
once, resolved with "the server decides, the client undoes", no
subscription and no polling.

The full test pyramid in a monorepo: pure logic with no DOM, components
with Testing Library, network mocks with Apollo, and end to end with
Playwright, including two browser contexts to prove the concurrency
conflict for real.

The domain is moving-company dispatch because it comes with real schedule
constraints, finite crews, finite trucks, time windows that collide, so
the technical problems above show up on their own instead of being forced
onto a generic todo list.

---

## What was decided

| Topic | Choice | Where |
| --- | --- | --- |
| Monorepo | Turborepo + npm workspaces | ADR-001 |
| Drag engine | @dnd-kit, no hand-built physics | ADR-002 |
| Day navigation | Tabs with auto-switch on drag | ADR-003 |
| Auth | None in v1, single dispatcher | ADR-004 |
| API + DB host | Railway | ADR-005 |
| Concurrency | Server decides, client rolls back, no WebSocket | ADR-006 |
| N+1 | DataLoader on every list resolver, guarded by a query-count test | ADR-007 |
| Logic boundary | `core/` (no JSX) split from `ui/` | ADR-008 |
| Mutation validation | Pydantic in `services/`, not inline `if`/`raise` | ADR-009 |

## Decisions taken without asking, and why

Tabs over stacked days. Both solve the "target must be on screen" tension,
and stacking is less code. Tabs won because it's how real dispatch boards
work and because the "target group isn't visible" problem is worth solving
well here. The cost is a whole module (`core/dragAutoSwitch.ts`) and a
keyboard shortcut that dnd-kit doesn't give for free. Taken on purpose,
eyes open. Full reasoning in ADR-003.

The cross-day keyboard shortcut is a candidate, not a final call.
`Tab`/`Shift+Tab` with the job picked up is the working assumption. It
gets confirmed when Phase 6 is built, and if it changes, the change lands
in `docs/DECISIONS.md`.

---

## Phases

In dependency order. No dates, the project has no fixed deadline. Each
phase assumes the previous one actually works, not just that its code was
written.

Phase 6 (cross-day drag) is the largest piece and the highest risk. It's
where ADR-003 gets paid off in full, and it has no shortcut: the
auto-switch mechanism, the keyboard equivalent, and tests for both paths
before it counts as done. If scope has to be cut anywhere, that's the
first place to re-argue it, in `docs/DECISIONS.md`, rather than quietly
dropping the keyboard path.

### Phase 0 — Scaffold

- [x] Root `package.json` with `workspaces: ["apps/*"]`, plus `turbo.json`
- [x] `apps/web`: Next.js 16 (App Router) + TypeScript strict + Tailwind v4
- [x] `apps/api`: Flask + Graphene + SQLAlchemy, `uv` for dependencies
- [x] Local Postgres (docker) for dev; Railway is deploy-only
- [x] `npm run dev` brings both apps up through turbo
- [x] Minimal CI: typecheck and lint on every push, no deploy yet

Checks. `npm run dev` brings web and api up, each answering on a health
check route.

### Phase 1 — Data model and GraphQL schema

- [x] SQLAlchemy models: `Crew`, `Job`, the `Job.crew_id` relation
- [x] A seed script with sample data (a few crews, jobs spread across 3
      days, including at least one latent conflict to test against later)
- [x] Graphene types matching the models
- [x] A `board(dates: [Date!]!)` query returning crews and jobs
- [x] A DataLoader for `Job.crew` from the first resolver that needs one
      (ADR-007 applies from Phase 1, it isn't a retrofit)

Checks. The `board` query returns the seeded data, `crew` resolved through
`CrewLoader` rather than the ORM. No GraphiQL UI yet, verified with `curl`
and two pytest cases (`tests/test_board_query.py`) instead: one asserting
the resolved shape, one asserting the date filter actually excludes a job
outside the requested range.

### Phase 2 — Headless core (no UI)

- [x] `core/types.ts`: shared types (Job, Crew, TimeSlot)
- [x] `core/geometry.ts`: time to vertical position, 15-min snap
- [x] `core/collision.ts`: local conflict detection, the pre-check
- [x] Vitest for geometry and collision, edge cases included (a job on the
      exact slot boundary, two adjacent jobs with no overlap)

Checks. The `core/` suite passes with no React import anywhere in it. 21
tests across the two files; conflict detection uses a half-open interval
([start, start + duration)), so two adjacent jobs that touch at the
boundary don't conflict, the same way two back-to-back calendar events
don't.

### Phase 3 — Static UI (no drag yet)

- [x] `ui/Board.tsx`, `ui/DayTabs.tsx`, `ui/CrewColumn.tsx`, `ui/JobBlock.tsx`
- [x] `data/queries.ts`: the Apollo `board` query, using entrepta for the
      visual components (colour, type, `ivy` theme)
- [x] The board renders 3 days as tabs, manual switch (click) works
- [x] Jobs positioned correctly inside each crew column, via
      `core/geometry.ts`
- [x] RTL tests: tab switch, positioning, the query's loading/error states

Checks. Confirmed by hand in the browser, not just by the test suite:
`npm run dev` against seeded data, tabs switch between days, jobs sit at
the right vertical offset for their start time (the seeded double-booking
on day 2 visibly overlaps two blocks in the same crew column, which is
exactly what it's there to prove ahead of Phase 6). 38 Vitest cases total
across `core/` and the new RTL suite (`Board.test.tsx`,
`DayTabs.test.tsx`), covering loading, error, success, tab switch, and
position.

Two bugs the manual pass caught that the type checker didn't:
`graphene-sqlalchemy` infers a foreign key column as GraphQL `Int`, not
`ID` — `job.crewId` and `crew.id` serialized as `8` vs `"8"`, so every
job silently rendered in no column at all (fixed in `schema/types.py`,
noted in this file's `apps/api` rules and in ADR-007). And the entrepta
CLI's Pages Router assumption put `styles/`, `lib/`, and `components/` at
the app root instead of under `src/`; moved by hand, documented in the
`apps/web` rules so the next `npx @entrepta/cli add` doesn't repeat it.

### Phase 4 — Drag within the same day

- [x] dnd-kit wired into the `JobBlock`s
- [x] Local collision pre-check while dragging, visual feedback before drop
- [x] The `moveJob(jobId, crewId, date, startTime)` mutation in the schema
      (a thin resolver: parse input through a Pydantic model in
      `services/`, per ADR-009, then check the conflict and return
      `errors: [Error!]`)
- [x] The client calls the mutation on drop, no optimistic update yet
      (waits for the server, updates after)
- [x] Keyboard: move a job between crews of the same day with arrows and
      space (dnd-kit's default)

Checks. Confirmed by hand in the browser for mouse and keyboard: a real
drag moves a job to another crew, the `DragOverlay` ghost turns
error-coloured while hovering a conflicting slot and back to normal once
clear, and the block stays at its original position until the mutation's
refetch lands — no optimistic jump yet, that's Phase 5. Reloading the page
after each move confirmed the new crew/time persisted server-side, not
just in Apollo's cache. Touch wasn't separately exercised (no touch
emulation in this pass) beyond adding `touch-action: none` to the
draggable, which PointerSensor needs to receive touch events at all; it
rides the same PointerSensor path as mouse, but that's an assumption, not
a checked box.

Backend: 8 pytest cases for `moveJob` (success, rejected overlap,
boundary-touching non-conflict, the 15-minute grid rule, job-not-found).
The rejection path also asserts the row is untouched, not just that the
payload carries an error.

What actually slowed this phase down was not the app: it was the browser
automation harness's synthetic key events. The `computer` tool's `key`
action intermittently failed to trigger dnd-kit's keyboard sensor at all,
and rapid-fire key dispatches with no delay between them sometimes
coalesced into a net-zero move that silently hit the "nothing changed,
skip the mutation" guard — both diagnosed by dispatching real
`KeyboardEvent`/`PointerEvent` sequences via `javascript_exec` instead,
with a small delay between each key. Neither issue reproduces for an
actual human pressing keys at normal speed; noted here so a future replay
of this Check doesn't mistake automation flakiness for an app bug.

### Phase 5 — Optimistic update and rollback

- [ ] `optimisticResponse` on the `moveJob` mutation
- [ ] The UI moves the job immediately on drop
- [ ] The error path: server rejects, Apollo undoes it, the job returns to
      its original place
- [ ] An error toast explaining the rejection, no layout shift
- [ ] `MockedProvider` tests: loading, error, optimistic, rollback, all
      four states, not just the happy path

Checks. The rollback test passes. Force a server rejection and confirm the
UI returns to its prior state without freezing.

### Phase 6 — Cross-day drag (auto-switch and keyboard)

Pays off ADR-003 in full. Highest-risk phase in the project. If scope has
to be cut, re-argue it here first in `docs/DECISIONS.md`, don't silence
the gap.

- [ ] `core/dragAutoSwitch.ts`: the pure threshold logic (pointer over an
      inactive tab for X ms triggers an active-tab change, no drop)
- [ ] Vitest for the threshold: a short hover doesn't switch, a long hover
      switches, moving the pointer away before the threshold cancels
- [ ] Wiring in `DayTabs.tsx`: dnd-kit's `onDragMove` feeds
      `dragAutoSwitch`, and the tab change re-renders the right day with
      the drag still in flight
- [ ] The keyboard shortcut for switching day with the job picked up
      (candidate: `Tab`/`Shift+Tab`). If the final choice diverges from
      ADR-003's candidate, record it in `docs/DECISIONS.md`
- [ ] `moveJob` already accepts `date` (should be done in Phase 1). Confirm
      the conflict is checked against the destination day, not the origin
- [ ] Playwright: cross-day via mouse (auto-switch) and cross-day via
      keyboard, both paths, not just one

Checks. A job created on day 1 can move to day 3 by mouse (hovering the
tab) and by keyboard, with the conflict checked against the right day in
both cases.

### Phase 7 — Concurrency conflict (proven for real)

- [ ] README steps: open two browser tabs, move a job into a slot in tab
      A, try to move another job into the same slot in tab B, watch the
      rejection and the rollback
- [ ] A Playwright test with two browser contexts automating that
      scenario, not just the manual walkthrough

Checks. The two-context test fails if the server's conflict check is
removed or weakened.

### Phase 8 — N+1 and DataLoader (proven for real)

- [ ] A pytest that counts the SQL queries fired resolving `board` with N
      jobs, asserting a fixed number independent of N
- [ ] Remove a DataLoader on purpose, confirm the test breaks, put it back

Checks. The query-count test is in CI and fails reliably when a DataLoader
is removed.

### Phase 9 — Deploy and final polish

- [ ] Deploy `apps/web` to Vercel
- [ ] Deploy `apps/api` + Postgres to Railway (ADR-005)
- [ ] A README covering what the project is, how to run it locally, how to
      reproduce the concurrency conflict (Phase 7), and links to
      `docs/GOAL.md` and `docs/DECISIONS.md`
- [ ] Final pass: every "How to know it worked" item in `docs/GOAL.md` is
      ticked

Checks. Someone from outside can clone it, run it locally, and reproduce
the documented scenarios without asking anything.

---

## What this plan deliberately does not do

No real-time sync. Two open sessions don't watch each other update. They
find the conflict when one of them saves. That's ADR-006, and it's the
whole point: the server decides and the client recovers, without the
infrastructure a subscription would drag in.

No auth. The v1 is a single implicit dispatcher (ADR-004). The project
proves nothing about permissions, on purpose.

No hand-built drag engine. dnd-kit owns the mechanics (ADR-002). The one
piece of interaction built here is the tab auto-switch, because nothing
off the shelf handles a drop target that isn't on screen.

No component extraction or npm package. The `core/` and `ui/` split is for
testing without a DOM, not for publishing. If that ever changes, it's a
new decision with its own ADR.

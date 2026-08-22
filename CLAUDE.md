# capacity

A small dispatch board: resources (crews and trucks) as columns, jobs
scheduled inside time windows, draggable between crews and between days.
The example domain is moving-company dispatch.

The reasoning behind everything here lives in `docs/`:

- `docs/GOAL.md`, what this project is and why it exists.
- `docs/DECISIONS.md`, the architectural decisions, the alternatives dropped, and why.
- `docs/IMPLEMENTATION.md`, the build, phase by phase.

This file is the operational summary: stack, layout, and the rules to
follow while writing code here.

---

## Stack

| Layer | Tech |
| --- | --- |
| Framework (web) | Next.js 15 (App Router), React 19 |
| Language (web) | TypeScript, strict |
| Data (client) | Apollo Client, normalised cache, optimistic updates |
| Drag | @dnd-kit (not a hand-built engine, see ADR-002) |
| Styling | Tailwind v4 + entrepta, `ivy` theme |
| Test (web) | Vitest + Testing Library + Playwright |
| Framework (api) | Python 3.12, Flask |
| GraphQL (api) | Graphene + graphene-sqlalchemy |
| Data (api) | SQLAlchemy + Postgres |
| Test (api) | pytest |
| Monorepo | Turborepo + npm workspaces |
| Deploy | Vercel (`apps/web`) + Railway (`apps/api` + Postgres) |

---

## The point of the project

Everything here exists to show one thing end to end: what happens *after*
you drop a block. dnd-kit handles the mechanics of the drag, so the
interesting part starts at the drop, with the optimistic mutation, the
server's verdict, and the rollback when the server says no. Anything that
doesn't serve that story is out of scope (see `docs/DECISIONS.md`).

Four things carry the weight, and each one is a rule, not a nice-to-have:

- Optimistic update with an explicit rollback path. A mutation that only
  handles success is the happy-path demo this project exists to not be.
- Cross-day drag through tab auto-switch, plus the keyboard equivalent.
- No N+1: every list resolver batches through a DataLoader.
- The full test pyramid, with the unhappy paths tested, not just the
  happy one.

---

## Layout: tabs per day, with auto-switch on drag

The board shows 3 days as tabs, one active at a time, with that day's crew
columns. It's closer to a real dispatch board than three days stacked
vertically, but it creates a problem the UI has to solve: drag-and-drop
only works if the target is on screen, so a job can only be dropped on a
day that isn't the active one if the tab switches before the drop.

The fix is tab auto-switch during the drag. While the user holds a job and
the pointer rests over an inactive tab past a minimum time (the threshold,
see `core/dragAutoSwitch.ts`), the active tab switches and reveals that
day's columns. The drag stays in flight; the job is never dropped.

This has a direct consequence for the keyboard. dnd-kit already handles
arrow-key movement inside the active day, but switching days *during* a
keyboard-driven drag is not built in. It needs an explicit shortcut
(candidate: `Tab`/`Shift+Tab` while the job is "picked up") that switches
the active tab without dropping the job. Without it, the board is
draggable by mouse and touch but not by keyboard across days, which is
exactly the gap this project exists to avoid.

See ADR-003 in `docs/DECISIONS.md` for the alternative that was dropped
(stacked days) and why this extra complexity was taken on purpose.

---

## Why dnd-kit, not a hand-built engine

Building the drag physics from scratch (pointer events, sensors, position
maths during the drag, keyboard access) is enough work to be its own
project, and it's out of scope here. The goal is the full flow: interaction,
optimistic mutation, server validation, rollback when needed. dnd-kit
handles the mechanical part and frees up the time for the part that
actually matters, which is what happens once you let go of the block. The
tab auto-switch above is the one piece of interaction this project builds
itself, because dnd-kit has no opinion about groups that aren't all on
screen at once.

---

## Folder structure

```
capacity/
├── docs/
│   ├── GOAL.md
│   ├── DECISIONS.md
│   └── IMPLEMENTATION.md
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── scheduler/
│   │       │   ├── core/                # no JSX, pure logic, testable with no DOM
│   │       │   │   ├── geometry.ts          # time ↔ vertical position, snap
│   │       │   │   ├── collision.ts         # local conflict, pre-check
│   │       │   │   ├── dragAutoSwitch.ts    # hover threshold, tab switch
│   │       │   │   └── types.ts
│   │       │   ├── ui/                  # Board, DayTabs, CrewColumn, JobBlock
│   │       │   └── data/                # queries, mutations, optimistic config
│   │       └── ...
│   └── api/
│       ├── app.py
│       ├── schema/                      # Graphene types, queries, mutations
│       ├── loaders/                     # DataLoaders, mandatory
│       └── models/                      # SQLAlchemy
├── turbo.json
└── package.json                         # workspaces: ["apps/*"]
```

The `core/` and `ui/` split holds even with no intention of publishing
anything to npm. `core/` knows nothing about React beyond hooks, so it's
testable without rendering. This isn't about extracting a package. It's so
the collision test (and the auto-switch test) don't need a DOM to run.

---

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Crew** | one board column (a team plus a truck) |
| **Job** | one scheduled block |
| **Slot** | the smallest unit of time (15 min) |
| **Conflict** | two Jobs overlapping on the same Crew |
| **Day tab** | the tab for one of the 3 visible days, only one active at a time |
| **Auto-switch** | active-tab change triggered by hover during an in-flight drag |

---

## Rules

### General
- TypeScript strict. `any` only with a comment justifying it.
- Commits in English, conventional commits.
- A new decision that changes the architecture becomes an entry in
  `docs/DECISIONS.md`, not just a code comment.

### `apps/web`
- No time or date maths outside `core/geometry.ts`. Two spellings of
  "snap to 15 min" drift the day one rounds and the other floors.
- No auto-switch logic outside `core/dragAutoSwitch.ts`.
- Every `ui/` component takes props and renders. Business logic in a
  `useEffect` is a sign it's in the wrong place.
- Every mutation has an optimistic update *and* an explicit rollback path.
  The rollback is the point; skipping it is skipping the project.
- dnd-kit covers mouse and touch, and the keyboard movement it already
  gives (arrows to move, space to confirm) stays on, don't disable it.
  The cross-day keyboard shortcut is mandatory, not optional (ADR-003).

### `apps/api`
- Every list resolver uses a DataLoader. A resolver that queries per item
  is a bug, not a TODO. The board is nested lists (jobs × crews ×
  customers), which is where N+1 turns 1 query into hundreds.
- Thin resolvers: validate input, call a service, return. Business logic
  lives in `services/`.
- The server is the source of truth on conflict. The client may predict;
  the server decides, always.
- Mutations return a payload with `errors: [Error!]`, they never throw a
  raw exception at GraphQL.

---

## Critical flow: moving a job across days

1. The user drags a block (dnd-kit handles pointer/touch/keyboard).
2. `core/collision.ts` runs a local pre-check for immediate visual feedback.
3. If the pointer (or the keyboard shortcut) rests over an inactive tab
   past the threshold, `core/dragAutoSwitch.ts` switches the active tab and
   the drag continues.
4. On drop: the `moveJob(jobId, crewId, date, startTime)` mutation fires
   with an optimistic response.
5. The UI updates at once, including the day change.
6. The server can reject, if another session moved something into that
   slot first.
7. Apollo rolls back: the block returns to its original day, tab, and time.
8. A toast explains why, with no flicker and no layout shift.

---

## Real conflict, not simulated

There's no WebSocket, subscription, or polling. That's a deliberate call
(ADR-006), not a gap. The conflict is still real: open two browser tabs on
the same backend, move a job in tab A, then try to move another job into
the same slot in tab B. The server genuinely rejects it, because tab B's
cache was stale. The reproduction steps go in the README.

---

## Tests

The full pyramid:

| Where | Tool | What it covers |
| --- | --- | --- |
| `apps/web` | Vitest | geometry, snap, local collision, the auto-switch threshold (pure, no DOM) |
| `apps/web` | RTL | focus states, ARIA, callbacks the board emits |
| `apps/web` | MockedProvider | loading, error, optimistic, rollback |
| `apps/web` | Playwright | real mouse drag; cross-day via auto-switch; cross-day via keyboard; conflict across two browser contexts |
| `apps/api` | pytest | resolvers, the conflict rule, query counting |

Five tests are non-negotiable:

1. Optimistic rollback. The server rejects, the UI returns to its prior
   state.
2. Conflict across two browser contexts. An end-to-end reproduction of the
   cache divergence.
3. No N+1. Asserts the number of SQL queries when the board loads. Remove a
   DataLoader and the test breaks.
4. Cross-day drag via auto-switch. Hovering the tab for the minimum time
   switches the active day, the job drops on the right day, and the
   conflict is checked against the destination day.
5. Cross-day drag via keyboard. The same result as #4, without a mouse.

Every fixed bug earns a regression test.

---

## Commands

```bash
npm install
npm run dev              # turbo: web + api together
npm test                 # turbo: vitest + pytest
npm run typecheck

npm run test:e2e --workspace=web     # playwright
cd apps/api && uv run pytest
```

---

## Don't

- Don't add `react-dnd` alongside dnd-kit, and don't hand-write drag
  physics. That's already been decided out of scope (ADR-002).
- Don't add a WebSocket or subscription without a new entry in
  `docs/DECISIONS.md`. The two-tab conflict is intentional (ADR-006).
- Don't skip a DataLoader "just for this one resolver, it's fast anyway".
- Don't add login or auth without a new entry in `docs/DECISIONS.md`. The
  v1 assumes a single dispatcher (ADR-004).
- Don't implement tab auto-switch outside `core/dragAutoSwitch.ts`.
- Don't create new documentation files without being asked. This file and
  `docs/` are enough for now.

---

## Code review

When asked to review a branch or PR, review the full diff against `main`.

The checks below are the traps this stack sets: known failure modes of
Apollo, Graphene, and dnd-kit, plus the rules the rest of this file already
commits to. Read them as prompts to look, not a list to tick. A diff that
touches none of them still deserves a read, and a rule that clearly doesn't
apply to the diff in front of you isn't a finding.

- Optimistic and rollback — the one worth reading the diff twice for,
  because it's the whole project (see "The point of the project"). Every
  mutation has an `optimisticResponse` *and* an explicit rollback path
  *and* an error toast. The tell is a mutation that writes the cache on
  success and does nothing on failure: that's the happy-path demo this
  project exists to not be. A `moveJob` that assumes the server will accept
  is a bug even when the server does accept.
- Server decides, client predicts — the client's local collision
  pre-check is feedback, never the verdict. A diff where the client rejects
  a move the server would allow, or persists one the server would reject,
  has inverted the source of truth. And the moment a move can cross days,
  the conflict is checked against the *destination* day, not the origin
  (ADR-003). The origin-day check is invisible until a job lands on a day
  that was already full.
- N+1 and DataLoader — every resolver that resolves a list of relations
  goes through a loader in `loaders/`. The tell is a resolver that queries
  per item, or a new relation added to the schema with no loader behind it.
  The query-count test (ADR-007) is what catches the regression; if the
  diff adds a resolver, it adds the loader in the same commit, not a
  follow-up.
- The `core/` boundary — no JSX in `scheduler/core/`, no time or date
  maths outside `geometry.ts`, no auto-switch logic outside
  `dragAutoSwitch.ts`. On the client, business logic in a `useEffect` is in
  the wrong place; on the server, business logic in a resolver belongs in
  `services/`. The tell on the client is a component reaching into Apollo
  cache internals; the tell on the server is a resolver longer than
  validate, call, return.
- Loading and error states — the board reads the API, so it handles all
  three of loading, error, and empty, not just `data`. An Apollo `useQuery`
  that renders as if `data` is always there shows a blank board when the API
  is down, which reads as "no jobs" rather than "something broke".
  Mutations need a pending state and have to tell a network failure apart
  from a server rejection: different messages, and only one of them is worth
  retrying.
- Mutation shape — mutations return a payload with `errors: [Error!]`
  and never throw a raw exception at GraphQL. The tell is a resolver that
  lets a SQLAlchemy `IntegrityError` reach the transport: it leaks a stack
  and hands the client nothing structured to branch on.
- Accessibility — the keyboard drag path is a requirement, not a nicety
  (ADR-003). dnd-kit's keyboard sensor stays on, the cross-day shortcut
  works, and focus survives the tab auto-switch mid-drag instead of getting
  stranded on a tab that's no longer visible. Drag state is announced (an
  `aria` live region for pick-up, move, drop, cancel), and glyph-only
  affordances carry screen-reader text. A move that works with a mouse and
  not a keyboard is the gap this project exists to avoid.
- Concurrency — no WebSocket, subscription, or polling without a new ADR
  (ADR-006). The tell is an Apollo subscription import, or a `setInterval`
  refetching the board. The two-tab conflict is the design, not a
  limitation to paper over.
- Dates and hydration — `new Date("YYYY-MM-DD")` parses as UTC midnight
  and shifts a day in negative-offset timezones, which is exactly the
  board's day-column maths. Anything date-dependent computed on both the
  server and the client is a hydration mismatch waiting for a render that
  straddles midnight. Day boundaries are the project's core data; wrong once
  and every column is off by one.
- Performance — Apollo needs stable IDs to update the cache in place; a
  mutation that refetches the whole board where a normalised cache write
  would do is the network round trip the optimistic update was meant to
  remove. Per-frame drag work that repaints rather than composites stutters
  under a board full of blocks.
- Security — there's no auth (ADR-004), which makes server-side input
  validation the only line there is. The server validates every mutation
  input and never trusts a client-supplied `crewId`, `date`, or `startTime`
  as already checked. No secrets and no stack traces in GraphQL responses.
- Tests — the five non-negotiables (see Tests) are still covered, and
  the rollback and two-context tests still exercise the real failure, not a
  mock that always resolves. A fixed bug earns a regression test in the same
  diff.
- Responsive — code-level checks only: wide boards scroll rather than
  reflow, and the layout survives a narrow viewport. Hand the visual pass to
  Anna, never drive a browser.

**What the checks cannot see.** Drag feel, the auto-switch threshold timing,
and whether a rollback reads as smooth or as a flicker are not measured by
`typecheck`, `pytest`, or the unit suite. If a diff changes any of them, say
so in the review and hand back something concrete to try by hand: which
interaction, on which day, with mouse and with keyboard, and what should
happen. "Test the drag" is not that.

Also run `npm run typecheck`, `npm test`, and `cd apps/api && uv run
pytest`, and report the results.

Deliver the findings as a Markdown doc at the repo root
(`CODE-REVIEW-<branch>.md`), uncommitted. Open with a clear
production-readiness verdict, cite findings as `file:line` links, and close
with a prioritised action table (fix before merge / follow-up / future).
Note explicitly which checks are left for a manual interaction pass.

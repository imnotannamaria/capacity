# Decisions

A log of architectural decisions. Each entry carries the context, the
decision, what was dropped and why, and the consequences taken on. A new
decision that changes the architecture earns a new entry here, rather than
living only in a code comment or a commit message.

---

## ADR-001 — Monorepo with Turborepo + npm workspaces

Context: the project has two apps (`web` and `api`) that move together.
A GraphQL schema change touches both sides in the same commit, most of the
time.

Decision: one repository, `apps/web` and `apps/api` as npm workspaces,
orchestrated by Turborepo (`npm run dev`, `npm test`, `npm run typecheck`
running both apps).

Dropped:
- Two separate repos. It would pair a PR on each side for every schema
  change, with no real gain, since there are no separate teams owning each
  repo.

Consequences: a slightly heavier initial setup (turbo.json, workspace
config) in exchange for atomic changes across front and back.

---

## ADR-002 — dnd-kit instead of a hand-built drag engine

Context: building the drag physics from scratch (pointer events, sensors,
position maths during the drag, keyboard access) is enough work to be its
own project. `capacity` has a different goal: showing the full flow of an
interaction, from the drag through the optimistic mutation, the server
validation, and the rollback.

Decision: use `@dnd-kit` for pointer events, sensors, and the basic
keyboard navigation (arrows to move, space to confirm), and spend the
saved time on what happens after the drop.

Dropped:
- A hand-built engine. Out of scope for now: it would eat time that
  doesn't feed the project's real goal (the optimistic/rollback flow, not
  the drag mechanics themselves).
- `react-dnd`. Worse native keyboard support and a more verbose API for
  this use case.

Consequences: a dependency on an external lib for the drag mechanics. In
exchange, keyboard access within a day comes ready, and the project can
focus on the genuinely hard part: what happens once the user lets go of
the block.

---

## ADR-003 — Days as tabs, with auto-switch during the drag

Context: the board shows 3 navigable days, and jobs can be dragged between
them. That creates a tension: drag-and-drop only works if the target is on
screen. Two ways to resolve it:

1. Stack the 3 days vertically, with scroll, everything visible at once.
2. Keep the days as tabs, one active at a time, and switch the active tab
   automatically when the user drags a job onto it.

Decision: option 2, tabs with auto-switch. When the pointer (or the
keyboard equivalent) rests over an inactive tab past a minimum time, the
active tab switches and the drag stays in flight, without dropping the job.

Why not the simpler option: stacked days would resolve the tension with
much less code, and that's why it was the first suggestion. Tabs were a
deliberate choice. It's the more common pattern in real dispatch boards,
where a dispatcher looks at one day at a time rather than a vertical feed
of three, and the "target group isn't visible" problem is exactly the kind
of interaction worth solving well here.

Consequences taken on, eyes open:
- More scope. `core/dragAutoSwitch.ts` is a new module with its own
  threshold logic and its own tests, not one more line in `collision.ts`.
- dnd-kit has no opinion about partially visible groups. The auto-switch
  is built on top of the lib by hand; it doesn't come for free.
- The keyboard needs a dedicated shortcut to switch day during an active
  drag (candidate: `Tab`/`Shift+Tab` with the job picked up), because
  dnd-kit's arrow navigation doesn't cover switching context between
  groups. That's extra work option 1 wouldn't need.
- Playwright gets one more scenario: hovering a tab for the minimum time,
  plus the keyboard equivalent.

---

## ADR-004 — No authentication in v1

Context: the board assumes a single dispatcher running the system. Access
control (a crew seeing only its own jobs, say) is a possible extension,
not a requirement of the current technical exercise.

Decision: no authentication or authorisation in v1. Every route and
resolver assumes a single implicit user.

Dropped:
- Basic auth (login + roles) from the start. It would grow the scope
  without adding to what the project sets out to prove (GraphQL, optimistic
  UI, cross-group drag, tests).

Consequences: the project demonstrates nothing about permission modelling.
If that ever matters, it's a new decision with its own ADR, not a silent
addition.

---

## ADR-005 — Railway as the host for API + Postgres

Context: the API (Flask + Graphene) and Postgres need a host with simple
git-based deploys, without hand-configured infrastructure.

Decision: Railway, with a Postgres addon managed by the platform itself.

Dropped:
- Fly.io. Considered, but Railway won on the simplicity of its
  git-push-to-deploy flow and a more direct database addon for a project
  this size.

Consequences: switching hosts later is possible, since nothing in the code
depends on a Railway-specific feature, but it isn't a priority now.

---

## ADR-006 — Concurrency conflict via server + rollback, no WebSocket

Context: two sessions can try to move jobs into the same slot at the same
time. This can be resolved with real-time sync (a WebSocket/subscription)
or with server validation at mutation time.

Decision: the server is the single source of truth on conflict. The client
runs a local pre-check (immediate visual feedback) and an optimistic
mutation, but if the server rejects it, the client undoes the change
through Apollo's rollback.

Dropped:
- A WebSocket/subscription to sync state in real time between sessions.
  Dropped for v1 because it adds an infrastructure layer (a persistent
  channel, reconnection, presence state) without being needed to prove the
  central point: that the server decides and the client can recover when it
  bets wrong.

Consequences: two sessions open at once don't watch each other update in
real time; they only find the conflict when one of them tries to save.
That's intentional and documented, not a gap noticed late. The reproduction
(two browser tabs on the same backend) is documented in the README as a way
to demonstrate the behaviour.

---

## ADR-007 — DataLoader mandatory on every list resolver

Context: the board loads jobs and crews together in a single GraphQL
query, each job resolving its own crew. Without care, that relation
resolver fires one SQL query per job in the list (N+1); with dozens of
jobs on screen, that becomes hundreds of queries.

Decision: every resolver that resolves a list of relations uses a
DataLoader (batching and a per-request cache). A query-count test enforces
it: remove a DataLoader and the test breaks.

Dropped:
- Relying on manual PR review to catch N+1. It's easy to miss, especially
  as the schema grows.

Consequences: every new relation resolver has to ship with a DataLoader.
It's a rule, not a suggestion (see CLAUDE.md, the `apps/api` section).

---

## ADR-008 — `core/` (no JSX) split from `ui/`

Context: the geometry logic (time to position), collision, and now the tab
auto-switch need to be testable without mounting React components.

Decision: all of it lives in `scheduler/core/`, with no JSX import,
testable with plain Vitest. `scheduler/ui/` only takes props and renders.

Dropped:
- Mixing the logic into the components and testing it through RTL. Geometry,
  collision, and threshold tests don't need a DOM, and forcing one would
  make the suite slower and more brittle to visual changes that shouldn't
  break a logic test.

Consequences: one more layer of organisation, but pure-logic tests run in
milliseconds and don't break when a component's markup changes.

---

## ADR-009 — Pydantic for mutation input validation in `services/`

Context: Graphene already validates the *shape* of a mutation's input, its
types and nullability, before a resolver ever runs. It has no opinion on
the *rules*: a `startTime` has to land on a 15-minute boundary, a `date`
has to fall inside the 3 navigable days, a job can't end before it starts.
Left unchecked, that validation either gets hand-rolled as `if`/`raise`
inside each resolver, which drifts in shape from one mutation to the next,
or skipped, which pushes a malformed value straight into SQLAlchemy.

Decision: every mutation input is parsed through a Pydantic model in
`services/` before it reaches the database. A validation failure becomes a
structured entry in the mutation's `errors: [Error!]` payload (ADR-007's
own rule: never a raw exception at GraphQL), not an exception that
resolvers have to remember to catch.

Dropped:
- Hand-rolled validation per resolver. Works once, drifts every time a
  second mutation needs the same rule (a 15-minute snap check written
  twice is a bug waiting for the two copies to disagree).
- Marshmallow. Weaker type-checker integration than Pydantic, and no
  reason to carry two validation libraries when Pydantic already covers it.

Consequences: one more dependency, but the validation rules become
declarative and sit in one place per mutation, and the `errors` payload
shape is consistent by construction rather than by convention.

### Why not Zod on the client

Considered and dropped, at least for now. Zod's job is validating
untrusted input at a boundary, and `apps/web` doesn't have one yet: there
are no forms, no login, and the GraphQL responses it reads are already
shape-guaranteed by a schema shared between both apps in the same
monorepo. Parsing an Apollo response through Zod on top of that would be
validating a boundary that doesn't actually exist here, not a safety net
against real drift. If a form or an external API call enters scope later,
that's a new decision with its own reasoning, not a default to reach for
because the backend has Pydantic.

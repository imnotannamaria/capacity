# Goal

`capacity` is a small dispatch board: resources (a moving crew and a
truck) as columns, jobs scheduled inside time windows, draggable between
crews and between days.

## Why this project exists

It's a personal project, built to practise a set of technologies together
in one real end-to-end flow rather than in separate tutorials.

GraphQL for real, with Graphene and Flask on the server. That means
facing the classic N+1 problem head on and solving it with a DataLoader,
with a test that breaks on purpose if anyone removes one.

Apollo Client past the basics: a normalised cache, an optimistic mutation,
and the part most tutorials skip, which is what to do when the server
rejects and the UI has to walk itself back without looking broken.

Real drag-and-drop with dnd-kit, including the hard case: moving an item
between two groups that aren't both on screen at once (switching day
during the drag), and the accessible keyboard equivalent for that same
move.

Concurrency without a WebSocket. Two people editing the same resource at
once, resolved with "the server decides, the client undoes", no
subscription and no polling.

The full test pyramid, in a monorepo with Turborepo and npm workspaces:
pure logic with no DOM, components with Testing Library, network mocks
with Apollo, and end to end with Playwright, including two browser
contexts to prove the concurrency conflict for real.

The chosen domain is residential moving-company dispatch. The reason is
practical: it comes with real schedule constraints, finite crews, finite
trucks, time windows that collide, so the technical problems above
(conflict, N+1, drag between groups) show up on their own instead of being
forced onto a generic todo list.

## What this project is not

It isn't a product. There's no intention of turning it into a SaaS.

It isn't a clone of any existing dispatch or logistics software. The
domain is a pretext for real schedule constraints, not the point in
itself.

It isn't a pile of loose features. Every documented piece is here because
it attacks a specific technical problem, and the reasoning for each one
lives in `docs/DECISIONS.md`.

## How to know it worked

- [ ] The board loads with 3 days as tabs, each tab with crew columns and
      jobs positioned at the right time.
- [ ] Dragging a job within the same day works with mouse, touch, and
      keyboard.
- [ ] Dragging a job to another day works through tab auto-switch (hover)
      and through a keyboard shortcut, with both routes reaching the same
      result.
- [ ] The server rejects a real schedule conflict and the client undoes
      the change visibly, without freezing or flickering the screen.
- [ ] A test fails automatically if anyone removes a DataLoader from the
      board's query path.
- [ ] An end-to-end test with two browser contexts reproduces and resolves
      the concurrency conflict with no manual intervention.

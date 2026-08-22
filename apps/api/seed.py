"""Populates the local database with sample crews and jobs.

Dates are relative to today, not literal, so the board always shows
something on whichever 3 days you happen to open it during local dev.
That's a different goal from the deterministic fixtures the frontend
will use for its own tests (see docs/DECISIONS.md, ADR-009's Zod note,
and the "no `new Date()`" rule this project inherited for test data) —
this script seeds a database for exploring the app by hand, it isn't a
test fixture.

Run with: uv run python seed.py
"""

from datetime import date, time, timedelta

from models import Base, Crew, Job, db_session, engine

TODAY = date.today()
DAY_1 = TODAY + timedelta(days=1)
DAY_2 = TODAY + timedelta(days=2)


def seed():
    Base.metadata.create_all(engine)

    db_session.query(Job).delete()
    db_session.query(Crew).delete()

    crew_a = Crew(name="Crew A")
    crew_b = Crew(name="Crew B")
    crew_c = Crew(name="Crew C")
    db_session.add_all([crew_a, crew_b, crew_c])
    db_session.flush()  # assigns ids, needed before jobs reference them

    jobs = [
        Job(crew_id=crew_a.id, title="Downtown loft move", date=TODAY,
            start_time=time(9, 0), duration_minutes=120),
        Job(crew_id=crew_a.id, title="Storage pickup", date=TODAY,
            start_time=time(13, 0), duration_minutes=60),
        Job(crew_id=crew_b.id, title="Office relocation", date=TODAY,
            start_time=time(10, 0), duration_minutes=180),
        Job(crew_id=crew_c.id, title="Piano delivery", date=TODAY,
            start_time=time(9, 30), duration_minutes=90),

        Job(crew_id=crew_a.id, title="Suburban house move", date=DAY_1,
            start_time=time(8, 0), duration_minutes=240),
        # Deliberate conflict: both land on Crew B on the same day, and
        # 10:00-11:00 sits inside 09:00-11:30. Nothing in this script
        # stops it from being inserted — the server-side conflict check
        # doesn't exist until Phase 4's `moveJob` mutation. Until then
        # this is a fixture for testing that check once it's built.
        Job(crew_id=crew_b.id, title="Apartment move", date=DAY_1,
            start_time=time(9, 0), duration_minutes=150),
        Job(crew_id=crew_b.id, title="Studio move", date=DAY_1,
            start_time=time(10, 0), duration_minutes=60),
        Job(crew_id=crew_c.id, title="Antique transport", date=DAY_1,
            start_time=time(11, 0), duration_minutes=90),

        Job(crew_id=crew_a.id, title="Cross-town move", date=DAY_2,
            start_time=time(9, 0), duration_minutes=200),
        Job(crew_id=crew_b.id, title="Small apartment move", date=DAY_2,
            start_time=time(9, 0), duration_minutes=90),
        Job(crew_id=crew_c.id, title="Warehouse move", date=DAY_2,
            start_time=time(8, 0), duration_minutes=300),
    ]
    db_session.add_all(jobs)
    db_session.commit()

    print(f"Seeded {len([crew_a, crew_b, crew_c])} crews and {len(jobs)} jobs "
          f"across {TODAY}, {DAY_1}, {DAY_2}.")


if __name__ == "__main__":
    seed()

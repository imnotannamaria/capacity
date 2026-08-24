from contextlib import contextmanager
from datetime import date, time

import sqlalchemy as sa

from app import app
from models import Base, Crew, Job, db_session, engine

# Requests `crew` on every job on purpose: the frontend's real board query
# (apps/web/src/scheduler/data/queries.ts) never does, since Board already
# has the full crews list and doesn't need it per-job. That's exactly why
# this test has to ask for it directly — nothing else in the app exercises
# CrewLoader, so nothing else would catch a DataLoader regression.
QUERY = """
    query Board($dates: [Date!]!) {
        board(dates: $dates) {
            crews { id name }
            jobs { id crew { id name } }
        }
    }
"""


def setup_function():
    Base.metadata.create_all(engine)
    db_session.query(Job).delete()
    db_session.query(Crew).delete()
    db_session.commit()


def teardown_function():
    db_session.query(Job).delete()
    db_session.query(Crew).delete()
    db_session.commit()
    db_session.remove()


def seed_jobs(job_count):
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.flush()

    for index in range(job_count):
        db_session.add(
            Job(
                crew_id=crew.id,
                title=f"Job {index}",
                date=date(2026, 1, 1),
                start_time=time(9, 0),
                duration_minutes=15,
            )
        )
    db_session.commit()


@contextmanager
def count_queries():
    statements = []

    def on_execute(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    sa.event.listen(engine, "before_cursor_execute", on_execute)
    try:
        yield statements
    finally:
        sa.event.remove(engine, "before_cursor_execute", on_execute)


def run_board_query():
    client = app.test_client()
    response = client.post("/graphql", json={"query": QUERY, "variables": {"dates": ["2026-01-01"]}})
    assert response.status_code == 200
    body = response.get_json()
    assert "errors" not in body, body
    return body


def test_query_count_does_not_grow_with_the_number_of_jobs():
    seed_jobs(3)
    with count_queries() as small_run:
        run_board_query()

    teardown_function()
    setup_function()

    seed_jobs(20)
    with count_queries() as large_run:
        run_board_query()

    # crews, jobs, and one batched crew lookup via CrewLoader — fixed
    # regardless of how many jobs came back, which is the whole point of
    # ADR-007. If a resolver ever queries per item instead of batching,
    # this grows with the job count and the second assertion below fails.
    assert len(small_run) == 3
    assert len(large_run) == len(small_run)

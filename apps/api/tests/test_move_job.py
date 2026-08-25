from datetime import date, time

from app import app
from models import Base, Crew, Job, db_session, engine

MUTATION = """
    mutation MoveJob($jobId: ID!, $crewId: ID!, $date: Date!, $startTime: Time!) {
        moveJob(jobId: $jobId, crewId: $crewId, date: $date, startTime: $startTime) {
            job {
                id
                crewId
                date
                startTime
            }
            errors {
                message
            }
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


def move(job_id, crew_id, day, start_time):
    client = app.test_client()
    response = client.post(
        "/graphql",
        json={
            "query": MUTATION,
            "variables": {
                "jobId": str(job_id),
                "crewId": str(crew_id),
                "date": day.isoformat(),
                "startTime": start_time.isoformat(),
            },
        },
    )
    assert response.status_code == 200
    body = response.get_json()
    assert "errors" not in body, body
    return body["data"]["moveJob"]


# `app.teardown_appcontext` runs `db_session.remove()` after every request
# `move()` makes, discarding the session every ORM object in these tests
# was created with. Every test below captures the plain-Python ids it
# needs *before* calling `move()`, and re-fetches by id afterward instead
# of touching an attribute on a now-detached instance.


def test_moves_a_job_to_a_free_slot_on_another_crew():
    crew_a = Crew(name="Crew A")
    crew_b = Crew(name="Crew B")
    db_session.add_all([crew_a, crew_b])
    db_session.flush()
    crew_a_id, crew_b_id = crew_a.id, crew_b.id

    job = Job(
        crew_id=crew_a_id,
        title="Test job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=60,
    )
    db_session.add(job)
    db_session.commit()
    job_id = job.id

    payload = move(job_id, crew_b_id, date(2026, 1, 1), time(11, 0))

    assert payload["errors"] == []
    assert payload["job"]["crewId"] == str(crew_b_id)
    assert payload["job"]["startTime"] == "11:00:00"

    reloaded = db_session.get(Job, job_id)
    assert reloaded.crew_id == crew_b_id
    assert reloaded.start_time == time(11, 0)


def test_rejects_a_move_into_an_overlapping_slot():
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.flush()
    crew_id = crew.id

    existing = Job(
        crew_id=crew_id,
        title="Existing job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=60,
    )
    moving = Job(
        crew_id=crew_id,
        title="Moving job",
        date=date(2026, 1, 1),
        start_time=time(13, 0),
        duration_minutes=60,
    )
    db_session.add_all([existing, moving])
    db_session.commit()
    moving_id = moving.id

    payload = move(moving_id, crew_id, date(2026, 1, 1), time(9, 30))

    assert len(payload["errors"]) == 1
    assert "Existing job" in payload["errors"][0]["message"]
    assert payload["job"] is None

    reloaded = db_session.get(Job, moving_id)
    assert reloaded.start_time == time(13, 0), "a rejected move must not touch the row"


def test_allows_a_move_that_only_touches_an_adjacent_job_at_the_boundary():
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.flush()
    crew_id = crew.id

    existing = Job(
        crew_id=crew_id,
        title="Existing job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=60,
    )
    moving = Job(
        crew_id=crew_id,
        title="Moving job",
        date=date(2026, 1, 1),
        start_time=time(13, 0),
        duration_minutes=60,
    )
    db_session.add_all([existing, moving])
    db_session.commit()
    moving_id = moving.id

    # Existing job runs 09:00-10:00. Landing exactly on 10:00 must not
    # conflict — the same half-open-interval rule as core/collision.ts.
    payload = move(moving_id, crew_id, date(2026, 1, 1), time(10, 0))

    assert payload["errors"] == []


def test_rejects_a_start_time_off_the_15_minute_grid():
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.flush()
    crew_id = crew.id

    job = Job(
        crew_id=crew_id,
        title="Test job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=60,
    )
    db_session.add(job)
    db_session.commit()
    job_id = job.id

    payload = move(job_id, crew_id, date(2026, 1, 1), time(9, 7))

    assert len(payload["errors"]) == 1
    assert "15-minute" in payload["errors"][0]["message"]


def test_rejects_a_move_of_a_job_that_does_not_exist():
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.commit()
    crew_id = crew.id

    payload = move(999_999, crew_id, date(2026, 1, 1), time(9, 0))

    assert payload["errors"] == [{"message": "Job not found"}]


def test_rejects_a_move_that_would_run_past_the_end_of_the_day():
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.flush()
    crew_id = crew.id

    job = Job(
        crew_id=crew_id,
        title="Long job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=120,
    )
    db_session.add(job)
    db_session.commit()
    job_id = job.id

    # 23:00 + 120 min would end at 25:00 — past midnight. The server must
    # reject it even though the start time is on a valid 15-minute slot.
    payload = move(job_id, crew_id, date(2026, 1, 1), time(23, 0))

    assert len(payload["errors"]) == 1
    assert "past the end of the day" in payload["errors"][0]["message"]
    reloaded = db_session.get(Job, job_id)
    assert reloaded.start_time == time(9, 0), "a rejected move must not touch the row"


def test_rejects_a_move_to_a_nonexistent_crew():
    crew = Crew(name="Crew A")
    db_session.add(crew)
    db_session.flush()
    crew_id = crew.id

    job = Job(
        crew_id=crew_id,
        title="Test job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=60,
    )
    db_session.add(job)
    db_session.commit()
    job_id = job.id

    # A well-formed but non-existent crew_id must come back as a structured
    # error, not a foreign-key IntegrityError at commit (which would 500).
    payload = move(job_id, 999_999, date(2026, 1, 1), time(9, 0))

    assert payload["errors"] == [{"message": "Crew not found"}]
    assert payload["job"] is None
    reloaded = db_session.get(Job, job_id)
    assert reloaded.crew_id == crew_id, "a rejected move must not touch the row"

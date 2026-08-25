from datetime import date, time

from app import app
from models import Base, Crew, Job, db_session, engine

MUTATION = """
    mutation MoveJob($jobId: ID!, $crewId: ID!, $date: Date!, $startTime: Time!) {
        moveJob(jobId: $jobId, crewId: $crewId, date: $date, startTime: $startTime) {
            job { id }
            errors { message }
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


def test_missing_query_returns_400_and_does_not_execute():
    response = app.test_client().post("/graphql", json={})
    assert response.status_code == 400
    assert response.get_json()["errors"] == ["Malformed request: a 'query' string is required"]


def test_non_json_body_returns_400():
    response = app.test_client().post("/graphql", data="not json", content_type="text/plain")
    assert response.status_code == 400


def test_unexpected_resolver_error_is_not_leaked(monkeypatch):
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

    # A resolver that blows up with a secret in its message must not hand
    # that text to the client — it gets logged and replaced.
    def boom(**_kwargs):
        raise RuntimeError("postgresql://user:hunter2@db.internal:5432/prod")

    monkeypatch.setattr("schema.mutations.move_job", boom)

    response = app.test_client().post(
        "/graphql",
        json={
            "query": MUTATION,
            "variables": {
                "jobId": str(job_id),
                "crewId": str(crew_id),
                "date": "2026-01-01",
                "startTime": "09:00:00",
            },
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["errors"] == ["Internal server error"]
    assert "hunter2" not in response.get_data(as_text=True)


def test_graphql_validation_error_is_still_surfaced():
    # A malformed query has no original_error — the client should see it to
    # fix the request, so it is not masked.
    response = app.test_client().post("/graphql", json={"query": "{ thisFieldDoesNotExist }"})
    body = response.get_json()
    assert body["errors"]
    assert any("thisFieldDoesNotExist" in message for message in body["errors"])

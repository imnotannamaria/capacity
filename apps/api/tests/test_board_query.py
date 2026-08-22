from datetime import date, time

from app import app
from models import Base, Crew, Job, db_session, engine


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


def test_board_query_returns_crews_and_jobs_with_resolved_crew():
    crew = Crew(name="Test Crew")
    db_session.add(crew)
    db_session.flush()

    job = Job(
        crew_id=crew.id,
        title="Test job",
        date=date(2026, 1, 1),
        start_time=time(9, 0),
        duration_minutes=60,
    )
    db_session.add(job)
    db_session.commit()

    client = app.test_client()
    response = client.post(
        "/graphql",
        json={
            "query": """
                query Board($dates: [Date!]!) {
                    board(dates: $dates) {
                        crews { id name }
                        jobs { id title crew { id name } }
                    }
                }
            """,
            "variables": {"dates": ["2026-01-01"]},
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert "errors" not in body

    board = body["data"]["board"]
    assert board["crews"] == [{"id": str(crew.id), "name": "Test Crew"}]
    assert board["jobs"] == [
        {
            "id": str(job.id),
            "title": "Test job",
            # Confirms the DataLoader path (schema/types.py resolve_crew),
            # not just that the crew_id column round-trips.
            "crew": {"id": str(crew.id), "name": "Test Crew"},
        }
    ]


def test_board_query_excludes_jobs_outside_the_requested_dates():
    crew = Crew(name="Test Crew")
    db_session.add(crew)
    db_session.flush()

    db_session.add(
        Job(
            crew_id=crew.id,
            title="Outside range",
            date=date(2026, 6, 1),
            start_time=time(9, 0),
            duration_minutes=60,
        )
    )
    db_session.commit()

    client = app.test_client()
    response = client.post(
        "/graphql",
        json={
            "query": """
                query Board($dates: [Date!]!) {
                    board(dates: $dates) { jobs { id } }
                }
            """,
            "variables": {"dates": ["2026-01-01"]},
        },
    )

    assert response.get_json()["data"]["board"]["jobs"] == []

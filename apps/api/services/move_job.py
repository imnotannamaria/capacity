from dataclasses import dataclass, field
from datetime import date as date_type
from datetime import time as time_type

from pydantic import BaseModel, ValidationError, field_validator
from sqlalchemy.exc import IntegrityError

from models import Crew, Job, db_session


class MoveJobInput(BaseModel):
    """Business-rule validation for a move, on top of what GraphQL already
    guarantees about types and nullability (ADR-009). Graphene checked
    that `start_time` is *a* time; this checks that it's a time this
    board can actually schedule on.
    """

    job_id: int
    crew_id: int
    date: date_type
    start_time: time_type

    @field_validator("start_time")
    @classmethod
    def start_time_on_slot_boundary(cls, value: time_type) -> time_type:
        if value.minute % 15 != 0 or value.second != 0:
            raise ValueError("start_time must fall on a 15-minute slot boundary")
        return value


MINUTES_PER_DAY = 24 * 60


@dataclass
class MoveJobResult:
    job: Job | None = None
    errors: list[str] = field(default_factory=list)


def _times_overlap(start_a: time_type, duration_a: int, start_b: time_type, duration_b: int) -> bool:
    """Half-open interval overlap, mirroring core/collision.ts on the
    frontend. The two implementations exist independently on purpose
    (ADR-006): the client's version is a prediction, this one is the
    verdict, and neither should import the other across the language
    boundary.
    """
    start_a_minutes = start_a.hour * 60 + start_a.minute
    end_a_minutes = start_a_minutes + duration_a
    start_b_minutes = start_b.hour * 60 + start_b.minute
    end_b_minutes = start_b_minutes + duration_b
    return start_a_minutes < end_b_minutes and start_b_minutes < end_a_minutes


def _find_conflict(
    *, crew_id: int, date: date_type, start_time: time_type, duration_minutes: int, exclude_job_id: int
) -> Job | None:
    candidates = (
        db_session.query(Job)
        .filter(Job.crew_id == crew_id, Job.date == date, Job.id != exclude_job_id)
        .all()
    )
    for candidate in candidates:
        if _times_overlap(start_time, duration_minutes, candidate.start_time, candidate.duration_minutes):
            return candidate
    return None


def move_job(*, job_id: int, crew_id: int, date: date_type, start_time: time_type) -> MoveJobResult:
    try:
        validated = MoveJobInput(job_id=job_id, crew_id=crew_id, date=date, start_time=start_time)
    except ValidationError as exc:
        return MoveJobResult(errors=[str(error["msg"]) for error in exc.errors()])

    job = db_session.get(Job, validated.job_id)
    if job is None:
        return MoveJobResult(errors=["Job not found"])

    # The client-supplied crew_id is never trusted as already valid
    # (CLAUDE.md, Security). Without this check a non-existent crew_id
    # passes pydantic (it's a well-formed int) and only fails at commit,
    # as a foreign-key IntegrityError that would surface as a 500 — the
    # exact "IntegrityError reaching the transport" the review flagged.
    if db_session.get(Crew, validated.crew_id) is None:
        return MoveJobResult(errors=["Crew not found"])

    # The board is a single day; a job can't spill past midnight. The client
    # clamps this (core/geometry.ts, clampStartMinutes), but the server is
    # the source of truth, so it enforces the same bound instead of trusting
    # the clamp to have run.
    start_minutes = validated.start_time.hour * 60 + validated.start_time.minute
    if start_minutes + job.duration_minutes > MINUTES_PER_DAY:
        return MoveJobResult(errors=["Job would run past the end of the day"])

    conflict = _find_conflict(
        crew_id=validated.crew_id,
        date=validated.date,
        start_time=validated.start_time,
        duration_minutes=job.duration_minutes,
        exclude_job_id=job.id,
    )
    if conflict is not None:
        return MoveJobResult(errors=[f"Conflicts with '{conflict.title}'"])

    job.crew_id = validated.crew_id
    job.date = validated.date
    job.start_time = validated.start_time

    # Defense in depth: the crew was checked above, but any constraint the
    # DB enforces (now or later) should come back as a structured error,
    # never a raw IntegrityError at the transport.
    try:
        db_session.commit()
    except IntegrityError:
        db_session.rollback()
        return MoveJobResult(errors=["Could not save the move"])

    return MoveJobResult(job=job)

from sqlalchemy import Date, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class Job(Base):
    __tablename__ = "jobs"

    # No `relationship("Crew")` here on purpose: it would let a resolver
    # lazy-load `job.crew` straight from the ORM, one query per job,
    # exactly the N+1 that `loaders/crew_loader.py` exists to prevent
    # (ADR-007). `crew_id` is the only link; the GraphQL `crew` field is
    # resolved through the loader, never through the ORM relationship.
    id: Mapped[int] = mapped_column(primary_key=True)
    crew_id: Mapped[int] = mapped_column(ForeignKey("crews.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

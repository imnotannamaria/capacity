import graphene
from graphene_sqlalchemy import SQLAlchemyObjectType

from models import Crew, Job


class CrewType(SQLAlchemyObjectType):
    class Meta:
        model = Crew


class JobType(SQLAlchemyObjectType):
    class Meta:
        model = Job

    # Without this override, graphene-sqlalchemy infers `crew_id` (a plain
    # SQLAlchemy Integer column) as GraphQL Int, while `Crew.id` is ID —
    # `crewId` and `crew.id` would then serialize as `8` vs `"8"`, and any
    # client-side `===` between them silently never matches. Foreign keys
    # are IDs, not counts; this field says so explicitly.
    crew_id = graphene.ID(required=True)

    # `Job` has no ORM relationship to `Crew` (see models/job.py): this
    # field is resolved through the request's CrewLoader, not a lazy load.
    crew = graphene.Field(CrewType, required=True)

    def resolve_crew(self, info):
        return info.context["crew_loader"].load(self.crew_id)


class BoardType(graphene.ObjectType):
    crews = graphene.List(graphene.NonNull(CrewType), required=True)
    jobs = graphene.List(graphene.NonNull(JobType), required=True)


class Error(graphene.ObjectType):
    """Shared by every mutation payload (CLAUDE.md, "Mutation shape").
    `message` is developer-facing text, safe to show in a toast — never a
    raw exception string, which is how a stack trace or a connection
    string would leak into a response.
    """

    message = graphene.String(required=True)

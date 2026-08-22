import graphene
from graphene_sqlalchemy import SQLAlchemyObjectType

from models import Crew, Job


class CrewType(SQLAlchemyObjectType):
    class Meta:
        model = Crew


class JobType(SQLAlchemyObjectType):
    class Meta:
        model = Job

    # `Job` has no ORM relationship to `Crew` (see models/job.py): this
    # field is resolved through the request's CrewLoader, not a lazy load.
    crew = graphene.Field(CrewType, required=True)

    def resolve_crew(self, info):
        return info.context["crew_loader"].load(self.crew_id)


class BoardType(graphene.ObjectType):
    crews = graphene.List(graphene.NonNull(CrewType), required=True)
    jobs = graphene.List(graphene.NonNull(JobType), required=True)

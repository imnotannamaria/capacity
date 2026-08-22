import graphene

from models import Crew, Job, db_session

from .types import BoardType


class Query(graphene.ObjectType):
    board = graphene.Field(
        BoardType,
        dates=graphene.List(graphene.NonNull(graphene.Date), required=True),
        required=True,
    )

    def resolve_board(self, info, dates):
        crews = db_session.query(Crew).all()
        jobs = db_session.query(Job).filter(Job.date.in_(dates)).all()
        return BoardType(crews=crews, jobs=jobs)

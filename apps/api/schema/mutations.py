import graphene

from services import move_job

from .types import Error, JobType


class MoveJobPayload(graphene.ObjectType):
    job = graphene.Field(JobType)
    errors = graphene.List(graphene.NonNull(Error), required=True)


class MoveJob(graphene.Mutation):
    class Arguments:
        job_id = graphene.ID(required=True)
        crew_id = graphene.ID(required=True)
        date = graphene.Date(required=True)
        start_time = graphene.Time(required=True)

    Output = MoveJobPayload

    def mutate(self, info, job_id, crew_id, date, start_time):
        result = move_job(job_id=job_id, crew_id=crew_id, date=date, start_time=start_time)

        if result.errors:
            return MoveJobPayload(job=None, errors=[Error(message=message) for message in result.errors])

        return MoveJobPayload(job=result.job, errors=[])


class Mutation(graphene.ObjectType):
    move_job = MoveJob.Field()

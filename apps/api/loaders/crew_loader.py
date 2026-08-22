from aiodataloader import DataLoader

from models import Crew, db_session


class CrewLoader(DataLoader):
    """Batches every `Job.crew` lookup in a single request into one query.

    One instance per request (see app.py): caching a crew across requests
    would serve stale data after an edit, and DataLoader's cache is
    unbounded for the life of the instance.
    """

    async def batch_load_fn(self, crew_ids):
        crews = db_session.query(Crew).filter(Crew.id.in_(crew_ids)).all()
        crew_by_id = {crew.id: crew for crew in crews}
        return [crew_by_id.get(crew_id) for crew_id in crew_ids]

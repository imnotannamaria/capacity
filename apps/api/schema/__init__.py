import graphene

from schema.mutations import Mutation
from schema.queries import Query

schema = graphene.Schema(query=Query, mutation=Mutation)

__all__ = ["schema"]

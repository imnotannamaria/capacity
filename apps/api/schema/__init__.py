import graphene

from schema.queries import Query

schema = graphene.Schema(query=Query)

__all__ = ["schema"]

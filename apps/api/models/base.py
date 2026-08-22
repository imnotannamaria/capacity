import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, scoped_session, sessionmaker

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg2://capacity:capacity@localhost:5434/capacity"
)

engine = create_engine(DATABASE_URL)
db_session = scoped_session(sessionmaker(bind=engine))


class Base(DeclarativeBase):
    pass

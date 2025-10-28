from sqlalchemy import text
from database import engine, Base

with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

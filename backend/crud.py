from sqlalchemy.orm import Session
import models, schemas
from typing import List

def create_research_paper(db: Session, paper: schemas.ResearchPaperCreate) -> models.ResearchPaper:
    db_paper = models.ResearchPaper(**paper.dict())
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)
    return db_paper

def get_research_paper(db: Session, paper_id: int) -> models.ResearchPaper:
    return db.query(models.ResearchPaper).filter(models.ResearchPaper.id == paper_id).first()

def get_all_research_papers(db: Session) -> List[models.ResearchPaper]:
    return db.query(models.ResearchPaper).all()

def search_papers_by_keyword(db: Session, keyword: str) -> List[models.ResearchPaper]:
    return db.query(models.ResearchPaper).filter(
        models.ResearchPaper.content.ilike(f"%{keyword}%") |
        models.ResearchPaper.title.ilike(f"%{keyword}%") |
        models.ResearchPaper.abstract.ilike(f"%{keyword}%")
    ).all()

def delete_research_paper(db: Session, paper_id: int) -> bool:
    paper = db.query(models.ResearchPaper).filter(models.ResearchPaper.id == paper_id).first()
    if paper:
        db.delete(paper)
        db.commit()
        return True
    return False
"""
RAG pipeline for the AI Doubt Bot.

Ingestion (called after Admin approves a material in Course Management):
    extract_text -> chunk_text -> embed each chunk via Ollama (nomic-embed-text)
    -> store in `material_chunks` (pgvector column).

Answering (called from the trainee-facing AI Doubt Bot):
    embed the question -> pgvector cosine search scoped to the course, over
    chunks whose parent material is Admin-approved -> build a grounded prompt
    -> Llama 3.2 via Ollama `/api/chat` -> return the answer + source refs.

IMPORTANT: only ever ingest/retrieve chunks belonging to a CourseMaterial with
status == approved. Unapproved trainer uploads must never reach the model.
"""

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.course_material import CourseMaterial
from app.models.enums import MaterialStatus
from app.models.material_chunk import MaterialChunk
from app.services.ocr_processing import chunk_text, extract_text

SYSTEM_PROMPT = (
    "You are the CAPACITY CONNECT doubt-solving assistant for India Meteorological "
    "Department trainees. Answer ONLY using the provided course material excerpts. "
    "If the excerpts don't contain the answer, say you don't have that in the "
    "approved course material and suggest the trainee ask their trainer. Keep "
    "answers concise and technically accurate."
)


def _embed(texts: list[str]) -> list[list[float]]:
    """Call Ollama's embedding endpoint for one or more texts."""
    with httpx.Client(base_url=settings.ollama_base_url, timeout=60.0) as client:
        resp = client.post(
            "/api/embed",
            json={"model": settings.ollama_embed_model, "input": texts},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["embeddings"]


def ingest_material(db: Session, material: CourseMaterial, file_bytes: bytes) -> int:
    """Extract, chunk and embed one approved material. Returns number of chunks stored."""
    if material.status != MaterialStatus.approved:
        raise ValueError("Only Admin-approved materials may be embedded for the AI Doubt Bot")

    raw_text = extract_text(file_bytes, material.file_type.value)
    pieces = chunk_text(raw_text)
    if not pieces:
        return 0

    vectors = _embed(pieces)
    for idx, (piece, vector) in enumerate(zip(pieces, vectors)):
        db.add(
            MaterialChunk(
                material_id=material.id,
                course_id=material.course_id,
                chunk_index=idx,
                chunk_text=piece,
                embedding=vector,
            )
        )
    material.embedding_indexed = "yes"
    db.commit()
    return len(pieces)


def answer_doubt(db: Session, course_id: int, question: str, top_k: int = 5) -> dict:
    question_vector = _embed([question])[0]

    approved_material_ids = select(CourseMaterial.id).where(
        CourseMaterial.course_id == course_id,
        CourseMaterial.status == MaterialStatus.approved,
    )

    matches = (
        db.query(MaterialChunk)
        .filter(MaterialChunk.course_id == course_id, MaterialChunk.material_id.in_(approved_material_ids))
        .order_by(MaterialChunk.embedding.cosine_distance(question_vector))
        .limit(top_k)
        .all()
    )

    if not matches:
        return {
            "answer": (
                "There's no approved course material indexed for this course yet, so I can't "
                "answer from verified content. Please check with your trainer or Admin."
            ),
            "sources": [],
        }

    context_block = "\n\n---\n\n".join(m.chunk_text for m in matches)
    prompt_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Course material excerpts:\n\n{context_block}\n\n---\n\nTrainee question: {question}",
        },
    ]

    with httpx.Client(base_url=settings.ollama_base_url, timeout=120.0) as client:
        resp = client.post(
            "/api/chat",
            json={"model": settings.ollama_chat_model, "messages": prompt_messages, "stream": False},
        )
        resp.raise_for_status()
        answer_text = resp.json()["message"]["content"]

    sources = [
        {
            "material_title": m.material.title,
            "chunk_preview": (m.chunk_text[:220] + "…") if len(m.chunk_text) > 220 else m.chunk_text,
        }
        for m in matches
    ]
    return {"answer": answer_text, "sources": sources}

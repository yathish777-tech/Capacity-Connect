# CAPACITY CONNECT

Digital Capacity Building and Learning Management Portal for the India Meteorological Department (IMD). Connects **Trainees**, **Trainers**, and **Admins** for training, competency development, and admin-verified knowledge sharing (including an AI Doubt Bot).

```
capacity-connect/
├── backend/    FastAPI + SQLAlchemy + PostgreSQL(Supabase)/pgvector + Ollama RAG
├── frontend/   React + Vite + Tailwind
└── README.md   (this file)
```

## Status of this build

Everything below was written as real, working code — not stubs — and validated during development:

- **Backend**: imports cleanly, generates a valid OpenAPI schema (40 routes), and was run **end-to-end against a real local Postgres 16 + pgvector instance** (table creation → seed data → signup → admin approval → enrollment → competency-engine ranking → MCQ attempt → 3-strike integrity violations → auto-submit → grading). `pytest` (6/6 passing) covers that flow plus the RAG text-chunker.
- **Frontend**: `npm install` and `npm run build` complete cleanly (2,485 modules, no errors). `vitest` (3/3 passing) covers a component and the login form.

What this environment **could not** do: run a live Ollama instance or a live Supabase project (no network access to either from here). The RAG pipeline, embeddings, and Supabase Storage calls are written against Ollama's and Supabase's real, documented APIs, but you'll need your own Ollama install and Supabase project to see the AI Doubt Bot actually answer and file uploads actually land in Storage. Everything else (auth, approvals, enrollment, competency engine, assessments + integrity, certificates, announcements, reports) runs on a plain Postgres connection with no extra setup.

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine) — gives you Postgres + Storage together
- [Ollama](https://ollama.com) installed locally, for the AI Doubt Bot

## 1. Set up Supabase

1. Create a project at supabase.com.
2. **Enable pgvector**: SQL Editor → run `create extension if not exists vector;`
3. **Get your connection string**: Project Settings → Database → Connection string → URI (use the "Session pooler" or direct connection string).
4. **Get your API keys**: Project Settings → API → `Project URL` and a key (service_role key is simplest for a demo — it bypasses Storage RLS).
5. **Create a Storage bucket** named `capacity-connect-files` (Storage → New bucket).

## 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env:
# - for local Postgres, set DATABASE_URL with your real postgres password
# - for Supabase, paste the postgresql:// connection string, SUPABASE_URL, and SUPABASE_KEY
# - keep DATABASE_SCHEMA=capacity_connect_app unless you intentionally want to use public

uvicorn app.main:app --reload --port 8000
```

If you skip `backend/.env`, the app uses its development fallback:
`postgresql://postgres:postgres@localhost:5432/capacity_connect`. A startup error like
`password authentication failed for user "postgres"` means that fallback password does not match
your local PostgreSQL user. Create `backend/.env` and set `DATABASE_URL` to the correct local or
Supabase connection string.

The app creates its tables in the `capacity_connect_app` Postgres schema by default. This avoids
colliding with older tables in Supabase's `public` schema, where names like `users` may already
exist with a different shape.

On first startup the app automatically:
- creates every table (`Base.metadata.create_all`)
- seeds a demo **Admin** account: `adminsih@gmail.com` / `Adminsihimd2026`
- seeds 7 sample IMD courses, 3 trainers, 3 trainees, competency tags, and one fully wired course (assigned trainer + a live MCQ questionnaire) — password for every seeded trainer/trainee is `ImdDemo@123` (printed in the console on first run)

API docs (Swagger): **http://localhost:8000/docs**

### Enable the AI Doubt Bot (optional but recommended)

```bash
ollama serve                     # if not already running
ollama pull llama3.2
ollama pull nomic-embed-text
```

With Ollama running, approving a PDF/PPT material in **Course Management** automatically extracts, chunks, and embeds its text (OCR via Tesseract for scanned pages) — the Doubt Bot then answers trainee questions grounded only in that approved content.

### Running the backend tests

```bash
# needs a real Postgres+pgvector reachable at the URL below (or edit tests/conftest.py)
createdb capacity_connect_test
psql capacity_connect_test -c "create extension if not exists vector;"
pytest -v
```

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env    # defaults to http://localhost:8000, matches the backend above
npm run dev
```

App runs at **http://localhost:5173**.

```bash
npm run test     # vitest + React Testing Library
npm run build    # production build (also generates the PWA service worker)
```

## Demo accounts

| Role    | Email                          | Password         |
|---------|---------------------------------|-------------------|
| Admin   | adminsih@gmail.com              | Adminsihimd2026   |
| Trainer | trainer.radar@imd.gov.in        | ImdDemo@123       |
| Trainee | trainee.one@imd.gov.in          | ImdDemo@123       |

(`trainer.satellite@imd.gov.in` and `trainee.three@imd.gov.in` are seeded **pending**, so you can immediately try the Trainee/Trainer Approvals screens as Admin.)

## How the core workflows map to the code

- **Signup → approval gate**: `POST /auth/signup` creates a `pending` account; `ProtectedRoute` on the frontend shows a "pending approval" screen until an Admin calls `POST /admin/{trainees|trainers}/{id}/review`.
- **Competency Engine**: `backend/app/services/competency_matching.py` — proficiency-weighted tag overlap between a trainer's `trainer_competencies` and a course's `course_subject_tags`. Surfaced in both **Trainer Requirements** (to act on) and **Competency Engine** (to explore).
- **Course request → dashboard unlock**: accepting a request in `POST /trainer/course-requests/{id}/respond` assigns the trainer, publishes the course, and unlocks Question Bank / Monitoring / Material Upload for it.
- **RAG / AI Doubt Bot**: `backend/app/services/rag_pipeline.py` — only ever embeds/retrieves chunks belonging to a `CourseMaterial` with `status == approved`; ingestion is triggered automatically the moment Admin approves a material in Course Management.
- **Assessment integrity**: `frontend/src/modules/trainee/Assessment.jsx` listens for `visibilitychange`, `blur`, and `fullscreenchange`; the server (`backend/app/services/integrity_checker.py`), not the browser, is the source of truth for the 1st-warning / 2nd-final-warning / 3rd-auto-submit count, so a tampered client can't skip it.

## Known simplifications (given the scope of this build)

- No Alembic migrations — `Base.metadata.create_all` handles schema creation, which is enough for a fresh demo database. Add Alembic if you need versioned migrations against an existing database.
- No Docker setup — the tech stack lists it as optional; every service runs fine directly per the steps above.
- Profile editing after signup isn't implemented (only creation) — not called out in the original requirements.
- The competency engine uses weighted tag-overlap (one of the two scoring options in the spec) rather than embedding cosine similarity, so it needs no extra infrastructure beyond Postgres.

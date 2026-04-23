# MARS Release Notes

AI-powered release notes generation from git diffs using GPT-4o.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # Edit with your Azure OpenAI credentials
# Required: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT

# Run backend
python -m backend
```

Backend runs on `http://localhost:8005`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs on `http://localhost:3008`.

### Usage

1. Open `http://localhost:3008`
2. Enter repository URL, base branch, and head branch
3. Click "Create Task & Continue"
4. Follow the 6-step wizard:
   - **Step 0**: Setup — input repository URL, base/head branches, auth token, and extra instructions
   - **Step 1**: Clone & Diff — clones repo and generates diff context
   - **Step 2**: AI Analysis — 3 sequential GPT-4o analysis passes (base, head, comparison)
   - **Step 3**: Release Notes — generates commercial and developer docs
   - **Step 4**: Migration — auto-generates migration scripts (database, API, infrastructure)
   - **Step 5**: Package — collects all artifacts and metadata

Each step supports editing, preview, save, PDF export, and AI-powered refinement.

## Project Structure

```
MARS-ReleaseNotes/
├── backend/                # FastAPI backend
│   ├── __main__.py         # Entry point (python -m backend)
│   ├── main.py             # App bootstrap & router registration
│   ├── core/               # App factory, config, logging
│   ├── models/             # Pydantic schemas
│   ├── routers/            # API endpoints
│   ├── services/           # Session management
│   └── execution/          # Cost tracking
├── frontend/               # Next.js 14 frontend
│   ├── app/                # App Router pages & layout
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   ├── lib/                # Config & fetch utilities
│   └── types/              # TypeScript types
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables
```

## Architecture

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Backend**: FastAPI (async, SQLAlchemy + SQLite)
- **LLM**: Azure OpenAI GPT-4o
- **PDF**: WeasyPrint + Python markdown
- **Icons**: Lucide React

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/release-notes/create` | Create new task |
| GET | `/api/release-notes/{id}` | Get task status |
| POST | `/api/release-notes/{id}/stages/{n}/execute` | Execute stage |
| GET | `/api/release-notes/{id}/stages/{n}/content` | Get stage content |
| PUT | `/api/release-notes/{id}/stages/{n}/content` | Save edited content |
| POST | `/api/release-notes/{id}/stages/{n}/refine` | AI refinement |
| GET | `/api/release-notes/{id}/stages/{n}/console` | Console output |
| GET | `/api/release-notes/{id}/stages/{n}/download` | Download markdown |
| GET | `/api/release-notes/{id}/stages/{n}/download-pdf` | Download PDF |
| GET | `/api/release-notes/recent` | List recent tasks |
| POST | `/api/release-notes/{id}/resume` | Resume suspended task |
| POST | `/api/release-notes/{id}/stop` | Cancel running task |
| DELETE | `/api/release-notes/{id}` | Delete task and work directory |

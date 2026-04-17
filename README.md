# Release Notes Generator

AI-powered release notes generation from git diffs using GPT-4o.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Backend Setup

```bash
cd release-notes-app

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.local  # Edit with your Azure OpenAI credentials
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

## Architecture

- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Backend**: FastAPI (async, SQLAlchemy + SQLite)
- **LLM**: OpenAI GPT-4o (+ Azure OpenAI support)
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

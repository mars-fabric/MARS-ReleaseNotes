"""Allow `python -m backend` to start the server."""

from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (parent of backend/) before any imports
# that may read environment variables (e.g. cmbagent LLM provider detection).
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
        reload_dirs=["backend"],
        log_config=None,
    )

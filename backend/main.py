"""
Release Notes Standalone Backend — Main Entry Point

Standalone extraction from the Mars backend, containing only the
Release Notes pipeline. Uses cmbagent as a pip-installed library.
"""

import sys
from pathlib import Path

# Load .env before any other imports that may read env vars
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# Add the parent directory to the path to import cmbagent
sys.path.append(str(Path(__file__).parent.parent))
# Add the backend directory to the path to import local modules
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI

# Import core app factory
from core.app import create_app

# Import release-notes router
from routers.releasenotes import router as releasenotes_router

# Create the FastAPI application
app = create_app()

# Register the release-notes router (only router needed for standalone)
app.include_router(releasenotes_router)

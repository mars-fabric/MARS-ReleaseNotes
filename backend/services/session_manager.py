"""
Session Manager Service

Provides database-backed session lifecycle management:
- Create sessions with initial state
- Save session state periodically during execution
- Load session state for resumption
- Suspend, resume, complete sessions
- Cleanup expired sessions
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4

from core.logging import get_logger

logger = get_logger(__name__)


class SessionManager:
    """
    Manages session lifecycle with database persistence.

    Session states:
    - active: Currently running or ready to run
    - suspended: Paused by user, can be resumed
    - completed: Finished successfully
    - expired: Timed out or cleaned up
    """

    def __init__(self, db_factory: Callable):
        """
        Initialize the session manager.

        Args:
            db_factory: Callable that returns a database session
        """
        self.db_factory = db_factory
        self._cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_interval = 60  # seconds
        self._session_ttl = 24 * 60 * 60  # 24 hours default

    async def start(self):
        """Start background cleanup task"""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("SessionManager started with cleanup interval %ds", self._cleanup_interval)

    async def stop(self):
        """Stop background cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("SessionManager stopped")

    # ==================== Session Lifecycle ====================

    def create_session(
        self,
        mode: str,
        config: Dict[str, Any],
        user_id: Optional[str] = None,
        name: Optional[str] = None
    ) -> str:
        """
        Create a new session.

        Args:
            mode: Workflow mode (copilot, planning-control, etc.)
            config: Session configuration
            user_id: Optional user identifier
            name: Optional session name

        Returns:
            session_id (UUID string)
        """
        from cmbagent.database.models import Session, SessionState

        db = self.db_factory()
        try:
            session_id = str(uuid4())
            session_name = name or f"{mode}_{datetime.now():%Y%m%d_%H%M%S}"

            # Create parent session record
            session = Session(
                id=session_id,
                user_id=user_id,
                name=session_name,
                status="active",
                meta=config
            )
            db.add(session)

            # Create session state record
            state = SessionState(
                session_id=session_id,
                mode=mode,
                conversation_history=[],
                context_variables={},
                current_phase="init",
                status="active"
            )
            db.add(state)

            db.commit()
            logger.info("Created session %s for mode %s", session_id, mode)
            return session_id

        except Exception as e:
            db.rollback()
            logger.error("Failed to create session: %s", e)
            raise
        finally:
            db.close()

    async def _cleanup_loop(self):
        """Background task to clean up expired sessions."""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                # Cleanup logic — simplified for standalone
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Cleanup loop error: %s", e)


# Factory function for dependency injection
def create_session_manager() -> SessionManager:
    """Create a SessionManager instance with database factory"""
    from cmbagent.database import get_db_session
    return SessionManager(db_factory=get_db_session)


# Global instance (lazy initialization)
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get global SessionManager instance"""
    global _session_manager
    if _session_manager is None:
        _session_manager = create_session_manager()
    return _session_manager

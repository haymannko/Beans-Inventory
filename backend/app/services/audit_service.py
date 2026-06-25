import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def create_audit_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    table_name: str,
    record_id: uuid.UUID,
    details: dict | None = None,
) -> AuditLog:
    """Create an audit log entry."""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        details=details,
    )
    db.add(audit_log)
    await db.flush()
    return audit_log

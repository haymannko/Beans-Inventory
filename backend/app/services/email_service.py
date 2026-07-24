"""Email service for sending low stock alerts and notifications.

This module provides an email-ready architecture for stock alerts.
Currently implements logging-based alerts. To enable real email sending,
configure SMTP settings and swap the transport backend.
"""

import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class EmailTransport(Protocol):
    """Protocol for email transport backends."""

    async def send_email(self, to: str, subject: str, body: str) -> bool:
        ...


class LoggingTransport:
    """Default transport: logs emails instead of sending them."""

    async def send_email(self, to: str, subject: str, body: str) -> bool:
        logger.info(f"[EMAIL READY] To: {to}")
        logger.info(f"[EMAIL READY] Subject: {subject}")
        logger.info(f"[EMAIL READY] Body:\n{body}")
        return True


# Current transport — swap to SMTPTransport when ready
_transport: EmailTransport = LoggingTransport()


def set_transport(transport: EmailTransport) -> None:
    """Swap the email transport backend at runtime."""
    global _transport
    _transport = transport


async def send_low_stock_alert(
    email: str,
    bean_type_name: str,
    current_bags: int,
    min_bags: int,
    current_weight: float,
    min_weight: float,
) -> bool:
    """Send a low stock alert email."""
    subject = f"⚠️ Low Stock Alert: {bean_type_name}"
    body = (
        f"Low Stock Alert\n"
        f"===============\n\n"
        f"Bean Type: {bean_type_name}\n"
        f"Current Stock: {current_bags} bags ({current_weight:.2f} kg)\n"
        f"Threshold: {min_bags} bags ({min_weight:.2f} kg)\n\n"
        f"Action Required: Please restock {bean_type_name} to avoid stockouts.\n"
    )
    return await _transport.send_email(to=email, subject=subject, body=body)


async def send_bulk_low_stock_alert(
    email: str,
    alerts: list[dict],
) -> bool:
    """Send a consolidated low stock alert with multiple items."""
    if not alerts:
        return True

    subject = f"⚠️ {len(alerts)} Low Stock Alert(s) — Action Required"

    lines = ["Low Stock Summary", "=================\n"]
    for a in alerts:
        lines.append(
            f"• {a['bean_type_name']}: {a['current_bags']} bags / {a['min_bags']} min "
            f"({a['current_weight']:.1f} kg / {a['min_weight']:.1f} kg)"
        )
    lines.append("\nPlease restock the above items.")

    return await _transport.send_email(to=email, subject=subject, body="\n".join(lines))

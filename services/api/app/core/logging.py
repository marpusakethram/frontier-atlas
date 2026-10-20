"""Structured logging and error handling utilities."""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """Formats logs as structured key-value lines with UTC timestamps."""

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).isoformat()
        level = record.levelname
        name = record.name
        msg = record.getMessage()
        if record.exc_info:
            exc_text = self.formatException(record.exc_info)
            return f"ts={ts} level={level} logger={name} msg={msg!r} exc={exc_text!r}"
        return f"ts={ts} level={level} logger={name} msg={msg!r}"


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)

"""Security guards: SSRF validation, prompt injection defense, and write endpoint auth."""

from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse

from fastapi import Header, HTTPException, Request, status

from app.config import settings

# Patterns commonly used in prompt injection attempts inside untrusted papers/READMEs
PROMPT_INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|system)\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*:", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"<\s*/?\s*system\s*>", re.IGNORECASE),
    re.compile(r"execute\s+shell\s+command", re.IGNORECASE),
    re.compile(r"print\s+environment\s+variables", re.IGNORECASE),
    re.compile(r"GEMINI_API_KEY|OPENALEX_API_KEY|GITHUB_TOKEN|DATABASE_URL", re.IGNORECASE),
)

ALLOWED_EXTERNAL_SCHEMES = {"https", "http"}


def sanitize_untrusted_research_text(text: str | None, max_length: int = 12000) -> str:
    """Sanitize untrusted research abstracts, paper bodies, or READMEs before LLM processing."""
    if not text:
        return ""
    cleaned = text[:max_length]
    for pattern in PROMPT_INJECTION_PATTERNS:
        cleaned = pattern.sub("[REDACTED_UNTRUSTED_DIRECTIVE]", cleaned)
    return cleaned


def validate_safe_external_url(url: str) -> str:
    """Validate that a URL is safe from SSRF (no localhost, loopback, link-local, or private IPs)."""
    parsed = urlparse(url.strip())
    if parsed.scheme.lower() not in ALLOWED_EXTERNAL_SCHEMES:
        raise ValueError(f"Disallowed URL scheme: {parsed.scheme}")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must include a valid hostname.")
    lowered = hostname.lower()
    if lowered in {"localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"}:
        raise ValueError(f"SSRF protection blocked local/metadata host: {hostname}")

    # Check literal IP first
    try:
        ip_obj = ipaddress.ip_address(lowered)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
        ):
            raise ValueError(f"SSRF protection blocked restricted IP: {ip_obj}")
        return url.strip()
    except ValueError as exc:
        if "SSRF protection" in str(exc):
            raise

    # Resolve hostname if possible; block private resolution
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            resolved_ip = ipaddress.ip_address(item[4][0])
            if (
                resolved_ip.is_private
                or resolved_ip.is_loopback
                or resolved_ip.is_link_local
                or resolved_ip.is_reserved
            ):
                raise ValueError(f"SSRF protection blocked private resolved IP: {resolved_ip}")
    except socket.gaierror:
        # DNS resolution failure during offline test is acceptable so long as host isn't local
        pass
    return url.strip()


async def verify_write_access(
    request: Request,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    """Enforce authentication for remotely exposed write endpoints while permitting local single-user mode."""
    configured_token = settings.API_WRITE_TOKEN.strip()
    client_host = (request.client.host if request.client else "127.0.0.1").lower()
    is_local_client = client_host in {"127.0.0.1", "::1", "localhost", "testclient"}

    if configured_token:
        if x_api_key != configured_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Valid X-API-Key header required for write operations.",
            )
        return

    if not is_local_client and settings.APP_ENV.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Remote write operations require API_WRITE_TOKEN in production mode.",
        )

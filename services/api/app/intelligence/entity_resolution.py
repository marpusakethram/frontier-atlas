"""Identifier-first Entity Resolution Engine (Phase 5).

Reconciles publications, researchers, and organizations/companies across public databases
with three explicit outcomes:
- Confirmed match
- Possible match (routed to review; never auto-merged on researcher name alone)
- Distinct entities

Maintains reversible merge history in `entity_aliases` and `audit_events`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditEvent, EntityAlias, Organization, Paper, Researcher


class ResolutionOutcome:
    CONFIRMED_MATCH = "Confirmed match"
    POSSIBLE_MATCH = "Possible match"
    DISTINCT_ENTITIES = "Distinct entities"


@dataclass
class ResolutionDecision:
    outcome: str
    matched_entity_id: str | None
    matched_by: str
    confidence: float
    reason: str


def normalize_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    cleaned = doi.strip().lower()
    for prefix in ("https://doi.org/", "http://doi.org/", "https://dx.doi.org/", "doi:"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
    cleaned = cleaned.strip().rstrip(".")
    return cleaned or None


def normalize_arxiv_id(arxiv_id: str | None) -> str | None:
    if not arxiv_id:
        return None
    cleaned = arxiv_id.strip().lower()
    for prefix in ("https://arxiv.org/abs/", "http://arxiv.org/abs/", "https://arxiv.org/pdf/", "arxiv:"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
    if cleaned.endswith(".pdf"):
        cleaned = cleaned[:-4]
    # Strip version suffix e.g. v1, v2 for canonical matching
    cleaned = re.sub(r"v\d+$", "", cleaned).strip()
    return cleaned or None


def normalize_openalex_id(openalex_id: str | None) -> str | None:
    if not openalex_id:
        return None
    cleaned = openalex_id.strip()
    if cleaned.startswith("http://openalex.org/"):
        cleaned = "https://openalex.org/" + cleaned.removeprefix("http://openalex.org/")
    elif not cleaned.startswith("https://openalex.org/") and re.match(r"^[WAICSV]\d+$", cleaned, re.I):
        cleaned = f"https://openalex.org/{cleaned.upper()}"
    return cleaned or None


def normalize_orcid(orcid: str | None) -> str | None:
    if not orcid:
        return None
    cleaned = orcid.strip()
    for prefix in ("https://orcid.org/", "http://orcid.org/", "orcid:"):
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix) :]
    match = re.search(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", cleaned.upper())
    return match.group(0) if match else (cleaned.upper() or None)


def normalize_title(title: str | None) -> str:
    if not title:
        return ""
    alnum = re.sub(r"[^a-z0-9\s]", " ", title.lower())
    return " ".join(alnum.split())


def normalize_org_name(name: str | None) -> str:
    if not name:
        return ""
    lowered = name.lower().strip()
    # Expand common abbreviations and strip legal suffixes
    replacements = {
        r"\bmit\b": "massachusetts institute of technology",
        r"\buc berkeley\b": "university of california berkeley",
        r"\bu\.c\.\s*berkeley\b": "university of california berkeley",
        r"\beth zurich\b": "eth zurich",
        r"\b(inc|corp|corporation|llc|ltd|limited|gmbh|co|company)\b\.?": "",
    }
    for pattern, repl in replacements.items():
        lowered = re.sub(pattern, repl, lowered)
    alnum = re.sub(r"[^a-z0-9\s]", " ", lowered)
    return " ".join(alnum.split())


def normalize_domain(website: str | None) -> str | None:
    if not website:
        return None
    raw = website.strip().lower()
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    host = parsed.hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return host or None


class EntityResolutionEngine:
    """Identifier-first entity reconciliation across publications, researchers, and organizations."""

    def resolve_paper(
        self,
        db: Session,
        *,
        doi: str | None = None,
        arxiv_id: str | None = None,
        openalex_id: str | None = None,
        title: str = "",
        publication_year: int | None = None,
    ) -> ResolutionDecision:
        norm_doi = normalize_doi(doi)
        norm_arxiv = normalize_arxiv_id(arxiv_id)
        norm_oa = normalize_openalex_id(openalex_id)
        norm_t = normalize_title(title)

        # 1. DOI match ( including arxiv-backed DOI )
        if norm_doi:
            existing = db.scalars(select(Paper)).all()
            for p in existing:
                if normalize_doi(p.doi) == norm_doi:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=p.id,
                        matched_by="doi",
                        confidence=0.99,
                        reason=f"Matched normalized DOI {norm_doi}",
                    )
                if norm_doi.startswith("10.48550/arxiv.") and normalize_arxiv_id(p.arxiv_id) == norm_doi.removeprefix("10.48550/arxiv."):
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=p.id,
                        matched_by="doi_to_arxiv",
                        confidence=0.99,
                        reason=f"Matched DataCite arXiv DOI {norm_doi}",
                    )

        # 2. arXiv ID match
        if norm_arxiv:
            existing = db.scalars(select(Paper)).all()
            for p in existing:
                if normalize_arxiv_id(p.arxiv_id) == norm_arxiv:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=p.id,
                        matched_by="arxiv_id",
                        confidence=0.99,
                        reason=f"Matched canonical arXiv identifier {norm_arxiv}",
                    )

        # 3. OpenAlex ID match
        if norm_oa:
            existing = db.scalars(select(Paper).where(Paper.openalex_id == norm_oa)).first()
            if existing:
                return ResolutionDecision(
                    outcome=ResolutionOutcome.CONFIRMED_MATCH,
                    matched_entity_id=existing.id,
                    matched_by="openalex_id",
                    confidence=0.98,
                    reason=f"Matched OpenAlex identifier {norm_oa}",
                )

        # 4. Normalized title + publication year metadata comparison
        if norm_t and len(norm_t) >= 12:
            candidates = db.scalars(select(Paper).where(Paper.normalized_title == norm_t)).all()
            for cand in candidates:
                if publication_year is None or abs(cand.publication_date.year - publication_year) <= 1:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=cand.id,
                        matched_by="normalized_title_and_year",
                        confidence=0.92,
                        reason="Matched normalized title and publication year window (+/-1 yr)",
                    )
                return ResolutionDecision(
                    outcome=ResolutionOutcome.POSSIBLE_MATCH,
                    matched_entity_id=cand.id,
                    matched_by="normalized_title_year_mismatch",
                    confidence=0.65,
                    reason="Identical normalized title but publication year differs by >1 year",
                )

        return ResolutionDecision(
            outcome=ResolutionOutcome.DISTINCT_ENTITIES,
            matched_entity_id=None,
            matched_by="none",
            confidence=0.95,
            reason="No identifier or title match found",
        )

    def resolve_researcher(
        self,
        db: Session,
        *,
        full_name: str,
        orcid: str | None = None,
        openalex_author_id: str | None = None,
        institution_name: str | None = None,
    ) -> ResolutionDecision:
        """Resolve researcher. NEVER auto-merge researchers solely because their names match."""
        norm_orc = normalize_orcid(orcid)
        norm_oa = normalize_openalex_id(openalex_author_id)

        # 1. ORCID match
        if norm_orc:
            existing = db.scalars(select(Researcher).where(Researcher.orcid == norm_orc)).first()
            if existing:
                return ResolutionDecision(
                    outcome=ResolutionOutcome.CONFIRMED_MATCH,
                    matched_entity_id=existing.id,
                    matched_by="orcid",
                    confidence=0.99,
                    reason=f"Matched canonical ORCID {norm_orc}",
                )

        # 2. OpenAlex author ID match
        if norm_oa:
            existing = db.scalars(
                select(Researcher).where(Researcher.openalex_author_id == norm_oa)
            ).first()
            if existing:
                return ResolutionDecision(
                    outcome=ResolutionOutcome.CONFIRMED_MATCH,
                    matched_entity_id=existing.id,
                    matched_by="openalex_author_id",
                    confidence=0.98,
                    reason=f"Matched OpenAlex Author ID {norm_oa}",
                )

        # 3. Secondary name check -> MUST return Possible match (human review), never Confirmed match
        cleaned_name = " ".join(full_name.strip().split()).lower()
        for r in db.scalars(select(Researcher)).all():
            if r.full_name.strip().lower() == cleaned_name:
                # If both have distinct ORCIDs, they are Distinct entities despite homonym name collision!
                if norm_orc and r.orcid and normalize_orcid(r.orcid) != norm_orc:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.DISTINCT_ENTITIES,
                        matched_entity_id=None,
                        matched_by="orcid_conflict_homonym",
                        confidence=0.99,
                        reason=f"Name collision ('{full_name}') with distinct ORCIDs ({norm_orc} vs {r.orcid})",
                    )
                return ResolutionDecision(
                    outcome=ResolutionOutcome.POSSIBLE_MATCH,
                    matched_entity_id=r.id,
                    matched_by="name_homonym_requires_review",
                    confidence=0.55,
                    reason="Researcher name matches existing record without ORCID/OpenAlex ID verification; human review required before merging.",
                )

        return ResolutionDecision(
            outcome=ResolutionOutcome.DISTINCT_ENTITIES,
            matched_entity_id=None,
            matched_by="none",
            confidence=0.95,
            reason="Distinct researcher entity",
        )

    def resolve_organization(
        self,
        db: Session,
        *,
        name: str,
        website: str | None = None,
        openalex_institution_id: str | None = None,
        country: str | None = None,
        organization_type: str | None = None,
    ) -> ResolutionDecision:
        norm_dom = normalize_domain(website)
        norm_oa = normalize_openalex_id(openalex_institution_id)
        norm_n = normalize_org_name(name)

        all_orgs = db.scalars(select(Organization)).all()

        # 1. Verified website domain
        if norm_dom:
            for org in all_orgs:
                if normalize_domain(org.website) == norm_dom:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=org.id,
                        matched_by="verified_domain",
                        confidence=0.98,
                        reason=f"Matched verified website domain {norm_dom}",
                    )

        # 2. Official external identifier
        if norm_oa:
            for org in all_orgs:
                if normalize_openalex_id(org.openalex_institution_id) == norm_oa:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=org.id,
                        matched_by="openalex_institution_id",
                        confidence=0.99,
                        reason=f"Matched OpenAlex Institution ID {norm_oa}",
                    )

        # Check alias table (e.g., renamed organizations)
        alias_hit = db.scalars(
            select(EntityAlias).where(
                EntityAlias.canonical_entity_type == "Organization",
                EntityAlias.alias_value == norm_n,
            )
        ).first()
        if alias_hit:
            return ResolutionDecision(
                outcome=ResolutionOutcome.CONFIRMED_MATCH,
                matched_entity_id=alias_hit.canonical_entity_id,
                matched_by="entity_alias_ledger",
                confidence=alias_hit.confidence,
                reason=f"Matched organization alias '{norm_n}'",
            )

        # 3 & 4. Normalized name + country + organization type
        for org in all_orgs:
            if normalize_org_name(org.normalized_name) == norm_n:
                same_country = not country or org.country.lower() == country.lower()
                same_type = not organization_type or org.organization_type.lower() == organization_type.lower()
                if same_country and same_type:
                    return ResolutionDecision(
                        outcome=ResolutionOutcome.CONFIRMED_MATCH,
                        matched_entity_id=org.id,
                        matched_by="normalized_name_country_type",
                        confidence=0.91,
                        reason=f"Matched normalized name '{norm_n}' with consistent country and type",
                    )
                return ResolutionDecision(
                    outcome=ResolutionOutcome.POSSIBLE_MATCH,
                    matched_entity_id=org.id,
                    matched_by="normalized_name_partial",
                    confidence=0.68,
                    reason=f"Matched normalized name '{norm_n}' but country/type differ",
                )

        return ResolutionDecision(
            outcome=ResolutionOutcome.DISTINCT_ENTITIES,
            matched_entity_id=None,
            matched_by="none",
            confidence=0.95,
            reason="Distinct organization entity",
        )

    def record_reversible_merge(
        self,
        db: Session,
        *,
        entity_type: str,
        canonical_id: str,
        merged_from_id: str,
        alias_value: str,
        alias_type: str,
        snapshot_before_merge: dict[str, Any],
        actor: str = "entity_resolution_engine",
    ) -> EntityAlias:
        """Record a reversible entity merge in entity_aliases and audit_events."""
        alias_entry = EntityAlias(
            canonical_entity_type=entity_type,
            canonical_entity_id=canonical_id,
            merged_from_entity_id=merged_from_id,
            alias_value=normalize_org_name(alias_value) if entity_type == "Organization" else alias_value.lower().strip(),
            alias_type=alias_type,
            resolution_outcome=ResolutionOutcome.CONFIRMED_MATCH,
            confidence=0.95,
            reversible_snapshot=snapshot_before_merge,
        )
        db.add(alias_entry)
        db.add(
            AuditEvent(
                event_type="entity_merge",
                entity_type=entity_type,
                entity_id=canonical_id,
                actor=actor,
                payload_json={
                    "canonical_id": canonical_id,
                    "merged_from_id": merged_from_id,
                    "alias_value": alias_value,
                    "reversible": True,
                },
            )
        )
        db.flush()
        return alias_entry

    def reverse_merge(self, db: Session, alias_id: str, actor: str = "admin_reviewer") -> dict[str, Any]:
        """Reverse a previously recorded merge using its stored reversible_snapshot."""
        alias_entry = db.get(EntityAlias, alias_id)
        if not alias_entry or not alias_entry.reversible_snapshot:
            raise ValueError(f"Reversible merge record '{alias_id}' not found.")

        snap = alias_entry.reversible_snapshot
        restored_id = alias_entry.merged_from_entity_id or snap.get("id")
        if alias_entry.canonical_entity_type == "Organization" and restored_id:
            if not db.get(Organization, restored_id):
                db.add(
                    Organization(
                        id=restored_id,
                        name=snap.get("name", alias_entry.alias_value),
                        normalized_name=normalize_org_name(snap.get("name", alias_entry.alias_value)),
                        organization_type=snap.get("organization_type", "Other"),
                        website=snap.get("website"),
                        country=snap.get("country", "United States"),
                    )
                )

        db.add(
            AuditEvent(
                event_type="entity_merge_reversed",
                entity_type=alias_entry.canonical_entity_type,
                entity_id=alias_entry.canonical_entity_id,
                actor=actor,
                payload_json={"alias_id": alias_id, "restored_entity_id": restored_id},
            )
        )
        db.delete(alias_entry)
        db.flush()
        return {"status": "reversed", "restored_entity_id": restored_id}

"""NetworkX Knowledge Graph & Centrality Engine (Phase 10).

Supports:
- Node types: Technology, Paper, Researcher, Institution, Company, Repository, Sector, Breakthrough
- Edge types: AUTHOR_OF, AFFILIATED_WITH, RESEARCHES, ASSOCIATED_WITH, REFERENCES, DEVELOPS,
              CONTRIBUTES_TO, RELATED_TO, OPERATES_IN
- Algorithms: Neighbor retrieval, bounded ego-graph expansion, degree centrality,
              betweenness centrality, and greedy modularity community detection.
"""

from __future__ import annotations

from typing import Any

import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    BreakthroughCandidate,
    Company,
    EntityRelationship,
    EvidenceSource,
    Organization,
    Paper,
    Repository,
    Researcher,
    Sector,
    Technology,
)

ALLOWED_EDGE_TYPES = {
    "AUTHOR_OF",
    "AFFILIATED_WITH",
    "RESEARCHES",
    "ASSOCIATED_WITH",
    "REFERENCES",
    "DEVELOPS",
    "CONTRIBUTES_TO",
    "RELATED_TO",
    "OPERATES_IN",
}


def build_knowledge_graph(
    db: Session,
    *,
    sector_id: str | None = None,
    relationship_type: str | None = None,
    include_provisional: bool = True,
) -> dict[str, Any]:
    """Construct full NetworkX graph from PostgreSQL entities and source-backed relationships."""
    G = nx.Graph()
    node_meta: dict[str, dict[str, Any]] = {}

    for s in db.scalars(select(Sector)).all():
        if sector_id and s.id != sector_id:
            continue
        node_meta[s.id] = {
            "id": s.id,
            "label": s.name,
            "entity_type": "Sector",
            "sector_id": s.id,
            "quality_status": s.quality_status,
            "subtitle": s.maturity_summary,
        }
        G.add_node(s.id, **node_meta[s.id])

    for t in db.scalars(select(Technology)).all():
        if sector_id and t.sector_id != sector_id:
            continue
        node_meta[t.id] = {
            "id": t.id,
            "label": t.name,
            "entity_type": "Technology",
            "sector_id": t.sector_id,
            "quality_status": t.quality_status,
            "subtitle": f"Momentum: {t.momentum_score or 'N/A'} | {t.maturity_stage}",
        }
        G.add_node(t.id, **node_meta[t.id])

    for p in db.scalars(select(Paper)).all():
        if sector_id and p.sector_id != sector_id:
            continue
        node_meta[p.id] = {
            "id": p.id,
            "label": p.title[:68] + ("..." if len(p.title) > 68 else ""),
            "full_title": p.title,
            "entity_type": "Paper",
            "sector_id": p.sector_id,
            "quality_status": p.quality_status,
            "subtitle": f"{p.journal_or_venue} ({p.publication_date.year}) • {p.citations_count} citations",
        }
        G.add_node(p.id, **node_meta[p.id])

    for r in db.scalars(select(Researcher)).all():
        node_meta[r.id] = {
            "id": r.id,
            "label": r.full_name,
            "entity_type": "Researcher",
            "sector_id": None,
            "quality_status": r.quality_status,
            "subtitle": f"{r.institution_name or 'Independent'} • ORCID: {r.orcid or 'Unverified'}",
        }
        G.add_node(r.id, **node_meta[r.id])

    for o in db.scalars(select(Organization)).all():
        node_meta[o.id] = {
            "id": o.id,
            "label": o.name,
            "entity_type": "Institution",
            "sector_id": None,
            "quality_status": o.quality_status,
            "subtitle": f"{o.organization_type} • {o.country}",
        }
        G.add_node(o.id, **node_meta[o.id])

    for c in db.scalars(select(Company)).all():
        if sector_id and c.sector_id != sector_id:
            continue
        node_meta[c.id] = {
            "id": c.id,
            "label": c.name,
            "entity_type": "Company",
            "sector_id": c.sector_id,
            "quality_status": c.quality_status,
            "subtitle": f"{c.funding_stage or 'Stage Unverified'} • {c.headquarters_country}",
        }
        G.add_node(c.id, **node_meta[c.id])

    for repo in db.scalars(select(Repository)).all():
        if sector_id and repo.sector_id != sector_id:
            continue
        node_meta[repo.id] = {
            "id": repo.id,
            "label": repo.full_name,
            "entity_type": "Repository",
            "sector_id": repo.sector_id,
            "quality_status": repo.quality_status,
            "subtitle": f"★ {repo.stars:,} • {repo.primary_language or 'Code'}",
        }
        G.add_node(repo.id, **node_meta[repo.id])

    for b in db.scalars(select(BreakthroughCandidate)).all():
        if sector_id and b.sector_id != sector_id:
            continue
        node_meta[b.id] = {
            "id": b.id,
            "label": b.title[:60] + "...",
            "full_title": b.title,
            "entity_type": "Breakthrough",
            "sector_id": b.sector_id,
            "quality_status": b.status,
            "subtitle": f"Score: {b.score:.1f} • {b.metric_name}",
        }
        G.add_node(b.id, **node_meta[b.id])

    evidence_map = {e.id: e for e in db.scalars(select(EvidenceSource)).all()}
    edges_out: list[dict[str, Any]] = []

    for rel in db.scalars(select(EntityRelationship)).all():
        if not include_provisional and rel.is_provisional:
            continue
        if relationship_type and rel.relationship_type != relationship_type:
            continue
        if rel.source_entity_id not in G or rel.target_entity_id not in G:
            continue

        ev = evidence_map.get(rel.source_id)
        edge_dict = {
            "id": rel.id,
            "source": rel.source_entity_id,
            "target": rel.target_entity_id,
            "relationship_type": rel.relationship_type,
            "confidence": rel.confidence,
            "review_status": rel.review_status,
            "is_provisional": rel.is_provisional,
            "evidence_source_id": rel.source_id,
            "evidence_title": ev.title if ev else "Verified Internal Provenance",
            "evidence_url": ev.source_url if ev else None,
            "evidence_excerpt": rel.evidence_excerpt,
        }
        edges_out.append(edge_dict)
        G.add_edge(rel.source_entity_id, rel.target_entity_id, **edge_dict)

    # Remove isolated nodes when filtering by sector/relationship so graph visualization stays focused
    if sector_id or relationship_type:
        connected_ids = {u for u, v in G.edges()} | {v for u, v in G.edges()}
        for nid in list(G.nodes()):
            if nid not in connected_ids and G.nodes[nid].get("sector_id") != sector_id:
                G.remove_node(nid)

    # Compute NetworkX centrality & community metrics
    deg_centrality = nx.degree_centrality(G) if len(G) > 1 else {n: 0.0 for n in G.nodes()}
    btw_centrality = nx.betweenness_centrality(G) if len(G) > 2 else {n: 0.0 for n in G.nodes()}
    try:
        pr_centrality = nx.pagerank(G) if G.number_of_edges() > 0 else deg_centrality
    except Exception:
        pr_centrality = deg_centrality

    community_map: dict[str, int] = {}
    if G.number_of_edges() > 0:
        communities = list(nx.algorithms.community.greedy_modularity_communities(G))
        for comm_idx, comm_nodes in enumerate(communities):
            for nid in comm_nodes:
                community_map[str(nid)] = comm_idx

    nodes_out: list[dict[str, Any]] = []
    for idx, nid in enumerate(G.nodes()):
        meta = dict(node_meta[nid])
        meta["entity_type"] = meta["entity_type"].lower()
        meta["degree"] = int(G.degree(nid))
        meta["degree_centrality"] = round(float(deg_centrality.get(nid, 0.0)), 4)
        meta["pagerank"] = round(float(pr_centrality.get(nid, 0.0)), 4)
        meta["betweenness_centrality"] = round(float(btw_centrality.get(nid, 0.0)), 4)
        meta["community_id"] = community_map.get(nid, 0)
        meta["provisional"] = False
        nodes_out.append(meta)

    for e in edges_out:
        e["provisional"] = bool(e.get("is_provisional", False))
        e["notes"] = e.get("evidence_excerpt")

    top_nodes = sorted(nodes_out, key=lambda x: x["pagerank"], reverse=True)[:6]
    comm_count = len(set(community_map.values())) if community_map else 0

    return {
        "nodes": nodes_out,
        "edges": edges_out,
        "summary": {
            "node_count": len(nodes_out),
            "edge_count": len(edges_out),
            "community_count": comm_count,
            "methodology_disclaimer": (
                "Graph degree and betweenness centrality measure research network connectivity "
                "and citation/collaboration bridging; they do not measure founder quality or commercial returns."
            ),
        },
        "analytics_summary": {
            "total_nodes": len(nodes_out),
            "total_edges": len(edges_out),
            "communities_detected": comm_count,
            "top_centrality_nodes": [
                {
                    "id": tn["id"],
                    "label": tn["label"],
                    "pagerank": tn["pagerank"],
                    "betweenness": tn["betweenness_centrality"],
                }
                for tn in top_nodes
            ],
        },
    }


def expand_ego_graph(
    db: Session,
    center_node_id: str,
    depth: int = 1,
    relationship_type: str | None = None,
) -> dict[str, Any]:
    """Bounded graph expansion (ego-network up to specified hop depth)."""
    full = build_knowledge_graph(db, relationship_type=relationship_type)
    G = nx.Graph()
    for n in full["nodes"]:
        G.add_node(n["id"], **n)
    for e in full["edges"]:
        G.add_edge(e["source"], e["target"], **e)

    if center_node_id not in G:
        return {"center_node_id": center_node_id, "depth": depth, "nodes": [], "edges": []}

    bounded_depth = max(1, min(depth, 3))
    ego = nx.ego_graph(G, center_node_id, radius=bounded_depth)

    sub_nodes = [dict(ego.nodes[n]) for n in ego.nodes()]
    node_set = {n["id"] for n in sub_nodes}
    sub_edges = [
        e for e in full["edges"] if e["source"] in node_set and e["target"] in node_set
    ]
    return {
        "center_node_id": center_node_id,
        "depth": bounded_depth,
        "nodes": sub_nodes,
        "edges": sub_edges,
    }

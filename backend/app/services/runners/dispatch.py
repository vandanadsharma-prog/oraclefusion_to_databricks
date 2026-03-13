from __future__ import annotations

from app.models import PipelineRunRequest, PipelineType


def detect_pipeline_type(req: PipelineRunRequest) -> PipelineType:
    types = {n.nodeType for n in req.nodes}
    if "bicc" in types:
        return "bicc"
    if "goldengate" in types:
        return "goldengate"
    if "rest-api" in types:
        return "rest-api"
    if "jdbc" in types:
        return "jdbc"
    return "custom"


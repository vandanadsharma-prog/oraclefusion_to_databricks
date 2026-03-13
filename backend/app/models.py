from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


NodeType = Literal["oracle-fusion", "bicc", "goldengate", "rest-api", "jdbc", "cloud-storage", "databricks"]
PipelineType = Literal["bicc", "goldengate", "rest-api", "jdbc", "custom"]


class NodeConfig(BaseModel):
    model_config = {"extra": "allow"}


class PipelineNode(BaseModel):
    id: str
    nodeType: NodeType = Field(alias="nodeType")
    config: NodeConfig = Field(default_factory=NodeConfig)


class PipelineRunRequest(BaseModel):
    nodes: list[PipelineNode]
    edges: list[dict[str, Any]] = Field(default_factory=list)


class RunStartedResponse(BaseModel):
    run_id: str


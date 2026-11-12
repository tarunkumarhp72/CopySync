import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(default="", max_length=500)
    content: str = Field(default="")


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    content: str | None = Field(default=None)
    expected_version: int


class NoteRead(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    version: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteListItem(BaseModel):
    id: uuid.UUID
    title: str
    version: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteVersion(BaseModel):
    id: uuid.UUID
    version: int
    updated_at: datetime

    model_config = {"from_attributes": True}


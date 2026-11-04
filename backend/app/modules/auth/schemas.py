import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserRead(BaseModel):
    id: uuid.UUID
    google_id: str
    email: str
    name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=20, max_length=8192)

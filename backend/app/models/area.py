"""Area/district API schemas owned by Person 5."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AreaState(str, Enum):
    NORMAL = "NORMAL"
    ALERT = "ALERT"
    EMERGENCY = "EMERGENCY"
    RECOVERY = "RECOVERY"


class AreaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    district_code: str = Field(min_length=1, max_length=40)
    state: str = Field(default="Tamil Nadu", min_length=1, max_length=120)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    current_state: AreaState = AreaState.NORMAL

    model_config = ConfigDict(str_strip_whitespace=True)


class AreaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    current_state: Optional[AreaState] = None


class AreaOut(BaseModel):
    id: int
    name: str
    district_code: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_state: AreaState
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

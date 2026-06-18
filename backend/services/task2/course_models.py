from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from enum import Enum


class DifficultyLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


def _normalize_difficulty(v) -> str:
    """Map any LLM difficulty string to a valid DifficultyLevel value."""
    if isinstance(v, DifficultyLevel):
        return v.value
    s = str(v).lower()
    if "advanced" in s:
        return "advanced"
    if "intermediate" in s or "inter" in s or "medium" in s or "moderate" in s:
        return "intermediate"
    return "beginner"


def _normalize_assessment_type(v) -> str:
    """Map any LLM assessment type string to a valid Literal value."""
    valid = {"quiz", "project", "assignment", "discussion"}
    if v in valid:
        return v
    s = str(v).lower()
    if any(k in s for k in ("project", "build", "create", "implement", "develop")):
        return "project"
    if any(k in s for k in ("assign", "homework", "exercise", "worksheet", "problem_set", "problem set")):
        return "assignment"
    if any(k in s for k in ("discuss", "debate", "forum", "peer")):
        return "discussion"
    # quiz covers: test, exam, mock, short_answer, conceptual, numerical, etc.
    return "quiz"


class Resource(BaseModel):
    type: Literal["youtube", "article", "exercise", "documentation", "book"]
    title: str
    url: str
    description: Optional[str] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_resource_type(cls, v):
        valid = {"youtube", "article", "exercise", "documentation", "book"}
        if v in valid:
            return v
        s = str(v).lower()
        if "youtube" in s or "video" in s:
            return "youtube"
        if "doc" in s or "reference" in s or "manual" in s:
            return "documentation"
        if "exercise" in s or "practice" in s or "problem" in s:
            return "exercise"
        if "book" in s or "textbook" in s or "chapter" in s:
            return "book"
        return "article"


def _coerce_id(v) -> int:
    """Handle LLM decimal lesson IDs like 1.1, 1.2, 2.3 → 1, 2, 3.
    The LLM sometimes uses module.lesson notation (1.1 = module 1 lesson 1).
    We extract the meaningful lesson number from the fractional part.
    """
    f = float(v)
    whole = int(f)
    frac_digit = round((f - whole) * 10)  # e.g. 1.3 → 3, 2.6 → 6
    if frac_digit > 0:
        return frac_digit
    return max(1, whole)


class Lesson(BaseModel):
    id: int
    title: str
    topics: List[str]
    difficulty: DifficultyLevel
    resources: List[Resource] = []
    estimated_duration_minutes: Optional[int] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return _coerce_id(v)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty(cls, v):
        return _normalize_difficulty(v)

    @field_validator("estimated_duration_minutes", mode="before")
    @classmethod
    def coerce_duration_minutes(cls, v):
        if v is None:
            return v
        return max(1, round(float(v)))


class Assessment(BaseModel):
    type: Literal["quiz", "project", "assignment", "discussion"]
    title: str
    description: str
    estimated_duration_minutes: Optional[int] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v):
        return _normalize_assessment_type(v)

    @field_validator("estimated_duration_minutes", mode="before")
    @classmethod
    def coerce_duration_minutes(cls, v):
        if v is None:
            return v
        return max(1, round(float(v)))


class Module(BaseModel):
    id: int
    title: str
    objectives: List[str]
    difficulty: DifficultyLevel
    prerequisites: List[str] = []
    lessons: List[Lesson] = []
    assessment: Optional[Assessment] = None
    estimated_duration_weeks: Optional[int] = None

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty(cls, v):
        return _normalize_difficulty(v)

    @field_validator("estimated_duration_weeks", mode="before")
    @classmethod
    def coerce_duration_weeks(cls, v):
        if v is None:
            return v
        # Round floats like 0.4 → 1, 1.8 → 2
        return max(1, round(float(v)))


class AudienceInfo(BaseModel):
    age_group: Optional[str] = None
    skill_level: DifficultyLevel = DifficultyLevel.beginner
    prior_knowledge: Optional[str] = None

    @field_validator("skill_level", mode="before")
    @classmethod
    def normalize_skill_level(cls, v):
        return _normalize_difficulty(v)


class CoursePlan(BaseModel):
    title: str
    subject: str
    description: str
    audience: AudienceInfo
    total_duration: str
    session_frequency: Optional[str] = None
    learning_goals: List[str]
    modules: List[Module]
    created_at: Optional[str] = None
    version: int = 1


class IntakeState(BaseModel):
    """Tracks what information has been collected during the intake phase."""
    subject: Optional[str] = None
    audience: Optional[AudienceInfo] = None
    duration: Optional[str] = None
    session_frequency: Optional[str] = None
    learning_goals: Optional[List[str]] = None
    is_complete: bool = False

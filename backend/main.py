# Backend main entry point

"""FastAPI server for BPHS-based Birth Time Rectification.

This module exposes two endpoints:

  * GET /api/geocode?q=<place>
    Resolve a place name to latitude, longitude and formatted address using the
    OpenCage geocoding API.

  * POST /api/btr
    Perform birth time rectification on the supplied birth details using
    BPHS rules and Swiss Ephemeris.
"""

import os
import sys
import uuid
import time
import logging
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, ConfigDict
import httpx

from . import config
from . import btr_core

# ----------------------------------------------------------------------------
# Logging configuration
# ----------------------------------------------------------------------------

def _configure_logger() -> logging.Logger:
    """Configure a verbose application logger that always flushes to stdout."""
    level_name = (config.LOG_LEVEL or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logger = logging.getLogger("btr")
    if not logger.handlers:
        formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

        # Mirror all backend logs into logs/backend.log so they are always captured
        logs_dir = Path(__file__).parent.parent / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(logs_dir / "backend.log", encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        # Attach the same file handler to uvicorn loggers so server events persist even without shell redirection
        for uvicorn_logger_name in ("uvicorn.error", "uvicorn.access"):
            uvicorn_logger = logging.getLogger(uvicorn_logger_name)
            uvicorn_logger.setLevel(level)
            if not any(isinstance(h, logging.FileHandler) and getattr(h, "baseFilename", "") == str(logs_dir / "backend.log") for h in uvicorn_logger.handlers):
                uvicorn_logger.addHandler(file_handler)
            uvicorn_logger.propagate = False
    logger.setLevel(level)
    logger.propagate = False
    # Keep uvicorn logs aligned with the app for consistency
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(level)
    return logger

logger = _configure_logger()

def _log_phase(request_id: str, phase: int, title: str, detail: str, context: Optional[Dict[str, Any]] = None):
    """Emit a structured phase log with an optional context payload."""
    suffix = f" | context={context}" if context else ""
    logger.info("[req:%s] Phase %d - %s: %s%s", request_id, phase, title, detail, suffix)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    if not config.OPENCAGE_API_KEY:
        import warnings
        warnings.warn(
            "OPENCAGE_API_KEY is not configured. Geocoding will fail. "
            "Set OPENCAGE_API_KEY environment variable or add it to .env file.",
            UserWarning
        )
    if config.EPHE_PATH:
        import os
        if not os.path.exists(config.EPHE_PATH):
            import warnings
            warnings.warn(
                f"EPHE_PATH '{config.EPHE_PATH}' does not exist. "
                "Swiss Ephemeris will use default paths.",
                UserWarning
            )
    yield
    # Shutdown (if needed in future)

app = FastAPI(title="BPHS BTR Prototype", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS if hasattr(config, 'CORS_ORIGINS') else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files - require React production build
react_build_path = Path(__file__).parent.parent / "frontend-react" / "dist"
react_index_path = react_build_path / "index.html"
if not react_index_path.exists():
    raise RuntimeError(
        f"React production build is missing at '{react_index_path}'. "
        "Build the frontend with `npm install && npm run build` inside frontend-react/"
    )

app.mount("/assets", StaticFiles(directory=str(react_build_path / "assets")), name="assets")

@app.get("/")
async def read_root():
    """Serve the React production frontend."""
    if not react_index_path.exists():
        raise HTTPException(status_code=500, detail="React frontend not found. Build assets before deployment.")
    return FileResponse(str(react_index_path))

# ---------------------------------------------------------------------------
# Pydantic models for request/response
# ---------------------------------------------------------------------------

class ApproxTob(BaseModel):
    mode: str = Field(..., description="Mode of approximate time: 'unknown' or 'approx'")
    center: Optional[str] = Field(None, description="Center time (HH:MM) when mode='approx'")
    window_hours: Optional[float] = Field(3.0, description="Window +/- hours when mode='approx'")

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v):
        if v not in ('unknown', 'approx'):
            raise ValueError("approx_tob.mode must be 'unknown' or 'approx'")
        return v

class TimeRangeOverride(BaseModel):
    start: str = Field(..., description="Start time (HH:MM)")
    end: str = Field(..., description="End time (HH:MM)")

class PhysicalTraitsModel(BaseModel):
    height: Optional[str] = None  # Legacy band
    height_cm: Optional[float] = Field(None, ge=0)
    height_feet: Optional[float] = Field(None, ge=0)
    height_inches: Optional[float] = Field(None, ge=0)
    height_band: Optional[str] = None
    build: Optional[str] = None
    build_band: Optional[str] = None
    body_frame: Optional[str] = None
    complexion: Optional[str] = None
    complexion_tone: Optional[str] = None
    notes: Optional[str] = None

class MarriageEventModel(BaseModel):
    date: str
    place: Optional[str] = None
    spouse_name: Optional[str] = None
    notes: Optional[str] = None

class ChildEventModel(BaseModel):
    date: str
    gender: Optional[str] = None
    notes: Optional[str] = None

class CareerEventModel(BaseModel):
    date: str
    role: Optional[str] = None
    description: Optional[str] = None

class MajorEventModel(BaseModel):
    date: str
    title: str
    description: Optional[str] = None

class SiblingEventModel(BaseModel):
    type: str = Field(..., description="elder_brother, elder_sister, younger_brother, younger_sister")
    count: int = Field(0, ge=0)
    notes: Optional[str] = None

class ParentEventModel(BaseModel):
    relation: str = Field(..., description="father, mother")
    is_alive: bool = True
    death_date: Optional[str] = None
    notes: Optional[str] = None

class LifeEventsModel(BaseModel):
    marriage: Optional[MarriageEventModel] = None  # Legacy single marriage
    marriages: Optional[List[MarriageEventModel]] = None
    children: Optional[Any] = None  # Accept legacy dict or list of child events
    career: Optional[Any] = None    # Accept list of career events or date strings
    major: Optional[List[MajorEventModel]] = None
    siblings: Optional[List[SiblingEventModel]] = None
    parents: Optional[List[ParentEventModel]] = None
    model_config = ConfigDict(extra='allow')

class BTRRequest(BaseModel):
    dob: str = Field(..., description="Date of birth in DD-MM-YYYY")
    pob_text: str = Field(..., description="Place of birth text")
    tz_offset_hours: float = Field(..., description="Time zone offset from UTC in hours")
    approx_tob: ApproxTob = Field(..., description="Approximate time of birth details")
    time_range_override: Optional[TimeRangeOverride] = Field(None, description="Explicit time range override")
    prashna_mode: Optional[bool] = Field(False, description="Use current time for Nashta Jataka analysis")
    optional_traits: Optional[PhysicalTraitsModel] = None
    optional_events: Optional[LifeEventsModel] = None

class SpecialLagnas(BaseModel):
    bhava_lagna: float
    hora_lagna: float
    ghati_lagna: float
    varnada_lagna: float

class Nisheka(BaseModel):
    nisheka_lagna_deg: float
    gestation_months: float
    is_realistic: bool
    gestation_score: float

class PhysicalTraitsScore(BaseModel):
    height: Optional[float] = None
    build: Optional[float] = None
    complexion: Optional[float] = None
    overall: Optional[float] = None

class LifeEventsScore(BaseModel):
    marriage: Optional[float] = None
    children: Optional[float] = None
    career: Optional[float] = None
    major: Optional[float] = None
    siblings: Optional[float] = None
    parents: Optional[float] = None
    overall: Optional[float] = None

class BTRCandidate(BaseModel):
    time_local: str
    lagna_deg: float
    pranapada_deg: float
    delta_pp_deg: float
    passes_trine_rule: bool
    purification_anchor: Optional[str] = None
    bphs_score: Optional[float] = None
    verification_scores: Dict[str, float]
    special_lagnas: Optional[SpecialLagnas] = None
    nisheka: Optional[Nisheka] = None
    composite_score: Optional[float] = None
    shodhana_delta_palas: Optional[int] = None
    physical_traits_scores: Optional[PhysicalTraitsScore] = None
    life_events_scores: Optional[LifeEventsScore] = None

class RejectedCandidate(BaseModel):
    time_local: str
    lagna_deg: float
    pranapada_deg: float
    delta_pp_deg: Optional[float] = None
    delta_madhya_pp_deg: Optional[float] = None
    delta_gulika_deg: Optional[float] = None
    delta_moon_deg: Optional[float] = None
    passes_trine_rule: bool
    passes_purification: bool
    non_human_classification: Optional[str] = None
    rejection_reason: Optional[str] = None

class BTRResponse(BaseModel):
    engine_version: str
    geocode: Dict[str, Any]
    search_config: Dict[str, Any]
    candidates: List[BTRCandidate]
    best_candidate: Optional[BTRCandidate]
    rejections: Optional[List[RejectedCandidate]] = None
    notes: Optional[str] = None

class ClientLogEvent(BaseModel):
    """Payload for frontend/client log forwarding."""
    level: str = Field("info", description="Log level e.g. debug/info/warning/error")
    message: str = Field(..., description="Message emitted by the frontend")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional structured context from the client")

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _normalize_traits_for_scoring(traits: Optional[PhysicalTraitsModel]) -> Optional[Dict[str, Any]]:
    """Map rich trait input into the bands expected by the scorer."""
    if traits is None:
        return None

    data = traits.model_dump(exclude_none=True)
    height_band = str(data.get('height_band') or data.get('height') or '').upper() or None
    build_band = str(data.get('build_band') or data.get('build') or '').upper() or None
    complexion_band = str(data.get('complexion_tone') or data.get('complexion') or '').upper() or None

    if not height_band and 'height_cm' in data:
        try:
            val = float(data['height_cm'])
            if val >= 175:
                height_band = 'TALL'
            elif val <= 160:
                height_band = 'SHORT'
            else:
                height_band = 'MEDIUM'
        except (TypeError, ValueError):
            height_band = None

    normalized = {
        **({} if height_band is None else {'height': height_band, 'height_band': height_band}),
        **({} if build_band is None else {'build': build_band, 'build_band': build_band}),
        **({} if complexion_band is None else {'complexion': complexion_band, 'complexion_tone': complexion_band}),
    }
    for key in ('height_cm', 'height_feet', 'height_inches', 'body_frame', 'notes'):
        if key in data:
            normalized[key] = data[key]
    return normalized or None

def _normalize_events_for_scoring(events: Optional[LifeEventsModel]) -> Optional[Dict[str, Any]]:
    """Preserve structured life events while keeping legacy keys for scoring."""
    if events is None:
        return None
    data = events.model_dump(exclude_none=True)
    return data or None

def _analyze_input_completeness(request: BTRRequest) -> Dict[str, Any]:
    """Analyze input completeness and return prioritized suggested questions.
    
    Returns suggestions based on what fields are missing from the request,
    with priorities determined by the potential impact on candidate scoring.
    """
    suggestions = []
    priority = 1
    
    # Check if user has any time constraint (high impact on search effectiveness)
    has_time_constraint = bool(request.time_range_override or (
        request.approx_tob.mode == 'approx' and request.approx_tob.center
    ))
    is_full_day_default = (request.approx_tob.mode == 'unknown' and 
                          not request.time_range_override)
    
    if is_full_day_default:
        suggestions.append({
            "field": "time_range",
            "priority": priority,
            "message": "Add a time range to narrow the search window",
            "hint": "Specify the most likely time period (e.g., morning, afternoon, evening) to improve candidate quality"
        })
        priority += 1
    
    # Check for life events (important for verification)
    events = request.optional_events
    has_major_events = bool(events and events.major and len(events.major) > 0)
    has_marriage = bool(events and (events.marriage or (events.marriages and len(events.marriages) > 0)))
    has_children = bool(events and events.children and len(events.children) > 0)
    has_career = bool(events and events.career and len(events.career) > 0)
    
    if not (has_major_events or has_marriage or has_children or has_career):
        suggestions.append({
            "field": "life_events",
            "priority": priority,
            "message": "Add at least 2 significant life events",
            "hint": "Include dates for marriage, children's birth, career changes, or other major life events"
        })
        priority += 1
    elif has_major_events and len(events.major) < 2:
        suggestions.append({
            "field": "more_life_events",
            "priority": priority,
            "message": "Add more life events for better verification",
            "hint": "Additional events help confirm the birth time through BPHS verification methods"
        })
        priority += 1
    
    # Check for physical traits (helps with ranking and verification)
    traits = request.optional_traits
    has_physical_info = bool(traits and (
        traits.height_band or traits.height_cm or traits.height_feet or
        traits.build_band or traits.body_frame or
        traits.complexion_tone or traits.complexion or
        traits.notes
    ))
    
    if not has_physical_info:
        suggestions.append({
            "field": "physical_traits",
            "priority": priority,
            "message": "Add physical traits for better candidate ranking",
            "hint": "Height, build, complexion, or distinctive features help verify the most suitable birth time"
        })
        priority += 1
    
    # Enhanced time range analysis
    if has_time_constraint and not is_full_day_default:
        # Check if time range is too narrow (less than 2 hours)
        time_window_hours = 24  # default
        if request.time_range_override:
            try:
                start_time = datetime.datetime.strptime(request.time_range_override.start, "%H:%M")
                end_time = datetime.datetime.strptime(request.time_range_override.end, "%H:%M")
                if end_time <= start_time:
                    end_time += datetime.timedelta(days=1)
                time_window_hours = (end_time - start_time).total_seconds() / 3600
            except ValueError:
                pass
        elif request.approx_tob.mode == 'approx' and request.approx_tob.window_hours:
            time_window_hours = request.approx_tob.window_hours
        
        if time_window_hours < 2:
            suggestions.append({
                "field": "widen_time_range",
                "priority": priority,
                "message": "Time range is very narrow - consider widening it",
                "hint": f"Current window is {time_window_hours:.1f} hours. Try at least 4-6 hours for better BPHS matching"
            })
            priority += 1
        else:
            suggestions.append({
                "field": "verify_time_range",
                "priority": priority,
                "message": "Verify the time range accuracy or add more context",
                "hint": "Consider if the birth time could be outside this range, or add physical traits to improve filtering"
            })
            priority += 1
    
    # Prioritize physical traits when time range is provided but still no candidates
    if has_time_constraint and not has_physical_info:
        # Move physical traits suggestion up in priority when time range exists
        suggestions.insert(0, {
            "field": "physical_traits_time_range",
            "priority": 1,
            "message": "Add physical traits to filter candidates in your time range",
            "hint": "Since you provided a time range, physical traits will help identify the best candidate within that window"
        })
        # Re-number priorities for remaining suggestions
        for i, suggestion in enumerate(suggestions):
            if suggestion["field"] != "physical_traits_time_range":
                suggestion["priority"] = i + 2
    
    return {
        "suggested_questions": suggestions,
        "input_completeness_score": 100 - (len(suggestions) * 20),  # Simple scoring
        "missing_categories": [s["field"] for s in suggestions]
    }

def _generate_bphs_specific_questions(rejections: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Generate BPHS-specific questions based on rejection patterns."""
    if not rejections:
        return []
    
    bphs_questions = []
    reason_counts = {}
    
    # Analyze rejection patterns
    for rej in rejections:
        reason = rej.get("rejection_reason", "Unknown")
        reason_counts[reason] = reason_counts.get(reason, 0) + 1
    
    # Find the most common rejection reasons
    top_reasons = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)
    
    for reason, count in top_reasons[:3]:
        if "trine rule" in reason.lower() and count > 5:
            # Many candidates failing BPHS 4.10 trine rule
            bphs_questions.append({
                "field": "bphs_trine_rule_failure",
                "priority": 1,
                "message": f"Most candidates fail BPHS 4.10 trine rule - verify birth characteristics",
                "hint": "The Trine Rule (BPHS 4.10) is mandatory for human birth. Add distinctive physical traits to help identify the correct human candidate."
            })
        elif "padekyata" in reason.lower() and count > 3:
            # Degree matching issues - suggest time precision
            bphs_questions.append({
                "field": "bphs_degree_matching",
                "priority": 2,
                "message": f"Degree matching failing (BPHS 4.6) - narrow time window",
                "hint": "Padekyatā requires precise degree alignment. Consider a more specific birth time window."
            })
        elif "non-human" in reason.lower() and count > 5:
            # Many non-human classifications
            bphs_questions.append({
                "field": "bphs_non_human_many",
                "priority": 1,
                "message": f"Many candidates classified as non-human (BPHS 4.11)",
                "hint": "Add physical traits and life events to help distinguish the human birth candidate per BPHS 4.10-4.11."
            })
        elif "purification" in reason.lower():
            # Verification anchor issues
            bphs_questions.append({
                "field": "bphs_purification_anchor",
                "priority": 3,
                "message": f"Purification anchor failing (BPHS 4.8)",
                "hint": "Consider if birth time might be in a different planetary period (dasha) or add life events for verification."
            })
    
    # If top candidates come close to passing BPHS rules
    min_padekyata = None
    min_moon = None
    min_gulika = None
    
    for rej in rejections:
        dp = rej.get("delta_pp_deg")
        dm = rej.get("delta_moon_deg")
        dg = rej.get("delta_gulika_deg")
        
        if dp is not None:
            min_padekyata = dp if min_padekyata is None else min(min_padekyata, dp)
        if dm is not None:
            min_moon = dm if dm is None else min(min_moon, dm)
        if dg is not None:
            min_gulika = dg if min_gulika is None else min(min_gulika, dg)
    
    # Suggest precision improvements
    if min_padekyata and min_padekyata < 1.0:
        bphs_questions.append({
            "field": "bphs_close_padekyata",
            "priority": 2,
            "message": f"Candidates very close to degree matching (Δ={min_padekyata:.2f}°)",
            "hint": "Some candidates nearly match Padekyatā (BPHS 4.6). Add more physical traits for precise identification."
        })
    
    if min_moon and min_moon < 2.0:
        bphs_questions.append({
            "field": "bphs_close_moon",
            "priority": 3,
            "message": f"Candidates close to Moon alignment (Δ={min_moon:.2f}°)",
            "hint": "Moon alignment is part of BPHS 4.8 verification. Life events can help confirm the best candidate."
        })
    
    # Special lagna suggestions
    if len(rejections) > 10:
        bphs_questions.append({
            "field": "bphs_special_lagnas",
            "priority": 4,
            "message": "Consider special lagna analysis (BPHS 4.18-28)",
            "hint": "Bhava/Hora/Ghati/Varnada lagnas provide additional verification layers for complex cases."
        })
    
    return bphs_questions

def _summarize_rejections_for_response(
    rejections: list[Dict[str, Any]],
    window_start: str,
    window_end: str,
    request: BTRRequest,
    suggested_questions: Dict[str, Any] = None
) -> tuple[Dict[str, Any], str]:
    """Summarize rejection diagnostics for UI recovery flows."""
    # If no suggested questions provided, analyze input completeness
    if suggested_questions is None:
        suggested_questions = _analyze_input_completeness(request)
    
    # Generate BPHS-specific questions based on rejection patterns
    bphs_specific_questions = _generate_bphs_specific_questions(rejections)
    
    # Combine general and BPHS-specific questions, with BPHS taking priority
    base_questions = suggested_questions.get("suggested_questions", [])
    combined_questions = []
    
    # Add BPHS-specific questions first (higher priority)
    bphs_used_fields = set()
    for bphs_q in bphs_specific_questions:
        combined_questions.append(bphs_q)
        bphs_used_fields.add(bphs_q["field"])
    
    # Add remaining general questions, avoiding duplicates
    for general_q in base_questions:
        if general_q["field"] not in bphs_used_fields:
            combined_questions.append(general_q)
    
    reason_counts: Dict[str, int] = {}
    min_padekyata = None
    min_moon = None
    min_gulika = None
    for rej in rejections:
        reason = rej.get("rejection_reason") or "Unknown rejection"
        reason_counts[reason] = reason_counts.get(reason, 0) + 1
        dp = rej.get("delta_pp_deg")
        dm = rej.get("delta_moon_deg")
        dg = rej.get("delta_gulika_deg")
        if dp is not None:
            min_padekyata = dp if min_padekyata is None else min(min_padekyata, dp)
        if dm is not None:
            min_moon = dm if min_moon is None else min(min_moon, dm)
        if dg is not None:
            min_gulika = dg if min_gulika is None else min(min_gulika, dg)
    
    top_reasons = sorted(reason_counts.items(), key=lambda kv: kv[1], reverse=True)
    reason_str = "; ".join(f"{msg} ({count})" for msg, count in top_reasons[:3])
    delta_bits = []
    if min_padekyata is not None:
        delta_bits.append(f"closest padekyata Δ={min_padekyata:.2f}°")
    if min_moon is not None:
        delta_bits.append(f"closest Moon Δ={min_moon:.2f}°")
    if min_gulika is not None:
        delta_bits.append(f"closest Gulika Δ={min_gulika:.2f}°")
    delta_str = "; ".join(delta_bits)

    # Enhanced rejection summary with dynamic BPHS-specific suggested questions
    rejection_summary = {
        "reason_counts": reason_counts,
        "window": {"start": window_start, "end": window_end},
        "nearest": {
            "padekyata_delta_deg": min_padekyata,
            "moon_delta_deg": min_moon,
            "gulika_delta_deg": min_gulika
        },
        "suggested_questions": combined_questions,
        "input_completeness_score": suggested_questions.get("input_completeness_score", 0),
        "missing_categories": [s["field"] for s in combined_questions],
        "bphs_insights": {
            "top_rejection_reasons": top_reasons,
            "candidates_analyzed": len(rejections),
            "bphs_violations": [reason for reason, count in top_reasons if "BPHS" in reason]
        },
        "suggestions": [
            "Add physical traits based on BPHS Chapter 2 for better verification",
            "Include life events validated by BPHS Chapter 12 dasha timing",
            "Consider special lagna analysis (BPHS 4.18-28) for complex cases",
            "Verify birth time window if most candidates fail the Trine Rule (BPHS 4.10)"
        ]
    }

    human_detail_suffix = ""
    if reason_str:
        human_detail_suffix += f" Rejections: {reason_str}."
    if delta_str:
        human_detail_suffix += f" Nearest matches: {delta_str}."
    return rejection_summary, human_detail_suffix

async def opencage_geocode(place: str, request_id: Optional[str] = None) -> Dict[str, Any]:
    """Resolve a place name using the OpenCage API.

    Args:
        place: Free‑text place description.
        request_id: Optional correlation id for log tracing.

    Returns:
        Dict with keys 'lat', 'lon', 'formatted', and optional timezone info.
    """
    log_prefix = f"[req:{request_id}] " if request_id else ""
    api_key = config.OPENCAGE_API_KEY
    if not api_key:
        logger.error("%sOpenCage API key is not configured; cannot geocode '%s'", log_prefix, place)
        raise HTTPException(status_code=500, detail="OPENCAGE_API_KEY is not configured.")
    logger.info("%sGeocoding place '%s'", log_prefix, place)
    url = "https://api.opencagedata.com/geocode/v1/json"
    params = {'q': place, 'key': api_key, 'limit': 1}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params, timeout=10.0)
        except httpx.TimeoutException:
            logger.warning("%sOpenCage API timed out for '%s'", log_prefix, place)
            raise HTTPException(status_code=504, detail="OpenCage API request timed out.")
        except httpx.RequestError as e:
            logger.error("%sOpenCage API request error for '%s': %s", log_prefix, place, e)
            raise HTTPException(status_code=503, detail=f"OpenCage API request failed: {str(e)}")
        
        if resp.status_code != 200:
            logger.error("%sOpenCage API error (%s): %s", log_prefix, resp.status_code, resp.text[:200])
            raise HTTPException(status_code=resp.status_code, detail=f"OpenCage API error: {resp.text}")
        
        try:
            data = resp.json()
        except ValueError as e:
            logger.error("%sInvalid JSON from OpenCage: %s", log_prefix, e)
            raise HTTPException(status_code=502, detail=f"Invalid JSON response from OpenCage API: {str(e)}")
        
        if not data.get('results'):
            logger.warning("%sOpenCage returned no results for '%s'", log_prefix, place)
            raise HTTPException(status_code=404, detail="Location not found.")
        
        result = data['results'][0]
        try:
            lat = float(result['geometry']['lat'])
            lon = float(result['geometry']['lng'])
            formatted = str(result.get('formatted', ''))
            if not formatted:
                formatted = f"{lat}, {lon}"
            tz_data = result.get('annotations', {}).get('timezone', {}) or {}
            tz_offset_hours = None
            try:
                tz_offset_hours = round(float(tz_data.get('offset_sec', 0)) / 3600.0, 2)
            except (TypeError, ValueError):
                tz_offset_hours = None
            tz_name = tz_data.get('name')
        except (KeyError, ValueError, TypeError) as e:
            logger.error("%sOpenCage response parse failed: %s", log_prefix, e)
            raise HTTPException(status_code=502, detail=f"Invalid response format from OpenCage API: {str(e)}")
        
        payload = {
            'lat': lat,
            'lon': lon,
            'formatted': formatted,
            'tz_offset_hours': tz_offset_hours,
            'timezone_name': tz_name
        }
        logger.info(
            "%sGeocoding success | lat=%s lon=%s place='%s' tz_offset=%s tz_name=%s",
            log_prefix,
            lat,
            lon,
            formatted,
            tz_offset_hours,
            tz_name
        )
        return payload

# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@app.post("/api/client-log")
async def client_log(event: ClientLogEvent):
    """Accept client-side log events and forward them to backend logs."""
    level = getattr(logging, event.level.upper(), logging.INFO)
    logger.log(level, "[client] %s | context=%s", event.message, event.context or {})
    return {"status": "ok"}

@app.get("/api/geocode")
async def geocode(q: str = Query(..., description="Place name to geocode")):
    """Geocode a place using OpenCage."""
    request_id = uuid.uuid4().hex[:8]
    _log_phase(request_id, 0, "Geocode", "Incoming geocode request", {"query": q})
    geodata = await opencage_geocode(q, request_id=request_id)
    _log_phase(request_id, 1, "Geocode", "Geocode success", {"lat": geodata.get("lat"), "lon": geodata.get("lon")})
    return geodata

@app.post("/api/btr", response_model=BTRResponse)
async def btr(request: BTRRequest):
    """Perform BPHS-based birth time rectification."""
    request_id = uuid.uuid4().hex[:8]
    t0 = time.perf_counter()
    _log_phase(
        request_id,
        0,
        "Request received",
        "Starting BTR calculation",
        {
            "dob": request.dob,
            "pob_text": request.pob_text,
            "tz": request.tz_offset_hours,
            "mode": request.approx_tob.mode
        }
    )
    # Parse date of birth
    try:
        dob_date = datetime.datetime.strptime(request.dob, "%d-%m-%Y").date()
        if dob_date > datetime.date.today():
            raise HTTPException(status_code=400, detail="Date of birth cannot be in the future.")
    except ValueError:
        logger.exception("[req:%s] Invalid dob format", request_id)
        raise HTTPException(status_code=400, detail="Invalid date format for dob. Use DD-MM-YYYY.")

    # Geocode the place
    _log_phase(request_id, 1, "Geocode", "Requesting geocode from OpenCage")
    geocode_result = await opencage_geocode(request.pob_text, request_id=request_id)
    latitude = geocode_result['lat']
    longitude = geocode_result['lon']
    geocode_tz_offset = geocode_result.get('tz_offset_hours')
    tz_offset_hours_to_use = geocode_tz_offset if isinstance(geocode_tz_offset, (int, float)) else request.tz_offset_hours
    _log_phase(
        request_id,
        2,
        "Geocode complete",
        "Resolved place and timezone",
        {
            "lat": latitude,
            "lon": longitude,
            "formatted": geocode_result.get('formatted'),
            "tz_offset_hours": tz_offset_hours_to_use,
            "tz_name": geocode_result.get('timezone_name')
        }
    )

    # Determine search window
    if request.time_range_override:
        start_time = request.time_range_override.start
        end_time = request.time_range_override.end
        
        # Validate time format
        try:
            start_parts = start_time.split(':')
            end_parts = end_time.split(':')
            if len(start_parts) != 2 or len(end_parts) != 2:
                raise ValueError("Time format must be HH:MM")
            
            start_hour, start_min = int(start_parts[0]), int(start_parts[1])
            end_hour, end_min = int(end_parts[0]), int(end_parts[1])
            
            if not (0 <= start_hour < 24 and 0 <= start_min < 60):
                raise ValueError(f"Start time hour must be 0-23 and minute must be 0-59. Got {start_hour}:{start_min}")
            if not (0 <= end_hour < 24 and 0 <= end_min < 60):
                raise ValueError(f"End time hour must be 0-23 and minute must be 0-59. Got {end_hour}:{end_min}")
                
        except (ValueError, IndexError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid time format in time_range_override: {str(e)}")
    else:
        if request.approx_tob.mode == "unknown":
            start_time = "00:00"
            end_time = "23:59"
        else:
            center = request.approx_tob.center or "12:00"
            window = request.approx_tob.window_hours or 3.0
            try:
                center_parts = center.split(':')
                if len(center_parts) != 2:
                    raise ValueError("Time format must be HH:MM")
                center_hour, center_min = int(center_parts[0]), int(center_parts[1])
                if not (0 <= center_hour < 24 and 0 <= center_min < 60):
                    raise ValueError("Hour must be 0-23 and minute must be 0-59")
            except (ValueError, IndexError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid time format for center: {center}. Use HH:MM format. {str(e)}")
            start_dt = datetime.datetime.combine(dob_date, datetime.time(center_hour, center_min)) - datetime.timedelta(hours=window)
            end_dt = datetime.datetime.combine(dob_date, datetime.time(center_hour, center_min)) + datetime.timedelta(hours=window)
            start_time = start_dt.strftime("%H:%M")
            end_time = end_dt.strftime("%H:%M")
    _log_phase(
        request_id,
        3,
        "Search window set",
        "Finalized time window for candidate scan",
        {"start_time": start_time, "end_time": end_time, "tz_offset_hours": tz_offset_hours_to_use}
    )

    # Precompute sunrise/sunset and gulika
    try:
        sunrise_local, sunset_local = btr_core.compute_sunrise_sunset(dob_date, latitude, longitude, tz_offset_hours_to_use)
    except RuntimeError as e:
        logger.exception("[req:%s] Sunrise/sunset calculation failed: %s", request_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to calculate sunrise/sunset: {str(e)}")
    except Exception as e:
        logger.exception("[req:%s] Unexpected sunrise/sunset error: %s", request_id, e)
        raise HTTPException(status_code=500, detail=f"Unexpected error in sunrise/sunset calculation: {str(e)}")
    
    _log_phase(
        request_id,
        4,
        "Sunrise/Sunset computed",
        "Day boundary established",
        {
            "sunrise_local": sunrise_local.isoformat(),
            "sunset_local": sunset_local.isoformat()
        }
    )
    
    try:
        gulika_info = btr_core.calculate_gulika(dob_date, latitude, longitude, tz_offset_hours_to_use)
    except RuntimeError as e:
        logger.exception("[req:%s] Gulika calculation failed: %s", request_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to calculate Gulika: {str(e)}")
    except Exception as e:
        logger.exception("[req:%s] Unexpected Gulika error: %s", request_id, e)
        raise HTTPException(status_code=500, detail=f"Unexpected error in Gulika calculation: {str(e)}")
    _log_phase(request_id, 5, "Gulika calculated", "Primary purification marker ready", gulika_info)

    traits_for_scoring = _normalize_traits_for_scoring(request.optional_traits)
    events_for_scoring = _normalize_events_for_scoring(request.optional_events)
    logger.debug(
        "[req:%s] Traits normalized: %s | Events normalized: %s",
        request_id,
        bool(traits_for_scoring),
        bool(events_for_scoring)
    )

    # Search candidate times at BPHS-aligned resolution (2 minutes)
    step_minutes = 2
    search_attempts: List[Dict[str, Any]] = []
    strict_bphs_used = True
    _log_phase(
        request_id,
        6,
        "Candidate search start",
        "Scanning times at BPHS resolution",
        {
            "step_minutes": step_minutes,
            "strict_bphs": True,
            "enable_shodhana": True,
            "collect_rejections": True
        }
    )
    try:
        def _run_search(window_start: str, window_end: str, strict_bphs: bool = True):
            return btr_core.search_candidate_times(
                dob=dob_date,
                latitude=latitude,
                longitude=longitude,
                tz_offset=tz_offset_hours_to_use,
                start_time_str=window_start,
                end_time_str=window_end,
                step_minutes=step_minutes,
                strict_bphs=strict_bphs,
                enable_shodhana=True,
                bphs_only_ordering=True,
                collect_rejections=True,
                sunrise_local=sunrise_local,
                sunset_local=sunset_local,
                gulika_info=gulika_info,
                optional_traits=traits_for_scoring,
                optional_events=events_for_scoring
            )

        candidates, rejections = _run_search(start_time, end_time, strict_bphs=True)
        search_attempts = [{
            "window": {"start": start_time, "end": end_time},
            "strict_bphs": True,
            "candidates": len(candidates),
            "rejections": len(rejections)
        }]

        # Fallback 1: widen to full-day window if user narrowed the search
        if not candidates and (start_time != "00:00" or end_time != "23:59"):
            _log_phase(
                request_id,
                6,
                "Fallback search",
                "No candidates found; widening to full-day window",
                {"previous_window": {"start": start_time, "end": end_time}}
            )
            fallback_start, fallback_end = "00:00", "23:59"
            candidates, rejections = _run_search(fallback_start, fallback_end, strict_bphs=True)
            search_attempts.append({
                "window": {"start": fallback_start, "end": fallback_end},
                "strict_bphs": True,
                "candidates": len(candidates),
                "rejections": len(rejections),
                "note": "expanded_window_full_day"
            })
            # Update start_time and end_time to be used in the next fallback if needed
            start_time, end_time = fallback_start, fallback_end
            if candidates:
                strict_bphs_used = True

        # Fallback 2: relax palā tolerance (strict_bphs=False) while keeping BPHS trine rule intact
        if not candidates:
            _log_phase(
                request_id,
                6,
                "Fallback search",
                "No candidates after widening; retrying with relaxed palā tolerance",
                {"window": {"start": start_time, "end": end_time}}
            )
            candidates, rejections = _run_search(start_time, end_time, strict_bphs=False)
            search_attempts.append({
                "window": {"start": start_time, "end": end_time},
                "strict_bphs": False,
                "candidates": len(candidates),
                "rejections": len(rejections),
                "note": "relaxed_padekyata_tolerance"
            })
            if candidates:
                strict_bphs_used = False
    except RuntimeError as e:
        logger.exception("[req:%s] BTR candidate search failed: %s", request_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to search candidate times: {str(e)}")
    except Exception as e:
        logger.exception("[req:%s] Unexpected error in candidate search: %s", request_id, e)
        raise HTTPException(status_code=500, detail=f"Unexpected error in candidate search: {str(e)}")

    # Candidates are already sorted by composite_score in search_candidate_times
    if not candidates:
        rejection_summary, human_suffix = _summarize_rejections_for_response(rejections, start_time, end_time, request)
        _log_phase(
            request_id,
            7,
            "No candidates",
            "Candidate search yielded zero valid times",
            {"window_start": start_time, "window_end": end_time, "rejections": len(rejections)}
        )
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NO_CANDIDATES",
                "message": "No valid birth time candidates found. This may indicate: "
                           "1) No times in the search window satisfy BPHS trine rule (4.10), "
                           "2) Invalid date/location, or 3) Calculation error."
                           f"{human_suffix}",
                "rejection_summary": rejection_summary,
                "search_window": {"start": start_time, "end": end_time},
                "tz_offset_hours_used": tz_offset_hours_to_use,
                "suggested_questions": rejection_summary.get("suggested_questions", []),
                "fallback_trace": search_attempts
            }
        )
    
    # Convert to Pydantic models, handling optional fields
    candidate_models = []
    for c in candidates:
        try:
            candidate_dict = {
                'time_local': c['time_local'],
                'lagna_deg': c['lagna_deg'],
                'pranapada_deg': c['pranapada_deg'],
                'delta_pp_deg': c['delta_pp_deg'],
                'passes_trine_rule': c['passes_trine_rule'],
                'purification_anchor': c.get('purification_anchor'),
                'bphs_score': c.get('bphs_score'),
                'shodhana_delta_palas': c.get('shodhana_delta_palas'),
                'verification_scores': c['verification_scores']
            }
            if 'special_lagnas' in c:
                candidate_dict['special_lagnas'] = SpecialLagnas(**c['special_lagnas'])
            if 'nisheka' in c:
                candidate_dict['nisheka'] = Nisheka(**c['nisheka'])
            if 'composite_score' in c:
                candidate_dict['composite_score'] = c['composite_score']
            if 'physical_traits_scores' in c:
                candidate_dict['physical_traits_scores'] = PhysicalTraitsScore(**c['physical_traits_scores'])
            if 'life_events_scores' in c:
                candidate_dict['life_events_scores'] = LifeEventsScore(**c['life_events_scores'])
            candidate_models.append(BTRCandidate(**candidate_dict))
        except (KeyError, ValueError, TypeError) as e:
            logger.exception("[req:%s] Candidate parse failed: %s", request_id, e)
            raise HTTPException(
                status_code=500,
                detail=f"Invalid candidate data structure: {str(e)}"
            )
    
    rejection_models: List[RejectedCandidate] = []
    for r in rejections:
        try:
            rejection_models.append(RejectedCandidate(**r))
        except (KeyError, ValueError, TypeError) as e:
            logger.exception("[req:%s] Rejection parse failed: %s", request_id, e)
            raise HTTPException(
                status_code=500,
                detail=f"Invalid rejection data structure: {str(e)}"
            )
    
    best_candidate = candidate_models[0] if candidate_models else None
    _log_phase(
        request_id,
        7,
        "Candidates ranked",
        "Scoring complete",
        {
            "candidate_count": len(candidate_models),
            "rejection_count": len(rejection_models),
            "best_candidate": best_candidate.time_local if best_candidate else None
        }
    )

    # Generate BPHS methodology notes
    methodology_notes = (
        "BPHS Birth Time Rectification Methodology:\n"
        "Source: Brihat Parashar Hora Shastra - Chapter 4 (लग्नाध्याय)\n"
        "Adhyāya 4: लग्नाध्याय (Lagna Chapter)\n\n"
        "Key Verses Implemented:\n"
        "- Gulika Calculation: BPHS 4.1-4.3 (गुलिक गणना)\n"
        "- Pranapada (Madhya): BPHS 4.5 (घटी चतुर्गुणा...)\n"
        "- Pranapada (Sphuta): BPHS 4.7 (स्वेष्टकालं पलीकृत्य...)\n"
        "- Degree Matching: BPHS 4.6 (लग्नांशप्राणांशपदैक्यता)\n"
        "- Triple Verification: BPHS 4.8 (विना प्राणपदाच्छुद्धो...)\n"
        "- Trine Rule (MANDATORY): BPHS 4.10 (प्राणपदं को राशि से त्रिकोण...)\n"
        "- Special Lagnas: BPHS 4.18-28 (Bhava, Hora, Ghati, Varnada)\n"
        "- Nisheka Lagna: BPHS 4.12-16 (Conception verification)\n\n"
        "All candidates must pass the Trine Rule (BPHS 4.10) for human birth verification. "
        "Candidates are scored based on degree matching, Gulika/Moon alignment, "
        "and optional physical traits/life events verification."
    )

    response = BTRResponse(
        engine_version="bphs-btr-prototype-v1",
        geocode=geocode_result,
        search_config={
            "step_minutes": step_minutes,
            "time_window_used": {
                "start_local": start_time,
                "end_local": end_time
            },
            "tz_offset_hours_used": tz_offset_hours_to_use
        },
        candidates=candidate_models,
        best_candidate=best_candidate,
        rejections=rejection_models or None,
        notes=methodology_notes
    )
    total_elapsed = time.perf_counter() - t0
    _log_phase(
        request_id,
        8,
        "Response ready",
        "BTR request succeeded",
        {
            "candidates": len(candidate_models),
            "rejections": len(rejection_models),
            "best_candidate": best_candidate.time_local if best_candidate else None,
            "elapsed_seconds": round(total_elapsed, 3),
            "window": f"{start_time}-{end_time}"
        }
    )

    return response

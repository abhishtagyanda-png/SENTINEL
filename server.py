import os
import glob
import json
from typing import Optional, Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag_store import retrieve_context, build_rag_store, collection
from edge_sensor import tokenise_sensor_row, tokenise_scene, check_ollama_status
from reasoning_engine import reason_about_incident
from forensic_logger import create_forensic_report, verify_forensic_report, REPORTS_DIR
from query_engine import operator_query

# Initialize FastAPI
app = FastAPI(
    title="VIGIL Backend REST API",
    description="3-Layer Gemma 4 Edge Public Safety Incident Verification Pipeline API",
    version="1.0.0"
)

# Enable CORS for Next.js frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build RAG store on startup
@app.on_event("startup")
def startup_event():
    build_rag_store()

# Pydantic models for request bodies
class EventSensorInput(BaseModel):
    event_id: str
    timestamp: str
    location: str
    motion_detected: bool
    door_state: str
    people_count: int
    camera_feed_summary: str
    acoustic_tokens: Optional[str] = None

class ImageInput(BaseModel):
    image_path: str
    location: str
    acoustic_tokens: Optional[str] = None

class QueryInput(BaseModel):
    question: str

def load_report_by_id(report_id: str) -> dict:
    filepath = os.path.join(REPORTS_DIR, f"{report_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Incident report not found")
    with open(filepath, "r") as f:
        return json.load(f)

# --- API ENDPOINTS ---

@app.get("/api/status")
def get_status():
    """
    Returns the overall status of the VIGIL pipeline subsystems.
    """
    ollama_ready = check_ollama_status()
    rag_doc_count = collection.count() if collection else 0
    reports = glob.glob(os.path.join(REPORTS_DIR, "*.json"))
    
    return {
        "status": "online",
        "subsystems": {
            "edge_ollama_gemma4": "ready" if ollama_ready else "offline (simulation fallback active)",
            "rag_vector_db": "active",
            "chromadb_document_count": rag_doc_count,
            "forensic_vault": "active",
            "reports_count": len(reports)
        }
    }

@app.get("/api/reports")
def list_reports():
    """
    Lists all forensic reports sorted by timestamp descending.
    """
    reports = []
    files = glob.glob(os.path.join(REPORTS_DIR, "*.json"))
    for f in files:
        try:
            with open(f, "r") as fh:
                rep = json.load(fh)
                # Return subset for list view
                reports.append({
                    "report_id": rep.get("report_id"),
                    "timestamp_utc": rep.get("timestamp_utc"),
                    "location": rep.get("location"),
                    "decision": rep.get("decision"),
                    "confidence": rep.get("confidence"),
                    "operator_message": rep.get("operator_message"),
                    "sha256_hash": rep.get("sha256_hash")
                })
        except Exception:
            pass
    # Sort descending
    reports.sort(key=lambda x: x.get("timestamp_utc", ""), reverse=True)
    return reports

@app.get("/api/reports/{report_id}")
def get_report(report_id: str):
    """
    Retrieves a detailed forensic report including full CoT trace and signatures.
    """
    return load_report_by_id(report_id)

@app.post("/api/trigger/sensor")
def trigger_sensor_event(event: EventSensorInput):
    """
    Ingests an IoT sensor event, processes through RAG/Gemma CoT reasoning, 
    and returns decision and signed report details.
    """
    event_dict = event.dict()
    tokens = tokenise_sensor_row(event_dict, event.acoustic_tokens)
    anomaly_score = tokens.get("anomaly_score", 0.0)
    
    if anomaly_score < 0.35:
        return {
            "processed": True,
            "action": "SUPPRESSED",
            "anomaly_score": anomaly_score,
            "preliminary_intent": tokens.get("preliminary_intent"),
            "reasoning_for_score": tokens.get("reasoning_for_score"),
            "message": "Activity suppressed at the edge. Normal telemetry logged silently.",
            "report": None
        }
        
    # Search RAG
    search_query = f"{tokens.get('preliminary_intent', '')} in {event.location} {tokens.get('sensor_summary', '')}"
    context = retrieve_context(search_query, n_results=3)
    
    # Reason
    reasoning = reason_about_incident(tokens, context)
    decision = reasoning.get("decision", "HOLD_FOR_REVIEW")
    
    # Sign report
    report = None
    if decision in ["ESCALATE", "HOLD_FOR_REVIEW"]:
        report = create_forensic_report(tokens, reasoning, event.location)
        
    return {
        "processed": True,
        "action": decision,
        "anomaly_score": anomaly_score,
        "preliminary_intent": tokens.get("preliminary_intent"),
        "reasoning": reasoning,
        "report": report
    }

@app.post("/api/trigger/image")
def trigger_image_event(image_input: ImageInput):
    """
    Ingests a camera frame image path, processes through Layer 1 vision tokenization,
    runs RAG CoT reasoning, and outputs signed reports.
    """
    if not os.path.exists(image_input.image_path):
        raise HTTPException(status_code=400, detail=f"Image file {image_input.image_path} not found")
        
    tokens = tokenise_scene(image_input.image_path, image_input.acoustic_tokens)
    anomaly_score = tokens.get("anomaly_score", 0.0)
    
    if anomaly_score < 0.35:
        return {
            "processed": True,
            "action": "SUPPRESSED",
            "anomaly_score": anomaly_score,
            "preliminary_intent": tokens.get("preliminary_intent"),
            "reasoning_for_score": tokens.get("reasoning_for_score"),
            "message": "Visual feed normal. Suppressed at the edge.",
            "report": None
        }
        
    # Search RAG
    search_query = f"{tokens.get('preliminary_intent', '')} in {image_input.location} {tokens.get('spatial_layout', '')}"
    context = retrieve_context(search_query, n_results=3)
    
    # Reason
    reasoning = reason_about_incident(tokens, context)
    decision = reasoning.get("decision", "HOLD_FOR_REVIEW")
    
    # Sign report
    report = None
    if decision in ["ESCALATE", "HOLD_FOR_REVIEW"]:
        report = create_forensic_report(tokens, reasoning, image_input.location)
        
    return {
        "processed": True,
        "action": decision,
        "anomaly_score": anomaly_score,
        "preliminary_intent": tokens.get("preliminary_intent"),
        "reasoning": reasoning,
        "report": report
    }

@app.post("/api/query")
def query_reports(query: QueryInput):
    """
    Allows plain-English search over verified incident reports using Gemma 4.
    """
    files = glob.glob(os.path.join(REPORTS_DIR, "*.json"))
    all_reports = []
    for f in files:
        try:
            with open(f, "r") as fh:
                all_reports.append(json.load(fh))
        except Exception:
            pass
            
    if not all_reports:
        return {
            "query": query.question,
            "answer": "No verified incident reports exist in the database yet to query."
        }
        
    answer = operator_query(query.question, all_reports)
    return {
        "query": query.question,
        "answer": answer
    }

@app.get("/api/verify/{report_id}")
def verify_report_integrity(report_id: str):
    """
    Performs real-time cryptographic audit on the report matching report_id.
    """
    report = load_report_by_id(report_id)
    is_valid = verify_forensic_report(report)
    
    return {
        "report_id": report_id,
        "cryptographic_verification": "SUCCESS" if is_valid else "FAILED",
        "sha256_hash": report.get("sha256_hash"),
        "tampered": not is_valid
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

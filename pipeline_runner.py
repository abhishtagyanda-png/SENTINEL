import os
import json
import shutil
from rag_store import retrieve_context, build_rag_store
from edge_sensor import tokenise_scene, tokenise_sensor_row
from reasoning_engine import reason_about_incident
from forensic_logger import create_forensic_report

def setup_mock_dataset():
    """
    Creates a mock dataset folder with standard CCTV/IoT events to demonstrate the pipeline.
    """
    dataset_dir = "./dataset"
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)
    os.makedirs(dataset_dir, exist_ok=True)

    # 1. Normal Transit Event (Lobby, Afternoon)
    event1 = {
        "event_id": "EVT-001",
        "timestamp": "14:30",
        "location": "Main Lobby Area",
        "motion_detected": True,
        "door_state": "closed",
        "people_count": 5,
        "camera_feed_summary": "Transit passengers walking with suitcases near ticketing counters."
    }
    
    # 2. Security Breach Event (Server Room, Night)
    event2 = {
        "event_id": "EVT-002",
        "timestamp": "03:15",
        "location": "Server Room B3",
        "motion_detected": True,
        "door_state": "forced",
        "people_count": 2,
        "camera_feed_summary": "Two individuals in dark clothing tampering with server rack door locks."
    }
    
    # 3. Scheduled Cleaning Event (Server Room, Night Maintenance)
    event3 = {
        "event_id": "EVT-003",
        "timestamp": "21:30",
        "location": "Server Room B3",
        "motion_detected": True,
        "door_state": "open",
        "people_count": 1,
        "camera_feed_summary": "Bob entering the room with a cleaning mop and bucket, wearing high-visibility orange vest."
    }
    
    # 4. Emergency Exit Tamper Event (Gate 5, Night)
    event4 = {
        "event_id": "EVT-004",
        "timestamp": "23:45",
        "location": "Emergency Exit Gate 5",
        "motion_detected": True,
        "door_state": "forced",
        "people_count": 1,
        "camera_feed_summary": "Single individual repeatedly pushing the alarmed fire escape door handle."
    }

    # Save to files
    with open(os.path.join(dataset_dir, "event1_transit_normal.json"), "w") as f:
        json.dump(event1, f, indent=2)
    with open(os.path.join(dataset_dir, "event2_b3_restricted_breach.json"), "w") as f:
        json.dump(event2, f, indent=2)
    with open(os.path.join(dataset_dir, "event3_maintenance_cleaning.json"), "w") as f:
        json.dump(event3, f, indent=2)
    with open(os.path.join(dataset_dir, "event4_gate5_alarm.json"), "w") as f:
        json.dump(event4, f, indent=2)
        
    print(f"Mock dataset generated in {dataset_dir} containing {len(os.listdir(dataset_dir))} test cases.")

def run_pipeline(dataset_path: str, location_tag: str = "Transit-Terminal-Edge"):
    """
    Iterates over all events in the dataset path, processes them through
    Edge, RAG, Reasoning, and Forensic layers.
    """
    print("=" * 60)
    print("             VIGIL PIPELINE RUNNER DEPLOYED")
    print("=" * 60)

    # Initialize RAG Database
    build_rag_store()
    
    # Create reports output directory
    os.makedirs("reports", exist_ok=True)
    
    files = sorted(os.listdir(dataset_path))
    processed = 0
    escalated = 0
    suppressed = 0
    held = 0

    for i, fname in enumerate(files):
        fpath = os.path.join(dataset_path, fname)
        if not fname.endswith(".json") and not fname.endswith((".jpg", ".png", ".jpeg")):
            continue
            
        print(f"\n[{i+1}/{len(files)}] Ingesting Event Log: {fname}")
        print("-" * 50)
        
        # --- LAYER 1: Edge Tokenisation ---
        if fname.endswith((".jpg", ".png", ".jpeg")):
            tokens = tokenise_scene(fpath)
            loc = location_tag
        else:
            with open(fpath) as f:
                row = json.load(f)
            tokens = tokenise_sensor_row(row)
            loc = row.get("location", location_tag)
            
        anomaly_score = tokens.get("anomaly_score", 0.0)
        print(f"  -> [LAYER 1 Edge Score]: {anomaly_score:.2f} (Intent: {tokens.get('preliminary_intent')})")
        
        # --- Noise Suppression Gate ---
        if anomaly_score < 0.35:
            print(f"  -> [ACTION]: SUPPRESSED AT EDGE. Normal event. Logging silently.")
            suppressed += 1
            continue

        # --- LAYER 2: Semantic Retrieval & CoT Reasoning ---
        print("  -> Anomaly score exceeds 0.35. Escalating to Local Reasoning Engine...")
        
        # Retrieve context matching the alarm signals
        search_query = f"{tokens.get('preliminary_intent', '')} in {loc} {tokens.get('sensor_summary', '')}"
        print(f"  -> Retrieving policies & history for: '{search_query}'")
        context = retrieve_context(search_query, n_results=3)
        
        # Execute reasoning
        reasoning = reason_about_incident(tokens, context)
        decision = reasoning.get("decision", "HOLD_FOR_REVIEW")
        print(f"  -> [LAYER 2 Decision]: {decision} (Confidence: {int(reasoning.get('confidence', 0.5) * 100)}%)")
        print(f"  -> Operator Directive: {reasoning.get('operator_message')}")
        
        # --- LAYER 3: Forensic Output ---
        if decision in ["ESCALATE", "HOLD_FOR_REVIEW"]:
            report = create_forensic_report(tokens, reasoning, loc)
            print(f"  -> [LAYER 3 Cryptography]: Tamper-Proof Incident Log Signed.")
            print(f"    Report ID: {report['report_id']}")
            print(f"    SHA-256: {report['sha256_hash']}")
            if decision == "ESCALATE":
                escalated += 1
            else:
                held += 1
        else:
            print("  -> [ACTION]: SUPPRESSED after semantic verification. Logged silently.")
            suppressed += 1
            
        processed += 1

    print("\n" + "=" * 60)
    print("                 PIPELINE RUN SUMMARY")
    print("=" * 60)
    print(f"Total events analyzed:   {len(files)}")
    print(f"Escalated alerts (Red):  {escalated}")
    print(f"Held for review (Amber): {held}")
    print(f"Suppressed alerts (Green): {suppressed}")
    print("=" * 60)

if __name__ == "__main__":
    setup_mock_dataset()
    run_pipeline("./dataset")

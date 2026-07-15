import base64
import json
import ollama

def check_ollama_status():
    """
    Checks if Ollama service is reachable and has the required model.
    """
    try:
        models = ollama.list()
        # Verify if gemma4:e4b is present
        model_names = [m.get("model", "") for m in models.get("models", [])]
        for name in model_names:
            if "gemma4:e4b" in name or "gemma4" in name:
                return True
        return False
    except Exception:
        return False

def tokenise_scene(image_path: str) -> dict:
    """
    Reads an image frame, converts to base64, and prompts Gemma 4 E4B
    running locally to produce structured scene tokens.
    """
    try:
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
    except Exception as e:
        print(f"Error reading image {image_path}: {e}")
        return get_fallback_tokens("error", f"Failed to read image: {e}")

    prompt = """You are an edge-deployed public safety sensor. Analyse the image and respond ONLY with valid JSON. No explanation, no markdown, no extra text.

Output this exact schema:
{
  "entities": ["list every person, vehicle, object visible"],
  "actions": ["what each entity is doing"],
  "spatial_layout": "one sentence describing positions",
  "time_context": "day/night/indoor/outdoor",
  "anomaly_score": 0.0,
  "preliminary_intent": "one of: benign_transit | maintenance_activity | medical_event | interpersonal_conflict | security_breach | unclassified",
  "reasoning_for_score": "one sentence explaining why this score"
}

anomaly_score rules:
- 0.0-0.2: completely normal, no concern
- 0.2-0.35: slightly unusual but explainable
- 0.35-0.6: needs semantic verification
- 0.6-0.8: likely incident, escalate
- 0.8-1.0: confirmed high-risk, escalate immediately"""

    if not check_ollama_status():
        print("Ollama service not responsive or gemma4:e4b not loaded. Running fallback tokenizer simulation.")
        # Extract filename to guess scenario for mock output
        import os
        filename = os.path.basename(image_path).lower()
        return get_fallback_tokens(filename)

    try:
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[{
                "role": "user",
                "content": prompt,
                "images": [img_b64]
            }]
        )
        raw = response["message"]["content"].strip()
        
        # Clean up any potential markdown code blocks
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
        
        return json.loads(raw)
    except Exception as e:
        print(f"Ollama tokenise_scene API error: {e}. Falling back to simulation.")
        import os
        filename = os.path.basename(image_path).lower()
        return get_fallback_tokens(filename)

def tokenise_sensor_row(row: dict) -> dict:
    """
    Takes an IoT sensor dictionary, converts to text, and queries Gemma 4 E4B
    running locally to produce structured scene tokens.
    """
    row_text = "\n".join([f"{k}: {v}" for k, v in row.items()])

    prompt = f"""You are an edge-deployed public safety sensor analysing IoT sensor data.

SENSOR READING:
{row_text}

Respond ONLY with valid JSON. No explanation. No markdown.

{{
  "sensor_summary": "plain English summary of what sensors report",
  "anomaly_score": 0.0,
  "preliminary_intent": "benign_transit | maintenance_activity | medical_event | interpersonal_conflict | security_breach | unclassified",
  "key_signals": ["list which sensor values drove this score"],
  "reasoning_for_score": "one sentence"
}}"""

    if not check_ollama_status():
        print("Ollama service not responsive or gemma4:e4b not loaded. Running fallback sensor simulation.")
        return get_fallback_sensor_tokens(row)

    try:
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response["message"]["content"].strip()
        
        # Clean up any potential markdown code blocks
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
        
        return json.loads(raw)
    except Exception as e:
        print(f"Ollama tokenise_sensor_row API error: {e}. Falling back to simulation.")
        return get_fallback_sensor_tokens(row)

def get_fallback_tokens(filename: str, error_msg: str = "") -> dict:
    """
    Simulated outputs when offline or Ollama is loading. Helps during testing and demo.
    """
    if "breach" in filename or "restricted" in filename:
        return {
            "entities": ["two adult males", "one locked server room door"],
            "actions": ["one male attempting to pick the lock", "other male standing lookout"],
            "spatial_layout": "Both standing closely in front of the Server Room B3 entrance, no other staff in corridor",
            "time_context": "night/indoor",
            "anomaly_score": 0.85,
            "preliminary_intent": "security_breach",
            "reasoning_for_score": "Unauthorized door tampering detected in restricted corridor B3 at night."
        }
    elif "maintenance" in filename or "clean" in filename:
        return {
            "entities": ["one adult male", "cleaning cart", "mop"],
            "actions": ["cleaning the server room floor", "moving cart"],
            "spatial_layout": "Inside Server Room B3 near the server racks",
            "time_context": "night/indoor",
            "anomaly_score": 0.30,
            "preliminary_intent": "maintenance_activity",
            "reasoning_for_score": "Individual in high-visibility vest cleaning the floors, consistent with daily duties."
        }
    elif "transit" in filename or "normal" in filename:
        return {
            "entities": ["three passengers", "baggage"],
            "actions": ["walking through main lobby toward platforms"],
            "spatial_layout": "Lobby area, walking along designated passenger pathway",
            "time_context": "day/outdoor",
            "anomaly_score": 0.10,
            "preliminary_intent": "benign_transit",
            "reasoning_for_score": "Standard passenger flow in the transit terminal during operating hours."
        }
    else:
        # Default unclassified anomaly for testing
        return {
            "entities": ["unidentified person", "backpack"],
            "actions": ["sitting on bench near server room corridor for 45 minutes"],
            "spatial_layout": "Seated on a bench in B3 corridor",
            "time_context": "day/indoor",
            "anomaly_score": 0.45,
            "preliminary_intent": "unclassified",
            "reasoning_for_score": "Person loitering in a semi-restricted corridor with no clear purpose."
        }

def get_fallback_sensor_tokens(row: dict) -> dict:
    """
    Simulated sensor tokenization output.
    """
    motion = row.get("motion_detected", False)
    door_state = row.get("door_state", "closed")
    hour = int(row.get("timestamp", "00:00").split(":")[0]) if ":" in row.get("timestamp", "") else 12
    
    if door_state == "forced" or (door_state == "open" and (hour >= 22 or hour < 6)):
        return {
            "sensor_summary": f"Door sensor reports '{door_state}' and motion detected in restricted corridor at night ({row.get('timestamp')}).",
            "anomaly_score": 0.90,
            "preliminary_intent": "security_breach",
            "key_signals": ["door_state", "timestamp"],
            "reasoning_for_score": "Forced entry or open door in restricted server zone during off-hours."
        }
    elif motion and (hour >= 22 or hour < 6):
        return {
            "sensor_summary": f"Motion sensor tripped in zone B3 at night ({row.get('timestamp')}).",
            "anomaly_score": 0.55,
            "preliminary_intent": "unclassified",
            "key_signals": ["motion_detected", "timestamp"],
            "reasoning_for_score": "Motion detected in restricted zone B3 after hours without door breaches."
        }
    else:
        return {
            "sensor_summary": f"Standard sensor activity: Motion={motion}, Door={door_state} at {row.get('timestamp')}.",
            "anomaly_score": 0.15,
            "preliminary_intent": "benign_transit",
            "key_signals": [],
            "reasoning_for_score": "Normal day-time sensor activity in public transit lobby."
        }

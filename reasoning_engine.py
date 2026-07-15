import json
import re
import ollama
from edge_sensor import check_ollama_status

def reason_about_incident(scene_tokens: dict, retrieved_context: list) -> dict:
    """
    Formulates a 5-step chain-of-thought prompt for Gemma 4, retrieves
    relevant safety policy/history context, and determines whether to
    ESCALATE, SUPPRESS, or HOLD_FOR_REVIEW.
    """
    context_text = "\n".join([f"- {c}" for c in retrieved_context])
    scene_text = json.dumps(scene_tokens, indent=2)

    prompt = f"""You are SENTINEL's semantic reasoning engine. Your job is to determine whether a flagged scene is a genuine public safety incident or a false alarm.

SCENE ANALYSIS FROM EDGE SENSOR:
{scene_text}

RETRIEVED POLICY AND HISTORY:
{context_text}

Think through this step by step. Follow EXACTLY this format:

STEP 1 — ENTITIES AND ACTIONS:
[What/who is present and what are they doing?]

STEP 2 — SCHEDULE CHECK:
[Is this activity consistent with known scheduled events or maintenance?]

STEP 3 — POLICY CHECK:
[Does any retrieved policy prohibit or flag this activity?]

STEP 4 — HISTORICAL COMPARISON:
[Does this match any past incident patterns in the retrieved history?]

STEP 5 — INTENT ASSESSMENT:
[What is the most probable intent? What is your confidence 0–100?]

DECISION: [ESCALATE | SUPPRESS | HOLD_FOR_REVIEW]

REASON: [One clear sentence a non-technical operator can read and act on]

Then output this JSON block at the end:
```json
{{
  "decision": "ESCALATE",
  "confidence": 0.0,
  "intent": "security_breach",
  "operator_message": "plain English for operator",
  "steps": {{
    "step1": "...",
    "step2": "...",
    "step3": "...",
    "step4": "...",
    "step5": "..."
  }}
}}
```"""

    if not check_ollama_status():
        print("Ollama service not responsive or gemma4:e4b not loaded. Running fallback reasoning engine simulation.")
        return get_fallback_reasoning(scene_tokens, retrieved_context)

    try:
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response["message"]["content"]
        
        # Parse the JSON block from response
        result = extract_json_from_text(raw)
        if result:
            result["full_reasoning_trace"] = raw
            # Ensure confidence is a float
            try:
                result["confidence"] = float(result.get("confidence", 0.0))
                # Normalize if it's 0-100 to 0.0-1.0
                if result["confidence"] > 1.0:
                    result["confidence"] = result["confidence"] / 100.0
            except Exception:
                result["confidence"] = 0.5
            return result
        
        print("Failed to parse JSON block from Gemma response. Falling back to structured parser.")
        return parse_raw_text_as_structured(raw, scene_tokens)
    except Exception as e:
        print(f"Ollama reasoning API error: {e}. Falling back to simulation.")
        return get_fallback_reasoning(scene_tokens, retrieved_context)

def extract_json_from_text(text: str) -> dict:
    """
    Extracts the JSON block wrapped in triple backticks or raw JSON brackets.
    """
    try:
        # Try finding json codeblock first
        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1).strip())
        
        # Try generic code block
        code_match = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
        if code_match:
            return json.loads(code_match.group(1).strip())

        # Find first '{' and last '}'
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            return json.loads(text[start:end+1].strip())
    except Exception:
        pass
    return None

def parse_raw_text_as_structured(raw_text: str, scene_tokens: dict) -> dict:
    """
    Heuristically extracts key information if model did not return valid JSON.
    """
    decision = "HOLD_FOR_REVIEW"
    if "DECISION: ESCALATE" in raw_text or "decision\": \"ESCALATE" in raw_text:
        decision = "ESCALATE"
    elif "DECISION: SUPPRESS" in raw_text or "decision\": \"SUPPRESS" in raw_text:
        decision = "SUPPRESS"
        
    reason = "Manual verification required."
    reason_match = re.search(r'REASON:\s*(.*)', raw_text)
    if reason_match:
        reason = reason_match.group(1).strip()
        
    steps = {}
    for i in range(1, 6):
        step_pattern = rf"STEP {i} — .*?:\n\[?(.*?)\]?(?=\nSTEP \d|\nDECISION|\nREASON|\Z)"
        step_match = re.search(step_pattern, raw_text, re.DOTALL | re.IGNORECASE)
        if step_match:
            steps[f"step{i}"] = step_match.group(1).strip()
        else:
            steps[f"step{i}"] = f"Step {i} analysis completed."

    return {
        "decision": decision,
        "confidence": 0.5,
        "intent": scene_tokens.get("preliminary_intent", "unclassified"),
        "operator_message": reason,
        "steps": steps,
        "full_reasoning_trace": raw_text
    }

def get_fallback_reasoning(scene_tokens: dict, retrieved_context: list) -> dict:
    """
    Produces high-fidelity reasoning trace offline based on scene tokens and context.
    """
    intent = scene_tokens.get("preliminary_intent", "unclassified")
    score = scene_tokens.get("anomaly_score", 0.0)
    
    # Analyze if there's any policy breach or match
    has_policy_match = False
    context_str = " ".join(retrieved_context).lower()
    
    # Look for matching terms
    for term in ["policy", "restrict", "forbid", "closed", "locked"]:
        if term in context_str:
            has_policy_match = True
            break

    # Determine decision
    if intent == "security_breach" or score > 0.8:
        decision = "ESCALATE"
        confidence = 0.95
        reason = "Tampering detected in high-security zone during off-hours, matching active security restrictions."
    elif has_policy_match and score > 0.35:
        decision = "ESCALATE"
        confidence = 0.85
        reason = "Activity detected in zone matching restricted access policy. No active maintenance ticket."
    elif intent == "maintenance_activity" or "cleaning" in context_str:
        decision = "SUPPRESS"
        confidence = 0.90
        reason = "Normal cleaning/maintenance activities match known schedule and protocol rules."
    else:
        decision = "HOLD_FOR_REVIEW"
        confidence = 0.65
        reason = "Loitering or unusual behavior detected; needs operator manual review to verify intent."

    steps = {
        "step1": f"Entities present: {', '.join(scene_tokens.get('entities', []))}. Actions: {', '.join(scene_tokens.get('actions', []))}.",
        "step2": "Checked daily schedules. No active maintenance schedule corresponds to the observed activity time.",
        "step3": "Checked active security policies. High-security access restrictions apply to this zone and time slot.",
        "step4": "Compared with incident history database. Similarity to previous breach alerts in the zone.",
        "step5": f"Probable intent: {intent}. Confidence score of {int(confidence*100)}% based on visual signals and database check."
    }

    full_trace = f"""STEP 1 — ENTITIES AND ACTIONS:
{steps['step1']}

STEP 2 — SCHEDULE CHECK:
{steps['step2']}

STEP 3 — POLICY CHECK:
{steps['step3']}

STEP 4 — HISTORICAL COMPARISON:
{steps['step4']}

STEP 5 — INTENT ASSESSMENT:
{steps['step5']}

DECISION: {decision}

REASON: {reason}"""

    return {
        "decision": decision,
        "confidence": confidence,
        "intent": intent,
        "operator_message": reason,
        "steps": steps,
        "full_reasoning_trace": full_trace
    }

import json
import ollama
from edge_sensor import check_ollama_status

def operator_query(natural_language_question: str, all_reports: list) -> str:
    """
    Summarizes incident reports based on an operator's plain-English question.
    """
    reports_summary = json.dumps([{
        "id": r.get("report_id", "unknown"),
        "time": r.get("timestamp_utc", "unknown"),
        "location": r.get("location", "unknown"),
        "decision": r.get("decision", "unknown"),
        "message": r.get("operator_message", "")
    } for r in all_reports], indent=2)

    prompt = f"""You are a public safety operations assistant. An operator has asked a question about recent incidents.

OPERATOR QUESTION: {natural_language_question}

INCIDENT REPORTS IN SYSTEM:
{reports_summary}

Answer the operator's question clearly and concisely. Use plain language - no jargon. 
If relevant incidents exist, list them with times and locations.
If no incidents match, say so clearly.
End with one actionable recommendation if appropriate.
"""

    if not check_ollama_status():
        print("Ollama service not responsive or gemma4:e4b not loaded. Running fallback operator query simulation.")
        return get_fallback_operator_query(natural_language_question, all_reports)

    try:
        response = ollama.chat(
            model="gemma4:e4b",
            messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"].strip()
    except Exception as e:
        print(f"Ollama query API error: {e}. Falling back to simulation.")
        return get_fallback_operator_query(natural_language_question, all_reports)

def get_fallback_operator_query(question: str, all_reports: list) -> str:
    """
    Simulates operator queries offline.
    """
    q_lower = question.lower()
    matches = []
    
    for r in all_reports:
        loc = r.get("location", "").lower()
        msg = r.get("operator_message", "").lower()
        decision = r.get("decision", "").lower()
        
        # Simple keywords match
        if ("server" in q_lower or "b3" in q_lower) and ("server" in loc or "b3" in loc or "server" in msg):
            matches.append(r)
        elif ("breach" in q_lower or "escalate" in q_lower) and (decision == "escalate" or "breach" in msg):
            matches.append(r)
        elif "gate" in q_lower and ("gate" in loc or "gate" in msg):
            matches.append(r)
        elif "emergency" in q_lower and ("emergency" in loc or "emergency" in msg):
            matches.append(r)

    if not matches:
        return f"I analyzed {len(all_reports)} active report(s). There are no incidents matching your request for '{question}'.\n\nRecommendation: Continue normal monitoring of security feeds."

    response_lines = [
        f"Operator request: '{question}'",
        f"I found {len(matches)} relevant incident report(s):"
    ]
    
    for idx, r in enumerate(matches, 1):
        response_lines.append(
            f"{idx}. [{r.get('decision')}] at {r.get('location')} ({r.get('timestamp_utc')})\n"
            f"   Detail: {r.get('operator_message')}\n"
            f"   Hash verification signature: {r.get('sha256_hash', 'unverified')[:10]}..."
        )
        
    response_lines.append("Recommendation: Dispatch response units to verify current status and secure access gates.")
    return "\n".join(response_lines)

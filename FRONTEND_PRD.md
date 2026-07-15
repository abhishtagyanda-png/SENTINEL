# Product Requirements Document (PRD)
## VIGIL — Operator Dashboard Frontend

This document outlines the product requirements and technical specs for building the **VIGIL Operator Dashboard** using **Next.js**, **React**, **Tailwind CSS**, and **shadcn/ui**.

The frontend will run on the `frontend` branch and connect to the local Python REST API backend running on `http://localhost:8000`.

---

## 1. Product Vision & Aesthetics

VIGIL replaces noisy, unexplainable black-box security alerts with cryptographically verified, chain-of-thought explained safety reports. 

### Visual Guidelines:
*   **Theme**: Cyberpunk-influenced, premium dark mode (`bg-slate-950`, `text-slate-50`). Avoid generic white backgrounds. It should feel like a high-end security operations center (SOC).
*   **Colors**:
    *   Accent: Indigo/Violet (`text-indigo-500`, `bg-indigo-600`)
    *   Escalate Alerts (High Anomaly): Red (`bg-red-500/20`, `text-red-400`, `border-red-500`)
    *   Review Alerts (Medium Anomaly): Amber (`bg-amber-500/20`, `text-amber-400`, `border-amber-500`)
    *   Suppressed/Normal: Green/Emerald (`text-emerald-400`, `border-emerald-500/30`)
*   **Typography**: Clean sans-serif (e.g., Inter, Outfit, or Geist) with monospaced text for cryptographic hashes and report IDs.
*   **Animations**: Pulse alerts for active escalations, smooth accordion slide-downs, and loading state skeletons.

---

## 2. Page Layout & Component Structure

The interface should be a **single-page dashboard** divided into three main grids.

```
+------------------------------------------------------------------------------+
| 🛡️ VIGIL                      [🟢 SYSTEM STATUS: ONLINE / Ollama: Ready]  |
+------------------------------------------------------------------------------+
|  📡 Local Edge Feeds     |  🧠 Gemma 4 Reasoning Trace |  🔏 Forensic Vault  |
|  (Trigger simulation)    |                             |                      |
|                          |  - Anomaly Score Status     |  - SHA-256 Hash      |
|  ----------------------  |  - Decision Badge           |  - RSA Signature     |
|  📂 Incident Queue       |  - 5-Step CoT Accordion     |  - Verify button     |
|  - VIGIL-17840... 🔴  |  - Operator Briefing Box    |  ------------------- |
|  - VIGIL-17840... 🟡  |                             |  💬 NLP Assistant    |
|  - VIGIL-17840... 🟢  |                             |  [Ask natural query] |
+------------------------------------------------------------------------------+
```

### Grid 1: Incident Queue & Simulator (Left Column - 25% width)
*   **Simulator Panel**:
    *   Dropdown containing mock scenarios (Normal Transit Flow, Restricted Zone Intrusion, Scheduled Cleaning, Emergency Exit Gate 5 Alarm).
    *   A Button **"Trigger Edge Event"** that sends a `POST` request to the backend, running the pipeline live.
*   **Incident Queue List**:
    *   Renders list of reports fetched from `/api/reports`.
    *   Each card lists: Report ID, Location, Timestamp, Decision Badge (`ESCALATE` = Red, `HOLD_FOR_REVIEW` = Amber, `SUPPRESS` = Green).
    *   Active/selected items should have an active border color (`border-indigo-500`).

### Grid 2: Gemma 4 Chain-of-Thought Trace (Center Column - 45% width)
*   **Anomaly Level Display**: An indicator showing the Layer 1 edge score (e.g., `0.98`).
*   **Decision Banner**: A large banner displaying the final verified decision (`ESCALATE`, `SUPPRESS`, `HOLD_FOR_REVIEW`).
*   **Reasoning Accordion (shadcn/ui Accordion)**:
    *   Renders the 5 steps of the Gemma 4 CoT model trace:
        *   **Step 1**: Entities & Actions Detected
        *   **Step 2**: Security Schedule Cross-Reference
        *   **Step 3**: Security Policy Evaluation
        *   **Step 4**: Historical Patterns Match
        *   **Step 5**: Intent & Severity Assessment
*   **Operator Briefing Box (shadcn/ui Alert)**:
    *   A card highlighting the plain-English, actionable message for the security operator (e.g., *"Immediate physical response teams must be dispatched to Server Room B3..."*).

### Grid 3: Forensics & Natural Language Query (Right Column - 30% width)
*   **Forensic Verification Box**:
    *   Displays the immutable SHA-256 file hash.
    *   Displays the RSA Hex signature.
    *   A **"Verify Signature Integrity"** button that hits `/api/verify/{id}`. On response, displays a secure audit badge:
        *   `Success`: *"Forensic Audit Passed: Signature is authentic and records have not been altered."*
        *   `Failed`: *"Cryptographic Error: Report contents do not match signature. Tampering detected!"*
*   **Operator NLP Chat Assistant**:
    *   A chat interface or query bar allowing search (e.g. *"Show me all intrusions in B3"*).
    *   Sends a query to `/api/query` and renders Gemma's answer dynamically.

---

## 3. Backend API Contract (Endpoints)

All API endpoints are hosted on `http://localhost:8000` (FastAPI).

### 1. Check System Subsystem Status
*   **Endpoint**: `GET /api/status`
*   **Response**:
    ```json
    {
      "status": "online",
      "subsystems": {
        "edge_ollama_gemma4": "ready",
        "rag_vector_db": "active",
        "chromadb_document_count": 9,
        "forensic_vault": "active",
        "reports_count": 5
      }
    }
    ```

### 2. Fetch Incident Logs Queue
*   **Endpoint**: `GET /api/reports`
*   **Response** (List of reports sorted by time):
    ```json
    [
      {
        "report_id": "VIGIL-1784097007780",
        "timestamp_utc": "2026-07-15T06:31:01Z",
        "location": "Server Room B3",
        "decision": "ESCALATE",
        "confidence": 0.98,
        "operator_message": "Immediate physical response teams must be dispatched to Server Room B3...",
        "sha256_hash": "03af5a9d2e467723794d5b0532b7256708e7d315d24b881f6ba54dcfd0ad9519"
      }
    ]
    ```

### 3. Fetch Full Chain-of-Thought Trace
*   **Endpoint**: `GET /api/reports/{report_id}`
*   **Response**:
    ```json
    {
      "report_id": "VIGIL-1784097007780",
      "timestamp_utc": "2026-07-15T06:31:01Z",
      "location": "Server Room B3",
      "decision": "ESCALATE",
      "confidence": 0.98,
      "operator_message": "Immediate physical response...",
      "scene_tokens": {
        "sensor_summary": "...",
        "anomaly_score": 0.98,
        "preliminary_intent": "security_breach"
      },
      "reasoning_steps": {
        "step1": "Two unidentifiable figures wearing dark clothing...",
        "step2": "No scheduled operations...",
        "step3": "Policy B3 strictly forbids entry...",
        "step4": "Matches signatures of an incident...",
        "step5": "High likelihood of espionage..."
      },
      "sha256_hash": "...",
      "signature_hex": "..."
    }
    ```

### 4. Trigger Ingestion (Sensor Simulation)
*   **Endpoint**: `POST /api/trigger/sensor`
*   **Body**:
    ```json
    {
      "event_id": "EVT-002",
      "timestamp": "03:15",
      "location": "Server Room B3",
      "motion_detected": true,
      "door_state": "forced",
      "people_count": 2,
      "camera_feed_summary": "Two individuals in dark clothing tampering with server rack door locks."
    }
    ```
*   **Response**: Same structure as `GET /api/reports/{id}`.

### 5. Verify Cryptographic Integrity
*   **Endpoint**: `GET /api/verify/{report_id}`
*   **Response**:
    ```json
    {
      "report_id": "VIGIL-1784097007780",
      "cryptographic_verification": "SUCCESS",
      "sha256_hash": "03af5a9d2e4677...",
      "tampered": false
    }
    ```

### 6. Natural Language Query over Verified Reports
*   **Endpoint**: `POST /api/query`
*   **Body**:
    ```json
    {
      "question": "Were there any security breaches near the server room last night?"
    }
    ```
*   **Response**:
    ```json
    {
      "query": "Were there any security breaches near the server room last night?",
      "answer": "Yes. Report VIGIL-1784097007780 recorded a security breach at Server Room B3 at 03:15. Two individuals were detected tampering with locks..."
    }
    ```

---

## 4. Suggested shadcn/ui Components

To save time during the hackathon, install these components:
1.  **Accordion**: For step-by-step CoT reasoning steps (`npx shadcn@latest add accordion`).
2.  **Card**: Standard container layout (`npx shadcn@latest add card`).
3.  **Badge**: Quick status indicator labels (`npx shadcn@latest add badge`).
4.  **Alert**: Large prominent directives for operators (`npx shadcn@latest add alert`).
5.  **ScrollArea**: Standard scroll control for the incident list queue (`npx shadcn@latest add scroll-area`).
6.  **Dialog / Popover**: Dialog modal for natural language assistant (`npx shadcn@latest add dialog`).
7.  **Button / Input**: Interaction elements.

---

## 5. Execution & Testing Instructions

1.  **Start the Backend API Server**:
    ```bash
    python server.py
    ```
    This launches the API on `http://localhost:8000`. You can test it by going to `http://localhost:8000/docs` (Swagger UI).
2.  **Run Pipeline Runner (Optional Test)**:
    ```bash
    python pipeline_runner.py
    ```
    This fills the `./reports/` folder with signed mock incidents, populating the queue for the frontend on startup.
3.  **Start Frontend**:
    Create a project, map the API endpoints to components, and boot the Next.js dev server:
    ```bash
    npm run dev
    ```

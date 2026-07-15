# 🛡️ SENTINEL
### Semantic Edge Intelligence for Noise-Tolerant, Explainable & Latency-Free Incident Notification

> **A Gemma 4-powered, privacy-first public safety system that transforms traditional surveillance into explainable, intelligent incident detection.**

---

## 🚀 Overview

Traditional surveillance systems generate thousands of false alarms every day, leading to **alarm fatigue** where operators begin ignoring alerts. Most existing AI surveillance solutions also depend on cloud processing, introducing latency, privacy risks, and high infrastructure costs.

**SENTINEL** is a three-layer AI pipeline built entirely around **Gemma 4** that performs intelligent incident detection locally, explains every decision it makes, and produces cryptographically signed incident reports for forensic integrity.

Instead of simply detecting motion, SENTINEL understands **what happened, why it happened, and whether human intervention is actually required.**

---

## ✨ Features

- 🧠 **Gemma 4 Powered**
  - Gemma 4B for edge perception
  - Gemma 27B for semantic reasoning

- 🎥 **Multimodal Understanding**
  - CCTV Camera feeds
  - IoT Sensors
  - Structured sensor logs

- ⚡ **Edge AI Processing**
  - No cloud dependency
  - Low latency
  - Privacy-first architecture

- 📖 **Explainable AI**
  - Human-readable reasoning
  - Step-by-step decision making
  - Confidence scoring

- 🔍 **Agentic RAG**
  - Historical incident retrieval
  - Security policies
  - Zone-specific knowledge

- 🔐 **Forensic Security**
  - SHA-256 hashing
  - RSA digital signatures
  - Tamper-proof incident reports

- 💬 **Natural Language Querying**
  - Ask questions like:
    > "Were there any security breaches near the server room last night?"

---

# 🏗️ Architecture

```text
                Camera / IoT Sensors
                         │
                         ▼
      ┌────────────────────────────────────┐
      │ Layer 1 : Edge Perception          │
      │ Gemma 4B (Vision + Sensors)        │
      └────────────────────────────────────┘
                         │
          Suppress Low-Risk Events (<0.35)
                         │
                         ▼
      ┌────────────────────────────────────┐
      │ Layer 2 : Semantic Reasoning       │
      │ Gemma 27B + Agentic RAG            │
      └────────────────────────────────────┘
                         │
              ESCALATE / HOLD / SUPPRESS
                         │
                         ▼
      ┌────────────────────────────────────┐
      │ Layer 3 : Incident Verification    │
      │ SHA-256 + RSA Digital Signature    │
      └────────────────────────────────────┘
                         │
                         ▼
                 Operator Dashboard
```

---

# 🧠 How It Works

## Layer 1 – Edge Perception

Gemma 4B processes incoming camera frames or sensor data locally and extracts:

- Objects
- Human actions
- Scene context
- Time information
- Anomaly score
- Preliminary intent

Events with low anomaly scores are discarded immediately, reducing unnecessary alerts.

---

## Layer 2 – Semantic Reasoning

Events above the threshold are enriched using:

- Security policies
- Historical incidents
- Zone-specific regulations

Gemma 27B performs a structured reasoning process:

1. Identify entities and actions
2. Verify schedules
3. Check security policies
4. Compare historical incidents
5. Infer probable intent

Finally, the system decides whether to:

- ✅ ESCALATE
- ⏳ HOLD FOR REVIEW
- ❌ SUPPRESS

---

## Layer 3 – Incident Verification

Every escalated incident is converted into a structured report containing:

- Timestamp
- Location
- Confidence score
- AI reasoning trace
- Operator summary
- SHA-256 hash
- RSA Digital Signature

This produces legally verifiable and tamper-proof forensic evidence.

---

# 💻 Tech Stack

### AI Models

- Gemma 4 4B
- Gemma 4 27B
- Ollama

### Backend

- Python
- FastAPI *(planned)*

### Retrieval

- ChromaDB
- sentence-transformers
- all-MiniLM-L6-v2

### Security

- SHA-256
- RSA PKCS#1 v1.5

### Deployment

- Edge Devices
- On-Premise Servers
- Ollama Runtime

---

# 📂 Project Structure

```bash
SENTINEL/
│
├── app/
│   ├── edge_ai/
│   ├── reasoning/
│   ├── rag/
│   ├── reports/
│   └── dashboard/
│
├── policies/
├── incidents/
├── reports/
├── models/
├── requirements.txt
└── README.md
```

---

# ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/SENTINEL.git
cd SENTINEL
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Install Gemma Models

```bash
ollama pull gemma4:4b-instruct
ollama pull gemma4:27b
```

### Run

```bash
python app.py
```

---

# 📊 Expected Impact

- 🚨 70–80% reduction in false alerts
- ⚡ Faster incident response
- 🔒 Privacy-preserving surveillance
- 📖 Fully explainable AI decisions
- ⚖️ Cryptographically verifiable forensic reports
- 🧠 Continuous improvement through operator feedback

---

# 🌍 Applications

- Smart Cities
- Railway Stations
- Airports
- Hospitals
- University Campuses
- Government Buildings
- Critical Infrastructure
- Industrial Facilities

---

# 🏆 Hackathon

**Google Gemma 4 Hackathon**

**Track 2 – AI for Public Safety**

---

# 🤝 Contributors

- **Asees Jot Singh**
- **Abhishta Gyanda**
- **Ananya Chaudhary**
- **Arkin Raj**

---

# 📜 License

This project is licensed under the **MIT License**.

---

<div align="center">

### ⭐ If you found this project interesting, consider giving it a star!

**Built with ❤️ using Google Gemma 4**

</div>

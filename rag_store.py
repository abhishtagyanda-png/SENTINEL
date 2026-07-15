import os
import chromadb
from sentence_transformers import SentenceTransformer

# Initialize SentenceTransformer embedder (small, fast, CPU-friendly)
# Using a local directory for caching models to keep everything self-contained
os.environ["SENTENCE_TRANSFORMERS_HOME"] = "./model_cache"
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Setup persistent ChromaDB client
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("vigil_knowledge")

# Default mock policies and histories for safety and security tracking
DEFAULT_POLICIES = [
    "POLICY-B3: Server Room B3 is a high-security zone. Access is strictly restricted between 2200 and 0600 hours daily. Only personnel with Level 4 clearance or pre-authorized maintenance tickets are permitted.",
    "POLICY-A1: Transit Main Lobby. Public access is open from 0500 to 2300 hours. No loitering or unattended bags are permitted at any time. Security patrols are active hourly.",
    "POLICY-GATE5: Emergency Exit Gate 5. Must remain closed and locked at all times except during fire alarms or active emergencies. Any manual attempt to force the exit door triggers a critical alarm.",
    "SCHEDULE-MAINTENANCE: Scheduled server maintenance is permitted in Server Room B3 only on Tuesdays and Thursdays between 1300 and 1600 hours. All maintenance personnel must wear orange high-visibility vests.",
    "SCHEDULE-CLEANING: Janitorial staff are scheduled to clean Server Room B3 every night between 2100 and 2145 hours. Staff names: Alice, Bob (Security Cleared).",
]

DEFAULT_HISTORY = [
    "HIST-2025-11-12: Server Room B3. Security breach attempt. Two individuals in dark clothing bypassed the magnetic lock of Door B3. Incident occurred at 02:45. Response team dispatched, suspects fled.",
    "HIST-2026-02-14: Emergency Exit Gate 5. False alarm. A transit passenger accidentally pushed the door thinking it was the restroom exit at 14:15. Incident suppressed.",
    "HIST-2026-05-01: Main Lobby. Medical emergency. An elderly passenger collapsed due to heat stroke at 11:30. Medical team was dispatched, patient stabilized.",
    "HIST-2026-06-19: Server Room B3. Maintenance activity. A contractor entered B3 at 14:05 for scheduled server racks upgrade. Contractor wore standard orange high-visibility vest. Incident suppressed.",
]

def build_rag_store(force_rebuild=False):
    """
    Builds the RAG vector store using mock policies and histories.
    """
    global collection
    # Check if we already have documents indexed
    if collection.count() > 0 and not force_rebuild:
        print(f"RAG store already contains {collection.count()} documents. Skipping initialization.")
        return

    # Clear existing collection if forcing rebuild
    if force_rebuild:
        print("Clearing existing RAG store...")
        try:
            client.delete_collection("vigil_knowledge")
        except Exception:
            pass
        collection = client.create_collection("vigil_knowledge")

    print("Building RAG store...")
    all_docs = DEFAULT_POLICIES + DEFAULT_HISTORY
    all_ids = []
    
    for i, doc in enumerate(DEFAULT_POLICIES):
        all_ids.append(f"policy_{i}")
        
    for i, doc in enumerate(DEFAULT_HISTORY):
        all_ids.append(f"history_{i}")
        
    embeddings = embedder.encode(all_docs).tolist()
    collection.add(documents=all_docs, embeddings=embeddings, ids=all_ids)
    print(f"RAG store successfully built: {len(all_docs)} documents indexed.")

def retrieve_context(query: str, n_results: int = 3) -> list:
    """
    Retrieve top-n most relevant policy/incident documents matching the query.
    """
    if collection.count() == 0:
        # Auto-build RAG store if empty
        build_rag_store()

    query_vec = embedder.encode([query]).tolist()
    results = collection.query(query_embeddings=query_vec, n_results=n_results)
    
    # Flatten list of documents retrieved
    documents = results.get("documents", [[]])[0]
    return documents

if __name__ == "__main__":
    # Test execution
    build_rag_store(force_rebuild=True)
    test_query = "two individuals trying to bypass B3 lock at night"
    docs = retrieve_context(test_query, n_results=3)
    print(f"\nTest retrieve for query: '{test_query}'")
    for doc in docs:
        print(f" - {doc}")

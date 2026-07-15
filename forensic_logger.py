import os
import time
import json
import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

KEYS_DIR = "./keys"
REPORTS_DIR = "./reports"

def generate_keys():
    """
    Generates public/private RSA key pair and stores them locally.
    """
    os.makedirs(KEYS_DIR, exist_ok=True)
    private_key_path = os.path.join(KEYS_DIR, "private_key.pem")
    public_key_path = os.path.join(KEYS_DIR, "public_key.pem")
    
    # Check if keys already exist
    if os.path.exists(private_key_path) and os.path.exists(public_key_path):
        return load_keys()

    print("Generating new RSA keys for forensic signing...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    
    # Save private key
    with open(private_key_path, "wb") as f:
        f.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
        )
        
    # Save public key
    with open(public_key_path, "wb") as f:
        f.write(
            public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
        )
        
    return private_key, public_key

def load_keys():
    """
    Loads RSA keys from local key directory.
    """
    private_key_path = os.path.join(KEYS_DIR, "private_key.pem")
    public_key_path = os.path.join(KEYS_DIR, "public_key.pem")
    
    if not os.path.exists(private_key_path) or not os.path.exists(public_key_path):
        return generate_keys()

    with open(private_key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
        
    with open(public_key_path, "rb") as key_file:
        public_key = serialization.load_pem_public_key(
            key_file.read(),
            backend=default_backend()
        )
        
    return private_key, public_key

def create_forensic_report(scene_tokens: dict, reasoning: dict, location: str) -> dict:
    """
    Assembles a complete safety report, hashes it, signs the hash using RSA,
    and writes it to the local reports directory.
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    private_key, _ = load_keys()
    
    report_id = f"VIGIL-{int(time.time() * 1000)}"
    report = {
        "report_id": report_id,
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "location": location,
        "decision": reasoning.get("decision", "HOLD_FOR_REVIEW"),
        "confidence": reasoning.get("confidence", 0.5),
        "operator_message": reasoning.get("operator_message", "Attention required."),
        "scene_tokens": scene_tokens,
        "reasoning_steps": reasoning.get("steps", {}),
        "full_reasoning_trace": reasoning.get("full_reasoning_trace", "")
    }
    
    # Compute SHA-256 hash
    report_bytes = json.dumps(report, sort_keys=True).encode()
    sha256_hash = hashlib.sha256(report_bytes).hexdigest()
    
    # Sign report bytes
    signature = private_key.sign(
        report_bytes,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    
    report["sha256_hash"] = sha256_hash
    report["signature_hex"] = signature.hex()
    report["verification_note"] = "Verify with VIGIL public key. Hash covers all fields above."
    
    # Save file
    filename = os.path.join(REPORTS_DIR, f"{report_id}.json")
    with open(filename, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"Tamper-proof forensic report saved: {filename}")
    return report

def verify_forensic_report(report: dict) -> bool:
    """
    Verifies that the signature matches the report contents, proving integrity.
    """
    try:
        _, public_key = load_keys()
        
        # Clone report and strip cryptographic tags to verify the original body
        test_report = report.copy()
        signature_hex = test_report.pop("signature_hex", None)
        test_report.pop("sha256_hash", None)
        test_report.pop("verification_note", None)
        
        if not signature_hex:
            return False
            
        report_bytes = json.dumps(test_report, sort_keys=True).encode()
        signature_bytes = bytes.fromhex(signature_hex)
        
        # Verify RSA signature
        public_key.verify(
            signature_bytes,
            report_bytes,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return True
    except Exception as e:
        print(f"Forensic verification failed: {e}")
        return False

if __name__ == "__main__":
    # Test execution
    generate_keys()
    mock_scene = {"test": "data"}
    mock_reasoning = {"decision": "ESCALATE", "confidence": 0.95, "steps": {"s1": "test step"}}
    rep = create_forensic_report(mock_scene, mock_reasoning, "Test Zone")
    print(f"Verification status: {verify_forensic_report(rep)}")

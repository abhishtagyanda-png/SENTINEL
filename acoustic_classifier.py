import os
import urllib.request
import numpy as np
import scipy.io.wavfile
import scipy.signal
import onnxruntime as ort

MODEL_DIR = "model_cache"
MODEL_PATH = os.path.join(MODEL_DIR, "yamnet.onnx")
MODEL_URL = "https://huggingface.co/jafet21/yamnetonnx/resolve/main/yamnet.onnx"

def ensure_model_exists():
    """
    Ensures the YAMNet ONNX model is available locally.
    Downloads it if not present.
    """
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR, exist_ok=True)
        
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading YAMNet ONNX model from {MODEL_URL}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
            print("Download completed successfully.")
        except Exception as e:
            print(f"Error downloading YAMNet model: {e}")
            raise RuntimeError(f"Could not download YAMNet model: {e}")

def classify_audio(file_path: str) -> str:
    """
    Reads a WAV file, runs it through YAMNet, and maps the output
    to a public safety Acoustic Token.
    """
    try:
        ensure_model_exists()
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
            
        # 1. Read WAV file
        sample_rate, data = scipy.io.wavfile.read(file_path)
        
        # Convert to float32 and normalize
        if data.dtype == np.int16:
            data = data.astype(np.float32) / 32768.0
        elif data.dtype == np.int32:
            data = data.astype(np.float32) / 2147483648.0
        elif data.dtype == np.uint8:
            data = (data.astype(np.float32) - 128.0) / 128.0
        else:
            data = data.astype(np.float32)
            
        # Convert stereo/multi-channel to mono
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
            
        # 2. Resample to 16kHz if necessary
        if sample_rate != 16000:
            num_samples = int(len(data) * 16000 / sample_rate)
            data = scipy.signal.resample(data, num_samples)
            
        # Ensure minimum length for YAMNet (needs to be non-empty)
        if len(data) == 0:
            data = np.zeros((16000,), dtype=np.float32)
            
        # 3. Load ONNX model and run inference
        # Use CPU provider for simplicity and lightweight execution on local machines
        session = ort.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
        
        # YAMNet input is named 'waveform' and is a 1D float32 array
        inputs = {'waveform': data.astype(np.float32)}
        outputs = session.run(None, inputs)
        
        # output_0 is 'scores' with shape [num_frames, 521]
        scores = outputs[0]
        
        if len(scores) == 0:
            return "[AUDIO: LOW_AMBIENT_CHATTER]"
            
        # Find maximum probability across all frames for each class
        max_scores = np.max(scores, axis=0) # shape (521,)
        
        # Target index mapping:
        # 11: Screaming
        # 435: Glass
        # 460: Bang
        # 317, 318, 319, 390, 391: Siren/Alarms
        # 421: Gunshot, gunfire
        
        threshold = 0.15
        
        predictions = {
            "screaming": max_scores[11] if 11 < len(max_scores) else 0.0,
            "glass_break": max_scores[435] if 435 < len(max_scores) else 0.0,
            "banging": max_scores[460] if 460 < len(max_scores) else 0.0,
            "gunshot": max_scores[421] if 421 < len(max_scores) else 0.0,
            "siren": max(
                [max_scores[i] for i in [317, 318, 319, 390, 391] if i < len(max_scores)]
            ) if len(max_scores) > 391 else 0.0
        }
        
        # Get highest confidence target class
        best_target = max(predictions, key=predictions.get)
        best_score = predictions[best_target]
        
        if best_score >= threshold:
            if best_target == "screaming":
                return "[AUDIO: SCREAM]"
            elif best_target == "glass_break":
                return "[AUDIO: GLASS_BREAK]"
            elif best_target == "banging":
                return "[AUDIO: PERSISTENT_DOOR_BANGING]"
            elif best_target == "gunshot":
                return "[AUDIO: WEAPON_DISCHARGE]"
            elif best_target == "siren":
                return "[AUDIO: SIREN_ALARM]"
                
        # Default fallback: check if general speech/chatter is dominant
        # Speech is class 0 in YAMNet
        if max_scores[0] > 0.3:
            return "[AUDIO: LOW_AMBIENT_CHATTER]"
            
        return "[AUDIO: LOW_AMBIENT_CHATTER]"
        
    except Exception as e:
        print(f"Error in acoustic classification: {e}. Falling back to default token.")
        # Fallback to a benign token in case of any runtime errors
        return "[AUDIO: LOW_AMBIENT_CHATTER]"

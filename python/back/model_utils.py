import os
import torch
from ml.models import GRUModel, CNNModel

DEVICE = "cpu"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(BASE_DIR, "../ml/models") #../ml/models
ROUND_DURATION_SECONDS = 60
AI_LEVELS = ("Bad", "Good", "Expert")

MODEL_CACHE = {}

def load_model(file_candidates):
    
    for file_name in file_candidates:
            # Always look for the TorchScript version first
            base, ext = os.path.splitext(file_name)
            jit_file = base + '_jit.pt'
            jit_path = os.path.join(MODELS_DIR, jit_file)
            if os.path.exists(jit_path):
                return torch.jit.load(jit_path, map_location=torch.device(DEVICE)), jit_file
            # Fallback to legacy .pt file if needed
            model_path = os.path.join(MODELS_DIR, file_name)
            if os.path.exists(model_path):
                return torch.load(model_path, weights_only=False, map_location=torch.device(DEVICE)), file_name
    raise FileNotFoundError(f"None of these model files were found: {file_candidates}")

def load_models_for_level(level):
    level_name = level if level in AI_LEVELS else "Good"
    gru_candidates = [f"GRUModel{level_name}.pt"]
    cnn_candidates = [f"CNNModel{level_name}.pt"]
    if level_name == "Good":
        gru_candidates.append("GRUModel.pt")
        cnn_candidates.append("CNNModel.pt")
    try:
        model_gru, gru_file = load_model(gru_candidates)
        model_cnn, cnn_file = load_model(cnn_candidates)
    except FileNotFoundError:
        model_gru, gru_file = load_model(["GRUModel.pt"])
        model_cnn, cnn_file = load_model(["CNNModel.pt"])
        level_name = "Good"
    model_gru.eval()
    model_cnn.eval()
    print(f"Loaded AI models for level={level_name}: {gru_file}, {cnn_file}")
    return model_gru, model_cnn, level_name

def get_models_for_level(level):
    cache_key = level if level in AI_LEVELS else "Good"
    if cache_key not in MODEL_CACHE:
        MODEL_CACHE[cache_key] = load_models_for_level(cache_key)
    return MODEL_CACHE[cache_key]

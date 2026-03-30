import os
import re
import torch

DEVICE = "cpu"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(BASE_DIR, "../ml/models") #../ml/models
MODEL_PATTERN = re.compile(r"^(GRU|CNN)_(\d+)_jit\.pt$")


MODEL_CACHE = {}

def get_available_epochs():
    if not os.path.isdir(MODELS_DIR):
        return []

    available = {
        "GRU": set(),
        "CNN": set(),
    }
    for file_name in os.listdir(MODELS_DIR):
        match = MODEL_PATTERN.match(file_name)
        if not match:
            continue
        model_type, epochs = match.groups()
        available[model_type].add(int(epochs))

    shared = sorted(available["GRU"] & available["CNN"])
    return shared

def normalize_epochs(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None

def load_models_for_epochs(n_epochs):
    epochs = normalize_epochs(n_epochs)
    if epochs is None:
        raise ValueError(f"Invalid epoch value: {n_epochs}")

    gru_file = f"GRU_{epochs}_jit.pt"
    cnn_file = f"CNN_{epochs}_jit.pt"
    gru_path = os.path.join(MODELS_DIR, gru_file)
    cnn_path = os.path.join(MODELS_DIR, cnn_file)

    if not os.path.exists(gru_path):
        raise FileNotFoundError(f"GRU model not found: {gru_file}")
    if not os.path.exists(cnn_path):
        raise FileNotFoundError(f"CNN model not found: {cnn_file}")

    model_gru = torch.jit.load(gru_path, map_location=torch.device(DEVICE))
    model_cnn = torch.jit.load(cnn_path, map_location=torch.device(DEVICE))
    model_gru.eval()
    model_cnn.eval()
    print(f"Loaded AI models for epochs={epochs}: {gru_file}, {cnn_file}")
    return model_gru, model_cnn, epochs

def get_models_for_epochs(n_epochs):
    cache_key = normalize_epochs(n_epochs)
    if cache_key is None:
        raise ValueError(f"Invalid epoch value: {n_epochs}")
    if cache_key not in MODEL_CACHE:
        MODEL_CACHE[cache_key] = load_models_for_epochs(cache_key)
    return MODEL_CACHE[cache_key]

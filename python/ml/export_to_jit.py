
import os
import torch
import argparse
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import GRUModel, CNNModel

"""
cd python
python -m ml.export_to_jit --model-name MyCNNModel --device cpu
"""

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CNN_MODELS_DIR = os.path.join(BASE_DIR, "train", "CNN", "models")
GRU_MODELS_DIR = os.path.join(BASE_DIR, "train", "GRU", "models")

def export_to_jit(model_name, device):
    found = False
    for model_type, model_dir, model_class in [
        ("CNN", CNN_MODELS_DIR, CNNModel),
        ("GRU", GRU_MODELS_DIR, GRUModel),
    ]:
        model_path = os.path.join(model_dir, model_name + ".pt")
        if not os.path.exists(model_path):
            print(f"Model file not found: {model_path}")
            continue
        print(f"Loading {model_path} ...")
        obj = torch.load(model_path, map_location=device, weights_only=False)
        # If obj is a model instance, use it directly. If it's a state_dict, load it into a new model instance.
        if hasattr(obj, 'state_dict') and hasattr(obj, 'forward'):
            model = obj
        elif isinstance(obj, dict):
            # If checkpoint contains 'model_state_dict' key, use it
            state_dict = obj['model_state_dict'] if 'model_state_dict' in obj else obj
            model = model_class()
            model.load_state_dict(state_dict)
        else:
            print(f"Unrecognized checkpoint format for {model_path}")
            continue
        model.eval()
        # Export to TorchScript
        # Use correct example input shape for each model type
        if model_type == "CNN":
            example_input = torch.randn(1, 3, 255, 255)
        elif model_type == "GRU":
            example_input = torch.randn(1, 100, 3)
        else:
            example_input = torch.randn(1, 3, 28, 28)
        traced = torch.jit.trace(model, example_input)
        # Save JIT model in ml/models directory
        ml_models_dir = os.path.join(BASE_DIR, "models")
        if not os.path.exists(ml_models_dir):
            os.makedirs(ml_models_dir)
        jit_path = os.path.join(ml_models_dir, f"{model_name}_{model_type}_jit.pt")
        traced.save(jit_path)
        print(f"Exported to {jit_path}")
        found = True
    if not found:
        print(f"No model named '{model_name}.pt' found in CNN or GRU model directories.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export model to TorchScript JIT")
    parser.add_argument("--model-name", required=True, help="Model name (without .pt)")
    parser.add_argument("--device", default="cpu", help="Device to load model on (cpu or cuda)")
    args = parser.parse_args()
    export_to_jit(args.model_name, args.device)

import os
import torch

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models import GRUModel, CNNModel


DEVICE = "cpu"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# List of model files to convert
model_files = [
    ("GRUModel.pt", GRUModel),
    ("CNNModel.pt", CNNModel),
    ("GRUModelBad.pt", GRUModel),
    ("CNNModelBad.pt", CNNModel),
    ("GRUModelGood.pt", GRUModel),
    ("CNNModelGood.pt", CNNModel),
    ("GRUModelExpert.pt", GRUModel),
    ("CNNModelExpert.pt", CNNModel),
]

def export_to_jit():
    for file_name, model_class in model_files:
        model_path = os.path.join(MODELS_DIR, file_name)
        if not os.path.exists(model_path):
            print(f"Model file not found: {model_path}")
            continue
        print(f"Loading {model_path} ...")
        obj = torch.load(model_path, map_location=DEVICE, weights_only=False)
        # If obj is a model instance, use it directly. If it's a state_dict, load it into a new model instance.
        if hasattr(obj, 'state_dict') and hasattr(obj, 'forward'):
            model = obj
        elif isinstance(obj, dict):
            model = model_class()
            # If checkpoint contains 'state_dict' key, use it
            state_dict = obj['state_dict'] if 'state_dict' in obj else obj
            model.load_state_dict(state_dict)
        else:
            print(f"Unrecognized checkpoint format for {model_path}")
            continue
        model.eval()
        # Export to TorchScript
        # Use correct example input shape for each model type
        if isinstance(model, CNNModel):
            example_input = torch.randn(1, 3, 255, 255)
        elif isinstance(model, GRUModel):
            example_input = torch.randn(1, 100, 3)
        else:
            example_input = torch.randn(1, 3, 28, 28)
        traced = torch.jit.trace(model, example_input)
        jit_path = model_path.replace('.pt', '_jit.pt')
        traced.save(jit_path)
        print(f"Exported to {jit_path}")

if __name__ == "__main__":
    export_to_jit()

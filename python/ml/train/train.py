import argparse
import torch
import numpy as np
import random
import torch.nn as nn
import torchmetrics
import sys, os
from .utils import load_checkpoint, train, build_loaders
"""
To train a new model:
cd python
python -m ml.train.train --model-name MyCNNModel --model-type CNN --device cuda --reset true
"""


def str_to_bool(value):
    if isinstance(value, bool):
        return value
    value = value.lower()
    if value in {"true", "1", "yes", "y", "on"}:
        return True
    if value in {"false", "0", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError(f"Invalid boolean value: {value}")

def parse_args():
    parser = argparse.ArgumentParser(description="Train image captioning model")
    parser.add_argument(
        "--model-name",
        default="ImageDescritpion",
        help="Checkpoint/model run name",
    )
    parser.add_argument(
        "--model-type",
        default="cuda",
        help="CNN ro GRU: corresponds to the type of model to train.",
    )
    parser.add_argument(
        "--reset",
        type=str_to_bool,
        default=False,
        help="If the training of the model with name model-name should be reset.",
    )
    parser.add_argument(
        "--device",
        default="cuda",
        help="Torch device to use (e.g. cuda, cpu, cuda:0)",
    )
    return parser.parse_args()

if __name__ == "__main__":
    # Set seeds for reproducibility
    SEED = 42
    NUM_CLASS = 345
    torch.manual_seed(SEED)
    torch.cuda.manual_seed_all(SEED)
    np.random.seed(SEED)
    random.seed(SEED)
    torch.backends.cudnn.deterministic = True
    batch_size = 256
    args = parse_args()
    model_name = args.model_name
    model_type = args.model_type
    device = args.device
    reset = args.reset
    model, optimizer, epoch0 = load_checkpoint(model_name, model_type, device, reset)

    loss_fn = nn.CrossEntropyLoss().to(device)
    metric = torchmetrics.Accuracy(task='multiclass', num_classes=NUM_CLASS).to(device)
    n_epochs = 2000
    train_loader, valid_loader, test_loader = build_loaders(model_type)
    history = train(
        model,
        model_type,
        optimizer,
        loss_fn,
        metric,
        train_loader,
        valid_loader,
        model_name,
        epoch0,
        n_epochs,
        device=device,
    )

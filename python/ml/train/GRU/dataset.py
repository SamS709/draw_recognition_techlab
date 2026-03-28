
import torch
from torch.utils.data import Dataset
import numpy as np
import json
from pathlib import Path

class QuickDrawDatasetGRU(Dataset):
    def __init__(self, quickdraw_folder="quickdraw_simplified", split='train', max_per_class=10000):
        self.data_folder = Path(quickdraw_folder)
        # Get all .ndjson files
        self.files = sorted(self.data_folder.glob("*.ndjson"))
        self.max_per_class = max_per_class
        self.label_to_idx = {f.stem: i for i, f in enumerate(self.files)}
        self.cats = [f.stem for f in self.files]
        
        # Save categories to JSON file
        with open('categories.json', 'w') as f:
            json.dump(self.cats, f, indent=2)
        
        # Load all data and collect dx, dy deltas for statistics
        print("[INFO] Loading data and calculating statistics...")
        self.data = []
        self.labels = []
        all_dx = []
        all_dy = []
        num_files_loaded = 0
        
        for file_path in self.files:
            label = file_path.stem
            label_idx = self.label_to_idx[label]
            
            # Read ndjson file
            with open(file_path, 'r') as f:
                count = 0
                for line in f:
                    if count >= self.max_per_class:
                        break
                    
                    drawing_data = json.loads(line)
                    
                    # Check if this drawing belongs to the requested split
                    if drawing_data.get('recognized', True) == False:
                        continue  # Skip unrecognized drawings
                    
                    # Convert strokes to delta format
                    L = []
                    strokes = drawing_data['drawing']
                    
                    for stroke in strokes:
                        x_coords = stroke[0]
                        y_coords = stroke[1]
                        
                        # Convert to deltas with pen_down flag
                        for j in range(len(x_coords) - 1):
                            dx = x_coords[j + 1] - x_coords[j]
                            dy = y_coords[j + 1] - y_coords[j]
                            pen_down = 1.0 if j == len(x_coords) - 2 else 0.0
                            L.append([dx, dy, pen_down])
                            
                            # Collect dx and dy for statistics
                            all_dx.append(dx)
                            all_dy.append(dy)
                    
                    if len(L) == 0:
                        continue
                    
                    X = torch.tensor(L, dtype=torch.float32)
                    
                    # Store the actual length before padding
                    actual_length = min(X.shape[0], 100)
                    
                    # Pad or truncate to 100 rows
                    if X.shape[0] >= 100:
                        X = X[:100]
                    else:
                        padding_needed = 100 - X.shape[0]
                        padding = torch.zeros(padding_needed, 3)
                        X = torch.cat([X, padding], dim=0)
                    
                    self.data.append((X, actual_length))  # Store both data and length
                    self.labels.append(label_idx)
                    count += 1
            
            num_files_loaded += 1
            print(f"[INFO] {num_files_loaded} / {len(self.label_to_idx)} files loaded.")
        
        # Calculate statistics on deltas
        self.dx_mean = np.mean(all_dx)
        self.dx_std = np.std(all_dx)
        self.dy_mean = np.mean(all_dy)
        self.dy_std = np.std(all_dy)
        
        print(f"[INFO] dX - Mean: {self.dx_mean:.2f}, Std: {self.dx_std:.2f}")
        print(f"[INFO] dY - Mean: {self.dy_mean:.2f}, Std: {self.dy_std:.2f}")
        
        # Normalize all loaded data (only the non-padding part)
        print("[INFO] Normalizing data...")
        for i in range(len(self.data)):
            X, actual_length = self.data[i]
            # Only normalize the actual data, not the padding
            X[:actual_length, 0] = (X[:actual_length, 0] - self.dx_mean) / self.dx_std
            X[:actual_length, 1] = (X[:actual_length, 1] - self.dy_mean) / self.dy_std
            self.data[i] = (X, actual_length)
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        X, length = self.data[idx]
        return X, self.labels[idx], length
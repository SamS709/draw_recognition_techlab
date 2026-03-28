
import torch
from torch.utils.data import Dataset
import numpy as np
import json
from pathlib import Path

class QuickDrawDatasetCNN(Dataset):
    def __init__(self, quickdraw_folder="ml/train/quickdraw_simplified", split='train', max_per_class=10000):
        self.data_folder = Path(quickdraw_folder)
        if not self.data_folder.exists() or not self.data_folder.is_dir():
            raise FileNotFoundError(f"QuickDraw data folder not found: {self.data_folder.resolve()}")
        # Get all .ndjson files
        self.files = sorted(self.data_folder.glob("*.ndjson"))
        if not self.files:
            raise FileNotFoundError(f"No .ndjson files found in {self.data_folder.resolve()}")
        self.max_per_class = max_per_class
        self.label_to_idx = {f.stem: i for i, f in enumerate(self.files)}
        self.cats = [f.stem for f in self.files]

        # Save categories to JSON file
        with open('categories.json', 'w') as f:
            json.dump(self.cats, f, indent=2)

        # Load all data and collect dx, dy deltas for statistics
        print("[INFO] Loading data...")
        self.data = []
        self.labels = []
        num_files_loaded = 0

        for file_path in self.files:
            label = file_path.stem
            label_idx = self.label_to_idx[label]

            # Read ndjson file
            with open(file_path, 'r') as f:
                count = 0
                for line in f:
                    if count >= max_per_class:
                        break

                    drawing_data = json.loads(line)

                    # Check if this drawing belongs to the requested split
                    if drawing_data.get('recognized', True) == False:
                        continue  # Skip unrecognized drawings

                    # Store raw strokes
                    strokes = drawing_data['drawing']
                    self.data.append(strokes)
                    self.labels.append(label_idx)
                    count += 1

            num_files_loaded += 1
            print(f"[INFO] {num_files_loaded} / {len(self.label_to_idx)} files loaded.")

        if len(self.data) == 0:
            raise RuntimeError(f"No data loaded from {self.data_folder.resolve()} (split={split}, max_per_class={max_per_class})")
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        strokes = self.data[idx]
        # Use numpy array for faster operations
        X_np = np.zeros((3, 255, 255), dtype=np.float32)
        
        for stroke in strokes:
            # Convert to numpy arrays once (much faster than list access)
            x_coords = np.array(stroke[0], dtype=np.int32)
            y_coords = np.array(stroke[1], dtype=np.int32)
            
            if len(x_coords) < 2:
                continue
            
            # Vectorized differences
            x0 = x_coords[:-1]
            y0 = y_coords[:-1]
            x1 = x_coords[1:]
            y1 = y_coords[1:]
            
            # Process all line segments in this stroke
            for i in range(len(x0)):
                dx = abs(x1[i] - x0[i])
                dy = abs(y1[i] - y0[i])
                num_points = max(dx, dy, 1)
                
                # Vectorized interpolation
                xs = np.linspace(x0[i], x1[i], num_points + 1, dtype=np.int32)
                ys = np.linspace(y0[i], y1[i], num_points + 1, dtype=np.int32)
                
                # Vectorized bounds check
                valid = (xs >= 0) & (xs < 255) & (ys >= 0) & (ys < 255)
                xs_valid = xs[valid]
                ys_valid = ys[valid]
                
                # Batch assignment using advanced indexing
                X_np[:, ys_valid, xs_valid] = 1.0
        
        # Convert to torch tensor once at the end
        return torch.from_numpy(X_np), self.labels[idx]

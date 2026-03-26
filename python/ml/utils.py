import torch
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import json
import os

class Data:
    
    def __init__(self):
        self.raw_points = []  # Store all raw points from all strokes
        self.data_gru = []  # Processed data with center and reduced deltas
        self.data_cnn = []  # Processed data image        
        self.max_len = 100
        
        categories_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "categories.json")
        with open(categories_path, 'r') as file:
            self.cats = json.load(file)
    
    def process_data(self, data):
        
        max_len = 100
        mean_x = 2.73
        std_x = 27.59
        mean_y = 2.10
        std_y = 26.16
        
        sample_freq = 5
        
        # Add new stroke points to accumulated raw points
        
        self.raw_points = data['points']
        
        # Step 1: Find min_x and min_y across all accumulated points
        if not self.raw_points:
            return
        
        min_x = min(p['x'] for p in self.raw_points)
        min_y = min(p['y'] for p in self.raw_points)
        
        # Step 2: Align to top-left corner (min = 0)
        aligned_points = []
        for p in self.raw_points:
            aligned_points.append({
                'x': p['x'] - min_x,
                'y': p['y'] - min_y
            })
        
        # Step 3: Find max value to scale uniformly
        max_x = max(p['x'] for p in aligned_points)
        max_y = max(p['y'] for p in aligned_points)
        max_value = max(max_x, max_y)
        
        # Step 4: Scale so maximum dimension = 255
        if max_value > 0:
            scale_factor = 255.0 / max_value
        else:
            scale_factor = 1.0
        
        normalized_points = []
        for p in aligned_points:
            normalized_points.append({
                'x': p['x'] * scale_factor,
                'y': p['y'] * scale_factor
            })
        self.data_cnn = []
        stroke = [[],[]]
        for i in range(len(self.raw_points)):
            stroke[0].append(normalized_points[i]['x'])
            stroke[1].append(normalized_points[i]['y'])
            if self.raw_points[i]['pen'] == 1:
                self.data_cnn.append(stroke)
                stroke = [[],[]]

        # Step 5: Calculate deltas from normalized points + center and reduce the deltas
        self.data_gru = []
        for i in range(len(normalized_points)):
            if len(self.data_gru) < max_len and i < len(normalized_points) - 2:
                delta_x = (normalized_points[i+1]['x'] - normalized_points[i]['x'] - mean_x) / std_x
                delta_y = (normalized_points[i+1]['y'] - normalized_points[i]['y'] - mean_y) / std_y
                self.data_gru.append([delta_x, delta_y, self.raw_points[i+1]['pen']])
        
        
    def get_data(self):
        X_gru = torch.tensor(self.data_gru, dtype=torch.float32)
        actual_length = torch.tensor(min(len(self.data_gru), self.max_len), dtype=torch.float32)

        if X_gru.shape[0]< self.max_len:
            padding_needed = self.max_len - X_gru.shape[0]
            padding = torch.zeros(padding_needed, 3)
            X_gru = torch.cat([X_gru, padding], dim=0)
        
    
        X_cnn = np.zeros((3, 255, 255), dtype=np.float32)
        
        for stroke in self.data_cnn:
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
                X_cnn[:, ys_valid, xs_valid] = 1.0
        X_cnn = torch.from_numpy(X_cnn)
        self.save_fig(X_cnn)
        # Convert to torch tensor once at the end
        return X_gru.unsqueeze(0), actual_length.unsqueeze(0), X_cnn.unsqueeze(0)
            
    def save_fig(self, tensor_cnn):
        plt.figure(figsize=(10, 10))
        plt.imshow(tensor_cnn.permute(1,2,0)[:,:,0].cpu().numpy(), cmap='gray')
        plt.axis('off')
        plt.savefig('output.png', bbox_inches='tight', pad_inches=0)
        plt.close()
    
    def clear(self):
        self.raw_points.clear()
        self.data_gru.clear()
    
    def pre_models(self, model_gru, tensor_gru, lengths, model_cnn, tensor_cnn):
        p_cnn = (len(self.raw_points) / self.max_len)**(1/3.0)
        # Get prediction
        with torch.no_grad():
            # TorchScript models only accept positional args used in tracing
            if hasattr(model_gru, 'code') or isinstance(model_gru, torch.jit.ScriptModule) or isinstance(model_gru, torch.jit.RecursiveScriptModule):
                output_gru = model_gru(tensor_gru)
            else:
                output_gru = model_gru(tensor_gru, lengths)
            probabilities_gru = torch.softmax(output_gru, dim=1)
            top_probs_gru, top_indices_gru = torch.topk(probabilities_gru, k=5, dim=1)
            top_probs_gru = top_probs_gru.squeeze().tolist()
            top_indices_gru = top_indices_gru.squeeze().tolist()
        with torch.no_grad():
            output_cnn = model_cnn(tensor_cnn)
            probabilities_cnn = torch.softmax(output_cnn, dim=1)
            top_probs_cnn, top_indices_cnn = torch.topk(probabilities_cnn, k=5, dim=1)
            top_probs_cnn = top_probs_cnn.squeeze().tolist()
            top_indices_cnn = top_indices_cnn.squeeze().tolist()
        # Create dictionaries for easy lookup
        cnn_dict = {idx: prob for idx, prob in zip(top_indices_cnn, top_probs_cnn)}
        gru_dict = {idx: prob for idx, prob in zip(top_indices_gru, top_probs_gru)}
        # Get union of all categories
        all_indices = set(top_indices_cnn) | set(top_indices_gru)
        # Combine probabilities
        combined = []
        for idx in all_indices:
            prob_cnn = cnn_dict.get(idx, 0.0)
            prob_gru = gru_dict.get(idx, 0.0)
            combined_prob = p_cnn * prob_cnn + (1 - p_cnn) * prob_gru
            combined.append((idx, combined_prob))
        # Sort by combined probability and take top 5
        combined.sort(key=lambda x: x[1], reverse=True)
        top_5 = combined[:5]
        top_cats = [self.cats[idx] for idx, _ in top_5]
        top_probs = [prob for _, prob in top_5]
        # Normalize to probability distribution with linear rescaling
        total = sum(top_probs)
        top_probs = [p / total for p in top_probs]
        return top_cats, top_probs
            
        
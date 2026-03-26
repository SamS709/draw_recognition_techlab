import torch.nn as nn
from torch.nn.utils.rnn import pack_padded_sequence


class GRUModel(nn.Module):

    def __init__(self, hidden_size=128, n_outputs = 345, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # seq shape: N, 33, 3
        self.embedder = nn.Sequential(
            nn.Linear(3, 64),
            nn.ReLU()
        )
        # X shape: N, 33, 64
        self.gru = nn.GRU(
            64,
            hidden_size= hidden_size,
            num_layers=3,
            batch_first=True,
            dropout=0.2,
            bidirectional=False
        )
        # h_ns[-1] shape: N, hidden_size
        self.fc = nn.Linear(hidden_size, n_outputs)
        # output shape = N, n_outputs


    def forward(self, seq, lengths=None):
        # Embed the input
        X = self.embedder(seq)
        
        if lengths is not None:
            X_packed = pack_padded_sequence(X, lengths.cpu(), batch_first=True, enforce_sorted=False)
            output_packed, h_ns = self.gru(X_packed)
        else:
            output_, h_ns = self.gru(X)
        
        return self.fc(h_ns[-1])

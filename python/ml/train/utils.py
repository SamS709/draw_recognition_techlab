import torch
from torch.utils.tensorboard import SummaryWriter
import os

from ml.models import CNNModel, GRUModel
from .CNN.dataset import QuickDrawDatasetCNN
from .GRU.dataset import QuickDrawDatasetGRU
from torch.utils.data import DataLoader
import os

def build_loaders(model_type):
    if model_type == "CNN":
        quickdraw_folder=os.path.join("ml", "train", "quickdraw_simplified")
        test_set = QuickDrawDatasetCNN(quickdraw_folder=quickdraw_folder, split='test', max_per_class=100)
        test_loader = DataLoader(dataset=test_set, batch_size=256, shuffle=True, num_workers=4)
        val_set = QuickDrawDatasetCNN(quickdraw_folder=quickdraw_folder, split='valid', max_per_class=1000)
        val_loader = DataLoader(dataset=val_set, batch_size=256, shuffle=True, num_workers=2)
        train_set = QuickDrawDatasetCNN(quickdraw_folder=quickdraw_folder, split='train', max_per_class=7000)
        train_loader = DataLoader(dataset=train_set, batch_size=256, shuffle=True, num_workers=2)
        return train_loader, val_loader, test_loader
    elif model_type == "GRU":
        quickdraw_folder=os.path.join("ml", "train", "quickdraw_simplified")
        test_set = QuickDrawDatasetGRU(quickdraw_folder=quickdraw_folder, split='test', max_per_class=100)
        test_loader = DataLoader(dataset=test_set, batch_size=256, shuffle=True, num_workers=4)
        val_set = QuickDrawDatasetGRU(quickdraw_folder=quickdraw_folder, split='valid', max_per_class=100)
        val_loader = DataLoader(dataset=val_set, batch_size=256, shuffle=True, num_workers=2)
        train_set = QuickDrawDatasetGRU(quickdraw_folder=quickdraw_folder, split='train', max_per_class=100)
        train_loader = DataLoader(dataset=train_set, batch_size=256, shuffle=True, num_workers=2)
        return train_loader, val_loader, test_loader
        

def evaluate_tm(model, data_loader, metric, device):
    model.eval()
    metric.reset()
    with torch.no_grad():
        for X_batch, y_batch in data_loader:
            y_batch = y_batch.to(device)
            y_pred = model(X_batch)
            metric.update(y_pred, y_batch)
    return metric.compute()

def save_checkpoint(epoch, model, model_type, optimizer, model_name):
    save_path = os.path.join("ml", "train", model_type, "models", model_name + "_" + epoch + "_" + ".pt")
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
    }, save_path)
    print("Model saved at " + save_path)
    
def train(model, model_type, optimizer, loss_fn, metric, train_loader, valid_loader, model_name, epoch0,
          n_epochs, device, patience=2, factor=0.5, epoch_callback=None, **kwargs):
    if model_type == "CNN":
        return train_cnn(model, model_type, optimizer, loss_fn, metric, train_loader, valid_loader, model_name, epoch0, n_epochs, device, patience, factor, epoch_callback)
    elif model_type == "GRU":
        return train_gru(model, model_type, optimizer, loss_fn, metric, train_loader, valid_loader, model_name, epoch0, n_epochs, device, patience, factor, epoch_callback)
    else:
        raise ValueError(f"Unknown model_type: {model_type}")

def train_cnn(model, model_type, optimizer, loss_fn, metric, train_loader, valid_loader, model_name, epoch0,
              n_epochs, device, patience=2, factor=0.5, epoch_callback=None):
    writer = SummaryWriter(log_dir=os.path.join("ml", "train", model_type, "runs", model_name))
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", patience=patience, factor=factor)
    history = {"train_losses": [], "train_metrics": [], "valid_metrics": []}
    save_rate = 1
    for epoch in range(epoch0, epoch0 + n_epochs):
        total_loss = 0.0
        metric.reset()
        model.train()
        if epoch_callback is not None:
            epoch_callback(model, epoch)
        for index, (X_batch, y_batch) in enumerate(train_loader):
            y_batch = y_batch.to(device)
            y_pred = model(X_batch)
            loss = loss_fn(y_pred, y_batch)
            total_loss += loss.item()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            optimizer.zero_grad()
            metric.update(y_pred, y_batch)
            train_metric = metric.compute().item()
            global_step = (epoch - epoch0) * len(train_loader) + index
            writer.add_scalar('Loss/train_batch', loss.item(), global_step)

            print(f"\rBatch {index + 1}/{len(train_loader)}", end="")
            print(f", loss={total_loss/(index+1):.4f}", end="")
            print(f", {train_metric=:.2%}", end="")

        val_metric = evaluate_tm(model, valid_loader, metric, device).item()
        history["train_losses"].append(total_loss / len(train_loader))
        history["train_metrics"].append(train_metric)
        history["valid_metrics"].append(val_metric)        
        writer.add_scalar('Loss/train_epoch', total_loss / len(train_loader), epoch - epoch0)
        writer.add_scalar('Accuracy/train', train_metric, epoch - epoch0)
        writer.add_scalar('Learning_rate', optimizer.param_groups[0]['lr'], epoch - epoch0)
        writer.add_scalar('Accuracy/valid', val_metric, epoch - epoch0)
        
        scheduler.step(val_metric)
        print(f"\rEpoch {epoch + 1}/{epoch0 + n_epochs},                      "
              f"train loss: {history['train_losses'][-1]:.4f}, "
              f"train metric: {history['train_metrics'][-1]:.2%}, "
              f"valid metric: {history['valid_metrics'][-1]:.2%}")
        if (epoch - epoch0) % save_rate == 0:
            save_checkpoint(epoch, model, model_type, optimizer, model_name)
    writer.close()
    return history

def train_gru(model, model_type, optimizer, loss_fn, metric, train_loader, valid_loader, model_name, epoch0,
              n_epochs, device, patience=2, factor=0.5, epoch_callback=None, max_grad_norm=1.0):
    writer = SummaryWriter(log_dir=os.path.join("ml", "train", model_type, "runs", model_name))
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", patience=patience, factor=factor)
    history = {"train_losses": [], "train_metrics": [], "valid_losses": [], "valid_metrics": []}
    glob_path = os.path.join("ml", "train", model_type, "models")
    save_rate = 1
    best_val_metric = 0.0
    if not os.path.exists(glob_path):
        os.makedirs(glob_path)
    for epoch in range(epoch0, epoch0 + n_epochs):
        total_loss = 0.0
        metric.reset()
        model.train()
        if epoch_callback is not None:
            epoch_callback(model, epoch)
        for index, (X_batch, y_batch, lengths) in enumerate(train_loader):
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            y_pred = model(X_batch, lengths)
            loss = loss_fn(y_pred, y_batch)
            total_loss += loss.item()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
            optimizer.step()
            optimizer.zero_grad()
            metric.update(y_pred, y_batch)
            train_metric = metric.compute().item()
            global_step = (epoch - epoch0) * len(train_loader) + index
            writer.add_scalar('Loss/train_batch', loss.item(), global_step)

            print(f"\rBatch {index + 1}/{len(train_loader)}", end="")
            print(f", loss={total_loss/(index+1):.4f}", end="")
            print(f", {train_metric=:.2%}", end="")
        avg_train_loss = total_loss / len(train_loader)
        history["train_losses"].append(avg_train_loss)
        history["train_metrics"].append(train_metric)
        val_loss, val_metric = evaluate_tm(model, valid_loader, loss_fn, metric, device)
        history["valid_losses"].append(val_loss)
        history["valid_metrics"].append(val_metric.item())
        writer.add_scalar('Loss/train_epoch', avg_train_loss, epoch - epoch0)
        writer.add_scalar('Accuracy/train', train_metric, epoch - epoch0)
        writer.add_scalar('Learning_rate', optimizer.param_groups[0]['lr'], epoch - epoch0)
        writer.add_scalar('Accuracy/valid', val_metric, epoch - epoch0)
        scheduler.step(val_metric)
        print(f"\rEpoch {epoch + 1}/{epoch0 + n_epochs},                      "
              f"train loss: {avg_train_loss:.4f}, "
              f"train metric: {train_metric:.2%}, "
              f"valid loss: {val_loss:.4f}, "
              f"valid metric: {val_metric:.2%}, "
              f"lr: {optimizer.param_groups[0]['lr']:.6f}")
        # Save best model
        if len(history["valid_metrics"]) > 0:
            if history["valid_metrics"][-1] > best_val_metric:
                best_val_metric = history["valid_metrics"][-1]
                save_checkpoint(epoch, model, model_type, optimizer, "best_" + model_name)
        # Periodic save
        if (epoch - epoch0) % save_rate == 0:
            save_checkpoint(epoch, model, model_type, optimizer, model_name)
    writer.close()
    return history

def load_checkpoint(model_name, model_type, device, reset):
    if not os.path.exists(os.path.join("ml", "train", model_type, "models")):
        os.mkdir(os.path.join("ml", "train", model_type, "models"))
    if model_type == "CNN":
        model = CNNModel().to(device)
    elif model_type == "GRU":
        model = GRUModel().to(device)
    optimizer = torch.optim.NAdam(model.parameters(), lr=0.001)
    epoch0 = 0
    
    checkpoint_path = os.path.join("ml", "train", model_type, "models", model_name + ".pt")

    if os.path.exists(checkpoint_path):
        if reset:
            print("Model found at ", checkpoint_path, ": reset== True => overwriting model")
        else:
            try:
                checkpoint = torch.load(checkpoint_path, weights_only=False)
                model.load_state_dict(checkpoint['model_state_dict'])
                optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
                epoch0 = checkpoint['epoch'] + 1
            except Exception as e:
                print(f"Failed to load checkpoint: {e}")
    else:
        print(f"No checkpoint found at {checkpoint_path}")
    
    return model, optimizer, epoch0
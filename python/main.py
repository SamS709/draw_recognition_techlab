import torch
import os
import random
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from utils import Data
from models import GRUModel, CNNModel

DEVICE = "cpu"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONT_DIR = os.path.join(PROJECT_ROOT, "front")
MODELS_DIR = os.path.join(BASE_DIR, "models")



model_gru = torch.load(os.path.join(MODELS_DIR, "GRUModel.pt"), weights_only=False, map_location=torch.device(DEVICE)).to(DEVICE)
model_cnn = torch.load(os.path.join(MODELS_DIR, "CNNModel.pt"), weights_only=False, map_location=torch.device(DEVICE)).to(DEVICE)
model_gru.eval()
model_cnn.eval()
data = Data()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

SID_TO_PLAYER = {}

game_state = {
    "category": None,
    "round_end": None,
    "players": {
        1: {"points": [], "connected": False},
        2: {"points": [], "connected": False},
    },
}


def _remaining_seconds():
    if game_state["round_end"] is None:
        return None
    return max(0, int(game_state["round_end"] - time.time()))


def _round_payload():
    return {
        "category": game_state["category"],
        "remainingSeconds": _remaining_seconds(),
        "roundEnd": game_state["round_end"],
    }


def _predict_from_points(points):
    data.process_data({"points": points})
    tensor_gru, length_, tensor_cnn = data.get_data()
    top_cats, top_probs = data.pre_models(model_gru, tensor_gru, length_, model_cnn, tensor_cnn)
    return {
        "prediction": {"category": top_cats[0], "confidence": float(top_probs[0])},
        "top10": [
            {"category": cat, "confidence": float(prob)}
            for cat, prob in zip(top_cats, top_probs)
        ],
    }


@app.route('/')
def index_page():
    return send_from_directory(FRONT_DIR, 'index.html')


@app.route('/host')
def host_page():
    return send_from_directory(FRONT_DIR, 'host.html')


@app.route('/player/<int:player_id>')
def player_page(player_id):
    if player_id not in (1, 2):
        return jsonify({"error": "player_id must be 1 or 2"}), 400
    return send_from_directory(FRONT_DIR, 'player.html')


@app.route('/styles/<path:filename>')
def styles_file(filename):
    return send_from_directory(os.path.join(FRONT_DIR, 'styles'), filename)


@app.route('/js/<path:filename>')
def js_file(filename):
    return send_from_directory(os.path.join(FRONT_DIR, 'js'), filename)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        stroke_data = request.json
        points = stroke_data.get("points", [])
        return jsonify(_predict_from_points(points))
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@socketio.on('join_role')
def on_join_role(payload):
    role = payload.get("role")
    if role == "player":
        player_id = int(payload.get("playerId", 0))
        if player_id not in (1, 2):
            return
        SID_TO_PLAYER[request.sid] = player_id
        game_state["players"][player_id]["connected"] = True
        emit('player_presence', {"playerId": player_id, "connected": True}, broadcast=True)
    emit('player_presence', {
        "playerId": 1,
        "connected": game_state["players"][1]["connected"],
    })
    emit('player_presence', {
        "playerId": 2,
        "connected": game_state["players"][2]["connected"],
    })
    emit('round_state', _round_payload())


@socketio.on('disconnect')
def on_disconnect():
    player_id = SID_TO_PLAYER.pop(request.sid, None)
    if player_id is not None:
        game_state["players"][player_id]["connected"] = False
        emit('player_presence', {"playerId": player_id, "connected": False}, broadcast=True)


@socketio.on('player_state')
def on_player_state(payload):
    player_id = int(payload.get("playerId", 0))
    points = payload.get("points", [])
    if player_id not in (1, 2):
        return
    game_state["players"][player_id]["points"] = points
    emit('player_drawing', {"playerId": player_id, "points": points}, broadcast=True)


@socketio.on('predict_request')
def on_predict_request(payload):
    player_id = int(payload.get("playerId", 0))
    points = payload.get("points", [])
    if player_id not in (1, 2) or len(points) < 3:
        return
    try:
        result = _predict_from_points(points)
        emit('prediction_update', {
            "playerId": player_id,
            "top": result["top10"],
            "best": result["prediction"],
        }, broadcast=True)
    except Exception as e:
        print(f"Prediction error for player {player_id}: {e}")


@socketio.on('host_start_round')
def on_host_start_round(payload):
    duration = int(payload.get("durationSeconds", 60))
    game_state["category"] = random.choice(data.cats)
    game_state["round_end"] = time.time() + max(10, duration)
    emit('round_state', _round_payload(), broadcast=True)


@socketio.on('host_reset_round')
def on_host_reset_round():
    game_state["category"] = None
    game_state["round_end"] = None
    game_state["players"][1]["points"] = []
    game_state["players"][2]["points"] = []
    emit('round_state', _round_payload(), broadcast=True)
    emit('player_drawing', {"playerId": 1, "points": []}, broadcast=True)
    emit('player_drawing', {"playerId": 2, "points": []}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)


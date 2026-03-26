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
ROUND_DURATION_SECONDS = 60
AI_LEVELS = ("Bad", "Good", "Expert")


def _load_model(file_candidates):
    for file_name in file_candidates:
        model_path = os.path.join(MODELS_DIR, file_name)
        if os.path.exists(model_path):
            return torch.load(model_path, weights_only=False, map_location=torch.device(DEVICE)).to(DEVICE), file_name
    raise FileNotFoundError(f"None of these model files were found: {file_candidates}")


def _load_models_for_level(level):
    level_name = level if level in AI_LEVELS else "Good"
    gru_candidates = [f"GRUModel{level_name}.pt"]
    cnn_candidates = [f"CNNModel{level_name}.pt"]

    # Backward compatibility with previous default naming.
    if level_name == "Good":
        gru_candidates.append("GRUModel.pt")
        cnn_candidates.append("CNNModel.pt")

    try:
        model_gru, gru_file = _load_model(gru_candidates)
        model_cnn, cnn_file = _load_model(cnn_candidates)
    except FileNotFoundError:
        # Fallback to legacy default models if a requested level file is missing.
        model_gru, gru_file = _load_model(["GRUModel.pt"])
        model_cnn, cnn_file = _load_model(["CNNModel.pt"])
        level_name = "Good"

    model_gru.eval()
    model_cnn.eval()
    print(f"Loaded AI models for level={level_name}: {gru_file}, {cnn_file}")
    return model_gru, model_cnn, level_name


MODEL_CACHE = {}


def _get_models_for_level(level):
    cache_key = level if level in AI_LEVELS else "Good"
    if cache_key not in MODEL_CACHE:
        MODEL_CACHE[cache_key] = _load_models_for_level(cache_key)
    return MODEL_CACHE[cache_key]


data = Data()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

SID_TO_PLAYER = {}
PLAYER_TO_SID = {1: None, 2: None}

game_state = {
    "category": None,
    "round_end": None,
    "ai_level": None,
    "awaiting_ai_level": False,
    "players": {
        1: {"points": [], "connected": False, "ready": False},
        2: {"points": [], "connected": False, "ready": False},
    },
}


def _remaining_seconds():
    if game_state["round_end"] is None:
        return None
    left = int(game_state["round_end"] - time.time())
    if left <= 0:
        game_state["round_end"] = None
        game_state["category"] = None
        game_state["ai_level"] = None
        game_state["awaiting_ai_level"] = False
        return None
    return left


def _round_active():
    return _remaining_seconds() is not None


def _request_ai_level_from_player_one():
    sid = PLAYER_TO_SID.get(1)
    if not sid:
        return
    emit('ai_level_required', {"levels": list(AI_LEVELS)}, to=sid)
    game_state["awaiting_ai_level"] = True


def _emit_ready_state(player_id, broadcast=True):
    emit(
        'player_ready_update',
        {
            "playerId": player_id,
            "ready": game_state["players"][player_id]["ready"],
        },
        broadcast=broadcast,
    )


def _start_round(duration=ROUND_DURATION_SECONDS, ai_level="Good"):
    game_state["category"] = random.choice(data.cats)
    game_state["round_end"] = time.time() + max(10, int(duration))
    game_state["ai_level"] = ai_level if ai_level in AI_LEVELS else "Good"
    game_state["awaiting_ai_level"] = False
    for pid in (1, 2):
        game_state["players"][pid]["points"] = []
        game_state["players"][pid]["ready"] = False
    emit('round_state', _round_payload(), broadcast=True)
    emit('player_drawing', {"playerId": 1, "points": []}, broadcast=True)
    emit('player_drawing', {"playerId": 2, "points": []}, broadcast=True)
    emit('prediction_update', {"playerId": 1, "top": []}, broadcast=True)
    emit('prediction_update', {"playerId": 2, "top": []}, broadcast=True)
    _emit_ready_state(1, broadcast=True)
    _emit_ready_state(2, broadcast=True)


def _round_payload():
    return {
        "category": game_state["category"],
        "remainingSeconds": _remaining_seconds(),
        "roundEnd": game_state["round_end"],
        "aiLevel": game_state["ai_level"],
    }


def _predict_from_points(points):
    data.process_data({"points": points})
    tensor_gru, length_, tensor_cnn = data.get_data()
    selected_level = game_state.get("ai_level") or "Good"
    model_gru, model_cnn, _ = _get_models_for_level(selected_level)
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
        previous_sid = PLAYER_TO_SID.get(player_id)
        if previous_sid and previous_sid != request.sid:
            SID_TO_PLAYER.pop(previous_sid, None)
        PLAYER_TO_SID[player_id] = request.sid
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
    _emit_ready_state(1, broadcast=False)
    _emit_ready_state(2, broadcast=False)
    emit('round_state', _round_payload())


@socketio.on('disconnect')
def on_disconnect():
    player_id = SID_TO_PLAYER.pop(request.sid, None)
    if player_id is not None:
        if PLAYER_TO_SID.get(player_id) == request.sid:
            PLAYER_TO_SID[player_id] = None
        game_state["players"][player_id]["connected"] = False
        game_state["players"][player_id]["ready"] = False
        game_state["awaiting_ai_level"] = False
        emit('player_presence', {"playerId": player_id, "connected": False}, broadcast=True)
        _emit_ready_state(player_id, broadcast=True)


@socketio.on('player_state')
def on_player_state(payload):
    player_id = int(payload.get("playerId", 0))
    points = payload.get("points", [])
    if player_id not in (1, 2):
        return
    game_state["players"][player_id]["points"] = points
    emit('player_drawing', {"playerId": player_id, "points": points}, broadcast=True)
    if len(points) == 0:
        emit('prediction_update', {
            "playerId": player_id,
            "top": [],
            "best": None,
        }, broadcast=True)


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


@socketio.on('player_ready')
def on_player_ready(payload):
    player_id = int(payload.get("playerId", 0))
    ready = bool(payload.get("ready", False))
    if player_id not in (1, 2):
        return
    if not game_state["players"][player_id]["connected"]:
        return
    if _round_active():
        return

    game_state["players"][player_id]["ready"] = ready
    if not ready:
        game_state["awaiting_ai_level"] = False
    _emit_ready_state(player_id, broadcast=True)

    if game_state["players"][1]["ready"] and game_state["players"][2]["ready"]:
        if not game_state["awaiting_ai_level"]:
            _request_ai_level_from_player_one()


@socketio.on('select_ai_level')
def on_select_ai_level(payload):
    player_id = SID_TO_PLAYER.get(request.sid)
    if player_id != 1:
        return
    if _round_active():
        return
    if not (game_state["players"][1]["ready"] and game_state["players"][2]["ready"]):
        return

    requested_level = str(payload.get("level", "Good"))
    normalized_level = next((level for level in AI_LEVELS if level.lower() == requested_level.lower()), "Good")
    _start_round(ROUND_DURATION_SECONDS, ai_level=normalized_level)


@socketio.on('host_start_round')
def on_host_start_round(payload):
    duration = int(payload.get("durationSeconds", ROUND_DURATION_SECONDS))
    _start_round(duration, ai_level="Good")


@socketio.on('host_reset_round')
def on_host_reset_round():
    game_state["category"] = None
    game_state["round_end"] = None
    game_state["ai_level"] = None
    game_state["awaiting_ai_level"] = False
    game_state["players"][1]["points"] = []
    game_state["players"][2]["points"] = []
    game_state["players"][1]["ready"] = False
    game_state["players"][2]["ready"] = False
    emit('round_state', _round_payload(), broadcast=True)
    _emit_ready_state(1, broadcast=True)
    _emit_ready_state(2, broadcast=True)
    emit('player_drawing', {"playerId": 1, "points": []}, broadcast=True)
    emit('player_drawing', {"playerId": 2, "points": []}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)


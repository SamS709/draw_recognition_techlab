import random
import time
from flask_socketio import emit
from ml.utils import Data
from .model_utils import get_models_for_level, AI_LEVELS

data = Data()
DEFAULT_AI_LEVEL = "Good"

SID_TO_PLAYER = {}
PLAYER_TO_SID = {1: None, 2: None}

game_state = {
    "category": None,
    "round_end": None,
    "round_duration_seconds": None,
    "ai_level": None,
    "awaiting_ai_level": False,
    "players": {
        1: {"points": [], "connected": False, "ready": False},
        2: {"points": [], "connected": False, "ready": False},
    },
}

def remaining_seconds():
    if game_state["round_end"] is None:
        return None
    left = int(game_state["round_end"] - time.time())
    if left <= 0:
        game_state["round_end"] = None
        game_state["round_duration_seconds"] = None
        game_state["category"] = None
        game_state["ai_level"] = None
        game_state["awaiting_ai_level"] = False
        return None
    return left

def round_active():
    return remaining_seconds() is not None

def request_ai_level_from_player_one():
    sid = PLAYER_TO_SID.get(1)
    if not sid:
        return
    emit('ai_level_required', {
        "levels": list(AI_LEVELS),
        "defaultLevel": DEFAULT_AI_LEVEL,
    }, to=sid)
    game_state["awaiting_ai_level"] = True

def emit_ready_state(player_id, broadcast=True):
    emit(
        'player_ready_update',
        {
            "playerId": player_id,
            "ready": game_state["players"][player_id]["ready"],
        },
        broadcast=broadcast,
    )

def start_round(duration, ai_level="Good"):
    round_seconds = max(3, int(duration))
    game_state["category"] = random.choice(data.cats)
    game_state["round_end"] = time.time() + round_seconds
    game_state["round_duration_seconds"] = round_seconds
    game_state["ai_level"] = ai_level if ai_level in AI_LEVELS else "Good"
    game_state["awaiting_ai_level"] = False
    for pid in (1, 2):
        game_state["players"][pid]["points"] = []
        game_state["players"][pid]["ready"] = False
    emit('round_state', round_payload(), broadcast=True)
    emit('player_drawing', {"playerId": 1, "points": []}, broadcast=True)
    emit('player_drawing', {"playerId": 2, "points": []}, broadcast=True)
    emit('prediction_update', {"playerId": 1, "top": []}, broadcast=True)
    emit('prediction_update', {"playerId": 2, "top": []}, broadcast=True)
    emit_ready_state(1, broadcast=True)
    emit_ready_state(2, broadcast=True)

def round_payload():
    return {
        "category": game_state["category"],
        "remainingSeconds": remaining_seconds(),
        "roundEnd": game_state["round_end"],
        "roundDurationSeconds": game_state["round_duration_seconds"],
        "aiLevel": game_state["ai_level"],
    }

def predict_from_points(points):
    data.process_data({"points": points})
    tensor_gru, length_, tensor_cnn = data.get_data()
    selected_level = game_state.get("ai_level") or "Good"
    model_gru, model_cnn, _ = get_models_for_level(selected_level)
    top_cats, top_probs = data.pre_models(model_gru, tensor_gru, length_, model_cnn, tensor_cnn)
    return {
        "prediction": {"category": top_cats[0], "confidence": float(top_probs[0])},
        "top10": [
            {"category": cat, "confidence": float(prob)}
            for cat, prob in zip(top_cats, top_probs)
        ],
    }

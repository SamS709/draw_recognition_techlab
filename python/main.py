import os
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from back.game_state import (
    game_state, SID_TO_PLAYER, PLAYER_TO_SID,
    round_active, request_ai_level_from_player_one,
    emit_ready_state, start_round, round_payload, predict_from_points
)
from back.model_utils import AI_LEVELS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONT_DIR = os.path.join(PROJECT_ROOT, "front")

DEFAULT_AI_LEVEL = "Good"
AI_LEVEL_ROUND_SECONDS = {
    "Bad": 18,
    "Good": 12,
    "Expert": 8,
}


def normalize_ai_level(value):
    requested_level = str(value or DEFAULT_AI_LEVEL)
    return next(
        (level for level in AI_LEVELS if level.lower() == requested_level.lower()),
        DEFAULT_AI_LEVEL,
    )


def round_duration_for_level(level):
    fallback = AI_LEVEL_ROUND_SECONDS[DEFAULT_AI_LEVEL]
    return int(AI_LEVEL_ROUND_SECONDS.get(level, fallback))


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


@app.route('/')
def index_page():
    return send_from_directory(FRONT_DIR, 'home.html')


@app.route('/host')
def host_page():
    return send_from_directory(FRONT_DIR, 'host.html')


@app.route('/styles/<path:filename>')
def styles_file(filename):
    return send_from_directory(os.path.join(FRONT_DIR, 'styles'), filename)


@app.route('/js/<path:filename>')
def js_file(filename):
    return send_from_directory(os.path.join(FRONT_DIR, 'js'), filename)


@app.route('/game-config')
def game_config():
    timer_by_level = {
        level: round_duration_for_level(level)
        for level in AI_LEVELS
    }
    default_level = normalize_ai_level(DEFAULT_AI_LEVEL)
    return jsonify({
        "levels": list(AI_LEVELS),
        "defaultLevel": default_level,
        "timerByLevel": timer_by_level,
    })


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
    emit_ready_state(1, broadcast=False)
    emit_ready_state(2, broadcast=False)
    emit('round_state', round_payload())


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
        emit_ready_state(player_id, broadcast=True)


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
        result = predict_from_points(points)
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
    if round_active():
        return

    game_state["players"][player_id]["ready"] = ready
    if not ready:
        game_state["awaiting_ai_level"] = False
    emit_ready_state(player_id, broadcast=True)

    if game_state["players"][1]["ready"] and game_state["players"][2]["ready"]:
        if not game_state["awaiting_ai_level"]:
            request_ai_level_from_player_one()


@socketio.on('select_ai_level')
def on_select_ai_level(payload):
    player_id = SID_TO_PLAYER.get(request.sid)
    if player_id != 1:
        return
    if round_active():
        return
    if not (game_state["players"][1]["ready"] and game_state["players"][2]["ready"]):
        return

    normalized_level = normalize_ai_level(payload.get("level", DEFAULT_AI_LEVEL))
    start_round(round_duration_for_level(normalized_level), ai_level=normalized_level)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)


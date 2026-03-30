import os
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from back.game_state import (
    game_state, SID_TO_PLAYER, PLAYER_TO_SID,
    round_active, request_epochs_from_player_one,
    emit_ready_state, start_round, round_payload, predict_from_points
)
from back.model_utils import get_available_epochs, normalize_epochs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONT_DIR = os.path.join(PROJECT_ROOT, "front")

ROUND_SECONDS = 12


def round_duration_seconds():
    return int(ROUND_SECONDS)


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
    return jsonify({
        "availableEpochs": get_available_epochs(),
        "roundSeconds": round_duration_seconds(),
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
        game_state["awaiting_epochs"] = False
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
        game_state["awaiting_epochs"] = False
    emit_ready_state(player_id, broadcast=True)

    if game_state["players"][1]["ready"] and game_state["players"][2]["ready"]:
        if not game_state["awaiting_epochs"]:
            request_epochs_from_player_one()


@socketio.on('select_n_epochs')
def on_select_n_epochs(payload):
    player_id = SID_TO_PLAYER.get(request.sid)
    if player_id != 1:
        return
    if round_active():
        return
    if not (game_state["players"][1]["ready"] and game_state["players"][2]["ready"]):
        return

    selected_epochs = normalize_epochs(payload.get("n_epochs"))
    available_epochs = set(get_available_epochs())
    if selected_epochs is None or selected_epochs not in available_epochs:
        emit('model_selection_error', {
            "message": "Selected epoch model is unavailable.",
            "availableEpochs": sorted(available_epochs),
        }, to=request.sid)
        game_state["awaiting_epochs"] = False
        return

    start_round(round_duration_seconds(), n_epochs=selected_epochs)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)


const VIRTUAL_CANVAS_SIZE = 900;

const socketP1 = io({ transports: ["websocket", "polling"] });
const socketP2 = io({ transports: ["websocket", "polling"] });

const timerEl = document.getElementById("timer");
const categoryEl = document.getElementById("category");

let roundEndMs = null;
let inGame = false;
let waitingForLevelSelection = false;

function makePlayerController(playerId, socket, canvasId, buttonIds) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  return {
    playerId,
    socket,
    canvas,
    ctx,
    readyBtn: document.getElementById(buttonIds.ready),
    clearBtn: document.getElementById(buttonIds.clear),
    undoBtn: document.getElementById(buttonIds.undo),
    sendBtn: document.getElementById(buttonIds.send),
    statusEl: document.getElementById(`p${playerId}-status`),
    predEl: document.getElementById(`pred-${playerId}`),
    connected: false,
    ready: false,
    strokes: [],
    currentStroke: [],
    drawing: false,
    predictDebounce: null,
  };
}

const players = {
  1: makePlayerController(1, socketP1, "canvas-1", {
    ready: "ready-btn-1",
    clear: "clear-btn-1",
    undo: "undo-btn-1",
    send: "send-btn-1",
  }),
  2: makePlayerController(2, socketP2, "canvas-2", {
    ready: "ready-btn-2",
    clear: "clear-btn-2",
    undo: "undo-btn-2",
    send: "send-btn-2",
  }),
};

function refreshPlayerStatus(playerId) {
  const p = players[playerId];
  if (!p || !p.statusEl) return;
  if (!p.connected) {
    p.statusEl.textContent = "Disconnected - Not Ready";
    return;
  }
  if (inGame) {
    p.statusEl.textContent = "Connected - In game";
    return;
  }
  p.statusEl.textContent = p.ready ? "Connected - Ready" : "Connected - Not Ready";
}

function refreshReadyButton(playerId) {
  const p = players[playerId];
  if (!p || !p.readyBtn) return;
  p.readyBtn.textContent = p.ready ? "Ready ✓" : "Ready";
  p.readyBtn.classList.toggle("secondary", !p.ready);
  const blockedByAiSelection = playerId === 1 && waitingForLevelSelection;
  p.readyBtn.disabled = inGame || blockedByAiSelection;
}

function setPrediction(playerId, top) {
  const p = players[playerId];
  if (!p || !p.predEl) return;
  p.predEl.innerHTML = "";
  if (!top || !top.length) {
    const li = document.createElement("li");
    li.textContent = "Draw to start predictions";
    p.predEl.appendChild(li);
    return;
  }
  top.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.category} (${(item.confidence * 100).toFixed(1)}%)`;
    p.predEl.appendChild(li);
  });
}

function getLogicalSize(p) {
  const dpr = window.devicePixelRatio || 1;
  return {
    width: p.canvas.width / dpr,
    height: p.canvas.height / dpr,
    dpr,
  };
}

function fitCanvasToDisplay(p) {
  const rect = p.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (!rect.width || !rect.height) return;
  p.canvas.width = Math.max(1, Math.round(rect.width * dpr));
  p.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  redrawAll(p);
}

function getPoint(p, event) {
  const rect = p.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return {
    nx: Math.min(1, Math.max(0, x)),
    ny: Math.min(1, Math.max(0, y)),
  };
}

function drawSegment(p, a, b) {
  const { width, height } = getLogicalSize(p);
  p.ctx.strokeStyle = "#111";
  p.ctx.lineWidth = 5;
  p.ctx.lineCap = "round";
  p.ctx.lineJoin = "round";
  p.ctx.beginPath();
  p.ctx.moveTo(a.nx * width, a.ny * height);
  p.ctx.lineTo(b.nx * width, b.ny * height);
  p.ctx.stroke();
}

function redrawAll(p) {
  const { width, height, dpr } = getLogicalSize(p);
  p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  p.ctx.clearRect(0, 0, width, height);
  for (const stroke of p.strokes) {
    for (let i = 1; i < stroke.length; i += 1) {
      drawSegment(p, stroke[i - 1], stroke[i]);
    }
  }
  if (p.currentStroke.length > 1) {
    for (let i = 1; i < p.currentStroke.length; i += 1) {
      drawSegment(p, p.currentStroke[i - 1], p.currentStroke[i]);
    }
  }
}

function flattenPoints(p) {
  const all = [];
  for (const stroke of p.strokes) {
    stroke.forEach((pt, index) => {
      all.push({
        x: Math.round(pt.nx * VIRTUAL_CANVAS_SIZE),
        y: Math.round(pt.ny * VIRTUAL_CANVAS_SIZE),
        pen: index === stroke.length - 1 ? 1 : 0,
      });
    });
  }
  return all;
}

function pointsToStrokes(points) {
  const strokes = [];
  let current = [];
  points.forEach((pt) => {
    current.push({
      nx: Math.min(1, Math.max(0, (pt.x || 0) / VIRTUAL_CANVAS_SIZE)),
      ny: Math.min(1, Math.max(0, (pt.y || 0) / VIRTUAL_CANVAS_SIZE)),
    });
    if (pt.pen === 1) {
      strokes.push(current);
      current = [];
    }
  });
  if (current.length > 0) {
    strokes.push(current);
  }
  return strokes;
}

function sendDrawingUpdate(p, triggerPrediction = false) {
  const points = flattenPoints(p);
  p.socket.emit("player_state", { playerId: p.playerId, points });
  if (triggerPrediction && points.length > 4) {
    p.socket.emit("predict_request", { playerId: p.playerId, points });
  }
}

function schedulePrediction(p) {
  if (p.predictDebounce) clearTimeout(p.predictDebounce);
  p.predictDebounce = setTimeout(() => sendDrawingUpdate(p, true), 300);
}

function setReadyState(playerId, ready) {
  const p = players[playerId];
  if (!p) return;
  p.ready = Boolean(ready);
  refreshReadyButton(playerId);
  refreshPlayerStatus(playerId);
}

function clearPlayerDrawing(playerId, send = true) {
  const p = players[playerId];
  p.strokes = [];
  p.currentStroke = [];
  redrawAll(p);
  if (send) {
    sendDrawingUpdate(p, false);
  }
  setPrediction(playerId, []);
}

function bindCanvasEvents(playerId) {
  const p = players[playerId];
  p.canvas.addEventListener("pointerdown", (event) => {
    p.drawing = true;
    p.canvas.setPointerCapture(event.pointerId);
    p.currentStroke = [getPoint(p, event)];
    redrawAll(p);
  });

  p.canvas.addEventListener("pointermove", (event) => {
    if (!p.drawing) return;
    const point = getPoint(p, event);
    const prev = p.currentStroke[p.currentStroke.length - 1];
    p.currentStroke.push(point);
    if (prev) drawSegment(p, prev, point);
  });

  function endStroke() {
    if (!p.drawing) return;
    p.drawing = false;
    if (p.currentStroke.length > 0) {
      p.strokes.push(p.currentStroke);
      p.currentStroke = [];
      sendDrawingUpdate(p, false);
      schedulePrediction(p);
    }
    redrawAll(p);
  }

  p.canvas.addEventListener("pointerup", endStroke);
  p.canvas.addEventListener("pointercancel", endStroke);
  p.canvas.addEventListener("pointerleave", endStroke);
}

function bindButtonEvents(playerId) {
  const p = players[playerId];

  p.clearBtn.addEventListener("click", () => {
    clearPlayerDrawing(playerId, true);
  });

  p.undoBtn.addEventListener("click", () => {
    p.strokes.pop();
    redrawAll(p);
    sendDrawingUpdate(p, false);
    const points = flattenPoints(p);
    if (points.length > 0) {
      p.socket.emit("predict_request", { playerId: p.playerId, points });
    } else {
      setPrediction(playerId, []);
    }
  });

  p.sendBtn.addEventListener("click", () => {
    sendDrawingUpdate(p, true);
  });

  p.readyBtn.addEventListener("click", () => {
    const next = !p.ready;
    setReadyState(playerId, next);
    p.socket.emit("player_ready", { playerId, ready: next });
  });
}

function createAiLevelModal() {
  let modal = document.getElementById("ai-level-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "ai-level-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.4)";
  modal.style.display = "none";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "1000";
  modal.innerHTML = `
    <div style="background: #fff; padding: 32px 24px; border-radius: 12px; min-width: 260px; box-shadow: 0 2px 16px #0002; text-align: center;">
      <div style="font-size: 1.2em; margin-bottom: 18px;">Choose the AI level</div>
      <div id="ai-level-modal-buttons" style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showAiLevelButtons(levels, onSelect) {
  const modal = createAiLevelModal();
  const btnContainer = modal.querySelector("#ai-level-modal-buttons");
  btnContainer.innerHTML = "";
  levels.forEach((level) => {
    const btn = document.createElement("button");
    btn.textContent = level;
    btn.className = "ai-level-btn";
    btn.style.margin = "0 8px";
    btn.style.padding = "8px 20px";
    btn.style.fontSize = "1.1em";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      modal.style.display = "none";
      onSelect(level);
    };
    btnContainer.appendChild(btn);
  });
  modal.style.display = "flex";
}

socketP1.on("connect", () => {
  socketP1.emit("join_role", { role: "player", playerId: 1 });
});

socketP2.on("connect", () => {
  socketP2.emit("join_role", { role: "player", playerId: 2 });
});

socketP1.on("disconnect", () => {
  players[1].connected = false;
  players[1].ready = false;
  refreshReadyButton(1);
  refreshPlayerStatus(1);
});

socketP2.on("disconnect", () => {
  players[2].connected = false;
  players[2].ready = false;
  refreshReadyButton(2);
  refreshPlayerStatus(2);
});

// Shared game updates are handled from player 1 socket to avoid duplicate processing.
socketP1.on("player_presence", (payload) => {
  const p = players[payload.playerId];
  if (!p) return;
  p.connected = Boolean(payload.connected);
  if (!p.connected) {
    p.ready = false;
    refreshReadyButton(payload.playerId);
  }
  refreshPlayerStatus(payload.playerId);
});

socketP1.on("player_ready_update", (payload) => {
  if (!players[payload.playerId]) return;
  setReadyState(payload.playerId, payload.ready);
});

socketP1.on("player_drawing", (payload) => {
  const p = players[payload.playerId];
  if (!p) return;
  p.strokes = pointsToStrokes(payload.points || []);
  p.currentStroke = [];
  p.drawing = false;
  redrawAll(p);
});

socketP1.on("prediction_update", (payload) => {
  setPrediction(payload.playerId, payload.top || []);
});

socketP1.on("round_state", (payload) => {
  const levelText = payload.aiLevel ? ` | AI: ${payload.aiLevel}` : "";
  categoryEl.textContent = `Category: ${payload.category || "waiting..."}${levelText}`;
  if (payload.remainingSeconds != null) {
    timerEl.textContent = `${payload.remainingSeconds}s`;
  } else {
    timerEl.textContent = "Waiting";
  }

  roundEndMs = payload.roundEnd ? payload.roundEnd * 1000 : null;
  inGame = payload.remainingSeconds != null && payload.remainingSeconds > 0;
  if (inGame) {
    waitingForLevelSelection = false;
  }
  refreshReadyButton(1);
  refreshReadyButton(2);
  refreshPlayerStatus(1);
  refreshPlayerStatus(2);
});

socketP1.on("ai_level_required", (payload) => {
  waitingForLevelSelection = true;
  refreshReadyButton(1);
  const allowedLevels = Array.isArray(payload?.levels) && payload.levels.length
    ? payload.levels
    : ["Bad", "Good", "Expert"];
  showAiLevelButtons(allowedLevels, (selectedLevel) => {
    socketP1.emit("select_ai_level", { level: selectedLevel });
    waitingForLevelSelection = false;
    refreshReadyButton(1);
  });
});

setInterval(() => {
  if (!roundEndMs) {
    return;
  }
  const left = Math.max(0, Math.ceil((roundEndMs - Date.now()) / 1000));
  timerEl.textContent = `${left}s`;
  if (left === 0) {
    inGame = false;
    roundEndMs = null;
    refreshReadyButton(1);
    refreshReadyButton(2);
    refreshPlayerStatus(1);
    refreshPlayerStatus(2);
  }
}, 250);

bindCanvasEvents(1);
bindCanvasEvents(2);
bindButtonEvents(1);
bindButtonEvents(2);

window.addEventListener("resize", () => {
  fitCanvasToDisplay(players[1]);
  fitCanvasToDisplay(players[2]);
});

fitCanvasToDisplay(players[1]);
fitCanvasToDisplay(players[2]);
refreshReadyButton(1);
refreshReadyButton(2);
refreshPlayerStatus(1);
refreshPlayerStatus(2);

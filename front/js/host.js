const VIRTUAL_CANVAS_SIZE = 900;
const DEFAULT_READY_HINT = "Round starts after both players confirm Ready in the popup";

const urlLevel = new URLSearchParams(window.location.search).get("level");
const storedLevel = localStorage.getItem("selectedAiLevel");
let selectedAiLevel = urlLevel || storedLevel || "Good";
localStorage.setItem("selectedAiLevel", selectedAiLevel);

const socketP1 = io({ transports: ["websocket", "polling"] });
const socketP2 = io({ transports: ["websocket", "polling"] });

const timerEl = document.getElementById("timer");
const categoryEl = document.getElementById("category");
const aiLevelInfoEl = document.getElementById("ai-level-info");
const readyHintEl = document.getElementById("ready-hint");

if (aiLevelInfoEl) {
  aiLevelInfoEl.textContent = `AI Level: ${selectedAiLevel}`;
}
if (readyHintEl) {
  readyHintEl.textContent = DEFAULT_READY_HINT;
}

let roundEndMs = null;
let inGame = false;

function makePlayerController(playerId, socket, canvasId, buttonIds) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  return {
    playerId,
    socket,
    canvas,
    ctx,
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
    clear: "clear-btn-1",
    undo: "undo-btn-1",
    send: "send-btn-1",
  }),
  2: makePlayerController(2, socketP2, "canvas-2", {
    clear: "clear-btn-2",
    undo: "undo-btn-2",
    send: "send-btn-2",
  }),
};

const readyGateState = {
  acknowledged: { 1: false, 2: false },
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
}

function createReadyGateModal() {
  let modal = document.getElementById("ready-gate-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "ready-gate-modal";
  modal.className = "overlay-modal";
  modal.innerHTML = `
    <div class="overlay-card">
      <h2>Players Ready?</h2>
      <p class="overlay-text">Both players must tap Ready to start the round. Selected AI level: <strong>${selectedAiLevel}</strong>.</p>
      <div class="ready-grid">
        <button id="popup-ready-btn-1" class="overlay-btn secondary" type="button">Player 1 Ready</button>
        <button id="popup-ready-btn-2" class="overlay-btn secondary" type="button">Player 2 Ready</button>
      </div>
      <p class="overlay-text" id="ready-popup-hint">Waiting for both players...</p>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("popup-ready-btn-1").addEventListener("click", () => {
    toggleReadyGate(1);
  });
  document.getElementById("popup-ready-btn-2").addEventListener("click", () => {
    toggleReadyGate(2);
  });

  return modal;
}

function createEndRoundModal() {
  let modal = document.getElementById("end-round-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "end-round-modal";
  modal.className = "overlay-modal";
  modal.innerHTML = `
    <div class="overlay-card">
      <h2>Round Finished</h2>
      <p class="overlay-text">What do you want to do next?</p>
      <div class="ready-grid">
        <button id="play-again-btn" class="overlay-btn" type="button">Play again</button>
        <button id="home-page-btn" class="overlay-btn secondary" type="button">Home page</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("play-again-btn").addEventListener("click", () => {
    hideEndRoundModal();
    openReadyGate(true);
  });

  document.getElementById("home-page-btn").addEventListener("click", () => {
    window.location.href = "/";
  });

  return modal;
}

function hideEndRoundModal() {
  const modal = createEndRoundModal();
  modal.classList.remove("open");
}

function showEndRoundModal() {
  const modal = createEndRoundModal();
  modal.classList.add("open");
}

function refreshReadyGateButtons() {
  const btn1 = document.getElementById("popup-ready-btn-1");
  const btn2 = document.getElementById("popup-ready-btn-2");
  const hint = document.getElementById("ready-popup-hint");
  if (!btn1 || !btn2 || !hint) return;

  const p1Connected = players[1].connected;
  const p2Connected = players[2].connected;

  btn1.disabled = !p1Connected;
  btn2.disabled = !p2Connected;

  btn1.classList.toggle("active", readyGateState.acknowledged[1]);
  btn2.classList.toggle("active", readyGateState.acknowledged[2]);

  btn1.textContent = readyGateState.acknowledged[1] ? "Player 1 Ready ✓" : "Player 1 Ready";
  btn2.textContent = readyGateState.acknowledged[2] ? "Player 2 Ready ✓" : "Player 2 Ready";

  if (!p1Connected || !p2Connected) {
    hint.textContent = "Waiting for both player connections...";
    return;
  }
  if (readyGateState.acknowledged[1] && readyGateState.acknowledged[2]) {
    hint.textContent = "Starting round...";
    return;
  }
  hint.textContent = "Waiting for both players...";
}

function closeReadyGate() {
  const modal = createReadyGateModal();
  modal.classList.remove("open");
}

function openReadyGate(resetServerReady) {
  readyGateState.acknowledged[1] = false;
  readyGateState.acknowledged[2] = false;

  if (resetServerReady) {
    socketP1.emit("player_ready", { playerId: 1, ready: false });
    socketP2.emit("player_ready", { playerId: 2, ready: false });
    setReadyState(1, false);
    setReadyState(2, false);
  }

  const modal = createReadyGateModal();
  modal.classList.add("open");
  refreshReadyGateButtons();
}

function toggleReadyGate(playerId) {
  if (!players[playerId].connected || inGame) {
    return;
  }
  readyGateState.acknowledged[playerId] = !readyGateState.acknowledged[playerId];
  refreshReadyGateButtons();

  if (readyGateState.acknowledged[1] && readyGateState.acknowledged[2]) {
    socketP1.emit("player_ready", { playerId: 1, ready: true });
    socketP2.emit("player_ready", { playerId: 2, ready: true });
    setReadyState(1, true);
    setReadyState(2, true);
    closeReadyGate();
  }
}

function handleRoundFinished() {
  showEndRoundModal();
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
  refreshPlayerStatus(1);
  refreshReadyGateButtons();
});

socketP2.on("disconnect", () => {
  players[2].connected = false;
  players[2].ready = false;
  refreshPlayerStatus(2);
  refreshReadyGateButtons();
});

// Shared game updates are handled from player 1 socket to avoid duplicate processing.
socketP1.on("player_presence", (payload) => {
  const p = players[payload.playerId];
  if (!p) return;
  p.connected = Boolean(payload.connected);
  if (!p.connected) {
    p.ready = false;
  }
  refreshPlayerStatus(payload.playerId);
  refreshReadyGateButtons();
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
  const activeLevel = payload.aiLevel || selectedAiLevel;
  if (aiLevelInfoEl) {
    aiLevelInfoEl.textContent = `AI Level: ${activeLevel}`;
  }
  if (readyHintEl) {
    readyHintEl.textContent = payload.roundDurationSeconds
      ? `Round time: ${payload.roundDurationSeconds}s. ${DEFAULT_READY_HINT}`
      : DEFAULT_READY_HINT;
  }

  const levelText = payload.aiLevel ? ` | AI: ${payload.aiLevel}` : "";
  categoryEl.textContent = `Category: ${payload.category || "waiting..."}${levelText}`;
  if (payload.remainingSeconds != null) {
    timerEl.textContent = `${payload.remainingSeconds}s`;
  } else {
    timerEl.textContent = "Waiting";
  }

  const nextInGame = payload.remainingSeconds != null && payload.remainingSeconds > 0;
  if (inGame && !nextInGame) {
    handleRoundFinished();
  }

  roundEndMs = payload.roundEnd ? payload.roundEnd * 1000 : null;
  inGame = nextInGame;
  if (inGame) {
    readyGateState.acknowledged[1] = false;
    readyGateState.acknowledged[2] = false;
    closeReadyGate();
    hideEndRoundModal();
  }
  refreshPlayerStatus(1);
  refreshPlayerStatus(2);
  refreshReadyGateButtons();
});

socketP1.on("ai_level_required", (payload = {}) => {
  const serverLevels = Array.isArray(payload.levels) ? payload.levels : [];
  const defaultLevel = typeof payload.defaultLevel === "string" ? payload.defaultLevel : "Good";
  const chosenLevel = serverLevels.includes(selectedAiLevel) ? selectedAiLevel : defaultLevel;

  if (chosenLevel !== selectedAiLevel) {
    selectedAiLevel = chosenLevel;
    localStorage.setItem("selectedAiLevel", selectedAiLevel);
  }
  if (aiLevelInfoEl) {
    aiLevelInfoEl.textContent = `AI Level: ${selectedAiLevel}`;
  }
  const readyGateModal = document.getElementById("ready-gate-modal");
  if (readyGateModal) {
    const levelStrong = readyGateModal.querySelector("strong");
    if (levelStrong) {
      levelStrong.textContent = selectedAiLevel;
    }
  }

  socketP1.emit("select_ai_level", { level: selectedAiLevel });
});

setInterval(() => {
  if (!roundEndMs) {
    return;
  }
  const left = Math.max(0, Math.ceil((roundEndMs - Date.now()) / 1000));
  timerEl.textContent = `${left}s`;
  if (left === 0 && inGame) {
    inGame = false;
    roundEndMs = null;
    refreshPlayerStatus(1);
    refreshPlayerStatus(2);
    handleRoundFinished();
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
refreshPlayerStatus(1);
refreshPlayerStatus(2);

setTimeout(() => {
  if (!inGame) {
    openReadyGate(false);
  }
}, 150);

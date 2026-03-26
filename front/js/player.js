const VIRTUAL_CANVAS_SIZE = 900;
const pathParts = window.location.pathname.split("/").filter(Boolean);
const playerId = Number(pathParts[pathParts.length - 1]) || 1;

const socket = io({ transports: ["websocket", "polling"] });
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("network-status");
const categoryPill = document.getElementById("category-pill");
const predictionsEl = document.getElementById("predictions");
const timerText = document.getElementById("timer-text");
const playerTitle = document.getElementById("player-title");
const readyBtn = document.getElementById("ready-btn");

playerTitle.textContent = `Player ${playerId}`;

let strokes = [];
let currentStroke = [];
let drawing = false;
let predictDebounce = null;
let roundEndMs = null;
let isReady = false;
let inGame = false;
let waitingForLevelSelection = false;

function showDrawToStartPredictions() {
  predictionsEl.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = "Draw to start predictions";
  predictionsEl.appendChild(li);
}

function getLogicalSize() {
  const dpr = window.devicePixelRatio || 1;
  return {
    width: canvas.width / dpr,
    height: canvas.height / dpr,
    dpr,
  };
}

function fitCanvasToDisplay() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (!rect.width || !rect.height) return;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  redrawAll();
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return {
    nx: Math.min(1, Math.max(0, x)),
    ny: Math.min(1, Math.max(0, y)),
  };
}

function drawSegment(a, b) {
  const { width, height } = getLogicalSize();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.nx * width, a.ny * height);
  ctx.lineTo(b.nx * width, b.ny * height);
  ctx.stroke();
}

function redrawAll() {
  const { width, height, dpr } = getLogicalSize();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i += 1) {
      drawSegment(stroke[i - 1], stroke[i]);
    }
  }
  if (currentStroke.length > 1) {
    for (let i = 1; i < currentStroke.length; i += 1) {
      drawSegment(currentStroke[i - 1], currentStroke[i]);
    }
  }
}

function flattenPoints() {
  const all = [];
  for (const stroke of strokes) {
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

function sendDrawingUpdate(triggerPrediction = false) {
  const points = flattenPoints();
  socket.emit("player_state", { playerId, points });
  if (triggerPrediction && points.length > 4) {
    socket.emit("predict_request", { playerId, points });
  }
}

function schedulePrediction() {
  if (predictDebounce) clearTimeout(predictDebounce);
  predictDebounce = setTimeout(() => sendDrawingUpdate(true), 300);
}

function refreshReadyButton() {
  readyBtn.textContent = isReady ? "Ready ✓" : "Ready";
  readyBtn.classList.toggle("secondary", !isReady);
  readyBtn.disabled = inGame || waitingForLevelSelection;
}

function setReady(nextReady) {
  isReady = Boolean(nextReady);
  refreshReadyButton();
}

canvas.addEventListener("pointerdown", (event) => {
  drawing = true;
  canvas.setPointerCapture(event.pointerId);
  currentStroke = [getPoint(event)];
  redrawAll();
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing) return;
  const point = getPoint(event);
  const prev = currentStroke[currentStroke.length - 1];
  currentStroke.push(point);
  if (prev) drawSegment(prev, point);
});

function endStroke() {
  if (!drawing) return;
  drawing = false;
  if (currentStroke.length > 0) {
    strokes.push(currentStroke);
    currentStroke = [];
    sendDrawingUpdate(false);
    schedulePrediction();
  }
  redrawAll();
}

canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);
canvas.addEventListener("pointerleave", endStroke);

document.getElementById("clear-btn").addEventListener("click", () => {
  strokes = [];
  currentStroke = [];
  redrawAll();
  sendDrawingUpdate(false);
  showDrawToStartPredictions();
});

document.getElementById("undo-btn").addEventListener("click", () => {
  strokes.pop();
  redrawAll();
  sendDrawingUpdate(false);
  const points = flattenPoints();
  if (points.length > 0) {
    socket.emit("predict_request", { playerId, points });
  } else {
    showDrawToStartPredictions();
  }
});

document.getElementById("send-btn").addEventListener("click", () => {
  sendDrawingUpdate(true);
});

readyBtn.addEventListener("click", () => {
  const next = !isReady;
  setReady(next);
  socket.emit("player_ready", { playerId, ready: next });
});

socket.on("connect", () => {
  statusEl.textContent = `Connected (${socket.id})`;
  socket.emit("join_role", { role: "player", playerId });
});

socket.on("disconnect", () => {
  statusEl.textContent = "Disconnected. Reconnecting...";
  setReady(false);
  waitingForLevelSelection = false;
  refreshReadyButton();
});

socket.on("ai_level_required", (payload) => {
  if (playerId !== 1) {
    return;
  }

  waitingForLevelSelection = true;
  refreshReadyButton();

  const allowedLevels = Array.isArray(payload?.levels) && payload.levels.length
    ? payload.levels
    : ["Bad", "Good", "Expert"];
  const defaultLevel = allowedLevels.includes("Good") ? "Good" : allowedLevels[0];
  const promptText = `Choose AI level: ${allowedLevels.join(", ")}`;
  const answer = window.prompt(promptText, defaultLevel);

  let selectedLevel = defaultLevel;
  if (answer && answer.trim()) {
    const normalized = allowedLevels.find((item) => item.toLowerCase() === answer.trim().toLowerCase());
    if (normalized) {
      selectedLevel = normalized;
    }
  }

  socket.emit("select_ai_level", { level: selectedLevel });
  waitingForLevelSelection = false;
  refreshReadyButton();
});

socket.on("player_ready_update", (payload) => {
  if (payload.playerId !== playerId) return;
  setReady(payload.ready);
});

socket.on("round_state", (payload) => {
  const category = payload.category || "waiting...";
  categoryPill.textContent = `Category: ${category}`;
  inGame = payload.remainingSeconds != null && payload.remainingSeconds > 0;
  if (inGame) {
    setReady(false);
    waitingForLevelSelection = false;
  }
  if (payload.remainingSeconds != null) {
    timerText.textContent = `${payload.remainingSeconds}s left`;
  } else {
    timerText.textContent = "Not running";
  }
  roundEndMs = payload.roundEnd ? payload.roundEnd * 1000 : null;
  refreshReadyButton();
});

setInterval(() => {
  if (!roundEndMs) {
    return;
  }
  const left = Math.max(0, Math.ceil((roundEndMs - Date.now()) / 1000));
  timerText.textContent = `${left}s left`;
  if (left === 0) {
    inGame = false;
    roundEndMs = null;
    refreshReadyButton();
  }
}, 250);

socket.on("prediction_update", (payload) => {
  if (payload.playerId !== playerId) return;
  const top = payload.top || [];
  if (!top.length) {
    showDrawToStartPredictions();
    return;
  }
  predictionsEl.innerHTML = "";
  for (const row of top) {
    const li = document.createElement("li");
    const conf = `${(row.confidence * 100).toFixed(1)}%`;
    li.textContent = `${row.category} (${conf})`;
    predictionsEl.appendChild(li);
  }
});

window.addEventListener("resize", fitCanvasToDisplay);
fitCanvasToDisplay();
refreshReadyButton();

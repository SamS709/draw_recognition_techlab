const VIRTUAL_CANVAS_SIZE = 900;
const DEFAULT_READY_HINT = "La manche demarre apres confirmation Pret des deux joueurs dans la fenetre";

const CATEGORY_TRANSLATIONS_FR = {
  "The Eiffel Tower": "Tour Eiffel",
  "The Great Wall of China": "Grande Muraille de Chine",
  "The Mona Lisa": "Joconde",
  "animal migration": "migration animale",
  "aircraft carrier": "porte-avions",
  "alarm clock": "reveil",
  "baseball bat": "batte de baseball",
  "baseball": "balle de baseball",
  "birthday cake": "gateau d'anniversaire",
  "ceiling fan": "ventilateur de plafond",
  "cell phone": "telephone portable",
  "coffee cup": "tasse de cafe",
  "cruise ship": "bateau de croisiere",
  "diving board": "plongeoir",
  "fire hydrant": "borne incendie",
  "fire truck": "camion de pompiers",
  "firetruck": "camion de pompiers",
  "flip flops": "tongs",
  "floor lamp": "lampe sur pied",
  "flying saucer": "soucoupe volante",
  "frying pan": "poele",
  "garden hose": "tuyau d'arrosage",
  "golf club": "club de golf",
  "hot air balloon": "montgolfiere",
  "hot dog": "hot dog",
  "hot tub": "jacuzzi",
  "house plant": "plante d'interieur",
  "ice cream": "glace",
  "light bulb": "ampoule",
  "mailbox": "boite aux lettres",
  "paper clip": "trombone",
  "paint can": "pot de peinture",
  "palm tree": "palmier",
  "parachute": "parachute",
  "pickup truck": "pickup",
  "picture frame": "cadre photo",
  "police car": "voiture de police",
  "power outlet": "prise electrique",
  "remote control": "telecommande",
  "roller coaster": "montagnes russes",
  "school bus": "bus scolaire",
  "sea turtle": "tortue de mer",
  "sleeping bag": "sac de couchage",
  "snowman": "bonhomme de neige",
  "speedboat": "bateau rapide",
  "spider web": "toile d'araignee",
  "sports car": "voiture de sport",
  "streetlight": "lampadaire",
  "table lamp": "lampe de table",
  "tennis racquet": "raquette de tennis",
  "toilet paper": "papier toilette",
  "traffic light": "feu tricolore",
  "washing machine": "machine a laver",
  "wine bottle": "bouteille de vin",
  "wine glass": "verre a vin",
  "wristwatch": "montre",
  "airplane": "avion",
  "ambulance": "ambulance",
  "angel": "ange",
  "ant": "fourmi",
  "anvil": "enclume",
  "apple": "pomme",
  "arm": "bras",
  "asparagus": "asperge",
  "axe": "hache",
  "backpack": "sac a dos",
  "banana": "banane",
  "bandage": "bandage",
  "barn": "grange",
  "basket": "panier",
  "basketball": "basket-ball",
  "bat": "chauve-souris",
  "bathtub": "baignoire",
  "beach": "plage",
  "bear": "ours",
  "beard": "barbe",
  "bed": "lit",
  "bee": "abeille",
  "belt": "ceinture",
  "bench": "banc",
  "bicycle": "velo",
  "binoculars": "jumelles",
  "bird": "oiseau",
  "blackberry": "mure",
  "blueberry": "myrtille",
  "book": "livre",
  "boomerang": "boomerang",
  "bowtie": "noeud papillon",
  "bracelet": "bracelet",
  "brain": "cerveau",
  "bread": "pain",
  "bridge": "pont",
  "broccoli": "brocoli",
  "broom": "balai",
  "bucket": "seau",
  "bulldozer": "bulldozer",
  "bus": "bus",
  "bush": "buisson",
  "butterfly": "papillon",
  "cactus": "cactus",
  "cake": "gateau",
  "calculator": "calculatrice",
  "calendar": "calendrier",
  "camel": "chameau",
  "camera": "camera",
  "candle": "bougie",
  "cannon": "canon",
  "canoe": "canoe",
  "car": "voiture",
  "carrot": "carotte",
  "castle": "chateau",
  "cat": "chat",
  "cello": "violoncelle",
  "chair": "chaise",
  "chandelier": "lustre",
  "church": "eglise",
  "circle": "cercle",
  "clarinet": "clarinette",
  "clock": "horloge",
  "cloud": "nuage",
  "compass": "boussole",
  "computer": "ordinateur",
  "cookie": "biscuit",
  "cooler": "glaciere",
  "couch": "canape",
  "cow": "vache",
  "crab": "crabe",
  "crayon": "crayon",
  "crocodile": "crocodile",
  "crown": "couronne",
  "cup": "tasse",
  "diamond": "diamant",
  "dishwasher": "lave-vaisselle",
  "dog": "chien",
  "dolphin": "dauphin",
  "donut": "beignet",
  "door": "porte",
  "dragon": "dragon",
  "dresser": "commode",
  "drill": "perceuse",
  "drums": "batterie",
  "duck": "canard",
  "dumbbell": "haltere",
  "ear": "oreille",
  "elbow": "coude",
  "elephant": "elephant",
  "envelope": "enveloppe",
  "eraser": "gomme",
  "eye": "oeil",
  "eyeglasses": "lunettes",
  "face": "visage",
  "fan": "ventilateur",
  "feather": "plume",
  "fence": "cloture",
  "finger": "doigt",
  "fireplace": "cheminee",
  "fish": "poisson",
  "flamingo": "flamant rose",
  "flashlight": "lampe torche",
  "flower": "fleur",
  "foot": "pied",
  "fork": "fourchette",
  "frog": "grenouille",
  "garden": "jardin",
  "giraffe": "girafe",
  "grapes": "raisin",
  "grass": "herbe",
  "guitar": "guitare",
  "hamburger": "hamburger",
  "hammer": "marteau",
  "hand": "main",
  "harp": "harpe",
  "hat": "chapeau",
  "headphones": "casque audio",
  "hedgehog": "herisson",
  "helicopter": "helicoptere",
  "helmet": "casque",
  "hexagon": "hexagone",
  "horse": "cheval",
  "hospital": "hopital",
  "hourglass": "sablier",
  "house": "maison",
  "hurricane": "ouragan",
  "jacket": "veste",
  "jail": "prison",
  "kangaroo": "kangourou",
  "key": "cle",
  "keyboard": "clavier",
  "knee": "genou",
  "knife": "couteau",
  "ladder": "echelle",
  "lantern": "lanterne",
  "laptop": "ordinateur portable",
  "leaf": "feuille",
  "leg": "jambe",
  "lighter": "briquet",
  "lighthouse": "phare",
  "lightning": "eclair",
  "line": "ligne",
  "lion": "lion",
  "lipstick": "rouge a levres",
  "lobster": "homard",
  "lollipop": "sucette",
  "map": "carte",
  "marker": "marqueur",
  "matches": "allumettes",
  "megaphone": "megaphone",
  "mermaid": "sirene",
  "microphone": "microphone",
  "microwave": "micro-ondes",
  "monkey": "singe",
  "moon": "lune",
  "mosquito": "moustique",
  "motorbike": "moto",
  "mountain": "montagne",
  "mouse": "souris",
  "moustache": "moustache",
  "mouth": "bouche",
  "mug": "mug",
  "mushroom": "champignon",
  "nail": "clou",
  "necklace": "collier",
  "nose": "nez",
  "ocean": "ocean",
  "octagon": "octogone",
  "octopus": "pieuvre",
  "onion": "oignon",
  "oven": "four",
  "owl": "hibou",
  "panda": "panda",
  "pants": "pantalon",
  "parrot": "perroquet",
  "passport": "passeport",
  "peanut": "cacahuete",
  "pear": "poire",
  "peas": "petits pois",
  "pencil": "crayon a papier",
  "penguin": "pingouin",
  "piano": "piano",
  "pig": "cochon",
  "pillow": "oreiller",
  "pineapple": "ananas",
  "pizza": "pizza",
  "pliers": "pince",
  "pond": "etang",
  "pool": "piscine",
  "popsicle": "glace baton",
  "postcard": "carte postale",
  "potato": "pomme de terre",
  "purse": "sac a main",
  "rabbit": "lapin",
  "raccoon": "raton laveur",
  "radio": "radio",
  "rain": "pluie",
  "rainbow": "arc-en-ciel",
  "rake": "rateau",
  "rhinoceros": "rhinoceros",
  "rifle": "fusil",
  "river": "riviere",
  "rollerskates": "patins a roulettes",
  "sailboat": "voilier",
  "sandwich": "sandwich",
  "saw": "scie",
  "saxophone": "saxophone",
  "scissors": "ciseaux",
  "scorpion": "scorpion",
  "screwdriver": "tournevis",
  "shark": "requin",
  "sheep": "mouton",
  "shoe": "chaussure",
  "shorts": "short",
  "sink": "evier",
  "skateboard": "skateboard",
  "skull": "crane",
  "skyscraper": "gratte-ciel",
  "snail": "escargot",
  "snake": "serpent",
  "snorkel": "tuba",
  "snowflake": "flocon de neige",
  "soccer ball": "ballon de football",
  "sock": "chaussette",
  "spoon": "cuillere",
  "spreadsheet": "tableur",
  "square": "carre",
  "star": "etoile",
  "steak": "steak",
  "stereo": "chaine hifi",
  "stethoscope": "stethoscope",
  "stitches": "points de suture",
  "stop sign": "panneau stop",
  "stove": "cuisiniere",
  "strawberry": "fraise",
  "submarine": "sous-marin",
  "suitcase": "valise",
  "sun": "soleil",
  "swan": "cygne",
  "sweater": "pull",
  "swing set": "balancoire",
  "sword": "epee",
  "syringe": "seringue",
  "t-shirt": "t-shirt",
  "teapot": "theiere",
  "teddy-bear": "ours en peluche",
  "telephone": "telephone",
  "television": "television",
  "tent": "tente",
  "toaster": "grille-pain",
  "toe": "orteil",
  "toilet": "toilettes",
  "tooth": "dent",
  "toothbrush": "brosse a dents",
  "toothpaste": "dentifrice",
  "tornado": "tornade",
  "tractor": "tracteur",
  "train": "train",
  "tree": "arbre",
  "triangle": "triangle",
  "trombone": "trombone",
  "truck": "camion",
  "trumpet": "trompette",
  "umbrella": "parapluie",
  "underwear": "sous-vetements",
  "van": "fourgon",
  "vase": "vase",
  "violin": "violon",
  "watermelon": "pasteque",
  "wheel": "roue",
  "windmill": "moulin a vent",
  "yoga": "yoga",
  "zebra": "zebre"
};

function translateCategoryToFrench(category) {
  if (!category) {
    return "en attente...";
  }
  const raw = String(category).trim();
  const direct = CATEGORY_TRANSLATIONS_FR[raw] || CATEGORY_TRANSLATIONS_FR[raw.toLowerCase()];
  if (direct) {
    return direct;
  }
  return raw;
}

const urlEpochs = new URLSearchParams(window.location.search).get("n_epochs");
const storedEpochs = localStorage.getItem("selectedEpochs");
let selectedEpochs = urlEpochs || storedEpochs || "";
if (selectedEpochs) {
  localStorage.setItem("selectedEpochs", selectedEpochs);
}

const socketP1 = io({ transports: ["websocket", "polling"] });
const socketP2 = io({ transports: ["websocket", "polling"] });

const timerEl = document.getElementById("timer");
const categoryEl = document.getElementById("category");
const epochsInfoEl = document.getElementById("epochs-info");
const readyHintEl = document.getElementById("ready-hint");

if (epochsInfoEl) {
  epochsInfoEl.textContent = selectedEpochs
    ? `Epochs du modele : ${selectedEpochs}`
    : "Epochs du modele : non selectionne";
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
    p.statusEl.textContent = "Deconnecte - Pas pret";
    return;
  }
  if (inGame) {
    p.statusEl.textContent = "Connecte - En jeu";
    return;
  }
  p.statusEl.textContent = p.ready ? "Connecte - Pret" : "Connecte - Pas pret";
}

function setPrediction(playerId, top) {
  const p = players[playerId];
  if (!p || !p.predEl) return;
  p.predEl.innerHTML = "";
  if (!top || !top.length) {
    const li = document.createElement("li");
    li.textContent = "Dessinez pour commencer les predictions";
    p.predEl.appendChild(li);
    return;
  }
  top.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${translateCategoryToFrench(item.category)} (${(item.confidence * 100).toFixed(1)}%)`;
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
      <h2>Joueurs prets ?</h2>
      <p class="overlay-text">Les deux joueurs doivent valider Pret pour demarrer la manche. Epochs selectionnees : <strong>${selectedEpochs || "aucune"}</strong>.</p>
      <div class="ready-grid">
        <button id="popup-ready-btn-1" class="overlay-btn secondary" type="button">Joueur 1 Pret</button>
        <button id="popup-ready-btn-2" class="overlay-btn secondary" type="button">Joueur 2 Pret</button>
      </div>
      <p class="overlay-text" id="ready-popup-hint">En attente des deux joueurs...</p>
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
      <h2>Manche terminee</h2>
      <p class="overlay-text">Que voulez-vous faire ensuite ?</p>
      <div class="ready-grid">
        <button id="play-again-btn" class="overlay-btn" type="button">Rejouer</button>
        <button id="home-page-btn" class="overlay-btn secondary" type="button">Accueil</button>
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

  btn1.textContent = readyGateState.acknowledged[1] ? "Joueur 1 Pret ✓" : "Joueur 1 Pret";
  btn2.textContent = readyGateState.acknowledged[2] ? "Joueur 2 Pret ✓" : "Joueur 2 Pret";

  if (!p1Connected || !p2Connected) {
    hint.textContent = "En attente de la connexion des deux joueurs...";
    return;
  }
  if (readyGateState.acknowledged[1] && readyGateState.acknowledged[2]) {
    hint.textContent = "Demarrage de la manche...";
    return;
  }
  hint.textContent = "En attente des deux joueurs...";
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
  const activeEpochs = payload.nEpochs ?? selectedEpochs;
  if (epochsInfoEl) {
    epochsInfoEl.textContent = activeEpochs
      ? `Epochs du modele : ${activeEpochs}`
      : "Epochs du modele : non selectionne";
  }
  if (readyHintEl) {
    readyHintEl.textContent = payload.roundDurationSeconds
      ? `Duree de manche : ${payload.roundDurationSeconds}s. ${DEFAULT_READY_HINT}`
      : DEFAULT_READY_HINT;
  }

  const epochText = payload.nEpochs ? ` | Epochs: ${payload.nEpochs}` : "";
  categoryEl.textContent = `Categorie : ${translateCategoryToFrench(payload.category)}`;
  if (payload.remainingSeconds != null) {
    timerEl.textContent = `${payload.remainingSeconds}s`;
  } else {
    timerEl.textContent = "En attente";
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

socketP1.on("epoch_selection_required", (payload = {}) => {
  const availableEpochs = Array.isArray(payload.availableEpochs)
    ? payload.availableEpochs
      .map((v) => Number.parseInt(v, 10))
      .filter((v) => Number.isInteger(v))
    : [];

  const currentEpoch = Number.parseInt(selectedEpochs, 10);
  const hasValidCurrent = Number.isInteger(currentEpoch) && availableEpochs.includes(currentEpoch);
  if (!hasValidCurrent) {
    if (readyHintEl) {
      readyHintEl.textContent = "Aucune epoch valide selectionnee. Revenez a l'accueil et choisissez d'abord des epochs.";
    }
    socketP1.emit("player_ready", { playerId: 1, ready: false });
    socketP2.emit("player_ready", { playerId: 2, ready: false });
    setReadyState(1, false);
    setReadyState(2, false);
    openReadyGate(false);
    return;
  }

  selectedEpochs = String(currentEpoch);
  localStorage.setItem("selectedEpochs", selectedEpochs);
  if (epochsInfoEl) {
    epochsInfoEl.textContent = `Epochs du modele : ${selectedEpochs}`;
  }
  const readyGateModal = document.getElementById("ready-gate-modal");
  if (readyGateModal) {
    const levelStrong = readyGateModal.querySelector("strong");
    if (levelStrong) {
      levelStrong.textContent = selectedEpochs;
    }
  }

  socketP1.emit("select_n_epochs", { n_epochs: currentEpoch });
});

socketP1.on("model_selection_error", (payload = {}) => {
  const message = payload.message || "Le modele correspondant aux epochs selectionnees est indisponible.";
  if (readyHintEl) {
    readyHintEl.textContent = message;
  }
  openReadyGate(false);
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

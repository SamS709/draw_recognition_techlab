const stored = localStorage.getItem("selectedEpochs");
let selectedEpochs = stored || "";

let availableEpochs = [];
let roundSeconds = null;

const epochsSelect = document.getElementById("epochs-select");
const explainEl = document.getElementById("level-explain");
const startBtn = document.getElementById("start-game-btn");

function isValidEpochChoice(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && availableEpochs.includes(n);
}

function rebuildEpochOptions() {
  epochsSelect.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "";
  placeholderOption.selected = true;
  epochsSelect.appendChild(placeholderOption);

  availableEpochs.forEach((epochs) => {
    const option = document.createElement("option");
    option.value = String(epochs);
    option.textContent = String(epochs);
    epochsSelect.appendChild(option);
  });
}

function renderSelection() {
  const hasChoice = isValidEpochChoice(selectedEpochs);
  startBtn.disabled = !hasChoice;

  if (!availableEpochs.length) {
    explainEl.textContent = "Aucune paire de modeles entrainee par epochs n'a ete trouvee. Ajoutez les fichiers GRU_[n]_jit.pt et CNN_[n]_jit.pt dans python/ml/models.";
    return;
  }

  if (!hasChoice) {
    explainEl.textContent = "Faites defiler et choisissez un nombre d'epochs pour lancer la partie.";
    return;
  }

  const timingText = Number.isFinite(roundSeconds) && roundSeconds > 0
    ? ` Duree de manche : ${Math.round(roundSeconds)}s.`
    : "";
  explainEl.textContent = `Modele selectionne : ${selectedEpochs} epochs d'entrainement.${timingText}`;
}

async function loadGameConfig() {
  try {
    const response = await fetch("/game-config", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const config = await response.json();
    if (Array.isArray(config.availableEpochs)) {
      availableEpochs = config.availableEpochs
        .map((v) => Number.parseInt(v, 10))
        .filter((v) => Number.isInteger(v))
        .sort((a, b) => a - b);
    }
    roundSeconds = Number(config.roundSeconds);
  } catch (error) {
    console.warn("Impossible de charger /game-config.", error);
  }

  rebuildEpochOptions();

  if (!isValidEpochChoice(selectedEpochs)) {
    selectedEpochs = "";
  }
  epochsSelect.value = selectedEpochs;
  renderSelection();
}

epochsSelect.addEventListener("change", () => {
  selectedEpochs = epochsSelect.value;
  if (isValidEpochChoice(selectedEpochs)) {
    localStorage.setItem("selectedEpochs", selectedEpochs);
  } else {
    localStorage.removeItem("selectedEpochs");
  }
  renderSelection();
});

startBtn.addEventListener("click", () => {
  if (!isValidEpochChoice(selectedEpochs)) {
    renderSelection();
    return;
  }
  localStorage.setItem("selectedEpochs", selectedEpochs);
  window.location.href = `/host?n_epochs=${encodeURIComponent(selectedEpochs)}`;
});

loadGameConfig();

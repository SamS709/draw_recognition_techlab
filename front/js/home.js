const EXPLANATIONS = {
  Bad: "Bad: this AI was trained less and on less varied data. It often hesitates, and needs very clear shapes.",
  Good: "Good: this AI is balanced. It recognizes common drawings fairly quickly while still making occasional mistakes.",
  Expert: "Expert: this AI was trained a lot on a lot of data. It usually guesses faster and more accurately.",
};

const FALLBACK_LEVELS = ["Bad", "Good", "Expert"];
const FALLBACK_DEFAULT_LEVEL = "Good";

let allowedLevels = [...FALLBACK_LEVELS];
let defaultLevel = FALLBACK_DEFAULT_LEVEL;
let timerByLevel = {};

const stored = localStorage.getItem("selectedAiLevel");
let selectedLevel = stored || defaultLevel;

const cards = Array.from(document.querySelectorAll(".level-card"));
const explainEl = document.getElementById("level-explain");
const startBtn = document.getElementById("start-game-btn");

cards.forEach((card) => {
  const subtitleEl = card.querySelector("span");
  if (subtitleEl) {
    subtitleEl.dataset.baseText = subtitleEl.textContent;
  }
});

function levelIsAllowed(level) {
  return allowedLevels.includes(level);
}

function getRoundSeconds(level) {
  const value = Number(timerByLevel[level]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value);
}

function refreshCardSubtitles() {
  cards.forEach((card) => {
    const level = card.dataset.level;
    const subtitleEl = card.querySelector("span");
    if (!subtitleEl) return;

    const baseText = subtitleEl.dataset.baseText || subtitleEl.textContent || "";
    const roundSeconds = getRoundSeconds(level);
    subtitleEl.textContent = roundSeconds ? `${baseText} | ${roundSeconds}s round` : baseText;
  });
}

function renderSelection() {
  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.level === selectedLevel);
  });

  const roundSeconds = getRoundSeconds(selectedLevel);
  const timingText = roundSeconds ? ` Round timer for this level: ${roundSeconds}s.` : "";
  explainEl.textContent = `${EXPLANATIONS[selectedLevel] || EXPLANATIONS[defaultLevel] || ""}${timingText}`;
}

async function loadGameConfig() {
  try {
    const response = await fetch("/game-config", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const config = await response.json();

    if (Array.isArray(config.levels) && config.levels.length > 0) {
      const availableLevels = config.levels.filter((level) => cards.some((card) => card.dataset.level === level));
      if (availableLevels.length > 0) {
        allowedLevels = availableLevels;
      }
    }

    if (config.timerByLevel && typeof config.timerByLevel === "object") {
      timerByLevel = config.timerByLevel;
    }

    if (typeof config.defaultLevel === "string" && levelIsAllowed(config.defaultLevel)) {
      defaultLevel = config.defaultLevel;
    }
  } catch (error) {
    console.warn("Could not load /game-config, using fallback level config.", error);
  }

  if (!levelIsAllowed(selectedLevel)) {
    selectedLevel = defaultLevel;
  }
  localStorage.setItem("selectedAiLevel", selectedLevel);
  refreshCardSubtitles();
  renderSelection();
}

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const next = card.dataset.level;
    if (!levelIsAllowed(next)) {
      return;
    }
    selectedLevel = next;
    localStorage.setItem("selectedAiLevel", selectedLevel);
    renderSelection();
  });
});

startBtn.addEventListener("click", () => {
  if (!levelIsAllowed(selectedLevel)) {
    selectedLevel = defaultLevel;
  }
  localStorage.setItem("selectedAiLevel", selectedLevel);
  window.location.href = `/host?level=${encodeURIComponent(selectedLevel)}`;
});

loadGameConfig();

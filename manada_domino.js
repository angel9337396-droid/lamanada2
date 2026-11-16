"use strict";

const STORAGE_KEY = "manada-domino-state-v1";
const root = document.getElementById("app");
const toast = document.getElementById("toast");
const smallScoreReaction = document.getElementById("small-score-reaction");
const highScoreReaction = document.getElementById("high-score-reaction");
const highScoreVideo = highScoreReaction.querySelector("video");
const REACTION_CHANCE = 0.5;
const scoreBackgrounds = [
  { id: "score-bg-1", name: "Fondo 1", image: "fondos/marcador-fondo-1.webp", preview: "fondos/marcador-fondo-1-mini.webp" },
  { id: "score-bg-2", name: "Fondo 2", image: "fondos/marcador-fondo-2.webp", preview: "fondos/marcador-fondo-2-mini.webp" },
  { id: "score-bg-3", name: "Fondo 3", image: "fondos/marcador-fondo-3.webp", preview: "fondos/marcador-fondo-3-mini.webp" },
  { id: "score-bg-4", name: "Fondo 4", image: "fondos/marcador-fondo-4.webp", preview: "fondos/marcador-fondo-4-mini.webp" },
  { id: "score-bg-5", name: "Fondo 5", image: "fondos/marcador-fondo-5.webp", preview: "fondos/marcador-fondo-5-mini.webp" },
  { id: "score-bg-6", name: "Fondo 6", image: "fondos/marcador-fondo-6.webp", preview: "fondos/marcador-fondo-6-mini.webp" },
  { id: "score-bg-7", name: "Fondo 7", image: "fondos/marcador-fondo-7.webp", preview: "fondos/marcador-fondo-7-mini.webp" },
  { id: "score-bg-8", name: "Fondo 8", image: "fondos/marcador-fondo-8.webp", preview: "fondos/marcador-fondo-8-mini.webp" }
];
const initialState = {
  setup: { names: ["Equipo 1", "Equipo 2"], target: 150 },
  scoreBackground: "score-bg-1",
  game: null
};

let state = loadState();
let selectedTeam = 0;
let manualEntryOpen = false;
let backgroundPickerOpen = false;
let toastTimer;
const reactionTimers = new Map();
let videoReactionId = 0;

function isValidState(value) {
  if (!value || typeof value !== "object" || !value.setup || !Array.isArray(value.setup.names)) return false;
  if (value.setup.names.length !== 2 || !value.setup.names.every((name) => typeof name === "string")) return false;
  if (![150, 200].includes(value.setup.target)) return false;
  if (value.scoreBackground !== undefined && !scoreBackgrounds.some((background) => background.id === value.scoreBackground)) return false;
  if (value.game === null) return true;

  const game = value.game;
  return Boolean(
    game &&
    [150, 200].includes(game.target) &&
    Array.isArray(game.teams) &&
    game.teams.length === 2 &&
    game.teams.every((team) => team && typeof team.name === "string" && Number.isSafeInteger(team.score) && team.score >= 0) &&
    Array.isArray(game.history) &&
    game.history.every((entry) =>
      entry &&
      [0, 1].includes(entry.team) &&
      Number.isSafeInteger(entry.points) &&
      entry.points > 0 &&
      Number.isSafeInteger(entry.total) &&
      entry.total >= entry.points &&
      typeof entry.at === "string"
    ) &&
    (game.winner === null || [0, 1].includes(game.winner))
  );
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(initialState);
    const parsed = JSON.parse(saved);
    if (!isValidState(parsed)) throw new Error("El formato guardado no es válido.");
    if (parsed.scoreBackground === undefined) parsed.scoreBackground = initialState.scoreBackground;
    return parsed;
  } catch (error) {
    console.error("No se pudo restaurar la partida guardada:", error);
    setTimeout(() => showToast("No se pudo cargar la partida guardada. Se inició una nueva configuración."), 0);
    return structuredClone(initialState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("No se pudo guardar la partida:", error);
    showToast("No se pudo guardar en este navegador. Comprueba el espacio disponible.");
    return false;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function hideReaction(reaction) {
  clearTimeout(reactionTimers.get(reaction));
  reactionTimers.delete(reaction);
  reaction.hidden = true;
}

function hideReactions() {
  hideReaction(smallScoreReaction);
  videoReactionId++;
  hideReaction(highScoreReaction);
  highScoreVideo.pause();
}

function showReaction(reaction, duration = 3500) {
  hideReaction(reaction);
  const image = reaction.querySelector("img[data-src]");
  if (image && !image.hasAttribute("src")) image.src = image.dataset.src;
  reaction.hidden = false;
  reactionTimers.set(reaction, setTimeout(() => {
    hideReaction(reaction);
    if (reaction === highScoreReaction) highScoreVideo.pause();
  }, duration));
}

function showHighScoreReaction() {
  const reactionId = videoReactionId;
  highScoreVideo.currentTime = 0;
  highScoreVideo.play().then(() => {
    if (reactionId !== videoReactionId) return;
    showReaction(highScoreReaction, 2000);
  }).catch((error) => {
    if (reactionId !== videoReactionId) return;
    console.error("No se pudo reproducir el video de la mano:", error);
    showToast("No se pudo reproducir el video de la mano.");
  });
}

function header() {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="2.75" width="16" height="18.5" rx="4" stroke="currentColor" stroke-width="1.7"/>
            <path d="M5 12h14" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="9" cy="7.5" r="1" fill="currentColor"/><circle cx="15" cy="16.5" r="1" fill="currentColor"/>
            <circle cx="15" cy="7.5" r="1" fill="currentColor"/><circle cx="9" cy="16.5" r="1" fill="currentColor"/>
          </svg>
        </span>
        <span>Manada <span style="color:var(--mint)">Dominó</span></span>
      </div>
      <div class="setup-header-actions">
        <span class="team-index">MARCADOR DE PARTIDA</span>
        <button class="setup-settings-button" type="button" data-action="open-backgrounds" aria-label="Elegir fondo del marcador" title="Fondos del marcador">⚙</button>
      </div>
    </header>`;
}

function renderBackgroundPicker() {
  if (!backgroundPickerOpen) return "";
  return `
    <div class="background-picker-backdrop">
      <section class="background-picker" role="dialog" aria-modal="true" aria-labelledby="background-picker-title">
        <button class="dialog-close" type="button" data-action="close-backgrounds" aria-label="Cerrar">×</button>
        <p class="eyebrow">Personaliza el marcador</p>
        <h2 id="background-picker-title">Fondo de pantalla</h2>
        <p class="background-picker-description">Elige el fondo que se verá mientras anotan los puntos.</p>
        <div class="background-options" role="group" aria-label="Fondos disponibles">
          ${scoreBackgrounds.map((background, index) => `
            <button type="button" class="background-option" data-action="select-background" data-background="${background.id}" aria-pressed="${state.scoreBackground === background.id}">
              <img src="${background.preview}" alt="" loading="${index < 3 ? "eager" : "lazy"}">
              <span>${background.name}</span>
              <span class="background-check" aria-hidden="true">${state.scoreBackground === background.id ? "✓" : ""}</span>
            </button>`).join("")}
        </div>
      </section>
    </div>`;
}

function renderSetup() {
  const [first, second] = state.setup.names;
  root.innerHTML = `${header()}
    <section class="setup-layout" aria-labelledby="setup-title" ${backgroundPickerOpen ? "inert" : ""}>
      <div class="setup-copy">
        <h1 id="setup-title">ATIVO</h1>
        <p>A ver quién la prende.</p>
        <div class="domino-art" aria-hidden="true">
          <div class="tile"><span class="pips"><i class="pip"></i><i class="pip"></i><i class="pip"></i><i class="pip"></i></span></div>
          <div class="tile"><span class="pips"><i class="pip"></i><i class="pip"></i></span></div>
          <div class="tile"><span class="pips"><i class="pip"></i><i class="pip"></i><i class="pip"></i></span></div>
        </div>
      </div>
      <form class="setup-card" id="setup-form" novalidate>
        <div class="field">
          <label class="form-label" for="team-name-0">Nombre del Equipo 1</label>
          <input class="text-input" id="team-name-0" name="team-0" maxlength="24" autocomplete="off" value="${escapeHtml(first)}" placeholder="Equipo 1">
        </div>
        <div class="field">
          <label class="form-label" for="team-name-1">Nombre del Equipo 2</label>
          <input class="text-input" id="team-name-1" name="team-1" maxlength="24" autocomplete="off" value="${escapeHtml(second)}" placeholder="Equipo 2">
        </div>
        <p class="form-label target-label">Puntos para ganar</p>
        <div class="target-picker" role="group" aria-label="Objetivo de la partida">
          ${[150, 200].map((target) => `
            <button type="button" class="target-button" data-target="${target}" aria-pressed="${state.setup.target === target}">
              ${target} puntos
            </button>`).join("")}
        </div>
        <p class="form-error" id="setup-error" aria-live="polite"></p>
        <button class="primary-button" type="submit">Iniciar partida <span aria-hidden="true">→</span></button>
      </form>
    </section>
    ${renderBackgroundPicker()}`;
  if (backgroundPickerOpen) root.querySelector(".background-picker .dialog-close").focus();
}

function renderTeam(team, index, game) {
  const remaining = Math.max(0, game.target - team.score);
  const progress = Math.min(100, (team.score / game.target) * 100);
  return `
    <section class="score-team team-${index === 0 ? "one" : "two"}" id="team-card-${index}" aria-label="${escapeHtml(team.name)}: ${team.score} puntos">
      <div class="score-team-title">
        <h2 class="team-name" title="${escapeHtml(team.name)}">${escapeHtml(team.name)}</h2>
      </div>
      <p class="score-value" aria-live="polite">${team.score}<span>/${game.target}</span></p>
      <p class="score-caption">ACUMULADO</p>
      <div class="progress-track" role="progressbar" aria-label="Progreso de ${escapeHtml(team.name)}" aria-valuenow="${team.score}" aria-valuemin="0" aria-valuemax="${game.target}">
        <div class="progress-fill" style="--progress:${progress}%"></div>
      </div>
      <p class="remaining">${remaining === 0 ? "<strong>¡Meta alcanzada!</strong>" : `Faltan <strong>${remaining}</strong>`}</p>
    </section>`;
}

function renderRoundHistory(game) {
  if (game.history.length === 0) {
    return `<p class="rounds-empty">Los puntos de cada mano aparecerán aquí.</p>`;
  }

  const rows = game.history.map((entry, index) => `
    <li class="round-row">
      <span class="round-number">${index + 1}</span>
      ${game.teams.map((team, teamIndex) => {
        const points = entry.team === teamIndex ? entry.points : 0;
        return `
        <span class="round-cell ${teamIndex === 0 ? "round-one" : "round-two"}">
          <strong>${points}</strong>
          ${points > 0
            ? `<button type="button" class="remove-round" data-action="remove-round" data-index="${index}" aria-label="Eliminar mano ${index + 1}" ${game.winner !== null ? "disabled" : ""}>×</button>`
            : `<span class="remove-placeholder" aria-hidden="true"></span>`}
        </span>`;
      }).join("")}
    </li>`).join("");

  return `<ol class="rounds-list" aria-label="Puntos por mano">${rows}</ol>`;
}

function renderWinner(game) {
  if (game.winner === null) return "";
  const team = game.teams[game.winner];
  const color = game.winner === 0 ? "var(--mint)" : "var(--orange)";
  return `
    <div class="winner-backdrop" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <section class="winner-card" style="--winner-color:${color}">
        <img class="winner-photo" src="ganador-transparente.png" alt="">
        <div class="trophy" aria-hidden="true">🏆</div>
        <p class="eyebrow">Partida terminada</p>
        <h2 id="winner-title">¡La prendiste!!!</h2>
        <p class="winner-name">${escapeHtml(team.name)}</p>
        <p class="winner-score">${team.score} puntos · objetivo ${game.target}</p>
        <p class="winner-label">¡GANADOR!</p>
        <div class="winner-actions">
          <button class="primary-button" type="button" data-action="new-game">Nueva partida</button>
          <button class="secondary-button" type="button" data-action="home">Volver al inicio</button>
        </div>
        <button class="quiet-button winner-undo" type="button" data-action="undo">Deshacer última suma</button>
      </section>
    </div>`;
}

function renderGame() {
  const game = state.game;
  const background = scoreBackgrounds.find((option) => option.id === state.scoreBackground) || scoreBackgrounds[0];
  root.innerHTML = `<section class="score-app" style="--score-background-image:url('${background.image}')" aria-labelledby="game-title" ${game.winner !== null || manualEntryOpen ? "inert" : ""}>
      <header class="score-topbar">
        <div class="goal-chip"><strong>${game.target}</strong><span aria-hidden="true">🏁</span></div>
        <h1 id="game-title">DOMINÓ</h1>
        <div class="top-actions">
          <button class="round-action" type="button" data-action="home" aria-label="Volver al inicio" title="Inicio">⌂</button>
          <button class="round-action" type="button" data-action="reset" aria-label="Reiniciar partida" title="Reiniciar">⚙</button>
        </div>
      </header>
      <div class="scoreboard">
        ${game.teams.map((team, index) => renderTeam(team, index, game)).join("")}
      </div>
      <section class="rounds-section" aria-label="Lista de puntos anotados">
        <div class="rounds-heading">
          <span>MANO</span>
          <span>${escapeHtml(game.teams[0].name)}</span>
          <span>${escapeHtml(game.teams[1].name)}</span>
        </div>
        ${renderRoundHistory(game)}
      </section>
      <div class="score-bottom">
        <div class="quick-controls">
          ${game.teams.map((team, index) => `
            <button type="button" class="quick-add-button" data-action="quick-add" data-team="${index}" aria-label="Agregar 30 puntos a ${escapeHtml(team.name)}" ${game.winner !== null ? "disabled" : ""}>
              <span>+30</span><small>${escapeHtml(team.name)}</small>
            </button>`).join("")}
        </div>
        <div class="bottom-actions">
          <button class="manual-entry-button" type="button" data-action="open-manual" ${game.winner !== null ? "disabled" : ""}>
            <span aria-hidden="true">＋</span> Otros puntos
          </button>
          <button class="undo-button" type="button" data-action="undo" ${game.history.length === 0 ? "disabled" : ""}>
            <span aria-hidden="true">↶</span> Deshacer
          </button>
        </div>
      </div>
      <p class="game-footer">Se guarda automáticamente en este dispositivo</p>
    </section>
    ${manualEntryOpen && game.winner === null ? `
      <div class="manual-backdrop">
        <form class="manual-dialog" id="points-form" role="dialog" aria-modal="true" aria-labelledby="manual-title">
          <button class="dialog-close" type="button" data-action="close-manual" aria-label="Cerrar">×</button>
          <p class="eyebrow">Registro manual</p>
          <h2 id="manual-title">Anotar puntos</h2>
          <div class="field">
            <span class="form-label">¿Qué equipo ganó la mano?</span>
            <div class="team-choice" role="group" aria-label="Equipo ganador de la mano">
              ${game.teams.map((team, index) => `
                <button type="button" class="team-select" data-action="select-team" data-team="${index}" aria-pressed="${selectedTeam === index}">${escapeHtml(team.name)}</button>`).join("")}
            </div>
          </div>
          <div class="field">
            <label class="form-label" for="points-input">Puntos obtenidos</label>
            <input class="text-input points-input" id="points-input" name="points" type="number" inputmode="numeric" min="1" step="1" placeholder="Ej. 5" required>
          </div>
          <button class="primary-button submit-points" type="submit">Agregar puntos</button>
        </form>
      </div>` : ""}
    ${renderWinner(game)}`;
  if (manualEntryOpen && game.winner === null) {
    root.querySelector("#points-input").focus();
  }
}

function render() {
  if (state.game) renderGame();
  else renderSetup();
  if (state.game && state.game.winner !== null) {
    root.querySelector(".winner-card .primary-button").focus();
  }
}

function updateSetupNames() {
  const first = document.getElementById("team-name-0");
  const second = document.getElementById("team-name-1");
  if (!first || !second) return;
  state.setup.names = [first.value, second.value];
  saveState();
}

function beginGame() {
  const names = state.setup.names.map((name) => name.trim());
  const error = document.getElementById("setup-error");
  if (names.some((name) => name.length === 0)) {
    error.textContent = "Escribe un nombre para los dos equipos.";
    document.getElementById(names[0] ? "team-name-1" : "team-name-0").focus();
    return;
  }

  state.setup.names = names;
  state.game = {
    target: state.setup.target,
    teams: names.map((name) => ({ name, score: 0 })),
    history: [],
    winner: null
  };
  selectedTeam = 0;
  saveState();
  render();
}

function addPoints(teamIndex, points) {
  const game = state.game;
  if (!game || game.winner !== null) return;
  if (![0, 1].includes(teamIndex) || !Number.isSafeInteger(points) || points <= 0) {
    showToast("Ingresa una cantidad de puntos válida.");
    return;
  }

  const team = game.teams[teamIndex];
  team.score += points;
  if (!Number.isSafeInteger(team.score)) {
    team.score -= points;
    showToast("La puntuación excede el límite permitido.");
    return;
  }
  game.history.push({ team: teamIndex, points, total: team.score, at: new Date().toISOString() });
  if (team.score >= game.target) game.winner = teamIndex;
  saveState();
  render();
  const card = document.getElementById(`team-card-${teamIndex}`);
  if (card) card.classList.add("score-flash");
  hideReactions();
  if (points < 10 && Math.random() < REACTION_CHANCE) showReaction(smallScoreReaction);
  if (points > 60) showHighScoreReaction();
  const entries = card?.querySelector(".team-points-list");
  if (entries) entries.scrollTop = entries.scrollHeight;
}

function undoLast() {
  const game = state.game;
  if (!game || game.history.length === 0) return;
  hideReactions();
  const last = game.history.pop();
  game.teams[last.team].score -= last.points;
  game.winner = null;
  saveState();
  render();
  showToast(`Se deshizo la última suma de ${game.teams[last.team].name}.`);
}

function removeRound(index) {
  const game = state.game;
  if (!game || game.winner !== null || !Number.isInteger(index) || index < 0 || index >= game.history.length) return;
  hideReactions();
  const [entry] = game.history.splice(index, 1);
  game.teams[entry.team].score -= entry.points;
  saveState();
  render();
  showToast(`Se eliminó la mano ${index + 1} de ${game.teams[entry.team].name}.`);
}

function resetGame() {
  if (!state.game) return;
  const confirmed = window.confirm("¿Reiniciar la partida? Se borrarán el marcador y el historial actuales.");
  if (!confirmed) return;
  hideReactions();
  state.game = {
    target: state.game.target,
    teams: state.game.teams.map((team) => ({ name: team.name, score: 0 })),
    history: [],
    winner: null
  };
  selectedTeam = 0;
  saveState();
  render();
  showToast("Partida reiniciada.");
}

function returnHome() {
  if (!state.game) return;
  if (state.game.winner === null && !window.confirm("¿Volver al inicio? Se descartará la partida actual.")) return;
  hideReactions();
  state.setup = {
    names: state.game.teams.map((team) => team.name),
    target: state.game.target
  };
  state.game = null;
  saveState();
  render();
}

function startNewGame() {
  if (!state.game) return;
  hideReactions();
  state.setup = {
    names: state.game.teams.map((team) => team.name),
    target: state.game.target
  };
  state.game = {
    target: state.game.target,
    teams: state.game.teams.map((team) => ({ name: team.name, score: 0 })),
    history: [],
    winner: null
  };
  selectedTeam = 0;
  saveState();
  render();
  showToast("Nueva partida. ¡A jugar!");
}

root.addEventListener("input", (event) => {
  if (event.target.matches("#team-name-0, #team-name-1")) updateSetupNames();
});

root.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && backgroundPickerOpen) {
    backgroundPickerOpen = false;
    render();
  }
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;

  if (button.matches("[data-target]")) {
    state.setup.target = Number(button.dataset.target);
    saveState();
    renderSetup();
    return;
  }

  const action = button.dataset.action;
  if (action === "quick-add") addPoints(Number(button.dataset.team), 30);
  if (action === "open-backgrounds") {
    backgroundPickerOpen = true;
    render();
  }
  if (action === "close-backgrounds") {
    backgroundPickerOpen = false;
    render();
  }
  if (action === "select-background") {
    const selected = scoreBackgrounds.find((background) => background.id === button.dataset.background);
    if (!selected) return;
    state.scoreBackground = selected.id;
    saveState();
    backgroundPickerOpen = false;
    render();
    showToast(`Fondo del marcador: ${selected.name}.`);
  }
  if (action === "open-manual") {
    manualEntryOpen = true;
    render();
  }
  if (action === "close-manual") {
    manualEntryOpen = false;
    render();
  }
  if (action === "select-team") {
    selectedTeam = Number(button.dataset.team);
    root.querySelectorAll(".team-select").forEach((choice) => {
      choice.setAttribute("aria-pressed", String(Number(choice.dataset.team) === selectedTeam));
    });
  }
  if (action === "undo") undoLast();
  if (action === "remove-round") removeRound(Number(button.dataset.index));
  if (action === "reset") resetGame();
  if (action === "home") returnHome();
  if (action === "new-game") startNewGame();
});

root.addEventListener("submit", (event) => {
  if (event.target.id === "setup-form") {
    event.preventDefault();
    updateSetupNames();
    beginGame();
  }

  if (event.target.id === "points-form") {
    event.preventDefault();
    const input = document.getElementById("points-input");
    const points = Number(input.value);
    if (!Number.isSafeInteger(points) || points <= 0) {
      showToast("Ingresa un número entero de puntos mayor que cero.");
      input.focus();
      return;
    }
    manualEntryOpen = false;
    addPoints(selectedTeam, points);
  }
});

render();

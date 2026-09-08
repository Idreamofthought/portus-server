import { TITLE, initialState, startScene, scenes } from "./story.js";

const SAVE_KEY = "textgame:save:v1";

let state = loadState();

const titleEl = document.getElementById("tg-title");
const textEl = document.getElementById("tg-text");
const choicesEl = document.getElementById("tg-choices");
const restartBtn = document.getElementById("tg-restart");

titleEl.textContent = TITLE;
document.title = TITLE;

function loadState() {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt save */ }
  return { scene: startScene, data: structuredClone(initialState) };
}

function saveState() {
  try {
    sessionStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* storage unavailable -- game still works, just won't persist on reload */ }
}

function render() {
  const scene = scenes[state.scene];
  if (!scene) {
    textEl.textContent = `Story error: unknown scene "${state.scene}".`;
    choicesEl.innerHTML = "";
    return;
  }

  textEl.textContent = typeof scene.text === "function" ? scene.text(state.data) : scene.text;

  choicesEl.innerHTML = "";
  const available = (scene.choices || []).filter(c => !c.requires || c.requires(state.data));

  if (available.length === 0) {
    const p = document.createElement("p");
    p.className = "tg-end";
    p.textContent = "— The End —";
    choicesEl.appendChild(p);
    return;
  }

  available.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "tg-choice";
    btn.textContent = choice.label;
    btn.onclick = () => {
      if (choice.effect) choice.effect(state.data);
      state.scene = choice.next;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    choicesEl.appendChild(btn);
  });
}

restartBtn.onclick = () => {
  if (!confirm("Start over from the beginning?")) return;
  state = { scene: startScene, data: structuredClone(initialState) };
  saveState();
  render();
};

render();

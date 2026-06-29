// 👇 Base URL of your backend (no trailing path).
// Local dev:  http://localhost:8787
// Deployed:   https://studymate-backend.<your-subdomain>.workers.dev
const BACKEND_URL = "http://localhost:8787";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const outEl = $("out");
const creditsEl = $("credits");
const accountEl = $("account");
const saveBtn = $("save");
const decksListEl = $("decks-list");
const deckDetailEl = $("deck-detail");
const decksStatusEl = $("decks-status");

let lastResult = null; // the most recent generation, for "Save as deck"

const setStatus = (m) => (statusEl.textContent = m || "");
const setDecksStatus = (m) => (decksStatusEl.textContent = m || "");
const setCredits = (n) => {
  if (typeof n === "number") creditsEl.textContent = `${n} credits`;
};

// --- Identity ---

async function getClientId() {
  const { clientId } = await chrome.storage.local.get("clientId");
  if (clientId) return clientId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ clientId: id });
  return id;
}
async function getToken() {
  return (await chrome.storage.local.get("token")).token || null;
}
async function authHeaders() {
  const token = await getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return { "X-Client-Id": await getClientId() };
}
async function jsonHeaders() {
  return { "Content-Type": "application/json", ...(await authHeaders()) };
}

// --- Account ---

async function refreshMe() {
  try {
    const res = await fetch(`${BACKEND_URL}/me`, { method: "POST", headers: await authHeaders() });
    const data = await res.json();
    if (res.ok) {
      setCredits(data.creditsRemaining);
      renderAccount(data);
    }
  } catch {
    renderAccount({ signedIn: false });
  }
}

function renderAccount(data) {
  accountEl.innerHTML = "";

  if (data.signedIn) {
    const bar = document.createElement("div");
    bar.className = "acct-bar";
    const who = document.createElement("span");
    who.textContent = data.email + (data.tier === "pro" ? " · Pro" : "");
    bar.appendChild(who);
    const right = document.createElement("span");
    if (data.tier !== "pro") {
      const up = document.createElement("button");
      up.className = "link";
      up.textContent = "Upgrade";
      up.onclick = upgrade;
      right.appendChild(up);
    }
    const out = document.createElement("button");
    out.className = "link";
    out.textContent = "Sign out";
    out.onclick = signOut;
    right.appendChild(out);
    bar.appendChild(right);
    accountEl.appendChild(bar);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "signin";
  const email = document.createElement("input");
  email.type = "email";
  email.placeholder = "you@email.com";
  const send = document.createElement("button");
  send.className = "link";
  send.textContent = "Sign in";
  const code = document.createElement("input");
  code.type = "text";
  code.placeholder = "6-digit code";
  code.maxLength = 6;
  code.classList.add("hidden");
  const verify = document.createElement("button");
  verify.className = "link hidden";
  verify.textContent = "Verify";

  send.onclick = async () => {
    if (!email.value.trim()) return setStatus("Enter your email.");
    setStatus("Sending code…");
    const res = await fetch(`${BACKEND_URL}/auth/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      code.classList.remove("hidden");
      verify.classList.remove("hidden");
      setStatus("Check your email for the code.");
    } else setStatus(data.error || "Could not send code.");
  };

  verify.onclick = async () => {
    setStatus("Verifying…");
    const res = await fetch(`${BACKEND_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value.trim(),
        code: code.value.trim(),
        clientId: await getClientId(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await chrome.storage.local.set({ token: data.token, email: data.email });
      setCredits(data.creditsRemaining);
      setStatus("Signed in.");
      refreshMe();
    } else setStatus(data.error || "Verification failed.");
  };

  wrap.append(email, send, code, verify);
  accountEl.appendChild(wrap);
}

async function upgrade() {
  setStatus("Opening checkout…");
  const res = await fetch(`${BACKEND_URL}/billing/checkout`, {
    method: "POST",
    headers: await jsonHeaders(),
    body: JSON.stringify({ plan: "pro" }),
  });
  const data = await res.json();
  if (res.ok && data.url) {
    chrome.tabs.create({ url: data.url });
    setStatus("");
  } else setStatus(data.error || "Checkout failed.");
}

async function signOut() {
  await chrome.storage.local.remove(["token", "email"]);
  setStatus("Signed out.");
  refreshMe();
}

// --- Generate ---

async function generate(payload) {
  setStatus("Thinking…");
  outEl.innerHTML = "";
  saveBtn.classList.add("hidden");
  try {
    const res = await fetch(`${BACKEND_URL}/generate`, {
      method: "POST",
      headers: await jsonHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.status === 402) {
      setCredits(data.creditsRemaining ?? 0);
      setStatus("Out of credits — they refresh next month, or upgrade above.");
      return;
    }
    if (res.status === 429) {
      setStatus(data.error || "Too many requests — give it a minute.");
      return;
    }
    if (!res.ok) throw new Error(data.error || "Request failed");

    setCredits(data.creditsRemaining);
    lastResult = data;
    render(data, outEl);
    saveBtn.classList.remove("hidden");
    setStatus("");
  } catch (e) {
    setStatus("Error: " + e.message);
  }
}

// Render {title, notes, quiz} into `target`, with reveal-able answers.
function render({ title, notes = [], quiz = [] }, target) {
  target.innerHTML = "";
  const frag = document.createDocumentFragment();

  if (title) {
    const t = document.createElement("h2");
    t.textContent = title;
    frag.appendChild(t);
  }

  const ul = document.createElement("ul");
  notes.forEach((n) => {
    const li = document.createElement("li");
    li.textContent = n;
    ul.appendChild(li);
  });
  frag.appendChild(ul);

  quiz.forEach((q, i) => {
    const d = document.createElement("div");
    d.className = "q";
    const qp = document.createElement("p");
    qp.innerHTML = `<strong>Q${i + 1}.</strong> `;
    qp.appendChild(document.createTextNode(q.question));
    d.appendChild(qp);
    const ans = document.createElement("p");
    ans.className = "answer hidden";
    ans.textContent = q.answer;
    const btn = document.createElement("button");
    btn.textContent = "Show answer";
    btn.onclick = () => ans.classList.toggle("hidden");
    d.append(btn, ans);
    frag.appendChild(d);
  });

  target.appendChild(frag);
}

saveBtn.onclick = async () => {
  if (!lastResult) return;
  setStatus("Saving…");
  const res = await fetch(`${BACKEND_URL}/decks/save`, {
    method: "POST",
    headers: await jsonHeaders(),
    body: JSON.stringify({
      title: lastResult.title,
      notes: lastResult.notes,
      quiz: lastResult.quiz,
    }),
  });
  const data = await res.json();
  if (res.ok) setStatus("Saved to Decks.");
  else setStatus(data.error || "Save failed.");
};

// --- Decks ---

async function loadDecks() {
  setDecksStatus("Loading…");
  decksListEl.innerHTML = "";
  deckDetailEl.innerHTML = "";
  deckDetailEl.classList.add("hidden");
  decksListEl.classList.remove("hidden");
  try {
    const res = await fetch(`${BACKEND_URL}/decks/list`, {
      method: "POST",
      headers: await authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    renderDeckList(data.decks || []);
    setDecksStatus(data.decks?.length ? "" : "No saved decks yet.");
  } catch (e) {
    setDecksStatus("Error: " + e.message);
  }
}

function renderDeckList(list) {
  decksListEl.innerHTML = "";
  list.forEach((d) => {
    const row = document.createElement("div");
    row.className = "deck-row";
    const open = document.createElement("button");
    open.className = "deck-open";
    open.textContent = d.title;
    open.onclick = () => openDeck(d.id);
    const del = document.createElement("button");
    del.className = "link";
    del.textContent = "Delete";
    del.onclick = () => removeDeck(d.id);
    row.append(open, del);
    decksListEl.appendChild(row);
  });
}

async function openDeck(id) {
  setDecksStatus("");
  const res = await fetch(`${BACKEND_URL}/decks/get`, {
    method: "POST",
    headers: await jsonHeaders(),
    body: JSON.stringify({ id }),
  });
  const deck = await res.json();
  if (!res.ok) return setDecksStatus(deck.error || "Could not open deck.");

  decksListEl.classList.add("hidden");
  deckDetailEl.classList.remove("hidden");
  deckDetailEl.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "detail-bar";
  const back = document.createElement("button");
  back.className = "link";
  back.textContent = "← Decks";
  back.onclick = loadDecks;
  const study = document.createElement("button");
  study.className = "link";
  study.textContent = "Study ▶";
  study.onclick = () => studyMode(deck);
  bar.append(back, study);

  const body = document.createElement("div");
  render(deck, body);

  deckDetailEl.append(bar, body);
}

async function removeDeck(id) {
  await fetch(`${BACKEND_URL}/decks/delete`, {
    method: "POST",
    headers: await jsonHeaders(),
    body: JSON.stringify({ id }),
  });
  loadDecks();
}

// Flashcard study: step through quiz cards, flip to reveal.
function studyMode(deck) {
  const quiz = deck.quiz || [];
  if (!quiz.length) return;
  let i = 0;

  deckDetailEl.innerHTML = "";
  const bar = document.createElement("div");
  bar.className = "detail-bar";
  const back = document.createElement("button");
  back.className = "link";
  back.textContent = "← Deck";
  back.onclick = () => openDeck(deck.id);
  const progress = document.createElement("span");
  progress.className = "muted-sm";
  bar.append(back, progress);

  const card = document.createElement("div");
  card.className = "card";
  const qEl = document.createElement("p");
  qEl.className = "card-q";
  const aEl = document.createElement("p");
  aEl.className = "answer hidden";
  card.append(qEl, aEl);

  const controls = document.createElement("div");
  controls.className = "row";
  const flip = document.createElement("button");
  flip.textContent = "Flip";
  const next = document.createElement("button");
  next.textContent = "Next";
  controls.append(flip, next);

  function show() {
    qEl.textContent = quiz[i].question;
    aEl.textContent = quiz[i].answer;
    aEl.classList.add("hidden");
    progress.textContent = `${i + 1} / ${quiz.length}`;
    next.textContent = i === quiz.length - 1 ? "Finish" : "Next";
  }
  flip.onclick = () => aEl.classList.toggle("hidden");
  next.onclick = () => {
    if (i === quiz.length - 1) return openDeck(deck.id);
    i += 1;
    show();
  };

  deckDetailEl.append(bar, card, controls);
  show();
}

// --- View switching ---

function showView(name) {
  const create = name === "create";
  $("create-view").classList.toggle("hidden", !create);
  $("decks-view").classList.toggle("hidden", create);
  $("nav-create").classList.toggle("active", create);
  $("nav-decks").classList.toggle("active", !create);
  if (!create) loadDecks();
}

// --- Wire up ---

$("nav-create").onclick = () => showView("create");
$("nav-decks").onclick = () => showView("decks");

$("gen").onclick = () => {
  const text = $("text").value.trim();
  if (!text) return setStatus("Paste some text first, or use a button above.");
  generate({ text });
};

$("shot").onclick = async () => {
  setStatus("Capturing…");
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
    generate({ image: { data: dataUrl.split(",")[1], mediaType: "image/png" } });
  } catch (e) {
    setStatus("Capture failed: " + e.message);
  }
};

$("yt").onclick = async () => {
  setStatus("Grabbing transcript…");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_TRANSCRIPT" });
    if (res && res.transcript) generate({ text: res.transcript });
    else setStatus("No transcript on screen. Open the video's transcript panel, then retry — or use Screenshot.");
  } catch {
    setStatus("Open a YouTube video tab first (then open its transcript panel).");
  }
};

refreshMe();

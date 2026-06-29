import { useEffect, useState } from "react";
import { api } from "./api.js";
import Result from "./Result.jsx";

export default function Decks() {
  const [list, setList] = useState([]);
  const [deck, setDeck] = useState(null);
  const [study, setStudy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("Loading…");
    setDeck(null);
    setStudy(false);
    const { ok, data } = await api.listDecks();
    if (ok) {
      setList(data.decks || []);
      setMsg((data.decks || []).length ? "" : "No saved decks yet.");
    } else setMsg(data.error || "Failed.");
  }

  useEffect(() => {
    load();
  }, []);

  async function open(id) {
    const { ok, data } = await api.getDeck(id);
    if (ok) {
      setDeck(data);
      setStudy(false);
    } else setMsg(data.error || "Failed.");
  }

  async function remove(id) {
    await api.deleteDeck(id);
    load();
  }

  if (deck && study) return <Study deck={deck} onBack={() => setStudy(false)} />;

  if (deck)
    return (
      <div>
        <div className="detail-bar">
          <button className="link" onClick={load}>
            ← Decks
          </button>
          <button className="link" onClick={() => setStudy(true)}>
            Study ▶
          </button>
        </div>
        <Result data={deck} />
      </div>
    );

  return (
    <div>
      {msg && <div className="status">{msg}</div>}
      {list.map((d) => (
        <div className="deck-row" key={d.id}>
          <button className="deck-open" onClick={() => open(d.id)}>
            {d.title}
          </button>
          <button className="link" onClick={() => remove(d.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

function Study({ deck, onBack }) {
  const quiz = deck.quiz || [];
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);

  if (!quiz.length)
    return (
      <div>
        <button className="link" onClick={onBack}>
          ← Deck
        </button>
        <p>No quiz in this deck.</p>
      </div>
    );

  const q = quiz[i];
  const last = i === quiz.length - 1;

  return (
    <div>
      <div className="detail-bar">
        <button className="link" onClick={onBack}>
          ← Deck
        </button>
        <span className="muted-sm">
          {i + 1} / {quiz.length}
        </span>
      </div>
      <div className="card">
        <p className="card-q">{q.question}</p>
        {show && <p className="answer">{q.answer}</p>}
      </div>
      <div className="row">
        <button onClick={() => setShow((s) => !s)}>Flip</button>
        <button
          onClick={() => {
            if (last) return onBack();
            setI(i + 1);
            setShow(false);
          }}
        >
          {last ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

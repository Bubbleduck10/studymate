import { useState } from "react";
import { api } from "./api.js";
import Result from "./Result.jsx";

export default function Create({ onCredits }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [drag, setDrag] = useState(false);

  async function run(payload) {
    setStatus("Thinking…");
    setResult(null);
    const { ok, status: s, data } = await api.generate(payload);
    if (s === 402) {
      onCredits(data.creditsRemaining ?? 0);
      setStatus("Out of credits — upgrade above, or wait for the monthly reset.");
      return;
    }
    if (s === 429) {
      setStatus(data.error || "Too many requests — give it a minute.");
      return;
    }
    if (!ok) {
      setStatus(data.error || "Failed.");
      return;
    }
    onCredits(data.creditsRemaining);
    setResult(data);
    setStatus("");
  }

  async function onFiles(files) {
    const file = files && files[0];
    if (!file) return;
    const b64 = await fileToB64(file);
    run({ image: { data: b64, mediaType: file.type || "image/png" } });
  }

  async function save() {
    if (!result) return;
    setStatus("Saving…");
    const { ok, data } = await api.saveDeck({
      title: result.title,
      notes: result.notes,
      quiz: result.quiz,
    });
    setStatus(ok ? "Saved to Decks." : data.error || "Save failed.");
  }

  return (
    <div>
      <div
        className={"dropzone" + (drag ? " drag" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        onPaste={(e) => {
          const files = [...e.clipboardData.files];
          if (files.length) onFiles(files);
        }}
      >
        Drop or paste a screenshot here, or{" "}
        <label className="link">
          choose a file
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…or paste a transcript / notes here"
      />

      <button
        className="primary"
        onClick={() => {
          const t = text.trim();
          if (!t) return setStatus("Paste some text or add a screenshot.");
          run({ text: t });
        }}
      >
        Generate notes &amp; quiz
      </button>

      <div className="status">{status}</div>
      {result && (
        <button className="link" onClick={save}>
          💾 Save as deck
        </button>
      )}
      {result && <Result data={result} />}
    </div>
  );
}

function fileToB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

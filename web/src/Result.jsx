import { useState } from "react";

// Presentational: renders {title, notes, quiz} with reveal-able answers.
export default function Result({ data }) {
  const { title, notes = [], quiz = [] } = data || {};
  return (
    <div className="result">
      {title && <h2>{title}</h2>}
      {notes.length > 0 && (
        <ul>
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {quiz.map((q, i) => (
        <QA key={i} q={q} idx={i} />
      ))}
    </div>
  );
}

function QA({ q, idx }) {
  const [show, setShow] = useState(false);
  return (
    <div className="q">
      <p>
        <strong>Q{idx + 1}.</strong> {q.question}
      </p>
      {show ? (
        <p className="answer">{q.answer}</p>
      ) : (
        <button className="link" onClick={() => setShow(true)}>
          Show answer
        </button>
      )}
    </div>
  );
}

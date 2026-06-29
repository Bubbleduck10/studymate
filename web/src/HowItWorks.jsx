const STEPS = [
  { n: "1", icon: "📥", title: "Capture", body: "Upload or paste a screenshot of whatever you're studying, or drop in a transcript / your notes." },
  { n: "2", icon: "⚡", title: "Generate", body: "NoteJet reads it and produces a tight set of notes plus a short quiz — in seconds." },
  { n: "3", icon: "🎴", title: "Review", body: "Save it as a deck and run through it in flashcard mode to lock the material in." },
];

const FAQ = [
  { q: "Do I need an account?", a: "No — you get 10 free credits a month right away. Sign in to keep your credits and save decks across devices." },
  { q: "What can I feed it?", a: "Screenshots (slides, PDFs, articles), pasted transcripts or notes, or a link — paste a YouTube video or article URL and we'll pull the transcript/text for you. (Video-only posts like X/TikTok need captions or pasted text.)" },
  { q: "Is my stuff private?", a: "Your material is only sent to generate your notes and quiz. We don't sell it or use it for ads." },
];

export default function HowItWorks({ go }) {
  return (
    <div className="container narrow">
      <h1 className="section-title reveal">How it works</h1>
      <p className="section-sub reveal" style={{ animationDelay: "0.05s" }}>
        Three steps from "I need to learn this" to "I've got it."
      </p>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div className="step reveal" style={{ animationDelay: `${0.1 + i * 0.1}s` }} key={s.n}>
            <div className="step-num">{s.n}</div>
            <div className="step-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title sm reveal">Questions</h2>
      <div className="faq">
        {FAQ.map((f, i) => (
          <details className="faq-item reveal" style={{ animationDelay: `${i * 0.06}s` }} key={i}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>

      <div className="center">
        <button className="btn primary lg" onClick={() => go("app")}>
          Try it now
        </button>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "📸", title: "Screenshot or paste", body: "Drop a screenshot of a slide, PDF, or article — or paste a transcript. Anything you're studying." },
  { icon: "📝", title: "Instant notes", body: "Claude distills it to the handful of points that actually matter. No fluff." },
  { icon: "🧩", title: "Auto quizzes", body: "Get a short quiz that tests understanding, so the material sticks." },
  { icon: "🎴", title: "Save & study", body: "Keep results as decks and review them in flashcard mode whenever." },
];

export default function Home({ go }) {
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-text">
          <span className="pill reveal">AI study buddy</span>
          <h1 className="hero-title reveal" style={{ animationDelay: "0.05s" }}>
            Turn anything you read into{" "}
            <span className="grad-text">notes &amp; quizzes</span>.
          </h1>
          <p className="hero-sub reveal" style={{ animationDelay: "0.12s" }}>
            Drop a screenshot or paste a transcript. NoteJet distills the key points and
            builds a quick quiz so you actually remember it.
          </p>
          <div className="hero-cta reveal" style={{ animationDelay: "0.19s" }}>
            <button className="btn primary lg pulse" onClick={() => go("app")}>
              Try it free
            </button>
            <button className="btn ghost lg" onClick={() => go("how")}>
              See how it works
            </button>
          </div>
          <p className="hero-note reveal" style={{ animationDelay: "0.26s" }}>
            10 free credits every month · no card required
          </p>
        </div>

        <div className="hero-art">
          <div className="float-card">
            <div className="fc-title">Photosynthesis</div>
            <ul className="fc-notes">
              <li>Light + CO₂ + water → glucose</li>
              <li>Happens in the chloroplasts</li>
              <li>Releases oxygen as a by-product</li>
            </ul>
            <div className="fc-q">
              <strong>Q.</strong> What gas does it release?
            </div>
          </div>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
        </div>
      </section>

      <section className="features">
        {FEATURES.map((f, i) => (
          <div className="feature reveal" style={{ animationDelay: `${0.1 + i * 0.08}s` }} key={i}>
            <div className="feat-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="cta-band reveal">
        <h2>Study smarter in seconds.</h2>
        <p>Free to start. Upgrade only when you want more.</p>
        <button className="btn primary lg" onClick={() => go("app")}>
          Get started
        </button>
      </section>
    </div>
  );
}

// Set this to the Chrome Web Store listing URL once the extension is approved,
// e.g. "https://chromewebstore.google.com/detail/<your-extension-id>".
// While empty, the page shows an "in review" state instead of a dead link.
const STORE_URL = "";

const FEATURES = [
  { icon: "📸", title: "Screenshot any tab", body: "Capture slides, PDFs, or an article and turn it into notes in one click." },
  { icon: "🎬", title: "YouTube transcripts", body: "Grab the transcript of the video you're watching and get notes + a quiz." },
  { icon: "🔄", title: "Syncs with your account", body: "Sign in once on the web — your credits and saved decks carry over automatically." },
];

export default function Extension({ go }) {
  return (
    <div className="container narrow">
      <h1 className="section-title reveal">NoteJet for Chrome</h1>
      <p className="section-sub reveal" style={{ animationDelay: "0.05s" }}>
        Study without leaving the page. The NoteJet browser extension turns whatever's on your
        screen — a lecture video, a slide, an article — into notes and a quick quiz.
      </p>

      <div className="center reveal" style={{ animationDelay: "0.1s" }}>
        {STORE_URL ? (
          <a className="btn primary lg" href={STORE_URL} target="_blank" rel="noreferrer">
            Add to Chrome — Free
          </a>
        ) : (
          <button className="btn primary lg" disabled>
            Coming soon to the Chrome Web Store
          </button>
        )}
        {!STORE_URL && (
          <p className="muted-sm" style={{ marginTop: 10 }}>
            The extension is in review — check back shortly, or use the web app in the meantime.
          </p>
        )}
      </div>

      <div className="steps" style={{ marginTop: 36 }}>
        {FEATURES.map((f, i) => (
          <div className="step reveal" style={{ animationDelay: `${0.15 + i * 0.1}s` }} key={f.title}>
            <div className="step-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>

      <div className="center" style={{ marginTop: 28 }}>
        <button className="btn ghost lg" onClick={() => go("app")}>
          Or try it on the web
        </button>
      </div>
    </div>
  );
}

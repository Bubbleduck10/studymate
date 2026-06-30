export default function Navbar({ view, go, account, onSignIn, onSignOut }) {
  const link = (id, label) => (
    <button className={"navlink" + (view === id ? " active" : "")} onClick={() => go(id)}>
      {label}
    </button>
  );

  return (
    <header className="nav">
      <div className="container nav-inner">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-mark">🧠</span> NoteJet
        </button>

        <nav className="nav-links">
          {link("home", "Home")}
          {link("how", "How it works")}
          {link("pricing", "Pricing")}
          {link("extension", "Extension")}
          {link("app", "Try it")}
        </nav>

        <div className="nav-account">
          {account.signedIn && account.creditsRemaining != null && (
            <span className="badge">{account.creditsRemaining} credits</span>
          )}
          {account.signedIn ? (
            <>
              <button
                className={"avatar" + (account.tier === "pro" ? " pro" : "")}
                onClick={() => go("profile")}
                title={`${account.username || account.email}${account.tier === "pro" ? " · Pro" : ""} — view profile`}
                aria-label="Profile"
              >
                {(account.username || account.email || "?").slice(0, 2).toUpperCase()}
              </button>
              <button className="btn ghost sm" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn primary sm" onClick={onSignIn}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

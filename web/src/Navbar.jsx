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
          <span className="brand-mark">🧠</span> StudyMate
        </button>

        <nav className="nav-links">
          {link("home", "Home")}
          {link("how", "How it works")}
          {link("pricing", "Pricing")}
          {link("app", "Try it")}
        </nav>

        <div className="nav-account">
          {account.creditsRemaining != null && (
            <span className="badge">{account.creditsRemaining} cr</span>
          )}
          {account.signedIn ? (
            <>
              <span className="acct-email">
                {account.email}
                {account.tier === "pro" ? " · Pro" : ""}
              </span>
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

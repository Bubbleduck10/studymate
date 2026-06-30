import { useEffect, useState } from "react";
import { api } from "./api.js";
import Navbar from "./Navbar.jsx";
import Home from "./Home.jsx";
import HowItWorks from "./HowItWorks.jsx";
import Pricing from "./Pricing.jsx";
import AppView from "./AppView.jsx";
import AuthModal from "./AuthModal.jsx";
import Terms from "./Terms.jsx";
import Privacy from "./Privacy.jsx";
import Profile from "./Profile.jsx";
import Extension from "./Extension.jsx";

export default function App() {
  const [account, setAccount] = useState({
    signedIn: false,
    email: null,
    tier: "free",
    creditsRemaining: null,
  });
  const [view, setView] = useState("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [banner, setBanner] = useState("");

  async function refresh() {
    const { ok, data } = await api.me();
    if (ok) setAccount(data);
  }
  const onCredits = (n) => setAccount((a) => ({ ...a, creditsRemaining: n }));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const c = params.get("checkout");
    if (c === "success") setBanner("🎉 Payment received — your credits have been added.");
    else if (c === "cancel") setBanner("Checkout canceled — no charge made.");
    if (c) setView("app");
    const go = params.get("go"); // e.g. extension deep-links ?go=pricing
    if (go) setView(go);
    if (params.get("signin")) setAuthOpen(true); // extension "Sign in on NoteJet"
    if (c || go || params.get("signin")) history.replaceState({}, "", location.pathname);
    refresh();
  }, []);

  const go = (v) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Navbar
        view={view}
        go={go}
        account={account}
        onSignIn={() => setAuthOpen(true)}
        onSignOut={() => {
          api.signOut();
          refresh();
        }}
      />

      {banner && (
        <div className="container">
          <div className="banner" onClick={() => setBanner("")}>
            {banner}
          </div>
        </div>
      )}

      <main key={view} className="view">
        {view === "home" && <Home go={go} />}
        {view === "how" && <HowItWorks go={go} />}
        {view === "pricing" && (
          <Pricing account={account} onSignIn={() => setAuthOpen(true)} />
        )}
        {view === "app" && <AppView onCredits={onCredits} />}
        {view === "terms" && <Terms />}
        {view === "privacy" && <Privacy />}
        {view === "profile" && <Profile account={account} go={go} />}
        {view === "extension" && <Extension go={go} />}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>🧠 NoteJet</span>
          <span className="footer-links">
            <button className="link" onClick={() => go("terms")}>Terms</button>
            <button className="link" onClick={() => go("privacy")}>Privacy</button>
          </span>
        </div>
      </footer>

      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onDone={() => { setAuthOpen(false); refresh(); }} />
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { api } from "./api.js";
import Account from "./Account.jsx";
import Create from "./Create.jsx";
import Decks from "./Decks.jsx";

export default function App() {
  const [account, setAccount] = useState({
    signedIn: false,
    email: null,
    tier: "free",
    creditsRemaining: null,
  });
  const [tab, setTab] = useState("create");
  const [banner, setBanner] = useState("");

  async function refresh() {
    const { ok, data } = await api.me();
    if (ok) setAccount(data);
  }
  const onCredits = (n) => setAccount((a) => ({ ...a, creditsRemaining: n }));

  useEffect(() => {
    const checkout = new URLSearchParams(location.search).get("checkout");
    if (checkout === "success") setBanner("Payment received — credits added.");
    else if (checkout === "cancel") setBanner("Checkout canceled.");
    if (checkout) history.replaceState({}, "", location.pathname);
    refresh();
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>StudyMate</h1>
        {account.creditsRemaining != null && (
          <span className="badge">{account.creditsRemaining} credits</span>
        )}
      </div>

      <Account account={account} refresh={refresh} />
      {banner && <div className="banner">{banner}</div>}

      <div className="nav">
        <button
          className={"navbtn" + (tab === "create" ? " active" : "")}
          onClick={() => setTab("create")}
        >
          Create
        </button>
        <button
          className={"navbtn" + (tab === "decks" ? " active" : "")}
          onClick={() => setTab("decks")}
        >
          Decks
        </button>
      </div>

      {tab === "create" ? <Create onCredits={onCredits} /> : <Decks />}
    </div>
  );
}

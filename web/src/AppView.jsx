import { useState } from "react";
import Create from "./Create.jsx";
import Decks from "./Decks.jsx";

export default function AppView({ onCredits }) {
  const [tab, setTab] = useState("create");
  return (
    <div className="container narrow">
      <h1 className="section-title reveal">Your study tool</h1>
      <div className="subnav reveal" style={{ animationDelay: "0.05s" }}>
        <button
          className={"subtab" + (tab === "create" ? " active" : "")}
          onClick={() => setTab("create")}
        >
          Create
        </button>
        <button
          className={"subtab" + (tab === "decks" ? " active" : "")}
          onClick={() => setTab("decks")}
        >
          Decks
        </button>
      </div>
      <div className="panel reveal" style={{ animationDelay: "0.1s" }}>
        {tab === "create" ? <Create onCredits={onCredits} /> : <Decks />}
      </div>
    </div>
  );
}

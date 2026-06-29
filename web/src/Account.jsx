import { useState } from "react";
import { api } from "./api.js";

export default function Account({ account, refresh }) {
  if (account.signedIn) {
    return (
      <div className="acct-bar">
        <span>
          {account.email}
          {account.tier === "pro" ? " · Pro" : ""}
        </span>
        <span>
          {account.tier !== "pro" && (
            <button className="link" onClick={upgrade}>
              Upgrade
            </button>
          )}
          <button
            className="link"
            onClick={() => {
              api.signOut();
              refresh();
            }}
          >
            Sign out
          </button>
        </span>
      </div>
    );
  }
  return <SignIn refresh={refresh} />;
}

async function upgrade() {
  const { ok, data } = await api.checkout("pro");
  if (ok && data.url) window.location.href = data.url;
  else alert(data.error || "Checkout failed");
}

function SignIn({ refresh }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    if (!email.trim()) return setMsg("Enter your email.");
    setMsg("Sending code…");
    const { ok, data } = await api.requestCode(email.trim());
    if (ok) {
      setSent(true);
      setMsg("Check your email for the code.");
    } else setMsg(data.error || "Could not send code.");
  }

  async function verify() {
    setMsg("Verifying…");
    const { ok, data } = await api.verifyCode(email.trim(), code.trim());
    if (ok) {
      api.setToken(data.token);
      refresh();
    } else setMsg(data.error || "Verification failed.");
  }

  return (
    <div className="signin">
      <input
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="link" onClick={send}>
        Sign in
      </button>
      {sent && (
        <>
          <input
            type="text"
            placeholder="6-digit code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="link" onClick={verify}>
            Verify
          </button>
        </>
      )}
      {msg && <span className="muted-sm">{msg}</span>}
    </div>
  );
}

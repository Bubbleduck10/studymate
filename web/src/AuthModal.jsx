import { useState } from "react";
import { api } from "./api.js";

export default function AuthModal({ onClose, onDone }) {
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
      setMsg("We emailed you a 6-digit code.");
    } else setMsg(data.error || "Could not send code.");
  }

  async function verify() {
    setMsg("Verifying…");
    const { ok, data } = await api.verifyCode(email.trim(), code.trim());
    if (ok) {
      api.setToken(data.token);
      onDone();
    } else setMsg(data.error || "Verification failed.");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="modal-title">Sign in to StudyMate</h2>
        <p className="modal-sub">No password — we'll email you a one-time code.</p>

        <input
          className="field"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {sent && (
          <input
            className="field"
            type="text"
            placeholder="6-digit code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}

        {!sent ? (
          <button className="btn primary full" onClick={send}>
            Email me a code
          </button>
        ) : (
          <button className="btn primary full" onClick={verify}>
            Verify &amp; sign in
          </button>
        )}

        {msg && <p className="modal-msg">{msg}</p>}
      </div>
    </div>
  );
}

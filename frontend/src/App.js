import { useEffect, useMemo, useRef, useState } from "react";

function App() {
  const textareaRef = useRef(null);

  const clientSessionId = useMemo(() => {
    const hasRandomUUID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
    if (hasRandomUUID) return crypto.randomUUID();
    return `client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }, []);

  const [sessionId, setSessionId] = useState(null);
  const [eventCount, setEventCount] = useState(0);
  const [keyTimingCount, setKeyTimingCount] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [lastPasteLength, setLastPasteLength] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const sessionPromiseRef = useRef(null);

  const lastKeyDownTsRef = useRef(null);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    sessionPromiseRef.current = (async () => {
      const resp = await fetch("https://vi-notes-8a36.onrender.com/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSessionId }),
      });
      if (!resp.ok) throw new Error(`Create session failed: ${resp.status}`);
      const data = await resp.json();
      setSessionId(data.sessionId);
      return data.sessionId;
    })();

    return sessionPromiseRef.current;
  };

  const sendEvent = async (payload) => {
    try {
      const activeSessionId = await ensureSession();
      // Fire-and-forget, but still awaited here so we can attach a minimal catch.
      await fetch(`https://vi-notes-8a36.onrender.com/api/sessions/${activeSessionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Telemetry failures should not break editing.
      console.error("Telemetry send failed:", err?.message || err);
    }
  };

  const pushRecentEvent = (text) => {
    const timeLabel = new Date().toLocaleTimeString();
    setRecentEvents((prev) => [`[${timeLabel}] ${text}`, ...prev].slice(0, 12));
  };

  useEffect(() => {
    // Pre-create the session so initial key presses aren't dropped.
    ensureSession().catch(() => { });
    return () => {
      // Allow GC to clean up in-flight promises; no special teardown required.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e) => {
    const ts = Date.now();
    const lastDown = lastKeyDownTsRef.current;
    const interKeyMs = lastDown == null ? null : ts - lastDown;
    lastKeyDownTsRef.current = ts;

    setEventCount((v) => v + 1);
    setKeyTimingCount((v) => v + 1);
    pushRecentEvent(
      interKeyMs == null ? "Key down captured (first key)" : `Key down captured (inter-key ${interKeyMs} ms)`
    );

    void sendEvent({
      type: "key",
      phase: "down",
      ts,
      interKeyMs,
      isRepeat: e.repeat ?? null,
    });
  };

  const handleKeyUp = (e) => {
    const downTs = lastKeyDownTsRef.current;
    if (downTs == null) return;

    const ts = Date.now();
    const holdMs = ts - downTs;

    setEventCount((v) => v + 1);
    setKeyTimingCount((v) => v + 1);
    pushRecentEvent(`Key up captured (hold ${holdMs} ms)`);

    void sendEvent({
      type: "key",
      phase: "up",
      ts,
      holdMs,
      isRepeat: e.repeat ?? null,
    });
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData("text") ?? "";
    const pasteLength = pastedText.length;
    const ts = Date.now();

    setEventCount((v) => v + 1);
    setPasteCount((v) => v + 1);
    setLastPasteLength(pasteLength);
    pushRecentEvent(`Paste detected (${pasteLength} characters)`);

    void sendEvent({
      type: "paste",
      ts,
      pasteLength,
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Vi-Notes Editor</h1>
      <textarea
        ref={textareaRef}
        rows="10"
        cols="50"
        placeholder="Start typing..."
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPaste={handlePaste}
      />
      <div style={{ marginTop: 10, fontSize: 13 }}>
        <strong>Live Activity</strong>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "15px", marginBottom: "15px", maxWidth: "580px" }}>
        {/* Card 1: Total Events */}
        <div style={{ flex: 1, padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#666" }}>Total Events</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#333", marginTop: "4px" }}>{eventCount}</div>
        </div>

        {/* Card 2: Keystroke Timings */}
        <div style={{ flex: 1, padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#666" }}>Keystrokes</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff", marginTop: "4px" }}>{keyTimingCount}</div>
        </div>

        {/* Card 3: Paste Events (Turns Red if Paste > 0) */}
        <div style={{ flex: 1, padding: "12px", background: pasteCount > 0 ? "#ffe8e8" : "#f8f9fa", border: "1px solid", borderColor: pasteCount > 0 ? "#ff4c4c" : "#ddd", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: pasteCount > 0 ? "#d90000" : "#666" }}>Paste Events</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: pasteCount > 0 ? "#d90000" : "#333", marginTop: "4px" }}>{pasteCount}</div>
        </div>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: pasteCount > 0 ? "#a83f00" : "#333" }}>
        {pasteCount > 0
          ? `Paste detected. Last pasted length: ${lastPasteLength} characters.`
          : "No paste detected yet."}
      </div>
      <div
        style={{
          marginTop: 8,
          border: "1px solid #000000",
          borderRadius: 6,
          padding: 8,
          maxWidth: 560,
          minHeight: 110,
          fontFamily: "monospace",
          fontSize: 12,
          background: "rgb(255, 255, 255)",
          overflow: "auto",
        }}
      >
        {recentEvents.length === 0 ? (
          <div>No events yet. Start typing or paste text to see detections.</div>
        ) : (
          recentEvents.map((entry, idx) => <div key={`${entry}-${idx}`}>{entry}</div>)
        )}
      </div>
      {sessionId ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Recording session: {sessionId}
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Starting session...</div>
      )}
    </div>
  );
}

export default App;
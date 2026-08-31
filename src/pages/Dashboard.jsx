import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useTracker } from "../lib/TrackerContext.jsx";
import { catStats, roadmapStats, overallStats, currentStreak, monthlyCounts } from "../lib/storage.js";
import { CATEGORIES, ROADMAP } from "../data/index.js";
import { slugify } from "../lib/slug.js";

function ProgressRing({ pct, size = 64, stroke = 7 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;
  const center = size / 2;
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle className="progress-ring-track" cx={center} cy={center} r={radius} strokeWidth={stroke} fill="none" />
      <circle
        className="progress-ring-fill"
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={stroke}
        fill="none"
        stroke="var(--accent)"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="progress-ring-text">
        {pct}%
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const { state, resetAll, importState } = useTracker();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const o = overallStats(state, CATEGORIES, ROADMAP);
  const streak = currentStreak(state);
  const mc = monthlyCounts(state);
  const months = Object.keys(mc).sort();
  const maxCount = months.length ? Math.max(...months.map((m) => mc[m])) : 0;

  const upNext = [];
  CATEGORIES.forEach((c) => {
    c.sections.forEach((sec) =>
      sec.items.forEach((i) => {
        const p = state.progress[i.id];
        if (!(p && p.done)) upNext.push({ ...i, cat: c.label, key: c.key, sectionSlug: slugify(sec.name) });
      })
    );
  });

  function exportProgress() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deepak-prep-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(JSON.parse(reader.result));
        alert("Progress imported.");
      } catch (err) {
        alert("Could not parse that file as valid progress JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="sub">Overall progress across all tracks and your 3/6/12-month roadmap from the career advancement plan.</p>
      </div>
      <div className="stat-grid">
        <div className="stat-card hero">
          <ProgressRing pct={o.pct} />
          <div className="hero-meta">
            <div className="lbl">Overall complete</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{o.done} of {o.total} items</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="num">{o.done}/{o.total}</div>
          <div className="lbl">Items done</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="num">{streak}</div>
          <div className="lbl">Day streak</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="num">{Object.keys(state.activityDays).length}</div>
          <div className="lbl">Active days total</div>
        </div>
      </div>

      <div className="dash-section-title">Progress by Track</div>
      {CATEGORIES.map((c) => {
        const s = catStats(state, c);
        return (
          <div className="cat-progress-row" key={c.key} onClick={() => navigate(`/track/${c.key}`)}>
            <span className="icon">{c.icon}</span>
            <span className="name">{c.label}</span>
            <div className="track">
              <div className="fill" style={{ width: `${s.pct}%`, background: c.color }} />
            </div>
            <span className="pct">{s.done}/{s.total} · {s.pct}%</span>
          </div>
        );
      })}
      <div className="cat-progress-row" onClick={() => navigate("/roadmap")}>
        <span className="icon">🗺️</span>
        <span className="name">My Roadmap</span>
        <div className="track">
          <div className="fill" style={{ width: `${roadmapStats(state, ROADMAP).pct}%`, background: "var(--purple)" }} />
        </div>
        <span className="pct">
          {roadmapStats(state, ROADMAP).done}/{roadmapStats(state, ROADMAP).total} · {roadmapStats(state, ROADMAP).pct}%
        </span>
      </div>

      <div className="dash-section-title">Progress Over Time</div>
      {months.length === 0 ? (
        <p className="empty-note">No dated completions yet — check off items and this will fill in as a month-by-month history.</p>
      ) : (
        <div className="month-chart">
          {months.map((m) => {
            const [y, mm] = m.split("-");
            const label = new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString([], { month: "short", year: "2-digit" });
            const pct = Math.round((mc[m] / maxCount) * 100);
            return (
              <div className="month-row" key={m}>
                <span className="mlabel">{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="mval">{mc[m]}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="dash-section-title">Up Next</div>
      <div className="upnext-list">
        {upNext.length === 0 ? (
          <div className="upnext-item">Everything is checked off. Time to add new goals or move to the roadmap tab.</div>
        ) : (
          upNext.slice(0, 6).map((i) => (
            <div className="upnext-item" key={i.id} onClick={() => navigate(`/track/${i.key}/${i.sectionSlug}`)} style={{ cursor: "pointer" }}>
              <span className="tag">{i.cat}</span>
              <span>{i.t}</span>
            </div>
          ))
        )}
      </div>

      <div className="export-row">
        <button className="btn primary" onClick={exportProgress}>
          Export progress (JSON)
        </button>
        <button className="btn" onClick={() => fileInputRef.current.click()}>
          Import progress
        </button>
        <button
          className="btn"
          onClick={() => {
            if (confirm("Reset all progress? This cannot be undone (export a backup first if unsure).")) resetAll();
          }}
        >
          Reset all progress
        </button>
        <input type="file" accept="application/json" ref={fileInputRef} style={{ display: "none" }} onChange={handleImportFile} />
      </div>
    </div>
  );
}

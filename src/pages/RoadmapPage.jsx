import { useTracker } from "../lib/TrackerContext.jsx";
import { roadmapStats } from "../lib/storage.js";
import { ROADMAP } from "../data/index.js";

export default function RoadmapPage() {
  const { state, toggleItem } = useTracker();
  const rm = roadmapStats(state, ROADMAP);

  return (
    <div>
      <div className="page-header">
        <h2>🗺️ My Roadmap</h2>
        <p className="sub">
          Pulled directly from your Career Advancement Plan document. This is scope-and-leadership work, not study material — the other tracks feed into it.
        </p>
        <div className="overall-bar-wrap">
          <div className="overall-bar-track">
            <div className="overall-bar-fill" style={{ width: `${rm.pct}%`, background: "var(--purple)" }} />
          </div>
          <div className="overall-bar-text">
            {rm.done}/{rm.total} · {rm.pct}%
          </div>
        </div>
      </div>

      {Object.entries(ROADMAP).map(([month, items]) => {
        const byTrack = {};
        items.forEach((i) => {
          (byTrack[i.track] = byTrack[i.track] || []).push(i);
        });
        return (
          <div className="roadmap-month" key={month}>
            <h3>{month}</h3>
            {Object.entries(byTrack).map(([track, its]) => (
              <div key={track}>
                <div className="roadmap-track-label">{track}</div>
                {its.map((i) => {
                  const done = !!(state.progress[i.id] && state.progress[i.id].done);
                  return (
                    <div className={`item-row ${done ? "done" : ""}`} key={i.id}>
                      <div className="item-head" style={{ cursor: "default" }}>
                        <input type="checkbox" checked={done} onChange={() => toggleItem(i.id)} />
                        <span className="item-title">{i.t}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

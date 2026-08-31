import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useTracker } from "../lib/TrackerContext.jsx";
import { catStats, isDone } from "../lib/storage.js";
import { CATEGORIES } from "../data/index.js";
import ItemRow from "../components/ItemRow.jsx";

export default function TrackPage() {
  const { key } = useParams();
  const { state } = useTracker();
  const [search, setSearch] = useState("");
  const cat = CATEGORIES.find((c) => c.key === key);

  if (!cat) return <Navigate to="/" replace />;

  const s = catStats(state, cat);

  return (
    <div>
      <div className="page-header">
        <h2>
          {cat.icon} {cat.label}
        </h2>
        <p className="sub">{cat.desc}</p>
        <div className="overall-bar-wrap">
          <div className="overall-bar-track">
            <div className="overall-bar-fill" style={{ width: `${s.pct}%`, background: cat.color }} />
          </div>
          <div className="overall-bar-text">
            {s.done}/{s.total} · {s.pct}%
          </div>
        </div>
      </div>

      <div className="search-row">
        <input type="text" placeholder="Filter items in this track..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="legend">
        <span>
          <span className="dot" style={{ background: "var(--green)" }} />
          Easy = quick refresher
        </span>
        <span>
          <span className="dot" style={{ background: "var(--yellow)" }} />
          Medium = needs real study time
        </span>
        <span>
          <span className="dot" style={{ background: "var(--red)" }} />
          Hard = deep-dive, plan a block of time
        </span>
      </div>

      {cat.sections.map((sec) => {
        const filtered = sec.items.filter((i) => i.t.toLowerCase().includes(search.toLowerCase()));
        if (filtered.length === 0) return null;
        const secDone = sec.items.filter((i) => isDone(state, i.id)).length;
        return (
          <div className="section-block" key={sec.name}>
            <h3>
              {sec.name} <span className="cnt">{secDone}/{sec.items.length}</span>
            </h3>
            {filtered.map((i) => (
              <ItemRow item={i} key={i.id} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

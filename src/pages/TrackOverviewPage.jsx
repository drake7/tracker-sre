import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useTracker } from "../lib/TrackerContext.jsx";
import { catStats, isDone } from "../lib/storage.js";
import { CATEGORIES } from "../data/index.js";
import { slugify } from "../lib/slug.js";
import ItemRow from "../components/ItemRow.jsx";

export default function TrackOverviewPage() {
  const { key } = useParams();
  const { state } = useTracker();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const cat = CATEGORIES.find((c) => c.key === key);

  if (!cat) return <Navigate to="/" replace />;

  const s = catStats(state, cat);
  const searching = search.trim().length > 0;

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
        <input
          type="text"
          placeholder={`Search all of ${cat.label}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!searching && (
        <div className="section-grid">
          {cat.sections.map((sec) => {
            const done = sec.items.filter((i) => isDone(state, i.id)).length;
            const pct = sec.items.length ? Math.round((done / sec.items.length) * 100) : 0;
            const slug = slugify(sec.name);
            return (
              <div className="section-card" key={sec.name} onClick={() => navigate(`/track/${cat.key}/${slug}`)}>
                <div className="section-card-title">{sec.name}</div>
                <div className="overall-bar-track" style={{ marginTop: 10 }}>
                  <div className="overall-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                </div>
                <div className="section-card-meta">
                  {done}/{sec.items.length} · {pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {searching && (
        <>
          <div className="legend">
            <span>
              <span className="dot" style={{ background: "var(--green)" }} />
              Easy
            </span>
            <span>
              <span className="dot" style={{ background: "var(--yellow)" }} />
              Medium
            </span>
            <span>
              <span className="dot" style={{ background: "var(--red)" }} />
              Hard
            </span>
          </div>
          {cat.sections.map((sec) => {
            const filtered = sec.items.filter((i) => i.t.toLowerCase().includes(search.toLowerCase()));
            if (filtered.length === 0) return null;
            return (
              <div className="section-block" key={sec.name}>
                <h3>{sec.name}</h3>
                {filtered.map((i) => (
                  <ItemRow item={i} key={i.id} />
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useTracker } from "../lib/TrackerContext.jsx";
import { isDone } from "../lib/storage.js";
import { CATEGORIES } from "../data/index.js";
import { slugify } from "../lib/slug.js";
import ItemRow from "../components/ItemRow.jsx";

export default function SectionPage() {
  const { key, sectionSlug } = useParams();
  const { state } = useTracker();
  const navigate = useNavigate();
  const cat = CATEGORIES.find((c) => c.key === key);
  if (!cat) return <Navigate to="/" replace />;

  const sectionIndex = cat.sections.findIndex((s) => slugify(s.name) === sectionSlug);
  if (sectionIndex === -1) return <Navigate to={`/track/${key}`} replace />;
  const sec = cat.sections[sectionIndex];
  const prev = cat.sections[sectionIndex - 1];
  const next = cat.sections[sectionIndex + 1];

  const done = sec.items.filter((i) => isDone(state, i.id)).length;
  const pct = sec.items.length ? Math.round((done / sec.items.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <Link to={`/track/${cat.key}`} className="back-link">
          ← {cat.icon} {cat.label}
        </Link>
        <h2 style={{ marginTop: 8 }}>{sec.name}</h2>
        <div className="overall-bar-wrap">
          <div className="overall-bar-track">
            <div className="overall-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
          </div>
          <div className="overall-bar-text">
            {done}/{sec.items.length} · {pct}%
          </div>
        </div>
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

      {sec.items.map((i) => (
        <ItemRow item={i} key={i.id} />
      ))}

      <div className="section-pager">
        {prev ? (
          <button className="btn" onClick={() => navigate(`/track/${cat.key}/${slugify(prev.name)}`)}>
            ← {prev.name}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button className="btn" onClick={() => navigate(`/track/${cat.key}/${slugify(next.name)}`)}>
            {next.name} →
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTracker } from "../lib/TrackerContext.jsx";
import Diagram from "./Diagram.jsx";
import CodeBlock from "./CodeBlock.jsx";

export default function ItemRow({ item }) {
  const { state, toggleItem, setNote } = useTracker();
  const [expanded, setExpanded] = useState(false);
  const done = !!(state.progress[item.id] && state.progress[item.id].done);
  const note = state.notes[item.id] || "";
  const hasBody = item.desc || item.url || item.res || item.notes;

  return (
    <div className={`item-row ${done ? "done" : ""}`} id={`row-${item.id}`}>
      <div className="item-head" onClick={() => hasBody && setExpanded((v) => !v)}>
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => {
            e.stopPropagation();
            toggleItem(item.id);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {item.notes && (
          <span className="notes-badge" title="Has a Deep Dive: explanation, code example, diagram, interview tricks">
            📘
          </span>
        )}
        <span className="item-title">{item.t}</span>
        <span className={`diff-badge diff-${item.d}`}>{item.d}</span>
        {hasBody && <span className={`chevron ${expanded ? "open" : ""}`}>▶</span>}
      </div>
      {expanded && hasBody && (
        <div className="item-body">
          {item.desc && <p>{item.desc}</p>}
          {item.url ? (
            <div className="res">
              🔗{" "}
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.res}
              </a>
            </div>
          ) : item.res ? (
            <div className="res">💡 {item.res}</div>
          ) : null}
          {item.notes && <DeepDive notes={item.notes} />}
          <textarea
            placeholder="Your notes..."
            defaultValue={note}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => setNote(item.id, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function DeepDive({ notes }) {
  return (
    <div className="deepdive">
      <div className="deepdive-title">📘 Deep Dive</div>
      {(notes.explain || []).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {(notes.code || []).map((ex, i) => (
        <CodeBlock example={ex} key={i} />
      ))}
      {notes.diagram && <Diagram d={notes.diagram} />}
      {notes.tricks && notes.tricks.length > 0 && (
        <>
          <div className="tricks-title">🎯 Interview Tricks &amp; Gotchas</div>
          <ul className="tricks-list">
            {notes.tricks.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

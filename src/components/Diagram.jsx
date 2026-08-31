export default function Diagram({ d }) {
  if (!d) return null;
  return (
    <div className="diagram-wrap">
      {d.type === "flow" && <FlowDiagram d={d} />}
      {d.type === "compare" && <CompareDiagram d={d} />}
      {d.type === "tree" && <TreeDiagram d={d} />}
      {d.caption && <div className="diagram-caption">{d.caption}</div>}
    </div>
  );
}

function FlowDiagram({ d }) {
  return (
    <div className="diagram diagram-flow">
      {d.steps.map((s, idx) => (
        <span key={idx} style={{ display: "contents" }}>
          <div className="flow-box">
            <div className="flow-box-label">{s.label}</div>
            {s.note && <div className="flow-box-note">{s.note}</div>}
          </div>
          {idx < d.steps.length - 1 && (
            <div className="flow-arrow">
              <span>→</span>
              {s.arrowLabel && <span className="arrow-label">{s.arrowLabel}</span>}
            </div>
          )}
        </span>
      ))}
    </div>
  );
}

function CompareDiagram({ d }) {
  return (
    <div className="diagram diagram-compare">
      {d.columns.map((col, idx) => (
        <div className={`compare-col ${idx === 0 ? "accent-a" : "accent-b"}`} key={idx}>
          <div className="compare-title">{col.title}</div>
          <ul>
            {col.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TreeNode({ n, depth }) {
  return (
    <>
      <div className="tree-node" style={{ marginLeft: depth * 22 }}>
        <span className="tree-dot" />
        {n.label}
      </div>
      {(n.children || []).map((c, i) => (
        <TreeNode n={c} depth={depth + 1} key={i} />
      ))}
    </>
  );
}

function TreeDiagram({ d }) {
  return (
    <div className="diagram diagram-tree">
      <div className="tree-node tree-root">
        <span className="tree-dot" />
        {d.root}
      </div>
      {(d.children || []).map((c, i) => (
        <TreeNode n={c} depth={1} key={i} />
      ))}
    </div>
  );
}

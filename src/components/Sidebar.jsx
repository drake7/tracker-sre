import { NavLink } from "react-router-dom";
import { useTracker } from "../lib/TrackerContext.jsx";
import { catStats, roadmapStats } from "../lib/storage.js";
import { CATEGORIES, ROADMAP } from "../data/index.js";

export default function Sidebar({ mobileOpen, onNavigate, onClose }) {
  const { state, fileHandle, needsReconnect, rememberedHandle, lastSavedAt, createSaveFile, loadSaveFile, reconnectSaveFile, FS_SUPPORTED } = useTracker();

  return (
    <div id="sidebar" className={mobileOpen ? "mobile-open" : ""}>
      <div className="brand">
        <div className="mark">ST</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1>Staff Track</h1>
            <button className="sidebar-close-btn" aria-label="Close menu" onClick={onClose}>✕</button>
          </div>
          <p>Deepak's Prep Tracker</p>
        </div>
      </div>
      <div id="nav" onClick={onNavigate}>
        <NavItem to="/" icon="📊" label="Dashboard" end />
        <div className="nav-section-title">Tracks</div>
        {CATEGORIES.map((c) => {
          const s = catStats(state, c);
          return <NavItem to={`/track/${c.key}`} icon={c.icon} label={c.label} pct={`${s.pct}%`} key={c.key} />;
        })}
        <div className="nav-section-title">Plan</div>
        <NavItem to="/roadmap" icon="🗺️" label="My Roadmap" pct={`${roadmapStats(state, ROADMAP).pct}%`} />
      </div>
      <div className="footer-note">
        {!FS_SUPPORTED && (
          <span className="fnote-txt">
            This browser can't auto-save to a file on disk. Progress is saved to browser storage on every change — export a backup regularly.
          </span>
        )}
        {FS_SUPPORTED && fileHandle && (
          <>
            <span className="fnote-txt">
              💾 Saving to <b>{fileHandle.name}</b>
              <br />
              Last saved {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}
            </span>
            <button className="fbtn connected" disabled>
              ✓ Connected
            </button>
          </>
        )}
        {FS_SUPPORTED && !fileHandle && needsReconnect && rememberedHandle && (
          <>
            <span className="fnote-txt">Save file connection needs to be re-approved after reload (browser security).</span>
            <button className="fbtn warn" onClick={reconnectSaveFile}>
              🔓 Reconnect {rememberedHandle.name || "save file"}
            </button>
          </>
        )}
        {FS_SUPPORTED && !fileHandle && !needsReconnect && (
          <>
            <span className="fnote-txt">Connect a save file so progress survives reloads and browser cleanup, independent of this browser's storage.</span>
            <button className="fbtn" onClick={createSaveFile}>
              🆕 Create save file
            </button>
            <button className="fbtn" onClick={loadSaveFile}>
              📂 Load existing save file
            </button>
          </>
        )}
        {FS_SUPPORTED && <span className="fnote-txt" style={{ marginTop: 6 }}>Also backed up to this browser's local storage automatically.</span>}
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, pct, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
      {pct && <span className="pct">{pct}</span>}
    </NavLink>
  );
}

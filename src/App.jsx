import { Suspense, lazy, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { TrackerProvider } from "./lib/TrackerContext.jsx";
import Sidebar from "./components/Sidebar.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const TrackOverviewPage = lazy(() => import("./pages/TrackOverviewPage.jsx"));
const SectionPage = lazy(() => import("./pages/SectionPage.jsx"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage.jsx"));

export default function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <TrackerProvider>
      <HashRouter>
        <button className="mobile-menu-btn" aria-label="Open menu" onClick={() => setMobileNavOpen(true)}>
          ☰
        </button>
        {mobileNavOpen && <div className="mobile-overlay" onClick={() => setMobileNavOpen(false)} />}
        <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} onClose={() => setMobileNavOpen(false)} />
        <div id="main">
          <Suspense fallback={<div className="page-loading">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/track/:key" element={<TrackOverviewPage />} />
              <Route path="/track/:key/:sectionSlug" element={<SectionPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
            </Routes>
          </Suspense>
        </div>
      </HashRouter>
    </TrackerProvider>
  );
}

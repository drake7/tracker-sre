// Build-time-only smoke test (not shipped). Renders every page component with
// ReactDOMServer to catch runtime errors that plain syntax checks can't see -
// hook misuse, undefined data access, bad component composition, etc.
import { renderToString } from "react-dom/server";
import { TrackerProvider } from "./src/lib/TrackerContext.jsx";
import Dashboard from "./src/pages/Dashboard.jsx";
import RoadmapPage from "./src/pages/RoadmapPage.jsx";
import TrackOverviewPage from "./src/pages/TrackOverviewPage.jsx";
import SectionPage from "./src/pages/SectionPage.jsx";
import { CATEGORIES } from "./src/data/index.js";
import { slugify } from "./src/lib/slug.js";
import { MemoryRouter, Routes, Route } from "react-router-dom";

function renderPage(path, element) {
  try {
    const html = renderToString(
      <TrackerProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/track/:key" element={<TrackOverviewPage />} />
            <Route path="/track/:key/:sectionSlug" element={<SectionPage />} />
          </Routes>
        </MemoryRouter>
      </TrackerProvider>
    );
    return { ok: true, length: html.length };
  } catch (e) {
    return { ok: false, error: e.stack || e.message };
  }
}

const results = {};
results["/ (Dashboard)"] = renderPage("/");
results["/roadmap"] = renderPage("/roadmap");
let sectionChecks = 0;
for (const cat of CATEGORIES) {
  results[`/track/${cat.key}`] = renderPage(`/track/${cat.key}`);
  for (const sec of cat.sections) {
    const slug = slugify(sec.name);
    results[`/track/${cat.key}/${slug}`] = renderPage(`/track/${cat.key}/${slug}`);
    sectionChecks++;
  }
}

console.log("SSR_SMOKE_RESULTS_START");
const failed = Object.entries(results).filter(([, r]) => !r.ok);
console.log(JSON.stringify({ totalRoutes: Object.keys(results).length, sectionChecks, failedCount: failed.length, failed }, null, 2));
console.log("SSR_SMOKE_RESULTS_END");

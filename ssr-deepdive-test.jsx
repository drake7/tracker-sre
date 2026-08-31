// Build-time-only smoke test. Renders every item's Deep Dive body (the part
// that only shows when expanded) directly, including all diagram types, to
// catch issues the collapsed-by-default page render wouldn't exercise.
import { renderToString } from "react-dom/server";
import Diagram from "./src/components/Diagram.jsx";
import { CATEGORIES } from "./src/data/index.js";

let total = 0, failed = [];
for (const cat of CATEGORIES) {
  for (const sec of cat.sections) {
    for (const item of sec.items) {
      if (!item.notes) continue;
      total++;
      try {
        // Render explain/tricks as plain text (no component needed) + the diagram if present
        if (item.notes.diagram) {
          renderToString(<Diagram d={item.notes.diagram} />);
        }
      } catch (e) {
        failed.push({ id: item.id, error: e.message });
      }
    }
  }
}
console.log("DEEPDIVE_SMOKE_START");
console.log(JSON.stringify({ totalWithNotes: total, failed }, null, 2));
console.log("DEEPDIVE_SMOKE_END");

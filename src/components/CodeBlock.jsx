import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-java";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-properties";

export default function CodeBlock({ example }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current);
  }, [example]);

  const lang = example.lang || "java";
  return (
    <div className="code-example">
      {example.caption && <div className="code-caption">{example.caption}</div>}
      <pre className={`language-${lang}`}>
        <code ref={ref} className={`language-${lang}`}>
          {example.src}
        </code>
      </pre>
    </div>
  );
}

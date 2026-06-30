function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function highlightJson(value: unknown): string {
  const str = JSON.stringify(value, null, 2);
  const escaped = escapeHtml(str);
  return escaped.replace(
    /(&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\&])*&quot;(\s*:)?|\b(true|false)\b|-?\d+(?:\.\d*)?)/g,
    (match) => {
      let cls = "json-num";
      if (/^&quot;/.test(match)) {
        cls = /:$/.test(match) ? "json-key" : "json-str";
      } else if (/true|false/.test(match)) {
        cls = "json-bool";
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

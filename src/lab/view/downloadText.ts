/**
 * downloadText.ts
 *
 * Hands text to the browser as a file download (CSV export).
 */

/** Triggers a browser download of `text` under `fileName`. */
export function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

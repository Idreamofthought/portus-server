// Repair known export artefacts when rendering a historical article. Original
// source files and their wording remain untouched for provenance.
function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function isMissingLocalScreenshot(source) {
  let decoded;
  try { decoded = decodeURIComponent(source); } catch { return false; }
  return /^\/(?:tmp\/moz-screenshot(?:-\d+)?\.jpg|docume~1\/[^?#]*\/temp\/moz-screenshot(?:-\d+)?\.jpg)$/i.test(decoded);
}

export function renderWritingArchive(html) {
  let output = html.replace(/<img\b[^>]*>/gi, tag => {
    const source = /\bsrc\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2];
    if (!source || !isMissingLocalScreenshot(source)) return tag;
    return '<span class="archive-image-note" role="note">[Original image unavailable in the archive.]</span>';
  });
  output = output.replace(/<a\b([^>]*?)\bhref\s*=\s*(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (tag, before, quote, href, after, content) => {
      if (!/^https?:\/\/(?:www\.)?blogger\.com\/blogger\.g\?blogID=\d+(?:&[^\s]*)?$/i.test(href)) return tag;
      const visible = content.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').trim();
      // Only restore an explicitly displayed web address. If the intended
      // destination is unknown, keep the words without an editor-only link.
      if (!/^https?:\/\/[^\s<>"']+$/i.test(visible)) return content;
      try {
        const target = new URL(visible);
        if (target.username || target.password) return content;
        return `<a${before}href="${escapeAttribute(visible)}"${after}>${content}</a>`;
      } catch { return content; }
    });
  return output;
}

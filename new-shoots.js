import fs from 'node:fs';
import path from 'node:path';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function publicationDate(html) {
  const meta = html.match(/<p[^>]*class="meta small-note"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const iso = meta.match(/datetime="(\d{4}-\d{2}-\d{2})"/)?.[1] || meta.match(/^\s*(\d{4}-\d{2}-\d{2})\b/)?.[1];
  if (iso) return iso;
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const date = meta.match(/^\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
  if (!date || !months.includes(date[2].toLowerCase())) return null;
  return `${date[3]}-${String(months.indexOf(date[2].toLowerCase()) + 1).padStart(2,'0')}-${date[1].padStart(2,'0')}`;
}
export function monthLater(date) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0,10);
}
export function recentShoots(items, today) {
  return items.filter(item => item.published && item.published <= today && today < monthLater(item.published)).sort((a,b) => b.published.localeCompare(a.published));
}
export function loadShootItems(leaves, root) {
  return [
    { title: 'The Hollow — Stories After Dark', category: 'Seasonal Sky · Horror collection', url: '/halloween/', published: '2026-10-04' },
    ...leaves.map(leaf => ({title:leaf.title, category:leaf.category, url:`/tree/leaves/${leaf.branch}/${encodeURIComponent(leaf.slug)}.html`, published:leaf.published || publicationDate(fs.readFileSync(path.join(root,'public',leaf.source),'utf8'))}))
  ];
}
export function renderShoots(items, today) {
  const recent = recentShoots(items,today);
  if (!recent.length) return '<p>The newest shoots have settled into their branches. Browse the leaves below.</p>';
  return recent.map(item => `<a class="shoot-card" href="${escape(item.url)}"><span class="shoot-branch">${escape(item.category)}</span><h3>${escape(item.title)}</h3><p class="shoot-excerpt">Published <time datetime="${item.published}">${item.published}</time> · In New Shoots until ${monthLater(item.published)}</p><span class="shoot-more">Read →</span></a>`).join('\n');
}

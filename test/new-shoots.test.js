import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationDate, monthLater, recentShoots, renderShoots} from '../new-shoots.js';
test('New Shoots expires after a calendar month, including short months',()=>{
 assert.equal(monthLater('2026-10-04'),'2026-11-04');
 assert.equal(monthLater('2026-01-31'),'2026-02-28');
 assert.equal(monthLater('2026-12-31'),'2027-01-31');
 const items=[{title:'Story',published:'2026-10-04',url:'/tree/leaves/short-stories/story.html',category:'Fiction'}];
 assert.equal(recentShoots(items,'2026-10-03').length,0);
 assert.equal(recentShoots(items,'2026-11-03').length,1);
 assert.equal(recentShoots(items,'2026-11-04').length,0);
 assert.match(renderShoots(items,'2026-10-04'),/\/tree\/leaves\/short-stories\/story.html/);
 assert.equal(items.length,1);
});
test('Use publication date rather than a subsequent update date',()=>{
 assert.equal(publicationDate('<p class="meta small-note">2 October 2026 · Updated 4 October 2026</p>'),'2026-10-02');
 assert.equal(publicationDate('<p class="meta small-note"><time datetime="2026-10-03">3 octobre 2026</time></p>'),'2026-10-03');
 assert.equal(publicationDate('<p class="meta small-note">2015-01-13 — Fiction</p>'),'2015-01-13');
});

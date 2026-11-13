/* بوابة "هل اشتركت في القناة؟" — تظهر مرة واحدة في الجلسة. */
import { YOUTUBE_URL, STORAGE } from '../config.js';
import { byId } from '../lib/dom.js';
import { session } from '../lib/storage.js';
import { activateModal } from '../lib/modal.js';

export function initYoutubeGate() {
  const gate = byId('ytGate'), root = document.documentElement;
  if (session.get(STORAGE.ytGate) === '1') return;
  gate.hidden = false;
  root.classList.add('yt-lock');
  const release = activateModal(gate, { dialog: gate, initialFocus: byId('ytYes'), opener: null });

  function close() {
    gate.hidden = true;
    release();
    root.classList.remove('yt-lock');
    session.set(STORAGE.ytGate, '1');
  }
  byId('ytYes').addEventListener('click', close);
  byId('ytNo').addEventListener('click', () => {
    let tab = null;
    try { tab = window.open(YOUTUBE_URL, '_blank'); if (tab) tab.opener = null; } catch (e) { /* محجوبة */ }
    if (!tab) { location.href = YOUTUBE_URL; return; }
    close();
  });
}

// Озвучка английских слов (speechSynthesis). Если браузер не умеет — кнопки не показываем.

import { h } from '../../js/ui.js';
import { lico } from './lic.js';

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

let voice = null;
function pickVoice() {
  if (!canSpeak) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  voice = voices.find((v) => v.lang === 'en-US' && /google|natural|samantha/i.test(v.name))
    || voices.find((v) => v.lang === 'en-US')
    || voices.find((v) => /^en/i.test(v.lang)) || null;
  return voice;
}
if (canSpeak) {
  try { window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice); } catch { /* старые браузеры */ }
}

export function speak(text, { rate = 0.85 } = {}) {
  if (!canSpeak || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US';
    u.rate = rate;
    const v = voice || pickVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch (e) {
    console.warn('speech', e);
  }
}

// Кнопка «послушать». Возвращает null, если озвучка недоступна.
export function speakBtn(text, { sm = true, label } = {}) {
  if (!canSpeak) return null;
  return h('button', {
    class: `icon-btn ${sm ? 'icon-btn--sm ' : ''}ln-speak`, type: 'button',
    'aria-label': label || `Послушать: ${text}`, title: 'Послушать',
    onclick: (e) => { e.stopPropagation(); speak(text); },
  }, lico('speaker'));
}

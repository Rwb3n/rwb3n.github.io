// Booking, with Cal.com (hosted). Decided in _model/target/funnel.md.
//
// Without JavaScript nothing here runs: step 1's form is a plain GET form to
// the Cal.com booking page, and "Show available times" is a plain link to it.
// With JavaScript:
//   - Cal.com's script loads only when the visitor acts (presses "Show
//     available times", or "Book the free call with these answers" in step 1),
//     never on page load.
//   - Both open Cal.com's inline embed in #book, with step 1's answers as
//     prefill (each name is a Cal.com booking question identifier).
//   - Focus moves to the "Book the free call" heading.
//   - One line says the times are loading. If the calendar is not ready
//     within the timeout, that line is replaced by a link to the Cal.com page
//     with the answers filled in.
// Nothing here says "sent" or "booked": Cal.com confirms the booking itself.

import { reducedMotion } from './dom.js';

export function bookingUrl(cfg, answers = {}) {
  if (!cfg?.calLink) return null;
  const url = new URL(`${cfg.origin.replace(/\/$/, '')}/${cfg.calLink}`);
  for (const [k, v] of Object.entries(answers)) if (v) url.searchParams.set(k, v);
  return url.href;
}

// Cal.com's documented loader: defines window.Cal and queues calls until
// embed.js arrives. Adding the <script> is the only network request.
function loadCal(src) {
  const w = window;
  if (w.Cal?.loaded) return w.Cal;
  const C = w.Cal = w.Cal || function () {
    const cal = C;
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.calEmbed = '';
      s.addEventListener('error', () => document.dispatchEvent(new CustomEvent('mu:cal-error')));
      document.head.appendChild(s);
      cal.loaded = true;
    }
    cal.q.push(arguments);
  };
  return C;
}

// getAnswers: step 1's answers so far, by Cal.com question identifier.
export function createBooking(root = document, { getAnswers = () => ({}) } = {}) {
  let cfg = null;
  try { cfg = JSON.parse(root.getElementById?.('booking-config')?.textContent || document.getElementById('booking-config')?.textContent || 'null'); } catch { cfg = null; }
  const box = root.querySelector('[data-booking]');
  if (!cfg?.calLink || !box) return null;

  const show = box.querySelector('[data-book-show]');
  const status = box.querySelector('[data-book-status]');
  const embed = box.querySelector('[data-book-embed]');
  const fail = box.querySelector('[data-book-fail]');
  const failLink = box.querySelector('[data-book-open]');
  const heading = root.querySelector('#book-h');
  let opened = false, ready = false, timer = 0;

  function failed(answers) {
    if (ready) return;
    clearTimeout(timer);
    status.hidden = true;
    embed.hidden = true;
    embed.classList.remove('is-loading');
    failLink.href = bookingUrl(cfg, answers);
    fail.hidden = false;
  }

  function open(answers = {}) {
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    if (opened) return;
    opened = true;
    show.hidden = true;
    status.hidden = false;
    embed.hidden = false;
    embed.classList.add('is-loading');   // keeps the calendar's space while it loads
    timer = setTimeout(() => failed(answers), (cfg.timeoutSeconds ?? 10) * 1000);
    document.addEventListener('mu:cal-error', () => failed(answers), { once: true });

    const Cal = loadCal(cfg.embedScript);
    Cal('init', { origin: cfg.origin });
    Cal('inline', { elementOrSelector: `#${embed.id}`, calLink: cfg.calLink, config: { layout: 'month_view', ...answers } });
    Cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    Cal('on', {
      action: 'linkReady',
      callback: () => {
        ready = true;
        clearTimeout(timer);
        status.hidden = true;
        embed.classList.remove('is-loading');
      },
    });
    Cal('on', { action: 'linkFailed', callback: () => failed(answers) });
  }

  show.addEventListener('click', (e) => {
    e.preventDefault();
    open(getAnswers());
  });

  return { open, get state() { return { opened, ready, failed: !fail.hidden }; } };
}

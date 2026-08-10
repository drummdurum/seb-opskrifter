// Mail-fane: sync, afmelding, AI-svar (foreslå/send/arkivér). Ren vanilla JS.
(function () {
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    let body = {};
    try { body = await res.json(); } catch (e) { /* tomt svar */ }
    return { ok: res.ok, status: res.status, body };
  }

  function cardOf(el) { return el.closest('.mail-card'); }
  function gmailIdOf(el) { return cardOf(el).dataset.gmailId; }
  function statusEl(card) { return card.querySelector('.js-status'); }

  function setStatus(card, text, color) {
    const el = statusEl(card);
    el.textContent = text || '';
    el.className = 'js-status text-xs mt-2 ' + (color || 'text-tree-brown');
  }

  // --- Synkronisér ---
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async function () {
      syncBtn.disabled = true;
      const original = syncBtn.textContent;
      syncBtn.textContent = 'Henter mails…';
      const { ok, body } = await postJSON('/mail/sync');
      if (ok) {
        window.location.reload();
      } else {
        syncBtn.disabled = false;
        syncBtn.textContent = original;
        alert((body && body.error) || 'Synkronisering fejlede.');
      }
    });
  }

  // --- Klik-håndtering via delegation ---
  document.addEventListener('click', async function (event) {
    const unsub = event.target.closest('.js-unsub');
    if (unsub) return handleUnsub(unsub);

    const reply = event.target.closest('.js-reply');
    if (reply) return handleReplyOpen(reply);
  });

  // --- Afmeld ---
  async function handleUnsub(btn) {
    const card = cardOf(btn);
    const oneClick = btn.dataset.oneclick === '1';
    const url = btn.dataset.url;

    // Uden one-click: åbn blot afmeld-linket i ny fane.
    if (!oneClick) {
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Afmelder…';
    const { ok, body } = await postJSON('/mail/unsubscribe', { gmail_id: card.dataset.gmailId });
    if (ok) {
      btn.replaceWith(makeDoneBadge('Afmeldt ✓'));
    } else {
      btn.disabled = false;
      btn.textContent = original;
      setStatus(card, (body && body.error) || 'Afmelding fejlede.', 'text-red-accent');
      if (body && body.fallback) window.open(body.fallback, '_blank', 'noopener');
    }
  }

  function makeDoneBadge(text) {
    const span = document.createElement('span');
    span.className = 'text-xs font-semibold text-olive-muted';
    span.textContent = text;
    return span;
  }

  // --- Svar: åbn boks med udkast ---
  async function handleReplyOpen(btn) {
    const card = cardOf(btn);
    const box = card.querySelector('.js-reply-box');
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Skriver svar…';

    const { ok, body } = await postJSON('/mail/reply', { gmail_id: card.dataset.gmailId });
    btn.disabled = false;
    btn.textContent = original;

    if (!ok) {
      setStatus(card, (body && body.error) || 'Kunne ikke generere svar.', 'text-red-accent');
      return;
    }

    box.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full border border-warm-taupe rounded-lg p-3 text-sm text-dark-brown';
    textarea.rows = 5;
    textarea.value = body.reply || '';

    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap gap-2 mt-2';

    const sendBtn = button('Send svar', 'btn-primary text-sm');
    const sendArchiveBtn = button('Send og arkivér', 'btn-secondary text-sm');
    const cancelBtn = button('Annuller', 'text-sm px-3 py-1 rounded text-tree-brown hover:text-red-accent');

    sendBtn.addEventListener('click', () => sendReply(card, textarea, false, [sendBtn, sendArchiveBtn]));
    sendArchiveBtn.addEventListener('click', () => sendReply(card, textarea, true, [sendBtn, sendArchiveBtn]));
    cancelBtn.addEventListener('click', () => { box.classList.add('hidden'); box.innerHTML = ''; setStatus(card, ''); });

    actions.append(sendBtn, sendArchiveBtn, cancelBtn);
    box.append(textarea, actions);
    box.classList.remove('hidden');
    setStatus(card, '');
  }

  function button(text, className) {
    const b = document.createElement('button');
    b.className = className;
    b.textContent = text;
    return b;
  }

  // --- Svar: send (evt. + arkivér) ---
  async function sendReply(card, textarea, archive, buttons) {
    const body = textarea.value.trim();
    if (!body) { setStatus(card, 'Svaret er tomt.', 'text-red-accent'); return; }
    buttons.forEach((b) => (b.disabled = true));
    setStatus(card, archive ? 'Sender og arkiverer…' : 'Sender…', 'text-tree-brown');

    const sent = await postJSON('/mail/reply/send', { gmail_id: card.dataset.gmailId, body });
    if (!sent.ok) {
      buttons.forEach((b) => (b.disabled = false));
      setStatus(card, (sent.body && sent.body.error) || 'Svaret kunne ikke sendes.', 'text-red-accent');
      return;
    }

    if (archive) {
      const arch = await postJSON('/mail/archive', { gmail_id: card.dataset.gmailId });
      if (arch.ok) { window.location.reload(); return; }
      setStatus(card, (arch.body && arch.body.error) || 'Svar sendt, men arkivering fejlede.', 'text-red-accent');
    }

    // Svar sendt (uden arkivering): ryd boksen og vis kvittering.
    const box = card.querySelector('.js-reply-box');
    box.classList.add('hidden');
    box.innerHTML = '';
    setStatus(card, 'Svar sendt ✓', 'text-olive-muted');
  }
})();

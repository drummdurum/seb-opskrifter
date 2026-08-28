// Ingredient checkbox functionality
document.addEventListener('DOMContentLoaded', function() {
  const ingredientItems = document.querySelectorAll('.ingredient-item');
  const resetBtn = document.getElementById('resetIngredients');

  ingredientItems.forEach(item => {
    item.addEventListener('click', function() {
      this.classList.toggle('crossed');
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      ingredientItems.forEach(item => {
        item.classList.remove('crossed');
      });
    });
  }
});

// Search functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const recipeCards = document.querySelectorAll('.recipe-card');
    
    recipeCards.forEach(card => {
      const title = card.querySelector('h2').textContent.toLowerCase();
      const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());
      
      if (title.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm))) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// Knitting counter controls
document.querySelectorAll('.counter-card').forEach(card => {
  const counterId = card.dataset.counterId;
  const value = card.querySelector('.counter-value');
  const errorMessage = card.querySelector('.counter-error');
  const syncMessage = card.querySelector('.counter-sync');
  const sessionTitle = card.querySelector('.session-title');
  const sessionSummary = card.querySelector('.session-summary');
  const sessionButton = card.querySelector('.session-toggle');
  let confirmedCount = Number(value.textContent);
  let pendingChange = 0;
  let failedChange = 0;
  let failedOperationId = '';
  let optimisticChange = 0;
  let sending = false;
  let flushTimer;

  const operationId = () => globalThis.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const renderCount = () => { value.textContent = Math.max(0, confirmedCount + optimisticChange); };

  const renderState = state => {
    confirmedCount = state.count;
    renderCount();
    const active = Boolean(state.activeSession);
    card.dataset.sessionActive = String(active);
    sessionTitle.textContent = active ? 'Session i gang' : 'Klar til en session';
    sessionSummary.textContent = active
      ? `${state.activeSession.rounds} omgange i denne session`
      : 'Start her og fortsæt på mobil eller pc.';
    sessionButton.dataset.sessionAction = active ? 'end' : 'start';
    sessionButton.textContent = active ? 'Afslut session' : 'Start session';
  };

  const showError = message => {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    syncMessage.textContent = navigator.onLine ? 'Ikke synkroniseret – tryk igen for at prøve igen' : 'Offline – ændringer venter';
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Tælleren kunne ikke opdateres');
    return result;
  };

  const flush = async () => {
    if (sending || (pendingChange === 0 && failedChange === 0) || !navigator.onLine) {
      return pendingChange === 0 && failedChange === 0;
    }
    sending = true;
    const isRetry = failedChange !== 0;
    const change = isRetry ? failedChange : Math.max(-100, Math.min(100, pendingChange));
    const requestOperationId = isRetry ? failedOperationId : operationId();
    if (isRetry) {
      failedChange = 0;
      failedOperationId = '';
    } else {
      pendingChange -= change;
    }
    syncMessage.textContent = 'Gemmer…';
    try {
      const state = await requestJson(`/taellere/${counterId}/count`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change, operationId: requestOperationId })
      });
      optimisticChange -= change;
      renderState(state);
      errorMessage.classList.add('hidden');
      syncMessage.textContent = 'Synkroniseret';
    } catch (error) {
      failedChange = change;
      failedOperationId = requestOperationId;
      showError(error.message);
    } finally {
      sending = false;
      if ((pendingChange !== 0 || failedChange !== 0) && navigator.onLine && errorMessage.classList.contains('hidden')) flush();
    }
    return pendingChange === 0 && failedChange === 0;
  };

  const queueChange = change => {
    const displayedCount = confirmedCount + optimisticChange;
    if (change < 0 && displayedCount <= 0) return;
    pendingChange += change;
    optimisticChange += change;
    renderCount();
    syncMessage.textContent = navigator.onLine ? 'Gemmer…' : 'Offline – ændringer venter';
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 80);
  };

  const resetCounter = async () => {
    if (!confirm('Vil du nulstille denne tæller til 0?')) return;
    await flush();
    if (pendingChange !== 0 || failedChange !== 0) return;
    try {
      const state = await requestJson(`/taellere/${counterId}/reset`, { method: 'PATCH' });
      optimisticChange = 0;
      renderState(state);
      errorMessage.classList.add('hidden');
      syncMessage.textContent = 'Synkroniseret';
    } catch (error) { showError(error.message); }
  };

  const changeSession = async action => {
    await flush();
    if (pendingChange !== 0 || failedChange !== 0) return;
    sessionButton.disabled = true;
    try {
      const state = await requestJson(`/taellere/${counterId}/session/${action}`, { method: 'POST' });
      renderState(state);
      errorMessage.classList.add('hidden');
    } catch (error) { showError(error.message); }
    finally { sessionButton.disabled = false; }
  };

  const refresh = async () => {
    if (!navigator.onLine || document.hidden) return;
    try {
      const state = await requestJson(`/taellere/${counterId}/state`);
      renderState(state);
      if (!sending && pendingChange === 0 && failedChange === 0) syncMessage.textContent = 'Synkroniseret';
    } catch (_) {
      if (!sending && pendingChange === 0 && failedChange === 0) syncMessage.textContent = 'Kunne ikke hente seneste værdi';
    }
  };

  card.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (button) {
      if (button.dataset.action === 'reset') resetCounter();
      else queueChange(button.dataset.action === 'increment' ? 1 : -1);
    }
    const sessionControl = event.target.closest('button[data-session-action]');
    if (sessionControl) changeSession(sessionControl.dataset.sessionAction);
  });

  window.addEventListener('online', () => { flush(); refresh(); });
  window.addEventListener('offline', () => { syncMessage.textContent = 'Offline – ændringer venter'; });
  setInterval(refresh, 2500);
});

// Delete confirmation
function confirmDelete(recipeName) {
  return confirm(`Er du sikker på, at du vil slette "${recipeName}"?`);
}

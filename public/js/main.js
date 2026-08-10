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
  const buttons = card.querySelectorAll('button[data-action]');

  const updateCounter = async (action) => {
    if (action === 'reset' && !confirm('Vil du nulstille denne tæller til 0?')) return;
    buttons.forEach(button => { button.disabled = true; });
    errorMessage.classList.add('hidden');

    try {
      const isReset = action === 'reset';
      const response = await fetch(`/taellere/${counterId}/${isReset ? 'reset' : 'count'}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: isReset ? '{}' : JSON.stringify({ change: action === 'increment' ? 1 : -1 })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Tælleren kunne ikke opdateres');
      value.textContent = result.count;
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.classList.remove('hidden');
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  };

  card.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (button) updateCounter(button.dataset.action);
  });
});

// Delete confirmation
function confirmDelete(recipeName) {
  return confirm(`Er du sikker på, at du vil slette "${recipeName}"?`);
}

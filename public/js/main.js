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

// Delete confirmation
function confirmDelete(recipeName) {
  return confirm(`Er du sikker på, at du vil slette "${recipeName}"?`);
}

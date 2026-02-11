/**
 * Unit tests for recipe validation
 * Testing all validation rules for recipes
 */

// Mock validator function (will be replaced with actual implementation)
const validateRecipe = (recipe) => {
  const errors = [];

  // Check required fields
  if (!recipe.titel || recipe.titel.toString().trim() === '') {
    errors.push('titel: required field');
  }

  if (!recipe.ingredienser || !Array.isArray(recipe.ingredienser) || recipe.ingredienser.length === 0) {
    errors.push('ingredienser: required array field');
  }

  if (!recipe.fremgangsmåde || recipe.fremgangsmåde.toString().trim() === '') {
    errors.push('fremgangsmåde: required field');
  }

  // Type validation
  if (recipe.titel && typeof recipe.titel !== 'string') {
    errors.push('titel: must be a string');
  }

  if (recipe.ingredienser && !Array.isArray(recipe.ingredienser)) {
    errors.push('ingredienser: must be an array');
  }

  if (recipe.fremgangsmåde && typeof recipe.fremgangsmåde !== 'string') {
    errors.push('fremgangsmåde: must be a string');
  }

  // Max length validation
  if (recipe.titel && recipe.titel.length > 100) {
    errors.push('titel: exceeds max length of 100 characters');
  }

   if (!Array.isArray(recipe.ingredienser)) {
    errors.push('ingredienser: must be an array');
  } else if (recipe.ingredienser.length === 0) {
    errors.push('ingredienser: cannot be empty');
  } else {
    recipe.ingredienser.forEach((ing, index) => {
      // Check if ingredient is a string FIRST
      if (typeof ing !== 'string') {
        errors.push(`ingredienser[${index}]: must be a string`);
        return; // Skip further checks for this ingredient
      }
      if (ing.length > 50) {
        errors.push(`ingredienser[${index}]: exceeds max length of 50 characters`);
      }
      if (ing.trim() === '') {
        errors.push(`ingredienser[${index}]: cannot be empty`);
      }
    });
  }

  if (recipe.fremgangsmåde && recipe.fremgangsmåde.length > 1000) {
    errors.push('fremgangsmåde: exceeds max length of 1000 characters');
  }

  // Tags validation
  if (recipe.tags) {
    if (!Array.isArray(recipe.tags)) {
      errors.push('tags: must be an array');
    } else {
      recipe.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`tags[${index}]: must be a string`);
        }
        if (tag.length > 20) {
          errors.push(`tags[${index}]: exceeds max length of 20 characters`);
        }
      });
    }
  }

  // how_many_servings validation
  if (recipe.how_many_servings !== undefined) {
    if (!Number.isInteger(recipe.how_many_servings) || recipe.how_many_servings <= 0) {
      errors.push('how_many_servings: must be a positive integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Tests
describe('Recipe Validation', () => {
  
  describe('Required fields validation', () => {
    test('should fail if titel is missing', () => {
      const recipe = {
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('titel: required field');
    });

    test('should fail if ingredienser is missing', () => {
      const recipe = {
        titel: 'Brød',
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ingredienser: required array field');
    });

    test('should fail if fremgangsmåde is missing', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel']
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fremgangsmåde: required field');
    });

    test('should fail if required field is empty string', () => {
      const recipe = {
        titel: '',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('titel: required field');
    });
  });

  describe('Data type validation', () => {
    test('should fail if titel is not a string', () => {
      const recipe = {
        titel: 123,
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('titel: must be a string');
    });

    test('should fail if ingredienser is not an array', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: '1 kg mel',
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ingredienser: must be an array');
    });

    test('should fail if fremgangsmåde is not a string', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 123
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fremgangsmåde: must be a string');
    });

    test('should fail if tags is not an array', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake',
        tags: 'bread'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('tags: must be an array');
    });
  });

  describe('Max length validation', () => {
    test('should fail if titel exceeds 100 characters', () => {
      const recipe = {
        titel: 'A'.repeat(101),
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('titel: exceeds max length of 100 characters');
    });

    test('should pass if titel is exactly 100 characters', () => {
      const recipe = {
        titel: 'A'.repeat(100),
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.errors).not.toContain('titel: exceeds max length of 100 characters');
    });

    test('should fail if ingredient exceeds 50 characters', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['A'.repeat(51)],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('50 characters'))).toBe(true);
    });

    test('should fail if fremgangsmåde exceeds 1000 characters', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'A'.repeat(1001)
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('fremgangsmåde: exceeds max length of 1000 characters');
    });

    test('should fail if tag exceeds 20 characters', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake',
        tags: ['A'.repeat(21)]
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('20 characters'))).toBe(true);
    });
  });

  describe('Array content validation', () => {
    test('should fail if ingredienser array is empty', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: [],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ingredienser: required array field');
    });

    test('should fail if ingredient array contains non-string', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel', 123],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ingredienser[1]: must be a string');
    });

    test('should fail if ingredient is empty string', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel', ''],
        fremgangsmåde: 'Mix and bake'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ingredienser[1]: cannot be empty');
    });
  });

  describe('serving validation', () => {
    test('should fail if how_many_servings is not an integer', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake',
        how_many_servings: 4.5
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('how_many_servings: must be a positive integer');
    });

    test('should fail if how_many_servings is zero or negative', () => {
      const recipe = {
        titel: 'Brød',
        ingredienser: ['1 kg mel'],
        fremgangsmåde: 'Mix and bake',
        how_many_servings: 0
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('how_many_servings: must be a positive integer');
    });
  });

  describe('Valid recipe', () => {
    test('should pass with all required fields and valid data', () => {
      const recipe = {
        titel: 'Tomatsuppe med suppenudler og hvidløgsostebrød',
        ingredienser: [
          '2 løg, finthakkede',
          '2 fed hvidløg, finthakkede',
          '1 porre, i tynde ringe'
        ],
        fremgangsmåde: 'Varm olie op i en gryde og sauter løg, hvidløg og porrer ved middelvarme, til de er bløde.'
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should pass with optional fields', () => {
      const recipe = {
        titel: 'Tomatsuppe',
        ingredienser: ['2 løg'],
        fremgangsmåde: 'Mix and bake',
        tags: ['soup', 'vegan'],
        how_many_servings: 4,
        til_servering: ['brød', 'smør']
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});

const Counter = require('../models/Counter');

describe('Counter validation', () => {
  test('accepts a named counter starting at zero', async () => {
    const counter = new Counter({ name: 'Blå sweater' });
    await expect(counter.validate()).resolves.toBeUndefined();
    expect(counter.count).toBe(0);
  });

  test('requires a project name', async () => {
    const counter = new Counter({ name: '   ' });
    await expect(counter.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('does not allow a negative count', async () => {
    const counter = new Counter({ name: 'Sokker', count: -1 });
    await expect(counter.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('does not allow decimal counts', async () => {
    const counter = new Counter({ name: 'Hue', count: 2.5 });
    await expect(counter.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('accepts an optional decrease plan on a project', async () => {
    const counter = new Counter({
      name: 'Blå sweater',
      decreasePlan: { startStitches: 90, decreasesPerRound: 6, decreaseRounds: 11, interval: 2 }
    });
    await expect(counter.validate()).resolves.toBeUndefined();
    expect(counter.decreasePlan.startStitches).toBe(90);
  });

  test('accepts yarn, pattern, images and notes', async () => {
    const counter = new Counter({
      name: 'Cardigan',
      pattern: { name: 'Min opskrift', url: 'https://example.com/pattern' },
      yarn: { brand: 'DROPS', name: 'Air', metersPerSkein: 150, gramsPerSkein: 50, skeinsUsed: 3.5 },
      needleSize: 5,
      notes: [{ text: 'Lavede ærmet 2 cm længere.' }],
      images: [{ filename: 'project.jpg', caption: 'Første ærme' }]
    });
    await expect(counter.validate()).resolves.toBeUndefined();
    expect(counter.yarn.metersPerSkein * counter.yarn.skeinsUsed).toBe(525);
  });
});

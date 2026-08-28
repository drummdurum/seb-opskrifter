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
      images: [{ filename: 'project.jpg', caption: 'Første ærme' }],
      documents: [{ filename: 'pattern.pdf', originalName: 'min-opskrift.pdf', title: 'Min opskrift' }]
    });
    await expect(counter.validate()).resolves.toBeUndefined();
    expect(counter.yarn.metersPerSkein * counter.yarn.skeinsUsed).toBe(525);
    expect(counter.documents[0].originalName).toBe('min-opskrift.pdf');
  });

  test('accepts Skammekrogen as project status', async () => {
    const counter = new Counter({ name: 'Den svære sweater', status: 'shame_corner' });
    await expect(counter.validate()).resolves.toBeUndefined();
    expect(counter.status).toBe('shame_corner');
  });

  test('accepts an active session and completed session history', async () => {
    const startedAt = new Date('2026-08-28T10:00:00Z');
    const counter = new Counter({
      name: 'Sessionssweater',
      count: 14,
      activeSession: { startedAt, startCount: 10, rounds: 4 },
      sessionHistory: [{
        startedAt: new Date('2026-08-27T10:00:00Z'),
        endedAt: new Date('2026-08-27T11:00:00Z'),
        startCount: 5,
        endCount: 10,
        rounds: 5
      }]
    });

    await expect(counter.validate()).resolves.toBeUndefined();
    expect(counter.activeSession.rounds).toBe(4);
    expect(counter.sessionHistory).toHaveLength(1);
  });
});

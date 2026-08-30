const ejs = require('ejs');
const path = require('path');

describe('counter views', () => {
  test('renders the counter list when a legacy active session has no start time', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'counters.ejs'), {
      title: 'Omgangstællere',
      counters: [{
        _id: 'legacy-counter',
        name: 'Legacy sweater',
        count: 4,
        activeSession: { rounds: 2 },
        images: [],
        decreasePlan: null
      }]
    });

    expect(html).toContain('data-session-active="true"');
    expect(html).toContain('data-session-started-at=""');
    expect(html).toContain('2 omgange i denne session');
  });
});

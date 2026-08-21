const User = require('../models/User');

describe('User validation', () => {
  test('normalizes email and accepts a secure password hash', async () => {
    const user = new User({ name: 'Sebastian', email: 'TEST@EXAMPLE.COM', passwordHash: 'hashed-password' });
    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('user');
  });

  test('requires name, email and password hash', async () => {
    const user = new User({});
    await expect(user.validate()).rejects.toMatchObject({ name: 'ValidationError' });
  });
});

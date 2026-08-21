process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/opskrifter_auth_test';
process.env.SESSION_SECRET = 'integration-test-session-secret';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Counter = require('../models/Counter');
const ShoppingList = require('../models/ShoppingList');

describe('multi-user authentication and ownership', () => {
  let ownerAgent;
  let otherAgent;
  let legacyProject;

  beforeAll(async () => {
    await app.locals.mongoConnectionPromise;
    await mongoose.connection.dropDatabase();
    legacyProject = await Counter.create({ name: 'Eksisterende sweater' });
    ownerAgent = request.agent(app);
    otherAgent = request.agent(app);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await app.locals.sessionStore.close();
    await mongoose.disconnect();
  });

  test('redirects guests away from private knitting projects and files', async () => {
    await request(app).get('/taellere').expect(302).expect('Location', '/login');
    await request(app).get('/indkoebsliste').expect(302).expect('Location', '/login');
    await request(app).get('/uploads/projects/pdfs/private.pdf').expect(302).expect('Location', '/login');
  });

  test('first registration claims existing projects', async () => {
    await ownerAgent.post('/register').type('form').send({
      name: 'Ejer', email: 'owner@example.test', password: 'TestPassword123!', passwordConfirmation: 'TestPassword123!'
    }).expect(302).expect('Location', '/verify-email-sent');

    const owner = await User.findOne({ email: 'owner@example.test' });
    expect(owner.role).toBe('admin');
    expect((await Counter.findById(legacyProject._id)).ownerId.toString()).toBe(owner._id.toString());
    await ownerAgent.get('/taellere').expect(200).expect(/Eksisterende sweater/);
  });

  test('another user cannot list or open the owner project', async () => {
    await otherAgent.post('/register').type('form').send({
      name: 'Anden', email: 'other@example.test', password: 'OtherPassword123!', passwordConfirmation: 'OtherPassword123!'
    }).expect(302);

    const list = await otherAgent.get('/taellere').expect(200);
    expect(list.text).not.toContain('Eksisterende sweater');
    await otherAgent.get(`/taellere/${legacyProject._id}`).expect(404);
  });

  test('shopping lists are private and can be deleted', async () => {
    await ownerAgent.post('/indkoebsliste/items').type('form').send({ text: 'Rundpind 4 mm' })
      .expect(302).expect('Location', '/indkoebsliste');

    const owner = await User.findOne({ email: 'owner@example.test' });
    const list = await ShoppingList.findOne({ ownerId: owner._id });
    expect(list.items.map(item => item.text)).toEqual(['Rundpind 4 mm']);
    await ownerAgent.get('/indkoebsliste').expect(200).expect(/Rundpind 4 mm/);
    await otherAgent.get('/indkoebsliste').expect(200).expect(response => {
      if (response.text.includes('Rundpind 4 mm')) throw new Error('En anden brugers vare blev vist.');
    });
    await otherAgent.delete(`/indkoebsliste/items/${list.items[0]._id}`).expect(404);

    await ownerAgent.patch(`/indkoebsliste/items/${list.items[0]._id}`).expect(302);
    expect((await ShoppingList.findById(list._id)).items[0].completed).toBe(true);
    await ownerAgent.delete('/indkoebsliste').expect(302).expect('Location', '/indkoebsliste');
    expect(await ShoppingList.exists({ ownerId: owner._id })).toBeNull();
  });

  test('food recipes remain public while Mail requires verified login', async () => {
    await request(app).get('/').expect(200);
    await request(app).get('/mail').expect(302).expect('Location', '/login');
    await ownerAgent.get('/mail').expect(302).expect('Location', '/verify-email-sent');

    await User.updateOne({ email: 'owner@example.test' }, { $set: { emailVerifiedAt: new Date() } });
    await ownerAgent.get('/mail').expect(200).expect(/Forbind din Gmail/);
  });

  test('rejects a state-changing request from another origin', async () => {
    await request(app)
      .post('/login')
      .set('Origin', 'https://attacker.example')
      .type('form')
      .send({ email: 'owner@example.test', password: 'TestPassword123!' })
      .expect(403);
  });

  test('accepts registration submitted from localhost', async () => {
    const response = await request(app)
      .post('/register')
      .set('Host', 'localhost:8080')
      .set('Origin', 'http://localhost:8080')
      .type('form')
      .send({
        name: 'Local bruger',
        email: 'local@example.com',
        password: 'hemmeligkode123',
        passwordConfirmation: 'hemmeligkode123'
      });

    expect(response.status).toBe(302);
    expect(await User.exists({ email: 'local@example.com' })).toBeTruthy();
  });

  test('login rejects an incorrect password without revealing the account', async () => {
    await request(app)
      .post('/login')
      .type('form')
      .send({ email: 'owner@example.test', password: 'wrong-password' })
      .expect(401)
      .expect(/Email eller adgangskode er forkert/);
  });
});

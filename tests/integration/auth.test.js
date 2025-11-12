const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');

describe('Auth flow', () => {
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (global.__MONGOD__) await global.__MONGOD__.stop();
  });

  it('registers and logs in a user', async () => {
    const email = 'testuser@example.com';
    const password = 'Test1234';
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: 'Test User' });
    expect(reg.statusCode).toBe(201);
    expect(reg.body).toHaveProperty('accessToken');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(login.statusCode).toBe(200);
    expect(login.body).toHaveProperty('accessToken');
    expect(login.body).toHaveProperty('refreshToken');
  });
});

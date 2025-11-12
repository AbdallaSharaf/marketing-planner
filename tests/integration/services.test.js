const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');

describe('Services CRUD', () => {
  let token;
  beforeAll(async () => {
    // register admin
    await request(app).post('/api/v1/auth/register').send({
      email: 'svcadmin@example.com',
      password: 'Admin1234',
      role: 'admin',
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'svcadmin@example.com', password: 'Admin1234' });
    token = res.body.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (global.__MONGOD__) await global.__MONGOD__.stop();
  });

  it('creates, reads, updates and deletes a service', async () => {
    const payload = {
      en: 'Test Service',
      ar: 'خدمة اختبار',
      price: 100,
      isGlobal: true,
    };
    const create = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(create.statusCode).toBe(201);
    const id = create.body.service._id;

    const get = await request(app)
      .get(`/api/v1/services/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.statusCode).toBe(200);
    expect(get.body.service.en).toBe('Test Service');

    const upd = await request(app)
      .put(`/api/v1/services/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 120 });
    expect(upd.statusCode).toBe(200);
    expect(upd.body.service.price).toBe(120);

    const del = await request(app)
      .delete(`/api/v1/services/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(204);
  });
});

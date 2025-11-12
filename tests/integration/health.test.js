const request = require('supertest');
const app = require('../../src/app');

describe('Health endpoint', () => {
  it('responds with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

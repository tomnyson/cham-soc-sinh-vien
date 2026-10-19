/**
 * Cache-Control headers. Cloudflare sits in front of production, so
 * per-user HTML/JSON must never be shareable, and static assets must
 * revalidate unless the URL carries a ?v= content version.
 */
const request = require('supertest');
const app = require('../app');

describe('Cache-Control headers', () => {
  it('marks API responses private and no-store', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('marks server-rendered pages private and no-store', async () => {
    const res = await request(app).get('/classes');
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('caches versioned assets as immutable', async () => {
    const res = await request(app).get('/js/init.js?v=abc123');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('forces revalidation for unversioned assets such as ES module imports', async () => {
    const res = await request(app).get('/js/modules/classManager.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });
});

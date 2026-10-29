import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('health endpoint reports the API status without requiring a database query', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'hotelpro-api');
});

test('private endpoints require a bearer session', async () => {
  const response = await request(app).get('/api/bookings');
  assert.equal(response.status, 401);
  assert.match(response.body.error.message, /sign in/i);
});

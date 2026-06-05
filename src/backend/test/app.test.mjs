import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createBackend } from '../app.mjs';

async function startTestBackend(options = {}) {
  const backend = await createBackend({
    storage: ':memory:',
    seed: false,
    syncOptions: { force: true },
    ...options
  });

  const server = backend.app.listen(0);
  await once(server, 'listening');

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    return {
      status: response.status,
      data
    };
  }

  async function close() {
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
    await backend.sequelize.close();
  }

  return { ...backend, request, close };
}

test('createBackend can initialize an empty in-memory database', async (t) => {
  const backend = await startTestBackend();
  t.after(() => backend.close());

  const response = await backend.request('/wishlist');

  assert.equal(response.status, 200);
  assert.deepEqual(response.data, []);
});

test('createBackend seeds the default wishlist when enabled', async (t) => {
  const backend = await startTestBackend({ seed: true });
  t.after(() => backend.close());

  const response = await backend.request('/wishlist');

  assert.equal(response.status, 200);
  assert.equal(response.data.length, 1);
  assert.equal(response.data[0].title, 'My Fancy Wishlist');
  assert.equal(response.data[0].Wishes.length, 1);
  assert.equal(response.data[0].Wishes[0].title, 'Leberkaassemmeln');
  assert.equal(response.data[0].Wishes[0].quantity, 3);
});

test('wishlist endpoints support create, read, update, and delete', async (t) => {
  const backend = await startTestBackend();
  t.after(() => backend.close());

  const created = await backend.request('/wishlist', {
    method: 'POST',
    body: { title: 'Birthday' }
  });

  assert.equal(created.status, 200);
  assert.equal(created.data.title, 'Birthday');
  assert.ok(created.data.id);

  const listed = await backend.request('/wishlist');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].title, 'Birthday');
  assert.deepEqual(listed.data[0].Wishes, []);

  const fetched = await backend.request(`/wishlist/${created.data.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.data.title, 'Birthday');

  const updated = await backend.request(`/wishlist/${created.data.id}`, {
    method: 'PUT',
    body: { title: 'Holiday' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.title, 'Holiday');

  const deleted = await backend.request(`/wishlist/${created.data.id}`, {
    method: 'DELETE'
  });
  assert.equal(deleted.status, 204);
  assert.equal(deleted.data, null);

  const afterDelete = await backend.request('/wishlist');
  assert.equal(afterDelete.status, 200);
  assert.deepEqual(afterDelete.data, []);
});

test('wish endpoints support adding, listing, updating, and deleting wishes', async (t) => {
  const backend = await startTestBackend();
  t.after(() => backend.close());

  const wishlist = await backend.request('/wishlist', {
    method: 'POST',
    body: { title: 'Groceries' }
  });

  const withWish = await backend.request(`/wishlist/${wishlist.data.id}/wish`, {
    method: 'POST',
    body: { title: 'Coffee', quantity: 2 }
  });

  assert.equal(withWish.status, 200);
  assert.equal(withWish.data.Wishes.length, 1);
  assert.equal(withWish.data.Wishes[0].title, 'Coffee');
  assert.equal(withWish.data.Wishes[0].quantity, 2);

  const wishId = withWish.data.Wishes[0].id;
  const allWishes = await backend.request('/wish');
  assert.equal(allWishes.status, 200);
  assert.equal(allWishes.data.length, 1);
  assert.equal(allWishes.data[0].id, wishId);

  const fetchedWish = await backend.request(`/wish/${wishId}`);
  assert.equal(fetchedWish.status, 200);
  assert.equal(fetchedWish.data.title, 'Coffee');

  const updatedWish = await backend.request(`/wish/${wishId}`, {
    method: 'PUT',
    body: { title: 'Tea', quantity: 4 }
  });
  assert.equal(updatedWish.status, 200);
  assert.equal(updatedWish.data.title, 'Tea');
  assert.equal(updatedWish.data.quantity, 4);

  const deletedWish = await backend.request(`/wish/${wishId}`, {
    method: 'DELETE'
  });
  assert.equal(deletedWish.status, 204);
  assert.equal(deletedWish.data, null);

  const afterDelete = await backend.request('/wish');
  assert.equal(afterDelete.status, 200);
  assert.deepEqual(afterDelete.data, []);
});

test('mutating missing resources returns a 404 response', async (t) => {
  const backend = await startTestBackend();
  t.after(() => backend.close());

  const missingWishlistUpdate = await backend.request('/wishlist/999', {
    method: 'PUT',
    body: { title: 'Missing' }
  });
  assert.equal(missingWishlistUpdate.status, 404);
  assert.deepEqual(missingWishlistUpdate.data, { message: 'Wishlist not found' });

  const missingWishCreate = await backend.request('/wishlist/999/wish', {
    method: 'POST',
    body: { title: 'Missing', quantity: 1 }
  });
  assert.equal(missingWishCreate.status, 404);
  assert.deepEqual(missingWishCreate.data, { message: 'Wishlist not found' });

  const missingWishUpdate = await backend.request('/wish/999', {
    method: 'PUT',
    body: { title: 'Missing', quantity: 1 }
  });
  assert.equal(missingWishUpdate.status, 404);
  assert.deepEqual(missingWishUpdate.data, { message: 'Wish not found' });
});

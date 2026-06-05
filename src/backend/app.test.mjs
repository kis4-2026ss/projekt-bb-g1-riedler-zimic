import request from 'supertest';
import { createBackend } from './app.mjs';

describe('WishBox API', () => {
  let app;
  let sequelize;
  let models;

  beforeAll(async () => {
    // Use in-memory database for tests to ensure isolation and speed
    const backend = await createBackend({
      storage: ':memory:',
      logging: false,
      syncOptions: { force: true },
      seed: false
    });
    app = backend.app;
    sequelize = backend.sequelize;
    models = backend.models;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await models.Wish.destroy({ where: {}, truncate: true });
    await models.Wishlist.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Wishlist Endpoints', () => {
    it('POST /wishlist - should create a new wishlist', async () => {
      const res = await request(app)
        .post('/wishlist')
        .send({ title: 'My Holiday Wishes' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('My Holiday Wishes');
      expect(res.body.id).toBeDefined();
    });

    it('GET /wishlist - should return all wishlists', async () => {
      await models.Wishlist.create({ title: 'List 1' });
      await models.Wishlist.create({ title: 'List 2' });

      const res = await request(app).get('/wishlist');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map(l => l.title)).toContain('List 1');
      expect(res.body.map(l => l.title)).toContain('List 2');
    });

    it('GET /wishlist/:id - should return a specific wishlist with its wishes', async () => {
      const list = await models.Wishlist.create({ title: 'Special List' });
      await list.createWish({ title: 'Item 1', quantity: 1 });

      const res = await request(app).get(`/wishlist/${list.id}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Special List');
      expect(res.body.Wishes).toHaveLength(1);
      expect(res.body.Wishes[0].title).toBe('Item 1');
    });

    it('PUT /wishlist/:id - should update a wishlist', async () => {
      const list = await models.Wishlist.create({ title: 'Old Title' });

      const res = await request(app)
        .put(`/wishlist/${list.id}`)
        .send({ title: 'New Title' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('New Title');

      const updated = await models.Wishlist.findByPk(list.id);
      expect(updated.title).toBe('New Title');
    });

    it('DELETE /wishlist/:id - should delete a wishlist', async () => {
      const list = await models.Wishlist.create({ title: 'To Be Deleted' });

      const res = await request(app).delete(`/wishlist/${list.id}`);
      
      expect(res.statusCode).toBe(204);

      const deleted = await models.Wishlist.findByPk(list.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Wish Endpoints', () => {
    let list;

    beforeEach(async () => {
      list = await models.Wishlist.create({ title: 'Parent List' });
    });

    it('POST /wishlist/:id/wish - should add a wish to a wishlist', async () => {
      const res = await request(app)
        .post(`/wishlist/${list.id}/wish`)
        .send({ title: 'New Wish', quantity: 5 });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.Wishes).toHaveLength(1);
      expect(res.body.Wishes[0].title).toBe('New Wish');
      expect(res.body.Wishes[0].quantity).toBe(5);
    });

    it('GET /wish - should return all wishes', async () => {
      await list.createWish({ title: 'Wish 1', quantity: 1 });
      await list.createWish({ title: 'Wish 2', quantity: 2 });

      const res = await request(app).get('/wish');
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('GET /wish/:id - should return a specific wish', async () => {
      const wish = await list.createWish({ title: 'Specific Wish', quantity: 10 });

      const res = await request(app).get(`/wish/${wish.id}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Specific Wish');
    });

    it('PUT /wish/:id - should update a wish', async () => {
      const wish = await list.createWish({ title: 'Old Wish', quantity: 1 });

      const res = await request(app)
        .put(`/wish/${wish.id}`)
        .send({ title: 'Updated Wish', quantity: 2 });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Wish');
      expect(res.body.quantity).toBe(2);
    });

    it('DELETE /wish/:id - should delete a wish', async () => {
      const wish = await list.createWish({ title: 'Bye Bye', quantity: 1 });

      const res = await request(app).delete(`/wish/${wish.id}`);
      
      expect(res.statusCode).toBe(204);

      const deleted = await models.Wish.findByPk(wish.id);
      expect(deleted).toBeNull();
    });
  });
});

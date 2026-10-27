const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

async function authHeader() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Lifter', email: 'lifter@example.com', password: 'secret123' });
  return { Authorization: `Bearer ${res.body.token}` };
}

const customExercise = { name: 'Band Pull-Apart', muscleGroup: 'shoulders', equipment: 'band' };

describe('custom exercise images', () => {
  it('accepts an https image URL', async () => {
    const auth = await authHeader();
    const res = await request(app)
      .post('/api/exercises')
      .set(auth)
      .send({ ...customExercise, image: 'https://example.com/pull-apart.jpg' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ isCustom: true, image: 'https://example.com/pull-apart.jpg' });
  });

  it('defaults to no image', async () => {
    const auth = await authHeader();
    const res = await request(app).post('/api/exercises').set(auth).send(customExercise);

    expect(res.status).toBe(201);
    expect(res.body.image).toBe('');
  });

  it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://example.com/x.jpg', '//evil.example.com/x.jpg'])(
    'rejects the unsafe image URL %s',
    async (image) => {
      const auth = await authHeader();
      const res = await request(app).post('/api/exercises').set(auth).send({ ...customExercise, image });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/image/i);
    }
  );

  it('can change and remove the image of an own custom exercise', async () => {
    const auth = await authHeader();
    const created = await request(app).post('/api/exercises').set(auth).send(customExercise);

    const changed = await request(app)
      .put(`/api/exercises/${created.body._id}`)
      .set(auth)
      .send({ image: 'http://example.com/new.png' });
    expect(changed.status).toBe(200);
    expect(changed.body.image).toBe('http://example.com/new.png');

    const removed = await request(app).put(`/api/exercises/${created.body._id}`).set(auth).send({ image: '' });
    expect(removed.status).toBe(200);
    expect(removed.body.image).toBe('');
  });
});

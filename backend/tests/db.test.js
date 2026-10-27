const { buildMongoUri, redactUri } = require('../src/config/db');

describe('buildMongoUri', () => {
  const base = { host: 'mongo', port: '27017', db: 'fittrack' };

  it('connects without authentication when no credentials are set', () => {
    expect(buildMongoUri({ ...base, user: '', password: '' })).toBe('mongodb://mongo:27017/fittrack');
  });

  it('uses credentials and authSource=admin when both are set', () => {
    expect(buildMongoUri({ ...base, user: 'admin', password: 'secret' })).toBe(
      'mongodb://admin:secret@mongo:27017/fittrack?authSource=admin'
    );
  });

  it('URL-encodes special characters in credentials', () => {
    expect(buildMongoUri({ ...base, user: 'us@r', password: 'p:ss/w#rd' })).toBe(
      'mongodb://us%40r:p%3Ass%2Fw%23rd@mongo:27017/fittrack?authSource=admin'
    );
  });

  it('ignores a user without a password', () => {
    expect(buildMongoUri({ ...base, user: 'admin', password: '' })).toBe('mongodb://mongo:27017/fittrack');
  });
});

describe('redactUri', () => {
  it('hides credentials for logging', () => {
    expect(redactUri('mongodb://admin:secret@mongo:27017/fittrack?authSource=admin')).toBe(
      'mongodb://***:***@mongo:27017/fittrack?authSource=admin'
    );
  });
});

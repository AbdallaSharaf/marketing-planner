const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

module.exports = async () => {
  mongo = await MongoMemoryServer.create({ instance: { dbName: 'testdb' } });
  const uri = mongo.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // expose stop function for after all tests
  global.__MONGOD__ = mongo;
};

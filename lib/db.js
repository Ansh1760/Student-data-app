// lib/db.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studentDB';

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

async function connect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(m => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connect;

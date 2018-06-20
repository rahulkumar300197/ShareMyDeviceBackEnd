'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');

const sessionSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'user',
    unique: true
  },
  remoteIP: {
    type: String
  },
  deviceType: {
    type: String
  },
  deviceToken: {
    type: String
  }

});

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

module.exports = mongoose.model('session', sessionSchema);
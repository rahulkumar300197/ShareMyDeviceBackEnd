'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	name: String,
	email: {
		type: String,
		unique: true
	},
	mobile_no: String,
	hashed_password: String,
	device_count: {
		type: Number,
		default: 0
	},
	device_shared_count: {
		type: Number,
		default: 0
	},
	device_request_count: {
		type: Number,
		default: 0
	},
	forgot_password_token: {
		type: String
	},
	created_at: String

});

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

module.exports = mongoose.model('user', userSchema);
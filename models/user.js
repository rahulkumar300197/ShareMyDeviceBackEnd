'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = mongoose.Schema({ 
    first_name : String,
	last_name : String,
	email : {type: String, unique: true}, 
	monile_no : String,
	hashed_password	: String,
	device_count : {type: Number, default: 0}, 
	created_at : String
	
});

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

module.exports = mongoose.model('user', userSchema);        
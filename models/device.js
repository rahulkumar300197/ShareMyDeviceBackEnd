'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceSchema = mongoose.Schema({ 
    name: String,
    os:String,
    version:String,
    imei:String,
    sticker_no : {type: String, unique: true}, 
    owner_id : {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        default: null,
    },
    assignee_id : {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        default: null,
    },
    is_available : {type: Boolean, default: false},
    shared_count : {type: Number, default: 0},
	created_at : String
	
});

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

module.exports = mongoose.model('device', deviceSchema);        
'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceSchema = mongoose.Schema({ 
    brand: {type: String, default:null},
    model: {type: String, default:null},
    os: {type: String, default:null},
    version: {type: String, default:null},
    screen_size: {type: String, default:null},
    resolution: {type: String, default:null},
    imei: {type: String, default:null},
    sticker_no : {type: String, unique: true}, 
    deviceCategory:{
        type: String,
        enum: [
          'ANDROID',
          'IOS',
          'CABLE',
        ],
        required:true
    },
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
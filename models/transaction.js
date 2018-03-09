'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = mongoose.Schema({ 
    device_id :{
        type: mongoose.Schema.ObjectId,
        ref: 'device',
        default: null,
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
    }
    
});

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

module.exports = mongoose.model('transaction', transactionSchema);        
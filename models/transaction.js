'use strict';
const config = require('../config/config');
const mongoose = require('mongoose');

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
    },
    transaction_date : {
        type: Date,
        default : Date.now()
    }
    
});

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

module.exports = mongoose.model('transaction', transactionSchema);        
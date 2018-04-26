'use strict';
const transaction = require('../models/transaction');

exports.addTransaction = (transaction_data) => {
	return new Promise((resolve,reject) => {
        const newTransaction = new transaction({
            device_id : transaction_data.device_id,
            owner_id : transaction_data.owner_id,
            assignee_id : transaction_data.assignee_id          
        });
      
        newTransaction.save()
        
        .then((data) => {
           resolve({ status: 201 ,transaction_id: data._id });
        })
      
        .catch(err => {
          if (err.code === 11000) {
            resolve({ status: 409, message: err.message });
          } else {
            resolve({ status: 500, message: 'Internal Server Error !' });
          }
        });
	});
}
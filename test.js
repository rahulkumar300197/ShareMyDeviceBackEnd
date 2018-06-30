// const transaction = require('./models/user');

// transaction.findOne({"email":"ADGEgEGE@ewvge.efe"},(err,data) => {
//     if (err) {
//         return;
//     }
//     console.log(data);
// });


const functions = require('./functions/utility_functions');

functions.updateStatusRequest()
.then((data) => {
    console.log(data);
    
})
.catch((err) => {
    console.log(err); 
} );
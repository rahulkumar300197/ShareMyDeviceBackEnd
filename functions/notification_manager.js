const admin = require('firebase-admin');
const serviceAccount = require('../config/sharemydevice-fd3fd-firebase');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sharemydevice-fd3fd.firebaseio.com"
});

exports.sendNotification = (data) => {
	return new Promise((resolve,reject) => {
        let payload = {
            data:{
                message:data.message
            }
        };

        let options = {
            priority:'high',
            timeToLive:24*60*60
        };

        admin.messaging().sendToDevice(data.token,payload,options)
        .then( (response) => {
            resolve(response);
        })
        .catch( (err) => {
            reject(err);
        })

	});  
}
const admin = require('firebase-admin');
const serviceAccount = require('../config/sharemydevice-fd3fd-firebase');
const config = require('../config/config');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebaseurl
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

        admin.messaging().sendToDevice(data.deviceToken,payload,options)
        .then( (response) => {
            console.log(JSON.stringify(response),"-----------NOTIFICATION_RESPONSE--------------");
            resolve(response);
        })
        .catch( (err) => {
            console.log(JSON.stringify(response),"-----------NOTIFICATION_ERR--------------");
            reject(err);
        })

	});  
}
const admin = require('firebase-admin');
const serviceAccount = require('../config/sharemydevice-fd3fd-firebase');
const token ="cfRnbI4b2tY:APA91bHx7uhAw3U0QWIkHfpOVGeA9Gw4e4YTlOZm7VuNjzKiNUSWH-9AIeA_qqGMj5UPBT_VDZoJqRFx-eZJa_5p6LZhOqQFfOKacjm6XpGbgjaMp3P6O07fg1F7dDeBIJXq4F1TFoQX";

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
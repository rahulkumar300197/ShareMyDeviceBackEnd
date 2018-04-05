
const admin = require('firebase-admin');
const serviceAccount = require('../config/sharemydevice-fd3fd-firebase');
const token ="dtzfpnFnBSw:APA91bGvBEMfvVDZ8joTnCmNlpFjAHE5Ms4J2EGAopeyqlUzqo90xh8BC5PARiWLkrR1Vc-5nfcWF9yNvncJard66cobeXAlazyDhFssWMxSb03v5Y1sTBMg3x7ZL06npbgbAVzrLD8Z";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sharemydevice-fd3fd.firebaseio.com"
});

var dettt="cfRnbI4b2tY:APA91bHx7uhAw3U0QWIkHfpOVGeA9Gw4e4YTlOZm7VuNjzKiNUSWH-9AIeA_qqGMj5UPBT_VDZoJqRFx-eZJa_5p6LZhOqQFfOKacjm6XpGbgjaMp3P6O07fg1F7dDeBIJXq4F1TFoQX";

sendNotification = (data) => {
	return new Promise((resolve,reject) => {
        let payload = {
            data:{
                message:"HI I am Rahul"
            }
        };

        let options = {
            priority:'high',
            timeToLive:24*60*60
        };

        admin.messaging().sendToDevice(token,payload,options)
        .then( (response) => {
            resolve(response);
        })
        .catch( (err) => {
            reject(err);
        })

	});  
}

sendNotification();
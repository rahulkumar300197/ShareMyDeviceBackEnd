"use strict";
const admin = require('firebase-admin');
const serviceAccount = require('../config/sharemydevice-fd3fd-firebase');
const config = require('../config/config');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebaseURL
});

exports.sendNotification = (data) => {
    return new Promise((resolve, reject) => {
        let payload = {
            data: {
                message: data.message
            }
        };

        let options = {
            priority: 'high',
            timeToLive: 24 * 60 * 60
        };

        admin.messaging().sendToDevice(data.deviceToken, payload, options)
        .then((response) => {
            resolve(response);
        })
        .catch((err) => {
            reject(err);
        });

    });
}
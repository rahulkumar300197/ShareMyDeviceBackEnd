'use strict';
const session = require('../models/session');

const sessionData = (options) => {
    return new Promise((resolve, reject) => {
        if (options.userId) {
            session.findOne(options, (err, data) => {
                if (err) reject(err);
                // console.log(data);
                resolve(data);
            });
        } else {
            reject({
                message: "Not Found"
            });
        }
    });
}

const deleteSession = (user_id) => {
    return new Promise((resolve, reject) => {
        if (user_id) {
            session.remove({
                userId: user_id
            }, (err, data) => {
                if (err) resolve(err);
                //console.log("Removed");
                resolve({
                    message: "removed",
                    status: 200
                });
            });
        } else {
            resolve({
                message: "Not Found",
                status: 404
            });
        }
    });
}

const newSession = (user_data) => {
    return new Promise((resolve, reject) => {
        const newSession = new session({
            userId: user_data._id,
            remoteIP: user_data.ip,
            deviceType: user_data.deviceType,
            deviceToken: user_data.deviceToken,
            is_Active: true
        });

        newSession.save()

            .then((session_data) => {
                resolve({
                    status: 201,
                    _id: session_data.userId
                });
            })

            .catch(err => {
                if (err.code === 11000) {
                    resolve({
                        status: 409,
                        message: err.message
                    });
                } else {
                    resolve({
                        status: 500,
                        message: 'Internal Server Error !'
                    });
                }
            });
    });
}

exports.setSession = (data) => {
    return new Promise((resolve, reject) => {
        sessionData({
                userId: data._id
            })
            .then((session_data) => {
                console.log("=======SESSION======", session_data);
                if (session_data == null) {
                    newSession(data)
                        .then((newsession) => {
                            if (newsession.status == 201) {
                                resolve({
                                    _id: newsession._id
                                });
                            }
                        });
                } else {
                    deleteSession(data._id + "")
                        .then((rem) => {
                            if (rem.status == 200) {
                                newSession(data)
                                    .then((newsession) => {
                                        resolve({
                                            _id: newsession._id
                                        });
                                    })
                                    .catch();
                            } else {
                                reject({
                                    status: 500,
                                    message: 'Internal Server Error !'
                                });
                            }
                        })
                        .catch();
                }
            })
            .catch(() => {
                console.log("888888888888888888888");
                reject({
                    status: 500,
                    message: 'Internal Server Error !'
                });
            });
    });
}

exports.verifySession = (session_data) => {
    console.log("=========Session Data=========", session_data);
    return new Promise((resolve, reject) => {
        sessionData({
                userId: session_data._id,
                is_Active: {
                    $ne: false
                }
            })
            .then((data) => {
                console.log(data);
                if (session_data.deviceType === data.deviceType && session_data.deviceToken === data.deviceToken) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch((err) => {
                resolve(false);
            });
    });
}

exports.removeSession = (data) => {
    return new Promise((resolve, reject) => {
        deleteSession(data)
            .then(() => resolve({
                message: "Successfully Logout",
                status: 200
            }))
            .catch(() => reject({
                message: "Not Found",
                status: 404
            }));
    });
}

exports.getSessionData = (user_data) => {
    return new Promise((resolve, reject) => {
        session.find({
            userId: user_data.owner_id,
            is_Active: {
                $ne: false
            }
        }, (err, data) => {
            if (err) {
                reject(err);
            } else if (data.length !== 0) {
                resolve(data);
            } else {
                reject({
                    data: "Not found"
                });
            }
        });
    });
};

exports.getAllActiveSessions = (criteria, options) => {
    return new Promise((resolve, reject) => {
        session.find(criteria, options, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

exports.deactivateSession = (user_id) => {
    return new Promise((resolve, reject) => {
        session.findByIdAndUpdate(user_id, {
                is_Active: false
            })
            .then(() => resolve({
                message: "Successfully Logout",
                status: 200
            }))
            .catch(() => reject({
                message: "Not Found",
                status: 404
            }));
    });
};
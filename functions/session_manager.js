'use strict';
const session = require('../models/session');

const sessionData = (user_id) => {
	return new Promise((resolve,reject) => {
		if (user_id) {
			session.findOne({userId:user_id},(err,data) => {
                if (err) reject(err);
               // console.log(data);
				resolve(data);
			});   
		} else {
			reject({message:"Not Found"});
		}
	});
}

const deleteSession = (user_id) => {
	return new Promise((resolve,reject) => {
		if (user_id) {
			session.remove({userId:user_id},(err,data) => {
                if (err) resolve(err);
                //console.log("Removed");
                resolve({message:"removed"});
			});   
		} else {
			resolve({message:"Not Found"});
		}
	});
}

const newSession = (user_data) => {
    return new Promise((resolve,reject) => {
        const newSession = new session({
            userId: user_data._id,
            remoteIP: user_data.ip,
            deviceType: user_data.deviceType,
            deviceToken: user_data.deviceToken             
        });
      
        newSession.save()
        
        .then((session_data) => {
           resolve({ status: 201, _id: session_data.userId});
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

exports.setSession = (data) => {
    return new Promise((resolve,reject) => {
        sessionData(data._id+"")
        .then((session_data) => {
          if(session_data ==null) {
              newSession(data)
              .then((newsession) => {
                  resolve(newsession);
              })
              .catch((err) => {});
          } else {
              deleteSession(data._id+"")
              .then((rem) => {
                newSession(data)
                .then((newsession) => {
                    resolve(newsession);
                })
                .catch((err) => {});
              })
              .catch((err) => {});
          }        
        })
        .catch((err) =>{reject(err)});           
    });
}

exports.verifySession = (session_data) => {
    return new Promise((resolve,reject) => {
        sessionData(session_data._id)
        .then((data) => {
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
    return new Promise((resolve,reject) => {
        deleteSession(data)
        .then(() => resolve({message:"Successfully Logout", status: 200}))
        .catch(() => reject({message:"Not Found", status: 404}));
    });
}

exports.getSessionData = (user_data) => {
    return new Promise((resolve,reject) => {
        session.find({userId:user_data.owner_id},(err,data) => {
            if(err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};
import { Session } from 'inspector';

'use strict';

const user = require('../models/user');
const device = require('../models/device');
const config = require('../config/config');
const sessionmanager = require('./session_manager');
const transactionmanager = require('./transaction_manager');
const notificationmanager = require('./notification_manager');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const hashPasswordUsingBcrypt = function (plainTextPassword) {
	const saltRounds = 10;
	return bcrypt.hashSync(plainTextPassword, saltRounds);
};

const comparePasswordUsingBcrypt = function (plainTextPassword, passwordhash) {
	return bcrypt.compareSync(plainTextPassword, passwordhash);
};

const verifyAccessToken = function (token) {

	//console.log("token -------------------------> "+token);
  if (token) {
    jwt.verify(token,config.secret, function(err, decoded) {      
      if (err) {
        return false; 
      } else {
        return decoded;
      }
    });
  } else {
	return false;
  }
}; 

const userData = function (user_id) {
	return new Promise((resolve,reject) => {
		if (user_id) {
			user.findById(user_id,(err,data) => {
				//console.log(JSON.stringify(data));  
				data.hashed_password=undefined;
				resolve(data);
			});   
		} else {
			resolve({message:"Not Found"});
		}
	});
  
} 

const deviceData = function (user_id) {
	return new Promise((resolve,reject) => {
		if (user_id !== undefined) {
			device.find({owner_id:user_id},(err,data) => {
				resolve(data);
			});   
		}else {
			reject({message:"Not Found"});
		}

	});
  
}

exports.registerUser = (data) => {
	//console.log(data.ip);
	return new Promise((resolve,reject) => {
		const newUser = new user({
			name : data.name,
			email : data.email, 
			mobile_no : data.mobile_no,
			hashed_password	: hashPasswordUsingBcrypt(data.password)
		});

		newUser.save()

		.then((user_data) =>  {
			data._id=user_data._id;
			sessionmanager.setSession(data)
			.then((session_data) => {
				const access_token = jwt.sign(session_data, config.secret, { expiresIn: 86400 } );
				data._id=undefined;
				resolve({access_token:access_token, user_data:user_data});
			})
			.catch(() => {});
		})

		.catch(err => {

			if (err.code == 11000) {
						
				reject({ status: 409, message: err.message });

			} else {
				reject({ status: 500, message: 'Internal Server Error !' });
			}
		});
	});

}

exports.registerDevice =  (data) => {

	
	return new Promise((resolve,reject) => {
	  const verify = jwt.verify(data.token,config.secret);
	  //console.log(JSON.stringify(verify));
	  data._id = verify._id;
	  
      if (verify._id) {
		const newDevice = new device({
	  	  name: data.name,
		  os:data.os,
		  version:data.version,
		  imei:data.imei,
		  sticker_no : data.sticker_no,
		  owner_id : verify._id
		});
		sessionmanager.verifySession(data)
		.then((session_data) => {
			if (session_data) {
				newDevice.save()
	            .then((device_data) => {
		  	      user.findByIdAndUpdate(verify._id, {$inc: {device_count:1}}, function (err, data) {
				    resolve({ status: 201, message: 'Device Registered Sucessfully !', device_data});
			      });
		        })
	
    	        .catch(err => {
    		      if (err.code == 11000) {		
    			    reject({ status: 409, message: 'Device Already Registered !' });
    		      } else {
	    		    reject({ status: 500, message: 'Internal Server Error !' });
	      	      }		
	            });
			} else {
				reject(false);
			}
		})
		.catch(() => {});	
		 
      } else {
	  	  reject(false);
  	  }
		
	});	 	  
	  
}

exports.checkAutorization = (req,res,next) => {
	 const bearerHeader = req.headers['authorization'];
	 //console.log(bearerHeader);
	 if (typeof bearerHeader !== undefined) {
		 const bearer = bearerHeader.split(" ");
		 const bearerToken = bearer[1];
		 req.body.token =  bearerToken;
         next();
	 } else {
		 res.sendStatus(403);
	 }
} 
	
exports.accessTokenLogin = (login_data) => {
	return new Promise((resolve,reject) => {
		const verify = jwt.verify(login_data.token,config.secret);
       
	  //console.log(JSON.stringify(verify));
        if (verify._id) {
			login_data._id=verify._id;
			sessionmanager.verifySession(login_data)
			.then((session_data) => {
				if (session_data) {
				  userData(verify._id)
			    .then((data) =>{
						deviceData(verify._id)
						.then((device) => {
							data.hashed_password = undefined;
							data._id = undefined;
							resolve({ data: {user_data: data, device_data: device},status:200});
						})
						.catch((err) => {
							user_data.hashed_password = undefined;
							user_data._id = undefined;
							resolve({ data: {user_data: data, device_data: err},status:200});
						});
			    })
			    .catch((err)=>{
					//console.log("ssss");  
				    reject({message: 'Incorrect Email or Password', status: 401});
		    	});
				} else {
				  //console.log("A");	
				  reject({message:'Unauthorized Access', status:401});
				}
			})
			.catch(() => {});
			
      } else {
		 // console.log("B");	
	  	  reject({message: 'Invalid Access Token', status: 404});
     	}
	});
} 

exports.emailPasswordLogin = (data) => {
  return new Promise((resolve,reject) => {
    if (data) {
      if (data.email !== undefined) {
		  	user.findOne({email:data.email},(err,user_data) => {
					console.log(user_data);
					if (err) reject({message: err, status:404});
					if (user_data == null){
						reject({message: 'Not Found !!',status:404});
					} else {
						if(comparePasswordUsingBcrypt(data.password, user_data.hashed_password)) {
							data._id=user_data._id;  
							sessionmanager.setSession(data)
							.then((session_data) => {
								const token = jwt.sign({_id:user_data._id}, config.secret, { expiresIn: 86400 } );
								deviceData(user_data._id)
								.then((device) => {
									user_data.hashed_password = undefined;
									user_data._id= undefined;
									user_data.forgot_password_token=undefined;
                  resolve({ data: {access_token: token, user_data: user_data, device_data: device},status:200});
								})
								.catch((err) => {
									user_data.hashed_password = undefined;
									user_data._id = undefined;
                  resolve({ data: {access_token: token, user_data: user_data, device_data: err},status:200});
								});						
									 
							})
							.catch(() => {});         
						} else {
							reject({message:'Incorrect Email or Password', status:401});
						}
					} 
			  	 
		  	});   
	  	} else {
	  		reject({message:'Bad Request !!', status: 400});
		  } 
    } else {
		reject({message:'Bad Request !!', status: 400});
	}
  });
}	 

exports.availableDevices = (token) => {
	return  new Promise((resolve,reject) => {
		jwt.verify(token, config.secret, function (err, decoded){
			if (err) {
				reject({status:404, message: err});
			} else {
				device.find({is_available:true},(err,data) => {
					if(err) {
						reject({status:404, message: err});
					} else {
						resolve({status:200, list: data});
					}   
				});
			}
	
		});
	});
}

exports.resetPassword = (data) => {
	return new Promise((resolve,reject) => {
		jwt.verify(data.token, config.secret,(err, decoded) => {
			if (err) {
				resolve({status: 200, message:err});
			} else {
				user.findById(decoded._id,(err,user_data) => {
					if(comparePasswordUsingBcrypt(data.password, user_data.hashed_password)) {
						user.findByIdAndUpdate(decoded._id, {hashed_password:hashPasswordUsingBcrypt(data.new_password)},(err, updated_data) => {
							if (err) {
								reject({status:401, message: err});
							} else {
								resolve({status:200, message:"Password Sucessfully Changed"});
							}
						});
					}
					else {
						resolve({status:401, message:"Invalid Current Password"});
					}
				});
			}
		});
	});	
}

exports.forgotPassword = (data) => {
	return new Promise((resolve,reject) => {
		user.findOne({email:data.email},(err,user_data) => {
			if (err) {
				reject({message:"Invalid Email", status:404});
			} else {
				const resetPasswordToken = jwt.sign({email:user_data.email}, config.secret, { expiresIn: 300 } );
				console.log(resetPasswordToken,"token");
				user.findByIdAndUpdate(user_data._id, {forgot_password_token:resetPasswordToken}, function (err, data) {
				    if (err) {

					} else {
						let transporter = nodemailer.createTransport({
							host: 'smtp.gmail.com',
							port: 587,
							secure: false, // true for 465, false for other ports
							auth: {
								user: config.email, // generated ethereal user
								pass: config.password // generated ethereal password
							}
						});
							
						let mailOptions = {
							from: '"ShareMyDevice"'+"<"+config.email+">", // sender address
							to: data.email, // list of receivers
							subject: 'Reset Password', // Subject line
							html: `Hello ${data.name},<br><br>
								  &nbsp;&nbsp;&nbsp;&nbsp; Your reset password link is there:-<br>
    			                  http://localhost:8080/api/v1/resetpasswordbytoken?token=${resetPasswordToken}<br> 
    			                  The token is valid for only 5 minutes.<br><br>
    			                  Thanks,<br>
    			                  Share My Device.`
						};
				
						transporter.sendMail(mailOptions, (error, info) => {
							if (error) {
								reject({message:err,status:404});
							} else {
								resolve({message:"Reset Password Link has been sent to your mail",status:200});
							}
						});
					}
			    });
			}
		});
	});	
}

exports.resetPasswordByToken = (data) => {
	return new Promise((resolve,reject) => {
		jwt.verify(data.token, config.secret,(err, decoded) => {
			if (err) {
				resolve({status: 200, message:err});
			} else {
				console.log(data.password,"pass");
				user.findOne({email: decoded.email},(err,user_data) => {
					user.findByIdAndUpdate(user_data._id, {hashed_password:hashPasswordUsingBcrypt(data.password),forgot_password_token:""},(err, updated_data) => {
						if (err) {
							reject({status:401, message: err});
						} else {
							resolve({status:200, message:"Password Sucessfully Changed"});
						}
					});
				});
			}
		});
	});	
}

exports.deviceNotification = (data) => {
	return new Promise((resolve,reject) => {
		sessionmanager.getSessionData(data)
		.then((session_data) => {
			const notification_data = {
				token: session_data.deviceToken,
				message: data.message
				//need to impliment with transection
			};
			notificationmanager.sendNotification(notification_data)
			.then((resolved_data) => {
				if(data.isAccepted) {
					var transection_data = {
						device_id : notification_data.device_id,
						owner_id : notification_data.owner_id,
						assignee_id : notification_data.assignee_id
					};
					transactionmanager.addTransaction(transection_data)
					.then(() => {
						user.findByIdAndUpdate(notification_data.owner_id, {$inc: {device_shared_count:1}},(err, updated_data) => {
							if (err) {
								reject({status:401, message: err});
							} else {
								//resolve({status:200, message:"Password Sucessfully Changed"});
							}
						});
						device.findByIdAndUpdate(notification_data.device_id, {$inc: {shared_count:1}},(err, updated_data) => {
							if (err) {
								reject({status:401, message: err});
							} else {
								//resolve({status:200, message:"Password Sucessfully Changed"});
							}
						});
					})
					.catch(() => {

					});
				} else if(data.isRequested){
					user.findByIdAndUpdate(notification_data.assignee_id, {$inc: {device_request_count:1}},(err, updated_data) => {
						if (err) {
							reject({status:401, message: err});
						} else {
							//resolve({status:200, message:"Password Sucessfully Changed"});
						}
					});
					resolve(resolved_data);
				}
			})
			.catch((err) => {
				reject(err);
			});
		})
		.catch((err) => {
			reject(err)
		});
	});    
}

exports.test = (user_id) => {
    user.find(user_id,(err,data)=>{ 
		console.log(JSON.stringify(data));    
	});
}
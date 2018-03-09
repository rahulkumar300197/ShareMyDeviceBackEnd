'use strict';

const user = require('../models/user');
const device = require('../models/device');
const config = require('../config/config');
const sessionmanager = require('./session_manager');
const transactionmanager = require('./transaction_manager');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');
const jwt = require('jsonwebtoken');

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
			first_name : data.first_name,
			last_name : data.last_name,
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
	jwt.verify(token, config.secret, function (err, decoded){
		if (err) {} else {}

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

exports.test = (user_id) => {
  user.find(user_id,(err,data)=>{ 
		console.log(JSON.stringify(data));    
	});
}
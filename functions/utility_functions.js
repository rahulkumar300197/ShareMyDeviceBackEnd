"use strict";

const user = require("../models/user");
const device = require("../models/device");
const config = require("../config/config");
const constant = require("../constants/constant");
const sessionmanager = require("./session_manager");
const transactionmanager = require("./transaction_manager");
const notificationmanager = require("./notification_manager");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const async = require("async");

const hashPasswordUsingBcrypt = plainTextPassword => {
	const saltRounds = 10;
	return bcrypt.hashSync(plainTextPassword, saltRounds);
};

const comparePasswordUsingBcrypt = (plainTextPassword, passwordhash) => {
	return bcrypt.compareSync(plainTextPassword, passwordhash);
};

const userData = user_id => {
	return new Promise((resolve, reject) => {
		if (user_id) {
			user.findById(user_id, (err, data) => {
				if (err) {
					reject({
						status: 500,
						message: "Internal Server Error !"
					});
				}
				data.hashed_password = undefined;
				resolve(data);
			});
		} else {
			reject({
				status: 404,
				message: "Not Found"
			});
		}
	});
};

const deviceData = user_id => {
	return new Promise((resolve, reject) => {
		if (user_id !== undefined) {
			device
				.find({
					$or: [{
							owner_id: user_id
						},
						{
							assignee_id: user_id
						}
					]
				})
				.populate("owner_id", [
					"device_shared_count",
					"device_request_count",
					"_id",
					"name",
					"email"
				])
				.populate("assignee_id", [
					"device_shared_count",
					"device_request_count",
					"_id",
					"name",
					"email"
				])
				.then(data => {
					resolve(data);
				})
				.catch(() => {
					reject({
						status: 500,
						message: "Internal Server Error !"
					});
				});
		}
	});
};

const send = (activeUser, cb) => {
	activeUser.message = constant.updateStatusMessage;
	notificationmanager.sendNotification(activeUser)
		.then((data) => {
			return cb(null, data);
		})
		.catch((err) => {
			return cb(err, null);
		});
};


exports.registerUser = data => {
	//console.log(data.ip);
	return new Promise((resolve, reject) => {
		const newUser = new user({
			name: data.name,
			email: data.email,
			mobile_no: data.mobile_no,
			hashed_password: hashPasswordUsingBcrypt(data.password)
		});
		var response_data = {};
		newUser
			.save()
			.then(user_data => {
				response_data.user_data = user_data;
				data._id = user_data._id;
				sessionmanager
					.setSession(data)
					.then(session_data => {
						const access_token = jwt.sign(session_data, config.secret, {
							expiresIn: 86400
						});
						data._id = undefined;
						resolve({
							access_token: access_token,
							user_data: user_data,
						});
					})
					.catch(() => {});
				return sessionmanager.setSession(data);
			})

			.then(session_data => {
				const access_token = jwt.sign(session_data, config.secret, {
					expiresIn: 86400
				});
				response_data.access_token = access_token;
				response_data.device_data = [];
				resolve(response_data);
			})

			.catch(err => {
				reject(err);
			});
	});
};

exports.registerDevice = data => {
	return new Promise((resolve, reject) => {
		const verify = jwt.verify(data.token, config.secret);
		data._id = verify._id;


		if (verify._id) {
			const newDevice = new device({
				brand: data.brand,
				model: data.model,
				os: data.os,
				version: data.version,
				screen_size: data.screen_size,
				resolution: data.resolution,
				imei: data.imei,
				sticker_no: data.sticker_no,
				deviceCategory: data.deviceCategory,
				owner_id: verify._id,
				assignee_id: verify._id
			});
			sessionmanager
				.verifySession(data)
				.then(session_data => {
					if (session_data) {
						return newDevice.save();
					} else {
						reject({
							message: "Unauthorized Access",
							status: 401
						});
					}
				})

				.then(() => {
					return user.findByIdAndUpdate(verify._id, {
						$inc: {
							device_count: 1
						}
					});
				})

				.then(() => {
					resolve({
						status: 201,
						message: "Device Registered Sucessfully !"
					});
				})

				.catch(err => {
					if (err.code === 11000) {
						reject({
							status: 409,
							message: "Device Already Registered !"
						});
					} else {
						reject({
							status: 500,
							message: "Invalid Data !!"
						});
					}
				});
		} else {
			reject({
				message: "Unauthorized Access",
				status: 401
			});
		}
	});
};

exports.updateuser = data => {
	return new Promise((resolve, reject) => {
		const verify = jwt.verify(data.token, config.secret);
		if (verify._id) {
			let sesssionModel = {
				_id: verify._id,
				deviceToken: data.user.deviceToken,
				deviceType: data.user.deviceType
			};
			sessionmanager
				.verifySession(sesssionModel)
				.then(session_data => {
					if (session_data) {
						return user.findByIdAndUpdate(verify._id, data.userData, {
							new: true
						});
					} else {
						reject({
							message: "Unauthorized Access",
							status: 401
						});
					}
				})
				.then(model => {
					resolve({
						status: 200,
						message: constant.success,
						data: model
					});
				})
				.catch(err => {
					reject({
						status: 401,
						message: err
					});
				});
		} else {
			reject({
				message: "Unauthorized Access",
				status: 401
			});
		}
	});
};

exports.updatedevice = data => {
	return new Promise((resolve, reject) => {
		const verify = jwt.verify(data.token, config.secret);
		if (verify._id) {
			let sesssionModel = {
				_id: verify._id,
				deviceToken: data.user.deviceToken,
				deviceType: data.user.deviceType
			};
			sessionmanager
				.verifySession(sesssionModel)
				.then(session_data => {
					if (session_data) {
						return device.findByIdAndUpdate(
							data.deviceData._id,
							data.deviceData, {
								new: true
							}
						);
					} else {
						reject({
							message: "Unauthorized Access",
							status: 401
						});
					}
				})

				.then(model => {
					resolve({
						status: 200,
						message: constant.success,
						data: model
					});
				})
				.catch(err => {
					reject({
						status: 401,
						message: err
					});
				});
		} else {
			reject({
				message: "Unauthorized Access",
				status: 401
			});
		}
	});
};

exports.checkAutorization = (req, res, next) => {
	const bearerHeader = req.headers["authorization"];
	//console.log(bearerHeader);
	if (typeof bearerHeader === undefined) {
		res.sendStatus(403);
	} else if (bearerHeader === undefined) {
		res.sendStatus(403);
	} else if (bearerHeader === null) {
		res.sendStatus(403);
	} else if (bearerHeader === '') {
		res.sendStatus(403);
	} else {
		const bearer = bearerHeader.split(" ");
		req.body.token = bearer[1];
		next();
	}
};

exports.accessTokenLogin = login_data => {
	return new Promise((resolve, reject) => {
		jwt.verify(login_data.token, config.secret, (err, decode) => {
			if (err) {
				reject({
					message: "Invalid Access Token",
					status: 404
				});
			}
			var data = {
				access_token: login_data.token
			};
			login_data._id = decode._id;
			sessionmanager
				.verifySession(login_data)

				.then(session_data => {
					if (session_data) {
						return userData(decode._id);
					} else {
						// console.log("A");
						reject({
							message: "Unauthorized Access",
							status: 401
						});
					}
				})

				.then(user_data => {
					user_data.hashed_password = undefined;
					data.user_data = user_data;
					return deviceData(decode._id);
				})

				.then(device => {
					data.device_data = device;
					resolve({
						data: data,
						status: 200
					});
				})
				.catch(err => {
					if (err.status == 500)
						reject({
							status: 500,
							message: "Internal Server Error !"
						});
				});
		});
	});
};

exports.emailPasswordLogin = data => {
	return new Promise((resolve, reject) => {
		if (data) {
			if (data.email !== undefined) {
				var response_data = {};
				user
					.findOne({
						email: data.email
					})
					.then(user_data => {
						//console.log(user_data);
						response_data.user_data = user_data;
						if (user_data == null) {
							reject({
								message: "Not Found !!",
								status: 404
							});
						} else {
							if (
								comparePasswordUsingBcrypt(
									data.password,
									user_data.hashed_password
								)
							) {
								data._id = user_data._id;
								return sessionmanager.setSession(data);
							} else {
								reject({
									message: "Incorrect Email or Password",
									status: 401
								});
							}
						}
					})

					.then(() => {
						const token = jwt.sign({
								_id: response_data.user_data._id
							},
							config.secret, {
								expiresIn: 86400
							}
						);
						response_data.access_token = token;
						return deviceData(response_data.user_data._id);
					})

					.then(device => {
						response_data.user_data.hashed_password = undefined;
						response_data.user_data.forgot_password_token = undefined;
						response_data.user_data.__v = undefined;
						response_data.device_data = device;
						resolve({
							data: response_data,
							status: 200
						});
					})

					.catch(err => {
						if (err.status == 500) {
							reject(err);
						} else {
							reject({
								message: "Something Went Wrong !!",
								status: 500
							});
						}
					});
			} else {
				reject({
					message: "Bad Request !!",
					status: 400
				});
			}
		} else {
			reject({
				message: "Bad Request !!",
				status: 400
			});
		}
	});
};

exports.getDevices = token => {
	return new Promise((resolve, reject) => {
		jwt.verify(token, config.secret, (err, decoded) => {
			device
				.find({
					owner_id: {
						$ne: decoded._id
					}
				})
				.populate("owner_id", [
					"device_shared_count",
					"device_request_count",
					"_id",
					"name",
					"email"
				])
				.populate("assignee_id", [
					"device_shared_count",
					"device_request_count",
					"_id",
					"name",
					"email"
				])
				.sort({
					is_available: -1
				})

				.then(data => {
					resolve({
						status: 200,
						list: data
					});
				})
				.catch(() => {
					reject({
						status: 404,
						message: "Something Went Wrong"
					});
				});
		})
	});
};

exports.resetPassword = data => {
	return new Promise((resolve, reject) => {
		jwt.verify(data.token, config.secret, (err, decoded) => {
			if (err) {
				reject({
					message: "Something Went Wrong !!",
					status: 500
				});
			} else {
				user.findById(decoded._id)
					.then(user_data => {
						if (
							comparePasswordUsingBcrypt(data.password, user_data.hashed_password)
						) {
							return user.findByIdAndUpdate(user_data._id, {
								hashed_password: hashPasswordUsingBcrypt(data.new_password)
							});
						} else {
							resolve({
								status: 401,
								message: "Password Not Matched"
							});
						}
					})
					.then(() => {
						resolve({
							status: 200,
							message: "Password Sucessfully Changed"
						});
					})
					.catch(() => {
						reject({
							message: "Something Went Wrong !!",
							status: 500
						});
					});
			}

		});
	});
};

exports.forgotPassword = data => {
	return new Promise((resolve, reject) => {
		let resetPasswordToken = null;
		user.findOne({
				email: data.email
			})
			.then(user_data => {
				if (user_data == null || user_data == undefined) {
					reject({
						message: "Invalid Email",
						status: 404
					});
				} else {
					resetPasswordToken = jwt.sign({
							email: user_data.email
						},
						config.secret, {
							expiresIn: 300
						}
					);
					return user.findByIdAndUpdate(user_data._id, {
						forgot_password_token: resetPasswordToken
					});
				}
			})
			.then(data => {
				let transporter = nodemailer.createTransport({
					host: "smtp.gmail.com",
					port: 587,
					secure: false, // true for 465, false for other ports
					auth: {
						user: config.email, // generated ethereal user
						pass: config.password // generated ethereal password
					}
				});

				let mailOptions = {
					from: '"ShareMyDevice"' + "<" + config.email + ">", // sender address
					to: data.email, // list of receivers
					subject: "Reset Password", // Subject line
					html: `Hello ${data.name},<br><br>
   &nbsp;&nbsp;&nbsp;&nbsp; Your reset password link is there:-<br>
   <a href="http://ec2-13-127-185-75.ap-south-1.compute.amazonaws.com:8000/?token=${resetPasswordToken}">Here</a><br>

   The token is valid for only 5 minutes.<br><br>
   Thanks,<br>
   Share My Device.`
				};

				return transporter.sendMail(mailOptions);
			})
			.then(() => {
				resolve({
					message: "Reset Password Link has been sent to your mail",
					status: 200
				});
			})
			.catch(() => {
				reject({
					message: "Something Went Wrong",
					status: 500
				});
			});
	});
};

exports.resetPasswordByToken = data => {
	return new Promise((resolve, reject) => {
		jwt.verify(data.token, config.secret, (err, decoded) => {
			if (err) {
				reject({
					status: 500,
					message: "Token Expired"
				});
			} else {
				user.findOne({
						email: decoded.email
					})
					.then(user_data => {
						return user.findByIdAndUpdate(user_data._id, {
							hashed_password: hashPasswordUsingBcrypt(data.password),
							forgot_password_token: ""
						});
					})
					.then(() => {
						resolve({
							status: 200,
							message: "Password Successfully Changed"
						});
					})
					.catch(
						reject({
							status: 500,
							message: "Token Expired"
						})
					);
			}
		});

	});
};

exports.deviceNotification = data => {
	return new Promise((resolve, reject) => {
		var session_data = {};
		const notification_data = {};
		console.log(JSON.stringify(data), "-----------REQUEST_DATA-----------");
		if (data.device_data._id == data.owner_id) {
			sessionmanager
				.getSessionData(data)
				.then(session => {
					session_data = session;
					console.log(JSON.stringify(session), "-----------SESSION_DATA-----------");
					return device.findById(data.device_id, ["is_available"]);
				})
				.then(is_available => {
					if (is_available.is_available) {

						notification_data.assignee_id = data.assignee_id;
						notification_data.device_id = data.device_id;
						notification_data.owner_id = data.owner_id;
						notification_data.deviceToken = session_data[0].deviceToken;
						notification_data.message = data.message;

						return notificationmanager.sendNotification(notification_data);
					} else {
						reject({
							status: 404,
							message: "Device is currently using by it's owner."
						});
					}
				})
				.then(resolved_data => {
					console.log(JSON.stringify(resolved_data), "-----------NOTIFICATION_RESPONSE-----------");

					var transection_data = {
						device_id: notification_data.device_id,
						owner_id: notification_data.owner_id,
						assignee_id: notification_data.assignee_id
					};

					return transactionmanager.addTransaction(transection_data);
				})
				.then(() => {
					return user.findByIdAndUpdate(notification_data.assignee_id, {
						$inc: {
							device_request_count: 1
						}
					});
				})
				.then(() => {
					return user.findByIdAndUpdate(notification_data.owner_id, {
						$inc: {
							device_shared_count: 1
						}
					});
				})
				.then(() => {
					return device.findByIdAndUpdate(notification_data.device_id, {
						$inc: {
							shared_count: 1
						},
						is_available: false,
						assignee_id: notification_data.assignee_id
					});
				})
				.then(() => {
					resolve({
						status: 200,
						message: "Sucess"
					});
				})
				.catch(() => {
					reject({
						status: 404,
						message: "User Not Available."
					});
				});
		} else {
			reject({
				status: 404,
				message: "Device Already assign to some another people."
			});
		}
	});
};

exports.deviceReturnNotification = data => {
	return new Promise((resolve, reject) => {
		var session_data = {};
		const notification_data = {};
		console.log(JSON.stringify(data), "-----------REQUEST_DATA-----------");
		sessionmanager
			.getSessionData(data)
			.then(session => {
				session_data = session;
				console.log(JSON.stringify(session), "-----------SESSION_DATA-----------");

				notification_data.assignee_id = data.assignee_id;
				notification_data.device_id = data.device_id;
				notification_data.owner_id = data.owner_id;
				notification_data.deviceToken = session_data[0].deviceToken;
				notification_data.message = data.message;

				return notificationmanager.sendNotification(notification_data);
			})
			.then(resolved_data => {
				console.log(JSON.stringify(resolved_data), "-----------NOTIFICATION_RESPONSE-----------");
				var transection_data = {
					device_id: notification_data.device_id,
					owner_id: notification_data.owner_id,
					assignee_id: null
				};
				return transactionmanager.addTransaction(transection_data);

			})
			.then(() => {
				return device.findByIdAndUpdate(
					notification_data.device_id, {
						is_available: true,
						assignee_id: notification_data.owner_id
					}
				);
			})
			.then(() => {
				resolve({
					status: 200,
					message: "Sucess"
				});
			})
			.catch(() => {
				reject({
					status: 401,
					message: "Something went wrong"
				});
			});
	});
};

exports.updateStatusRequest = () => {
	return new Promise((resolve, reject) => {
		let criteria = {
			deviceType: constant.android,
			is_Active: {
				$ne: false
			}
		};

		let options = {
			userId: 1,
			deviceToken: 1
		};

		sessionmanager
			.getAllActiveSessions(criteria, options)
			.then(activeUsers => {
				async.map(activeUsers, send, () => {
					resolve(constant.success);
				});
			})

			.catch(() => {
				reject(constant.falure);
			});
	});
};

exports.updatedeviceStatus = data => {
	return new Promise((resolve, reject) => {
		jwt.verify(data.token, config.secret, (err, decoded) => {
			if (err) {
				reject({
					status: 401,
					message: "Access Denied"
				});
			} else {
				let updateObj = {
					is_available: data.is_available
				};
				device.findByIdAndUpdate(
						data._id,
						updateObj, {
							new: true
						}
					)
					.then(() => {
						resolve({
							status: 200,
							message: constant.success
						});
					})

					.catch((err) => {
						reject({
							status: 401,
							message: err
						});
					});
			}
		});
	});
};

exports.test = user_id => {
	user.find(user_id, (err, data) => {
		console.log(JSON.stringify(data));
	});
}
'use strict';
const jwt = require('jsonwebtoken');
const CronJob = require('cron').CronJob;
const config = require('./config/config');
const functions = require('./functions/utility_functions');
const sessions = require('./functions/session_manager');


module.exports = router => {
	router.get('/', (req, res) => res.end('Welcome to Share My Device !'));
	router.post('/user_signup', (req, res) => {

		const data = req.body;
		//console.log(JSON.stringify(req.body));

		if (!data.name || !data.email || !data.password || !data.name.trim() || !data.email.trim() || !data.password.trim()) {

			res.status(400).json({
				message: 'Invalid Request !'
			});

		} else {
			var ip = req.connection.remoteAddress;
			ip = ip.split(':')[3];
			req.body.ip = ip;
			functions.registerUser(req.body)

				.then(result => {
					res.status(200).json(result);
					//res.writeHead({'Content-Type': 'application/json; charset=utf-8','X-Access-Token': token});
				})

				.catch(err => res.status(400).json({
					message: err.message
				}));
		}
	});

	router.post('/add_device', functions.checkAutorization, (req, res) => {
		//console.log(JSON.stringify(req.body));
		var ip = req.connection.remoteAddress;
		ip = ip.split(':')[3];
		req.body.ip = ip;
		const token = req.body.token;
		var data = req.body;
		functions.registerDevice(req.body)
			.then(result => {
				res.status(result.status).json({
					message: result.message,
					device_data: result.device_data
				});
			})
			.catch(err => res.status(err.status).json({
				message: err.message
			}));

	});

	router.post('/login', (req, res) => {
		var ip = req.connection.remoteAddress;
		ip = ip.split(':')[3];
		req.body.ip = ip;
		const data = req.body;
		if (!data.email || !data.password || !data.deviceToken || !data.deviceType || !data.email.trim() || !data.password.trim() || !data.deviceType.trim() || !data.deviceToken.trim()) {
			res.status(400).json({
				message: 'Bad Request !!',
				status: 400
			});
		} else {
			functions.emailPasswordLogin(data)
				.then(result => {
					res.status(result.status).json(result.data);
				})
				.catch(err => {
					res.status(err.status).json(err)
				});
		}
	});

	router.post('/access_token_login', functions.checkAutorization, (req, res) => {

		const data = req.body;
		//console.log(token);
		functions.accessTokenLogin(data)
			.then((result) => {
				res.status(result.status).json(result.data);
			})
			.catch((err) => {
				res.status(err.status).json(err);

			});
	});

	router.post('/logout', functions.checkAutorization, (req, res) => {
		const data = req.body.token;
		const verify = jwt.verify(data, config.secret);
		if (verify._id) {
			sessions.deactivateSession(verify._id)
				.then((result) => {
					res.status(result.status).json(result);
				})
				.catch((err) => {
					res.status(err.status).json(err);
				});

		} else {
			res.status(404).json({
				message: "Not Found"
			});
		}
	});

	router.post('/resetpassword', functions.checkAutorization, (req, res) => {
		functions.resetPassword(req.body)
			.then((data) => {
				res.status(data.status).json({
					message: data.message
				});
			})
			.catch((err) => {
				res.status(err.status).json({
					message: err.message
				});
			});
	});

	/*router.get('/resetpasswordbytoken', functions.validatetoken ,(req, res) => {
		 
	 });*/

	router.post('/resetpasswordbytoken', (req, res) => {
		console.log(JSON.stringify(req.body));
		functions.resetPasswordByToken(req.body)
			.then((data) => {
				res.status(data.status).json({
					message: data.message
				});
			})
			.catch((err) => {
				res.status(err.status).json({
					message: err.message
				});
			});
	});

	router.post('/forgotpassword', (req, res) => {
		functions.forgotPassword(req.body)
			.then((data) => {
				res.status(data.status).json({
					message: data.message
				});
			})
			.catch((err) => {
				res.status(err.status).json({
					message: err.message
				});
			});
	});

	router.post('/getDeviceList', functions.checkAutorization, (req, res) => {
		functions.getDevices(req.body.token)
			.then((data) => {
				res.status(data.status).json(data.list);
			})
			.catch((err) => {
				res.status(err.status).json({
					message: err.message
				});
			});

	});

	router.post('/deviceNotification', (req, res) => {
		functions.deviceNotification(req.body)
			.then((notification_data) => {
				res.status(notification_data.status).json({
					message: notification_data.message
				});
			})
			.catch((err) => {
				res.status(err.status).json({
					message: err.message
				});
			});
	});

	router.post('/deviceReturnNotification', (req, res) => {
		functions.deviceReturnNotification(req.body)
			.then((notification_data) => {
				res.status(notification_data.status).json({
					message: notification_data.message
				});
			})
			.catch((err) => {
				res.status(err.status).json({
					message: err.message
				});
			});
	});

	router.post('/updatedevicestatus', functions.checkAutorization, (req, res) => {
		functions.updatedeviceStatus(req.body).then((data) => {
			res.status(data.status).json({
				message: data.message
			});
		}).catch((err) => {
			res.status(err.status).json({
				message: err.message
			});
		});
	});

	router.post('/updateusers', functions.checkAutorization, (req, res) => {
		functions.updateuser(req.body).then((data) => {
			res.status(data.status).json(data);
		}).catch((err) => {
			res.status(err.status).json({
				message: err.message
			});
		});
	});

	router.post('/updatedevices', functions.checkAutorization, (req, res) => {
		functions.updatedevice(req.body).then((data) => {
			res.status(data.status).json(data);
		}).catch((err) => {
			res.status(err.status).json({
				message: err.message
			});
		});
	});

	router.post('/test', (req, res) => {
		var id = {
			"_id": req.body._id
		};
		functions.test(id);
	});

	var job = new CronJob('0 */60 9-19 * * 1-5', () => {
			console.log(">>------------------------Push send------------------------->>>>>");
			functions.updateStatusRequest()
				.then(() => {})
				.catch(() => {});
		},
		undefined,
		true,
		'Asia/Kolkata'
	);

}
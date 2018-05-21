'use strict';

const sessionmanager = require('./session_manager');

exports.checkAutorization = (req,res,next) => {
   const bearerHeader = req.headers['authorization'];
   //console.log(bearerHeader);
   if (typeof bearerHeader === undefined) {
       res.sendStatus(403);
   } else {
       const bearer = bearerHeader.split(" ");
       req.body.token = bearer[1];
       sessionmanager.verifySession(req.body)
	  .then((session_data) => {
		  if (session_data) {
            next(); 
		  } else {
            res.status(401).json({message:'Session Expired', status:401});
		  }
	  })
   }
} 
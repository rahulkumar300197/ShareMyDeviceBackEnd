const user = require('../models/user');
const device = require('../models/device');
const config = require('../config/config');

var getdata = () => {
    device.find({}).populate("owner_id").populate("assignee_id")
    .then((data) => {
        console.log(data);
    })
    .catch((err) => {
        console.log(err);
    });
}

getdata();
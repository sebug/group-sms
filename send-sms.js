const https = require('https');

// Get Access token method
// Doesn't seems to work, passing HTTP basic credentials directly
const getAccessToken = (callback) => {
    console.log('Getting access token');
    const clientKey = process.env.GROUP_SMS_CLIENT_KEY;
    const clientSecret = process.env.GROUP_SMS_CLIENT_SECRET;
    if (!clientKey) {
	throw new Error("Please specify environment variable GROUP_SMS_CLIENT_KEY");
    }
    if (!clientSecret) {
	throw new Error("Please specify environment variable GROUP_SMS_CLIENT_SECRET");
    }

    const data = 'grant_type=client_credentials';

    const options = {
	host: 'consent.swisscom.com',
	port: 443,
	path: '/o/oauth2/token',
	method: 'POST',
	headers: {
	    Authorization: 'Basic ' + new Buffer(clientKey + ':' + clientSecret).toString('base64'),
	    'Content-Length': data.length,
	    'Content-Type': 'application/x-www-form-urlencoded'
	}
    };

    const req = https.request(options, (res) => {
	console.log(`status code: ${res.statusCode}`);

	res.on('data', (d) => {
	    process.stdout.write(d);
	});
    });

    req.on('error', (error) => {
	console.error(error);
    });

    req.write(data);
    req.end();
};

const sendSMS = (targetNumber, message) => {
    const from = process.env.SMS_SENDER;
    const clientID = process.env.GROUP_SMS_CLIENT_KEY;
    const clientSecret = process.env.GROUP_SMS_CLIENT_SECRET;
    if (!from) {
	throw new Error("Please specify environment variable SMS_SENDER");
    }
    if (!clientID) {
	throw new Error("Please specify environment variable GROUP_SMS_CLIENT_KEY");
    }
    if (!clientSecret) {
	throw new Error("Please specify environment variable GROUP_SMS_CLIENT_SECRET");
    }
    const data = JSON.stringify({
	from: from,
	to: targetNumber,
	text: message
    });
    const requestID = 'gsms-' + Math.random();
    console.log("SCS-Request-ID: " + requestID);
    const headers = {
	'Content-Type': 'application/json',
	'Content-Length': data.length,
	'SCS-Version': 2,
	'client_id': clientID,
	'SCS-Request-ID': requestID,
	'Accept': 'application/json'
    };
    const options = {
	hostname: 'api.swisscom.com',
	port: 443,
	path: '/messaging/sms',
	method: 'POST',
	headers: headers
    };

    const req = https.request(options, (res) => {
	console.log(`status code: ${res.statusCode}`);

	console.log(res.headers);

	res.on('data', (d) => {
	    process.stdout.write(d);
	});
    });

    req.on('error', (error) => {
	console.error(error);
    });

    req.write(data);
    req.end();
};

if (process.argv.length < 4) {
    console.log('Usage: node send-sms.js targetnumber message');
} else {
    sendSMS(process.argv[2], process.argv[3]);
}




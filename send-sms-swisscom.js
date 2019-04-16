/*
   Copyright 2019 Sebastian Gfeller

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/


const https = require('https');

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
    console.log('Usage: node send-sms-swisscom.js targetnumber message');
} else {
    sendSMS(process.argv[2], process.argv[3]);
}


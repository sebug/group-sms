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

const eCallDomain = "www1.ecall.ch";
const sendFormat = "/ecallurl/ecallurl.ASP?WCI=Interface&Function=SendPage&Address={address}&Message={message}&AccountName={accountName}&AccountPassword={accountPassword}"

// The current API doesn't really receive the params as
// UTF-8, but instead as specified in https://www.ecall.ch/fileadmin/user_upload/ecall/ecall_entwickler/DS-Beschreibung_HTTP_HTTPS-Zugang.pdf
// Replace accordingly
const replaceUTF8Escapes = (text) =>
      text.replace('%C3%A8','%E8');

const sendSMS = (targetNumber, message) => {
    const eCallAccountName = process.env.ECALL_ACCOUNT_NAME;
    const eCallAccountPassword = process.env.ECALL_ACCOUNT_PASSWORD;

    if (!eCallAccountName) {
	throw new Error("Please specify ECALL_ACCOUNT_NAME");
    }
    if (!eCallAccountPassword) {
	throw new Error("Please specify ECALL_ACCOUNT_PASSWORD");
    }
    
    const requestPath = sendFormat.replace('{accountName}',encodeURIComponent(eCallAccountName))
	  .replace('{accountPassword}', encodeURIComponent(eCallAccountPassword))
	  .replace('{address}', encodeURIComponent(targetNumber))
	  .replace('{message}', replaceUTF8Escapes(encodeURIComponent(message)));

    const options = {
	hostname: eCallDomain,
	port: 443,
	path: requestPath,
	method: 'GET'
    };

    console.log(requestPath);

    const req = https.request(options, (res) => {
	console.log(`status code: ${res.statusCode}`);

	console.log(res.headers);

	res.on('data', (d) => {
	    process.stdout.write(d);
	});
    });

    req.end();
};

if (process.argv.length < 4) {
    console.log('Usage: node send-sms.js targetnumber message');
} else {
    sendSMS(process.argv[2], process.argv[3]);
}




const https = require('https');

const sendSMS = (targetNumber, message) => {
    console.log('Message is ' + message);
};

if (process.argv.length < 4) {
    console.log('Usage: node send-sms.js targetnumber message');
} else {
    sendSMS(process.argv[2], process.argv[3]);
}




const https = require('https');
const crypto = require('crypto');

const html = (inner) =>
      '<!DOCTYPE html>' +
      '<html>' +
      inner +
      '</html>';

const head = (inner) =>
      '<head>' +
      inner +
      '<meta charset="utf-8" />' +
      '<style>' + `
      body {
      font-family: sans-serif;
      }
`+
      '</style>' +
      '</head>';

const body = (inner) =>
      '<body>' +
      inner +
      '</body>';

const title = (t) =>
      '<title>' + t + '</title>';

const h1 = (t) =>
      '<h1>' + t + '</h1>';

const form = (inner) =>
      '<form method="post" action="/api/SendMessageTrigger">' +
      inner +
      '</form>';

const sendbutton = () =>
      '<button type="submit">Envoyer messages</button>';

const groups = JSON.parse(process.env.GROUPS_JSON);

const fieldset = (legend, inner) =>
      '<fieldset>' +
      '<legend>' + legend + '</legend>' +
      inner +
      '</fieldset>';

const groupDropdown = '<select name="groupe" required>' +
      groups.map(group =>
		 '<option value="' + group.name + '">' + group.displayName + '</option>').join(' ') +
      '</select>';

const messageInput = '<textarea name="message" rows="4" required>' +
      '</textarea>';

const confirmSend = '<p class="confirm-send-info">En appuyant sur "Envoyer messages", tous les destinataires dans le groupe choisi recevront un SMS.</p>' +
      '<p class="confirm-send"><label><input type="checkbox" name="iconfirm" required />Je confirme</label></p>';

const usernameAndPassword = '<p><label>Nom d\'utilisateur: <input name="username" required></label><br />' +
      '<label>Mot de passe: <input name="password" type="password" required></label></p>';

const contentSendForm = h1('Envoyer un message pour astreints Valavran') +
			form(
			    fieldset('Groupe destinataire',
				     groupDropdown) +
				fieldset('Message à envoyer',
					 messageInput) +
				fieldset('Autorisation',
					 usernameAndPassword) +
				confirmSend +
				sendbutton());

const returnLink = '<a href="/api/SendMessageTrigger">Nouveau message</a>';

const eCallDomain = "www1.ecall.ch";
const sendFormat = "/ecallurl/ecallurl.ASP?WCI=Interface&Function=SendPage&Address={address}&Message={message}&AccountName={accountName}&AccountPassword={accountPassword}";

// The current API doesn't really receive the params as
// UTF-8, but instead as specified in https://www.ecall.ch/fileadmin/user_upload/ecall/ecall_entwickler/DS-Beschreibung_HTTP_HTTPS-Zugang.pdf
// Replace accordingly
const replaceUTF8Escapes = (text) => {
    const replacements = [
	{ from: encodeURIComponent('è'), to: '%E8' },
	{ from: encodeURIComponent('é'), to: '%E9' },
	{ from: encodeURIComponent('à'), to: '%E0' }
    ];
    for (let r of replacements) {
	text = text.replace(new RegExp(r.from, 'g'), r.to);
    }
    return text;
};

const sendSMSEcall = (context, eCallAccountName, eCallAccountPassword, targetNumber, message, success, error) => {
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

    context.log(requestPath);

    const req = https.request(options, (res) => {
	context.log(`status code: ${res.statusCode}`);

	context.log(res.headers);

	res.on('data', (d) => {
	    context.log('' + d);
	    success();
	});
    });

    req.on('error', (err) => {
	context.log(err);
	error(err);
    });

    req.end();
};

const sendSMSSwisscom = (context, targetNumber, message, success, error) => {
    const clientID = process.env.GROUP_SMS_CLIENT_KEY;
    const clientSecret = process.env.GROUP_SMS_CLIENT_SECRET;
    if (!clientID) {
	throw new Error("Please specify environment variable GROUP_SMS_CLIENT_KEY");
    }
    if (!clientSecret) {
	throw new Error("Please specify environment variable GROUP_SMS_CLIENT_SECRET");
    }
    const data = JSON.stringify({
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
	context.log(`status code: ${res.statusCode}`);

	context.log(res.headers);

	res.on('data', (d) => {
	    context.log('' + d);
	    success();
	});
    });

    req.on('error', (err) => {
	context.log(err);
	error(err);
    });

    req.write(data);
    req.end();
};

const processSend = (context, requestBody, callback) => {
    const searchParams = new URLSearchParams(requestBody);
    const message = searchParams.get('message');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const recipient = searchParams.get('groupe');
    context.log('Provider used: ' + process.env.PROVIDER_USED);
    const successCallback = () => {
	callback('<p>Message envoyé au groupe ' + recipient + '. ' +
	returnLink +
		    '</p>');
    };
    const errorCallback = (err) => {
	callback('<p>Erreur d\'envoi au groupe ' + recipient + '! ' +
		 returnLink +
		 '</p>');
    };

    const passwordHashed = crypto.createHash('sha256').update(password, 'utf8').digest().toString('base64');
    if (passwordHashed !== process.env.PASSWORD_HASH) {
	context.log("Password does not match");
	errorCallback("Mot de passe incorrect.")
	return;
    }
    if (username !== process.env.CONNECTION_USERNAME) {
	context.log("Username does not match");
	errorCallback("Nom d'utilisateur incorrect");
	return;
    }


    if (process.env.PROVIDER_USED === 'ecall') {
	sendSMSEcall(context, username, password, recipient, message, successCallback, errorCallback);
    } else if (process.env.PROVIDER_USED === 'swisscom') {
	sendSMSSwisscom(context, process.env.TEST_NUMBER, message, successCallback, errorCallback);
	successCallback();
    }
};

const getGroupsFromJSON = (context, successCallback, errorCallback) => {
    const url = new URL(process.env.GROUPS_URL);
    const req = https.request(url, {}, (res) => {
	context.log(`groups status code: ${res.statusCode}`);

	res.on('data', (d) => {
	    const groups = JSON.parse('' + d);
	    successCallback(groups);
	});
    });

    req.on('error', (err) => {
	context.log(err);
	errorCallback(err);
    });

    req.end();
};

module.exports = function (context, req) {
    const successCallback = (groups) => {
	context.log(groups);
	let pageContent = contentSendForm;
	if (req.method === 'POST') {
	    processSend(context, req.body, pageContent => {
		context.res = {
		    status: 200,
		    body: html(
			head(
			    title('Envoyer un message')
			) +
			    body(
				pageContent
			    )
		    ),
		    headers: {
			'Content-Type': 'text/html'
		    }
		};
		context.done();
	    });
	} else {
	    context.res = {
		status: 200,
		body: html(
		    head(
			title('Envoyer un message')
		    ) +
			body(
			    contentSendForm
			)
		),
		headers: {
		    'Content-Type': 'text/html'
		}
	    };
	    context.done();
	}
    };
    const errorCallback = (err) => {
	context.res = {
	    status: 500,
	    body: html(
		head(
		    title('Envoyer un message')
		) +
		    body(
			err
		    )
	    ),
	    headers: {
		'Content-Type': 'text/html'
	    }
	};
	context.done();
    };
    getGroupsFromJSON(context, successCallback, errorCallback);
};

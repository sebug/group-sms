const https = require('https');

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

const contentSendForm = h1('Envoyer un message') +
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
const replaceUTF8Escapes = (text) =>
      text.replace('%C3%A8','%E8');

const sendSMS = (context, eCallAccountName, eCallAccountPassword, targetNumber, message, success, error) => {
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

const processSend = (context, requestBody, callback) => {
    const searchParams = new URLSearchParams(requestBody);
    const message = searchParams.get('message');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const recipient = searchParams.get('groupe');
    sendSMS(context, username, password, recipient, message, () => {
	callback('<p>Message envoyé au groupe ' + recipient + '. ' +
	returnLink +
		    '</p>');
    }, (err) => {
	callback('<p>Erreur d\'envoi au groupe ' + recipient + '! ' +
	returnLink +
		    '</p>');
    });
};

module.exports = function (context, req) {
    let pageContent = contentSendForm;
    if (req.method === 'POST') {
	context.log(req.params);
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

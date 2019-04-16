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

const groupDropdown = '<select name="groupe">' +
      groups.map(group =>
		 '<option value="' + group.name + '">' + group.displayName + '</option>').join(' ') +
      '</select>';

const messageInput = '<textarea name="message" rows="4">' +
      '</textarea>';

const confirmSend = '<p class="confirm-send-info">En appuyant sur "Envoyer messages", tous les destinataires dans le groupe choisi recevront un SMS.</p>' +
      '<p class="confirm-send"><label><input type="checkbox" name="iconfirm" />Je confirme</label></p>';

const usernameAndPassword = '<p><label>Nom d\'utilisateur: <input name="username" /></label><br />' +
      '<label>Mot de passe: <input name="password" type="password" /></label></p>';

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

const processSend = (context, requestBody) => {
    const searchParams = new URLSearchParams(requestBody);
    const message = searchParams.get('message');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const recipient = searchParams.get('groupe');
    context.log('Sending to ' + recipient);
    return '<p>Message envoyé</p>';
};

module.exports = function (context, req) {
    let pageContent = contentSendForm;
    if (req.method === 'POST') {
	context.log(req.params);
	pageContent = processSend(context, req.body);
    }
    
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
};

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

const messageInput = '<textarea name="message">' +
      '</textarea>';

const confirmSend = '<p class="confirm-send-info">En appuyant sur "Envoyer messages", tous les destinataires dans le groupe choisi recevront un SMS.</p>' +
      '<p class="confirm-send"><label><input type="checkbox" name="iconfirm" />Je confirme</label></p>';

module.exports = function (context, req) {
    
    context.res = {
	status: 200,
	body: html(
	    head(
		title('Envoyer un message')
	    ) +
		body(
		    h1('Envoyer un message') +
			form(
			    fieldset('Groupe destinataire',
				     groupDropdown) +
				fieldset('Message à envoyer',
					 messageInput) +
				confirmSend +
			    sendbutton())
		)
	),
	headers: {
	    'Content-Type': 'text/html'
	}
    };
    context.done();
};

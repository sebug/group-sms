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

const groups = [
    {
	name: 'TestNotifPolycom',
	displayName: 'Test de notifications'
    },
    {
	name: 'cheftm',
	displayName: 'Chef télématique'
    }
];

const fieldset = (legend, inner) =>
      '<fieldset>' +
      '<legend>' + legend + '</legend>' +
      inner +
      '</fieldset>';

const groupDropdown = '<select name="groupe">' +
      groups.map(group =>
		 '<option value="' + group.name + '">' + group.displayName + '</option>').join(' ') +
      '</select>';

module.exports = function (context, req) {
    context.log('groups JSON is');
    context.log(process.env.GROUPS_JSON);
    
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
				     groupDropdown()) +
			    sendbutton())
		)
	),
	headers: {
	    'Content-Type': 'text/html'
	}
    };
    context.done();
};

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

module.exports = function (context, req) {
    context.res = {
	status: 200,
	body: html(
	    head(
		title('Envoyer un message...')
	    ) +
		body(
		    h1('Envoyer un message')
		)
	),
	headers: {
	    'Content-Type': 'text/html'
	}
    };
    context.done();
};

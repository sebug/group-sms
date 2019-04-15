const https = require('https');

module.exports = function (context, req) {
    context.res = {
	status: 200,
	body: '<!DOCTYPE html>' +
	    '<html>' +
	    '<head>' +
	    '<title>Envoyer message</title>' +
	    '<meta charset="utf-8" />' +
	    '</head>' +
	    '<body'> +
	    '<h1>Envoyer message</h1>' +
	    '</body>' +
	    '</html>',
	headers: {
	    'Content-Type': 'text/html'
	}
    };
};

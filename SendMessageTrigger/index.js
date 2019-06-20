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

const getGroupsFromObject = (groupObject) =>
      Object.keys(groupObject).map(g => {
	  return {
	      name: g,
	      displayName: g
	  };
      });

const fieldset = (legend, inner) =>
      '<fieldset>' +
      '<legend>' + legend + '</legend>' +
      inner +
      '</fieldset>';

const groupDropdown = (groups) => '<select name="groupe" id="groupe" required>' +
      groups.map(group =>
		 '<option value="' + group.name + '">' + group.displayName + '</option>').join(' ') +
      '</select>' +
      '<div id="members"></div>';

const messageInput = '<textarea name="message" rows="4" required>' +
      '</textarea>';

const confirmSend = '<p class="confirm-send-info">En appuyant sur "Envoyer messages", tous les destinataires dans le groupe choisi recevront un SMS.</p>' +
      '<p class="confirm-send"><label><input type="checkbox" name="iconfirm" required />Je confirme</label></p>';

const usernameAndPassword = '<p><label>Nom d\'utilisateur: <input name="username" id="username" required></label><br />' +
      '<label>Mot de passe: <input name="password" id="password" type="password" required></label></p>';

const updateGroupJavascript = () => {
    return `<script>
	const userNameInput = document.querySelector('#username');
    const passwordInput = document.querySelector('#password');
    const groupDropdown = document.querySelector('#groupe');

    const createListFromMembers = (members) => {
	if (!members || !members.length) {
	    return '<p>Aucun astreint dans ce groupe</p>';
	}
	let res = '<h2>Astreints:</h2><ul>';
	for (let member of members) {
	    res += '<li>' + member.firstName + ' ' + member.lastName + ' (' +
		member.number + ')</li>';
	}
	res += '</ul>';
	return res;
    };

    let gotGroups = null;

    const ensureGroups = (username, password) => {
        return fetch('/api/GetFromGoogleSheetsTrigger?username=' + username +
		     '&password=' + password).then(response => {
            return response.json();
        }).then(groups => {
          if (!gotGroups && groups) {
            gotGroups = groups;
            let html = '';
            Object.keys(groups).forEach(k => {
               html += '<option value="' + k + '">' + k + '</option>';
            });
            groupDropdown.innerHTML = html;
          }
          return groups;
        });
    };

    const getGroups = (username, password, groupName) => {
	return ensureGroups(username, password).then(allGroups => {
                         return allGroups[groupName];
                     });
    };

    const verifyParametersSend = () => {
	const username = userNameInput.value;
	const password = passwordInput.value;
	const groupName = groupDropdown.value;

        if (username && password) {
            ensureGroups(username, password).then(groups => {
                console.log('Groups ensured');
                console.log(groups);
            });
        }

	if (username && password && groupName) {
	    getGroups(username, password, groupName).then(members => {
		const membersHtml = createListFromMembers(members);
		const membersDiv = document.querySelector('#members');
		membersDiv.innerHTML = membersHtml;
		console.log(members);
	    }, (err) => {
		alert('Erreur - pas pu obtenir les membres du groupe');
	    });
	}
    };
    
    userNameInput.addEventListener('change', verifyParametersSend);
    passwordInput.addEventListener('change', verifyParametersSend);
    groupDropdown.addEventListener('change', verifyParametersSend);
	</script>`;
};

const contentSendForm = (groupsArray) => h1('Envoyer un message pour astreints Valavran') +
			form(
			    fieldset('Groupe destinataire',
				     groupDropdown(groupsArray)) +
				fieldset('Message à envoyer',
					 messageInput) +
				fieldset('Autorisation',
					 usernameAndPassword) +
				confirmSend +
				sendbutton()) +
      updateGroupJavascript();



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
    context.log("SCS-Request-ID: " + requestID);
    const headers = {
	'Content-Type': 'application/json; encoding=utf-8',
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

	success();

	res.on('data', (d) => {
	    context.log('' + d);
	});
    });

    req.on('error', (err) => {
	context.log(err);
	error(err);
    });

    req.write(data);
    req.end();
};

const processSend = (context, groups, requestBody, callback) => {
    const searchParams = new URLSearchParams(requestBody);
    const message = searchParams.get('message');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const recipient = searchParams.get('groupe');
    context.log('Provider used: ' + process.env.PROVIDER_USED);
    const successCallback = (personsSent) => {
	if (personsSent) {
	    context.log('Sent to the following people');
	    context.log(personsSent);
	}
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
	const peopleToSendTo = groups[recipient];
	const sendPromises = peopleToSendTo.filter(person => person.number).map(person => new Promise((resolve, reject) => {
	    person.number = person.number.replace(/ /g, '');
	    context.log('Sending to ' + person.firstName + ' ' + person.lastName + ' ' + person.number);
	    let sentCallback = () => {
		resolve({
		    Sent: person
		});
	    };
	    sendSMSSwisscom(context, person.number, message, sentCallback, (err) => {
		context.log('Error sending to ' + person.number);
		resolve({
		    NotSent: person,
		    Error: err
		});
	    });
	}));
	Promise.all(sendPromises).then((personsSent) => {
	    successCallback(personsSent);
	}, errorCallback);
    }
};

const getGroupsFromJSON = (context, username, password, successCallback, errorCallback) => {
    if (!username || !password) {
	 context.log("Don't know username or password yet, no biggie, just return the empty list");
	 successCallback({});
	 return;
    }
    const url = new URL('https://group-sms.azurewebsites.net/api/GetFromGoogleSheetsTrigger?username=' + username +
			'&password=' + password);
    context.log('Calling ' + url);
    const req = https.request(url, {}, (res) => {
	context.log(`groups status code: ${res.statusCode}`);

	let fullData = '';
	

	res.on('data', (d) => {
	    context.log('Received group data');
	    fullData += d;
	});

	res.on('close', () => {
	    context.log('close');
	    const groups = JSON.parse(fullData);
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
    context.log('Starting execution');
    const successCallback = (groups) => {
	const groupsArray = getGroupsFromObject(groups);
	let pageContent = contentSendForm(groupsArray);
	if (req.method === 'POST') {
	    processSend(context, groups, req.body, pageContent => {
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
			    contentSendForm(groupsArray)
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
    let username = null;
    let password = null;
    try {
	if (req.body) {
	    const searchParams = new URLSearchParams(req.body);
	    username = searchParams.get('username');
	    password = searchParams.get('password');
	}
    } catch (e) {
	context.log('Error when extracting items');
	context.log(e);
    }
	
    getGroupsFromJSON(context, username, password, successCallback, errorCallback);
};

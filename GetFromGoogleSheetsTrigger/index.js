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
const {google} = require('googleapis');
const crypto = require('crypto');
const fs = require('fs');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The token will be read from the environment variable

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback, errorCallback) {
    fs.writeFile('credentials.json', process.env.GOOGLE_CREDENTIALS_CONTENT, function (err) {
	const auth = new google.auth.GoogleAuth({
	    scopes: SCOPES
	});
	auth.getClient().then(callback, errorCallback);
    });
}

function getAstreintsFromSheet(auth, sheetName, context) {
    return new Promise((resolve, reject) => {
	const sheets = google.sheets({version: 'v4', auth});
	sheets.spreadsheets.values.get({
	    spreadsheetId: process.env.GOOGLE_SHEET_ID,
	    range: sheetName + '!A2:C',
	}, (err, res) => {
	    if (err) {
		context.log(err);
		reject('The API returned an error: ' + err);
		return;
	    }
	    const rows = res.data.values;
	    if (rows && rows.length) {
		try {
		    resolve({
			sheetName: sheetName,
			rows: rows.map((row) => {
			    let r = {
				firstName: row[0],
				lastName: row[1],
				number: row[2]
			    };
			    if (r.number && r.number.toString().indexOf('00') === 0) {
				r.number = '+' + r.number.substr(2);
			    }
			    if (r.number) {
				r.number = r.number.replace(/ /g, '');
			    }
			    return r;
			})
		    });
		} catch (ex) {
		    context.log(ex);
		    reject(ex);
		}
	    } else {
		resolve({
		    sheetName: sheetName,
		    rows: []
		});
	    }
	});
    });
}

// get full name, normalized
function getFullName(person) {
    return ((person.firstName || '') +
			      ' ' +
	    (person.lastName || '')).toLowerCase()
	.replace('é','e')
	.replace('ë','e')
	.replace('ä','a')
	.replace('ô','o');
}

function getFullNameToNumberDict(groups) {
    let dict = {};
    for (let k of Object.keys(groups)) {
	const ll = groups[k];
	for (let person of ll) {
	    const fullName = getFullName(person);
	    if (person.number &&  /^[0-9 +]+$/.test(person.number) &&
	       !dict[fullName]) {
		dict[fullName] = person.number;
	    }
	}
    }
    return dict;
}

function replacePositionsWithNumbers(groups, dict) {
    for (let k of Object.keys(groups)) {
	const ll = groups[k];
	for (let person of ll) {
	    const fullName = getFullName(person);
	    if (!person.number || !(/^[0-9 +]+$/.test(person.number))) {
		if (dict[fullName]) {
		    person.number = dict[fullName];
		}
	    }
	}
    }
}


/**
 * Gets JSON for the different groups
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listAstreints(auth, context) {
    context.log('List astreints');
    const groups = {};
    const sheets = google.sheets({version: 'v4', auth});
    context.log('Getting google sheet ' + process.env.GOOGLE_SHEET_ID);
    sheets.spreadsheets.get({
	spreadsheetId: process.env.GOOGLE_SHEET_ID
    }, (err, res) => {
	context.log('got a result');
	if (err) {
	    context.res = {
		status: 400,
		body: 'The API returned an error: ' + err
	    };
	    context.done();
	    return;
	}
	const sheetNames = res.data.sheets.map((sheet) => {
	    return sheet.properties.title;
	});
	const sheetPromises = sheetNames.map((name) => {
	    return getAstreintsFromSheet(auth, name, context);
	});
	Promise.all(sheetPromises).then(function (results) {
	    context.log('In promise.all');
	    try {
		const groups = {};
		for (let sheet of results) {
		    groups[sheet.sheetName] = sheet.rows;
		}
		context.log('after let for');
		let dict = getFullNameToNumberDict(groups);
		replacePositionsWithNumbers(groups, dict);
		context.res = {
		    status: 200,
		    body: groups,
		    headers: {
			'Content-Type': 'application/json'
		    }
		};
		context.done();
	    } catch (ex) {
		context.log(ex);
		context.res = {
		    status: 400,
		    body: '"Failed in the very end"',
		    headers: {
			'Content-Type': 'application/json'
		    }
		};
		context.done();
	    }
	});
    });
}

// Copy paste (shame)
const verifyCredentials = (context, username, password, continuation) => {
    const forbidden = (message) => {
        context.res = {
            status: 400,
            body: message
        };
        context.done();
    };
    
    if (!username || !password) {
        forbidden("Veuillez donner votre nom d'utilisateur et mot de passe!");
        return;
    }
    const passwordHashed = crypto.createHash('sha256').update(password, 'utf8').digest().toString('base64');
    if (passwordHashed !== process.env.PASSWORD_HASH) {
        context.log("Password does not match");
        forbidden("Mot de passe incorrect");
        return;
    }
    if (username !== process.env.CONNECTION_USERNAME) {
        context.log("Username does not match");
        forbidden("Nom d'utilisateur incorrect");
        return;
    }
    context.log('Username and password match');
    continuation();
};

module.exports = (context, req) => {
    verifyCredentials(context, req.query.username, req.query.password,
		      () => {
			  authorize(auth => {
			      listAstreints(auth, context);
			  }, err => {
			      context.log('Could noth authorize using service account');
			      context.log(err);
			      context.res = {
				  status: 400,
				  body: '"Authorization failed"',
				  headers: {
				      'Content-Type': 'application/json'
				  }
			      };
			      context.done();
			  });
		      });
};

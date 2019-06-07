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

const verifyCredentials = (context, username, password, andThen) => {
    if (!username || !password) {
	context.res = {
	    status: 400,
	    body: "Veuillez donner votre nom d'utilisateur et mot de passe!"
	};
	context.done();
	return;
    }
    andThen();
};

module.exports = (context, req) => {
    verifyCredentials(context, req.query.username, req.query.password,
		      () => {
			  context.res = {
			      status: 200,
			      body: {
				  groupName: 'Test Group 2',
				  members: [
				  ]
			      },
			      headers: {
				  'Content-Type': 'application/json'
			      }
			  };
			  context.done();
		      });
};

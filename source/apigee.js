/* jshint esnext: true, -W024 */

var request = require('request');
var util = require('util');

const APIGEE_URL = 'https://api.enterprise.apigee.com/v1';

var importRevision = function(options, bundle, callback) {
	request({
		method: 'POST',
		url: util.format('%s/organizations/%s/apis', APIGEE_URL, options.org),
		headers: { 'Content-Type': 'application/octet-stream' },
		qs: { action: 'import', name: options.api },
		body: bundle.contents,
		auth: { user: process.env.username, password: process.env.password }
	}, function(err, response, body) {
		if (err) {
			callback(err);
			return;
		}

		if (response.statusCode !== 201) {
			callback('Received status code ' + response.statusCode + ' with body:' + body);
			return;
		}

		var bodyJson = JSON.parse(body);

		callback(null, {
			api: bodyJson.name,
			revision: bodyJson.revision
		});
	});
};

module.exports.import = importRevision;

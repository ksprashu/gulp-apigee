/* jshint esnext: true, -W024 */

var request = require('request');
var util = require('util');
var validator = require('revalidator');
var constraints = require('./constraints.js');

const APIGEE_URL = 'https://api.enterprise.apigee.com/v1';

var importRevision = function(options, bundle, callback) {
	var validationResult = validator.validate({ options: options, bundle: bundle}, constraints.import);
	if (!validationResult.valid) {
		var errors = [];
		validationResult.errors.forEach(function(validationError) {
			errors.push(util.format('A valid %s %s', 
						validationError.property, 
						validationError.message));
		});
		callback(new Error(errors));
		return;
	}

	request.post({
		url: util.format('%s/organizations/%s/apis', APIGEE_URL, options.org),
		headers: { 'Content-Type': 'application/octet-stream' },
		qs: { action: 'import', name: options.api },
		body: bundle.contents,
		auth: { user: options.username, password: options.password }
	}, function(err, response, body) {
		if (err) {
			callback(err);
			return;
		}

		body = JSON.parse(body);

		if (response.statusCode !== 201) {
			var r = { statusCode: response.statusCode, body: body };
			callback(r);
			return;
		}

		callback(null, body);
	});
};

var deployRevision = function(options, callback) {
	var validationResult = validator.validate({ options: options }, constraints.deploy);
	if (!validationResult.valid) {
		var errors = [];
		validationResult.errors.forEach(function(validationError) {
			errors.push(util.format('A valid %s %s', 
						validationError.property, 
						validationError.message));
		});

		callback(new Error(errors));
		return;
	}

	request.post({
		url: util.format('%s/organizations/%s/environments/%s/apis/%s/revisions/%s/deployments', APIGEE_URL, options.org, options.env, options.api, options.revision),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		qs: { override: options.override, delay: options.delay },
		auth: { user: options.username, password: options.password }
	}, function(err, response, body) {
		if (err) {
			callback(err);
			return;
		}

		body = JSON.parse(body);

		if (response.statusCode !== 200) {
			var r = { statusCode: response.statusCode, body: body };
			callback(r);
			return;
		}

		callback(null, body);
	});
};

module.exports.import = importRevision;
module.exports.deploy = deployRevision;

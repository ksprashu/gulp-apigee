/* jshint esnext: true, -W024 */

var request = require('request');
var util = require('util');
var validator = require('revalidator');
var validations = require('./validations.js');

const APIGEE_URL = 'https://api.enterprise.apigee.com/v1';

var importRevision = function(options, bundle, callback) {
	var validationResult = validator.validate({ options: options, bundle: bundle}, validations.import);
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

		if (body) {
			body = JSON.parse(body);
		}

		if (response.statusCode !== 201) {
			var r = { statusCode: response.statusCode, body: body };
			callback(new Error(JSON.stringify(r)));
			return;
		}

		callback(null, body);
	});
};

var activateRevision = function(options, callback) {
	var validationResult = validator.validate({ options: options }, validations.activate);
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

		if (body) {
			body = JSON.parse(body);
		}

		if (response.statusCode !== 200) {
			var r = { statusCode: response.statusCode, body: body };
			callback(new Error(JSON.stringify(r)));
			return;
		}

		callback(null, body);
	});
};

var updateRevision = function(options, bundle, callback) {
	var validationResult = validator.validate({ options: options, bundle: bundle}, validations.update);
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
		url: util.format('%s/organizations/%s/apis/%s/revisions/%s', APIGEE_URL, options.org, options.api, options.revision),
		qs: { validate: true },
		body: bundle.contents,
		auth: { user: options.username, password: options.password }
	}, function(err, response, body) {
		if (err) {
			callback(err);
			return;
		}

		if (body) {
			body = JSON.parse(body);
		}

		if (response.statusCode !== 200) {
			var r = { statusCode: response.statusCode, body: body };
			callback(new Error(JSON.stringify(r)));
			return;
		}

		callback(null, body);
	});
};

var getDeployedRevision = function(options, callback) {
	request.get({
		url: util.format('%s/o/%s/environments/%s/apis/%s/deployments', APIGEE_URL, options.org, options.env, options.api),
		auth: { user: options.username, password: options.password }
	}, function(err, response, body) {
		if (err) {
			callback(new Error(err));
			return;
		}

		if (body) {
			body = JSON.parse(body);
		}

		if (response.statusCode !== 200) {
			var r = { statusCode: response.statusCode, body: body };
			callback(new Error(JSON.stringify(r)));
			return;
		}

		callback(null, body);
	});
};

module.exports.import = importRevision;
module.exports.activate = activateRevision;
module.exports.update = updateRevision;
module.exports.getDeployedRevision = getDeployedRevision;

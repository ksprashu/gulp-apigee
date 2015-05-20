/*jshint esnext: true, node: true, -W024 */

var through = require('through2');
var gutil = require('gulp-util');
var apigee = require('./apigee.js');

var PluginError = gutil.PluginError;
const PLUGIN_NAME = 'gulp-apigee';

var importRevision = function (options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	return through.obj(function(file, enc, cb) {
		if (file.isNull()) {
			cb(new PluginError(PLUGIN_NAME, 'We cannot do anything useful with a null file'));
			return;
		}

		if (file.isStream()) {
			cb(new PluginError(PLUGIN_NAME, 'Stream is not supported'));
			return;
		}

		apigee.import(options, file, function(err, resp) {
			if (err) {
				cb(new PluginError(PLUGIN_NAME, err));
				return;
			}

			var r = {
				api: resp.name,
				revision: resp.revision
			};

			gutil.log(gutil.colors.green('imported ' + JSON.stringify(r)));
			if (options.verbose) { gutil.log(JSON.stringify(resp)); }

			options.revision = resp.revision;

			cb(null, file);
		});
	});
};

var deployRevision = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	apigee.deploy(options, function(err, resp) {
		if (err) {
			throw new PluginError(PLUGIN_NAME, err);
		}

		var r = {
			api: resp.aPIProxy,
			deployments: []
		};

		if (Array.isArray(resp.environment)) {
			resp.environment.forEach(function (deployment) {
				r.deployments.push({ env: deployment.environment, revision: deployment.revision, state: deployment.state });
			});
		} else {
			r.deployments.push( { env: resp.environment, revision: resp.revision, state: resp.state } );
		}

		gutil.log(gutil.colors.green('deployed ' + JSON.stringify(r)));
		if (options.verbose) { gutil.log(JSON.stringify(resp)); }
	});

	return through.obj(function(file, enc, cb) {
		cb(null, file);
	});
};

module.exports.import = importRevision;
module.exports.deploy = deployRevision;

/*jshint esnext: true, node: true, -W024 */

var through = require('through2');
var gutil = require('gulp-util');
var apigee = require('./apigee.js');
var libxmljs = require('libxmljs');
var stream = require('stream');
var File = require('vinyl');

var PluginError = gutil.PluginError;
const PLUGIN_NAME = 'gulp-apigee';

// options = { org, api, username, password }
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

// options = { org, env, api, username, password, revision, override, delay }
var activateRevision = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	return through.obj(function(file, enc, cb) {
		apigee.activate(options, function(err, resp) {
			if (err) {
				cb(new PluginError(PLUGIN_NAME, err));
				return;
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

			cb(null, file);
		});
	});
};

var test = function() {
	return through.obj(function(file, enc, cb) {
		console.log(file.relative);
		console.log(file.contents.toString('utf8'));
		cb(null, file);
	});
};

var promoteTo = function(targetEnv, options) {
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

		var revisionObject = JSON.parse(file.contents.toString(enc));
		options.revision = revisionObject.revision[0].name;
		options.env = targetEnv;
		gutil.log(gutil.colors.blue('promoting revision ' + options.revision + ' to ' + targetEnv));

		apigee.activate(options, function(err, resp) {
			if (err) {
				cb(new PluginError(PLUGIN_NAME, err));
				return;
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

			cb(null, file);
		});
	});
};

// options = { org, env, api, username, password }
var getDeployment = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	var revisionRead = false;

	var s = new stream.Readable({ objectMode: true });
	s._read = function() {
		if (revisionRead) {
			return s.push(null);
		}

		apigee.getDeployment(options, function(err, revision) {
			if (err) {
				throw new PluginError(PLUGIN_NAME, err);
			}

			var o = {
				path: 'revision',
				contents: new Buffer(JSON.stringify(revision))
			};

			revisionRead = true;
			s.push(new File(o));
		});
	};

	return s;
};

			
var promote = function(options) {
	apigee.getRevision(options, function(err, body) {
		if (err) {
			throw new PluginError(PLUGIN_NAME, err);
		}

		options.revision = body.revision[0].name;
		gutil.log(gutil.colors.blue('promoting revision ' + options.revision + ' from ' + options.fromEnv + ' to ' + options.toEnv));

		options.env = options.toEnv;
		apigee.deploy(options, function(err, body) {
			if (err) {
				throw new PluginError(PLUGIN_NAME, err);
			}

			var r = { api: body.aPIProxy, revision: body.revision, env: body.environment };
			gutil.log(gutil.colors.green('promoted ' + JSON.stringify(r)));
			if (options.verbose) { gutil.log(JSON.stringify(body)); }
		});
	});
};

var replace = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	return through.obj(function(file, enc, cb) {
		if (file.isDirectory()) {
			cb(null, file);
			return;
		}

		if (file.isNull()) {
			cb(new PluginError(PLUGIN_NAME, 'We cannot do anything useful with a null file'));
			return;
		}

		var path = file.relative;
		var replacementsForThisFile = options[path];

		if ((replacementsForThisFile === undefined) || (replacementsForThisFile === null) || (replacementsForThisFile.length === 0)) {
			cb(null, file);
			return;
		}

		gutil.log(gutil.colors.blue('replacing content in ' + path));

		var fileContents = file.contents.toString('utf8');

		var fileContentsXml = libxmljs.parseXml(fileContents);
		replacementsForThisFile.forEach(function(replacement) {
			var node = fileContentsXml.get(replacement.xpath);
			if (node === undefined) {
				gutil.log(gutil.colors.yellow('couldn\'t resolve replacement xpath ' + replacement.xpath + ' in ' + path));
				return;
			}
			if (node.type() === 'attribute') {
				node.value(replacement.value);
			} else { //comment or element
				node.text(replacement.value);
			}

			file.contents = new Buffer(xmlToString(fileContentsXml));
		});

		cb(null, file);
	});
};

var xmlToString = function(xml) {
	var str = xml.toString(false);
	str = str.replace('<?xml version="1.0" encoding="UTF-8"?>', '');
	return str.replace(/\n/g, '');
};

module.exports.import = importRevision;
module.exports.activate = activateRevision;
module.exports.promote = promote;
module.exports.promoteTo = promoteTo;
module.exports.replace = replace;
module.exports.getDeployment = getDeployment;
module.exports.test = test;

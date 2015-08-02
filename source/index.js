/*jshint esnext: true, node: true, -W024 */

var through = require('through2');
var gutil = require('gulp-util');
var apigee = require('./helpers/apigee.js');
var stream = require('stream');
var File = require('vinyl');
var select = require('xpath.js');
var dom = require('xmldom').DOMParser;
var git = require('git-last-commit');
var moment = require('moment');

var PluginError = gutil.PluginError;
var PLUGIN_NAME = 'gulp-apigee';
var REGEX_WORDWITHDOLLAR = /\$[a-z.]+/gi;

// options = { org, api, username, password }
var importRevision = function (options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	return through.obj(function(file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
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

var updateRevision = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	return through.obj(function(file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new PluginError(PLUGIN_NAME, 'Stream is not supported'));
			return;
		}

		apigee.getDeployedRevision(options, function (err, revision) {
			if (err) {
				cb(new PluginError(PLUGIN_NAME, err));
				return;
			}

			options.revision = revision.revision[0].name;

			apigee.update(options, file, function(err, resp) {
				if (err) {
					cb(new PluginError(PLUGIN_NAME, err));
					return;
				}

				var r = {
					api: resp.aPIProxy,
					deployments: []
				};

				r.deployments.push( { env: resp.environment, revision: resp.revision, state: resp.state } );

				gutil.log(gutil.colors.green('deployed ' + JSON.stringify(r)));
				if (options.verbose) { gutil.log(JSON.stringify(resp)); }

				cb(null, file);
			});
		});
	});
};

var promote = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}
	
	return through.obj(function(file, enc, cb) {

		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new PluginError(PLUGIN_NAME, 'Stream is not supported'));
			return;
		}

		var revisionObject = JSON.parse(file.contents.toString(enc));
		if (!revisionObject.revision) {
			cb(new PluginError(PLUGIN_NAME, 'Invalid stream passed in to promote method - it requires a revision stream to be passed in'));
			return;
		}

		options.revision = revisionObject.revision[0].name;
		gutil.log(gutil.colors.blue('promoting revision ' + options.revision + ' to ' + options.env));

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
var getDeployedRevision = function(options) {
	if (!options) {
		throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
	}

	var revisionRead = false;

	var s = new stream.Readable({ objectMode: true });

	s._read = function() {
		if (revisionRead) {
			return s.push(null);
		}

		apigee.getDeployedRevision(options, function(err, revision) {
			revisionRead = true;

			if (err) {
				gutil.log(gutil.colors.red(err.message));
				s.push(null);
				return;
			}

			s.push(new File( {
				path: 'revision',
				contents: new Buffer(JSON.stringify(revision))
			}));
		});
	};

	return s;
};

var setProxyDescription = function() {
	return through.obj(function(file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		if (file.isStream()) {
			cb(new PluginError(PLUGIN_NAME, 'Stream is not supported'));
			return;
		}

		if ((file.relative.substr(-4) === '.xml') &&
				(file.contents.toString('utf8').indexOf('<APIProxy') > -1)) {
			var fileContents = file.contents.toString('utf8');
			var fileContentsXml = new dom().parseFromString(fileContents);
			var descriptionElement = select(fileContentsXml, '/APIProxy/Description')[0];
			if (descriptionElement === undefined) {
				cb('couldn\'t locate Description element in ' + file.relative, file);
				return;
			}

			var desc = descriptionElement.firstChild.data;

			if (desc.indexOf('$') < 0) {
				gutil.log(gutil.colors.yellow(file.relative + ' does not contain any placeholders'));
				cb(null, file);
				return;
			}

			git.getLastCommit(function(err, commit) {
				if (err) {
					cb(err, file);
					return;
				}

				commit.committedDate = moment(commit.committedOn * 1000).format();

				desc.match(REGEX_WORDWITHDOLLAR).forEach(function(token) {
					var prop = token.replace('$','');
					desc = desc.replace(token, Object.resolve(prop, commit));
					desc = desc.replace(/\s\s/g, ' '); //if any placeholder's value is empty, we get two spaces
				});

				gutil.log(gutil.colors.green('setting proxy description to "' + desc + '"'));
				descriptionElement.firstChild.data = desc;
				file.contents = new Buffer(xmlToString(fileContentsXml));
				cb(null, file);
			});
		} else {
			// this is not proxy description file - pass it along
			cb(null, file);
		}
	});
};

var xmlToString = function(xml) {
	var str = xml.toString(false);
	str = str.replace('<?xml version="1.0" encoding="UTF-8"?>', '');
	return str.replace(/\n/g, '');
};

Object.resolve = function(path, obj) {
    return path.split('.').reduce(function(prev, curr) {
        return prev[curr];
    }, obj);
};

module.exports.import = importRevision;
module.exports.activate = activateRevision;
module.exports.update = updateRevision;
module.exports.promote = promote;
module.exports.getDeployedRevision = getDeployedRevision;
module.exports.setProxyDescription = setProxyDescription;

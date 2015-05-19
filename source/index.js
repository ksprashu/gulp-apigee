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

			gutil.log(gutil.colors.green('Imported ' + JSON.stringify(resp)));
			cb(null, file);
		});
	});
};

module.exports.import = importRevision;

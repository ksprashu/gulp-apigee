var file = require('gulp-file');

module.exports.getVinyl = function(name, contents, isNull, isStream) {
	var vinylFile = file('bundle.zip', 'zip-contents');
	vinylFile.isNull = function() { return isNull || false; }
	vinylFile.isStream = function() { return isStream || false; }
	vinylFile.name = name;

	return vinylFile;
};
var file = require('gulp-file');

module.exports.getVinyl = function(name, contents, isNull, isStream, isDirectory) {
	var vinylFile = file(name, contents);
	vinylFile.isNull = function() { return isNull || false; };
	vinylFile.isStream = function() { return isStream || false; };
	vinylFile.isDirectory = function() { return isDirectory || false; };
	vinylFile.name = name;
	vinylFile.relative = name;
	vinylFile.contents = new Buffer(contents);

	return vinylFile;
};
module.exports.getVinyl = function(name, contents, isNull, isStream, isDirectory) {
	var file = requireUncached('gulp-file');

	if (contents) {
		vinylFile = file(name, contents);
	} else {
		vinylFile = file(name, '');
	}

	vinylFile.isNull = function() { return isNull || false; };
	vinylFile.isStream = function() { return isStream || false; };
	vinylFile.isDirectory = function() { return isDirectory || false; };
	vinylFile.name = name;
	vinylFile.relative = name;

	if (contents) {
		vinylFile.contents = new Buffer(contents);
	}

	return vinylFile;
};

function requireUncached(module){
    delete require.cache[require.resolve(module)];
    return require(module);
}

var gulp = require('gulp');
var zip = require('gulp-zip');
var options = require('./config/test.js');
var apigee = require('../../source/index.js');

gulp.task('import', function(){
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(apigee.replace(options.replace))
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options));
});

gulp.task('deploy', function() {
	gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(apigee.replace(options.replace))
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options))
		.pipe(apigee.deploy(options));
});

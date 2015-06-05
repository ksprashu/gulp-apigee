var gulp = require('gulp');
var zip = require('gulp-zip');
var gutil = require('gulp-util');
var args = require('yargs').argv;
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

// gulp promote --from test --to prod
gulp.task('promote', function() {
	options.fromEnv = args.from;
	options.toEnv = args.to;
	return apigee.promote(options);
});

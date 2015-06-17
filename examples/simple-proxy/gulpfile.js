var gulp = require('gulp');
var zip = require('gulp-zip');
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
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(apigee.replace(options.replace))
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options))
		.pipe(apigee.activate(options));
});

gulp.task('promote', function() {
	var targetEnv = args.to;
	return apigee.getDeployment(options)
		.pipe(apigee.promoteTo(targetEnv, options));
});

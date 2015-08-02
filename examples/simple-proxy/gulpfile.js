var gulp = require('gulp');
var zip = require('gulp-zip');
var args = require('yargs').argv;
var apigee = require('../../source/index.js');
var intercept = require('gulp-intercept');
var xpath = require('gulp-xml-replace');

var testOptions = require('./config/test.js');
var prodOptions = require('./config/prod.js');

var getOptions = function(env) {
	switch(env) {
		case 'test':
			return testOptions;
		case 'prod':
			return prodOptions;
	}
};

gulp.task('import', function(){
	var options = getOptions(args.env);
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(xpath.replace(options.replace))
		.pipe(apigee.setProxyDescription())
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options));
});

gulp.task('deploy', function() {
	var options = getOptions(args.env);
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(xpath.replace(options.replace))
		.pipe(apigee.setProxyDescription())
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options))
		.pipe(apigee.activate(options));
});

gulp.task('update', function() {
	var options = getOptions(args.env);
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(xpath.replace(options.replace))
		.pipe(apigee.setProxyDescription())
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.update(options));
});

gulp.task('promote', function() {
	var sourceEnvOptions = getOptions(args.env);
	var targetEnvOptions = getOptions(args.to);
	return apigee.getDeployedRevision(sourceEnvOptions)
		.pipe(apigee.promote(targetEnvOptions));
});

gulp.task('desc', function() {
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(apigee.setProxyDescription())
		.pipe(intercept(function(file) {
			console.log(file.relative);
			if (file.contents !== null) {
				console.log(file.contents.toString('utf8'));
			}
		}));
});

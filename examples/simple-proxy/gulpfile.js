var gulp = require('gulp');
var zip = require('gulp-zip');
var options = require('../../config/test.js');
var apigee = require('../../source/index.js');

gulp.task('apigee:import', function(){
	return gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(apigee.replace(options.replace))
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options));
});

gulp.task('apigee:deploy', (options.revision) ? null : ['apigee:import'], function() {
	return apigee.deploy(options);
});

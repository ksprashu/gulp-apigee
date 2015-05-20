var gulp = require('gulp');
var zip = require('gulp-zip');
var options = require('../../config/test.js');
var apigee = require('../../source/index.js');

gulp.task('apigee:import', function(){
	gulp.src(['./apiproxy/**'], {base: '.'})
		.pipe(zip('apiproxy.zip'))
		.pipe(apigee.import(options));
});

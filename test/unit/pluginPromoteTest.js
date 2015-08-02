/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var options = require('../helpers/options.js');
var apigee = require('../../source/helpers/apigee.js');
var gutil = require('gulp-util');
var vinyl = require('../helpers/vinylHelper.js');
var fs = require('fs');
var plugin = require('../../source/index.js');

var apigeeActivateMethod,
	gutilLogMethod,
	throughObjMethod;

describe('feature: promote plugin', function() {

	beforeEach(function() {
		apigeeActivateMethod = sinon.stub(apigee, 'activate');
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	afterEach(function() {
		apigeeActivateMethod.restore();
		gutilLogMethod.restore();
		throughObjMethod.restore();
	});

	it('should throw error if options is null or empty', function() {
		var exception;
		try { plugin.promote(); } catch (e) { exception = e; }

		expect(exception).to.be.not.undefined;
		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');
	});

	it('should ignore null file and pass it along', function() {
		var vinylFile = vinyl.getVinyl('file', 'contents', true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.promote(options);

		expect(error).to.be.null;
		expect(nextFile).to.be.not.null;
		expect(nextFile.isNull()).to.be.true;
	});

	it('should throw error if file is stream', function() {
		var error;
		var vinylFile = vinyl.getVinyl('bundle.zip', 'bundle-contents', false, true);
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		plugin.promote(options); 

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('Stream is not supported');
	});

	it('should handle incorrect input being streamed in to promote method', function() {
		var getDeployedRevisionResponse = '{"a":"b"}';
		var vinylFile = vinyl.getVinyl('revision', getDeployedRevisionResponse);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, 'utf8', function(err, file) { error = err; nextFile = file; });

		plugin.promote(options);

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('Invalid stream passed in to promote method - it requires a revision stream to be passed in');
	});

	it('should handle apigee activation error properly', function() {
		var getDeployedRevisionResponse = fs.readFileSync('./test/apigee-responses/getDeployedRevisionResponse.json', 'utf8');
		var vinylFile = vinyl.getVinyl('revision', getDeployedRevisionResponse);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, 'utf8', function(err, file) { error = err; nextFile = file; });

		apigeeActivateMethod
			.yields('something happened');

		plugin.promote(options);

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('promoting revision 1 to test'));
	});

	it('should handle single revision activation response', function() {
		var getDeployedRevisionResponse = fs.readFileSync('./test/apigee-responses/getDeployedRevisionResponse.json', 'utf8');
		var vinylFile = vinyl.getVinyl('revision', getDeployedRevisionResponse);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, 'utf8', function(err, file) { error = err; nextFile = file; });

		var activateResponse = JSON.parse(fs.readFileSync('./test/apigee-responses/singleRevisionDeploymentResponse.json', 'utf8'));
		apigeeActivateMethod
			.yields(null, activateResponse); 

		var verbosity = options.verbose;
		options.verbose = false;
		plugin.promote(options);
		options.verbose = verbosity;

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('promoting revision 1 to test'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.green('deployed {"api":"gulp-v1","deployments":[{"env":"test","revision":"1","state":"deployed"}]}'));
		expect(gutilLogMethod.callCount).to.be.equal(2); //this is to make sure it understands verbose switch 
	});

	it('should handle multiple revision activation response', function() {
		var getDeployedRevisionResponse = fs.readFileSync('./test/apigee-responses/getDeployedRevisionResponse.json', 'utf8');
		var vinylFile = vinyl.getVinyl('revision', getDeployedRevisionResponse);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, 'utf8', function(err, file) { error = err; nextFile = file; });

		var activateResponse = JSON.parse(fs.readFileSync('./test/apigee-responses/multipleRevisionDeploymentResponse.json', 'utf8'));
		apigeeActivateMethod
			.yields(null, activateResponse); 

		var verbosity = options.verbose;
		options.verbose = true;
		plugin.promote(options);
		options.verbose = verbosity;

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('promoting revision 1 to test'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.green('deployed {"api":"gulp-v1","deployments":[{"env":"test","revision":"2","state":"deployed"},{"env":"test","revision":"1","state":"undeployed"}]}'));
		expect(gutilLogMethod.getCall(2).args[0]).to.be.equal(JSON.stringify(activateResponse));
		expect(gutilLogMethod.callCount).to.be.equal(3); //this is to make sure it understands verbose switch 
	});

});

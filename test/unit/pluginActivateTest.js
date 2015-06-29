/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var options = require('../helpers/options.js');
var apigee = require('../../source/apigee.js');
var gutil = require('gulp-util');
var vinyl = require('../helpers/vinylHelper.js');
var fs = require('fs');
var plugin = require('../../source/index.js');

var apigeeActivateMethod,
	gutilLogMethod,
	throughObjMethod;

describe('feature: activate plugin', function() {

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
		try { plugin.activate(); } catch (e) { exception = e; }

		expect(exception).to.be.not.undefined;
		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');
	});

	it('should propagate apigee errors', function() {
		var vinylFile = vinyl.getVinyl('bundle.zip', 'bundle-contents', false, true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		apigeeActivateMethod
			.yields(new Error('something happened in Apigee'));

		plugin.activate(options);

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('something happened in Apigee');
	});

	it('should process single revision deployment response correctly', function() {
		var vinylFile = vinyl.getVinyl('bundle.zip', 'bundle-contents', false, true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		var apigeeResponse = JSON.parse(fs.readFileSync('./test/apigee-responses/singleRevisionDeploymentResponse.json', 'utf8'));

		apigeeActivateMethod
			.yields(null, apigeeResponse);

		var verbosity = options.verbose;
		options.verbose = false;
		plugin.activate(options); 
		options.verbose = verbosity;

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.green('deployed {"api":"gulp-v1","deployments":[{"env":"test","revision":"1","state":"deployed"}]}'));
		expect(gutilLogMethod.callCount).to.be.equal(1); //this is to make sure it understands verbose switch 
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('bundle.zip');
	});
	
	it('should process multiple revision deployment response correctly', function() {
		var vinylFile = vinyl.getVinyl('bundle.zip', 'bundle-contents', false, true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		var apigeeResponse = JSON.parse(fs.readFileSync('./test/apigee-responses/multipleRevisionDeploymentResponse.json', 'utf8'));
		apigeeActivateMethod
			.yields(null, apigeeResponse);

		var verbosity = options.verbose;
		options.verbose = true;
		plugin.activate(options); 
		options.verbose = verbosity;

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.green('deployed {"api":"gulp-v1","deployments":[{"env":"test","revision":"2","state":"deployed"},{"env":"test","revision":"1","state":"undeployed"}]}'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(JSON.stringify(apigeeResponse));
		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('bundle.zip');
	});
});

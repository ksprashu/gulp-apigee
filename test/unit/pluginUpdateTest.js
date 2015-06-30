/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var options = require('../helpers/options.js');
var apigee = require('../../source/apigee.js');
var gutil = require('gulp-util');
var vinylHelper = require('../helpers/vinylHelper.js');
var plugin = require('../../source/index.js');
var fs = require('fs');

var apigeeUpdateMethod,
	gutilLogMethod,
	throughObjMethod;

describe('feature: import plugin', function() {

	before(function() {
		apigeeUpdateMethod = sinon.stub(apigee, 'update');
		apigeeGetDeployedRevisionMethod = sinon.stub(apigee, 'getDeployedRevision');
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	after(function() {
		apigeeUpdateMethod.restore();
		apigeeGetDeployedRevisionMethod.restore();
		gutilLogMethod.restore();
		throughObjMethod.restore();
	});

	it('should throw error if options is null or empty', function() {
		var exception;
		try { plugin.update(); } catch (e) { exception = e; }

		expect(exception).to.be.not.undefined;
		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');
	});

	it('should ignore null file and pass it along', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', null, true);

		var error, returnedFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; returnedFile = file; });

		plugin.update(options); 

		expect(error).to.be.null;
		expect(returnedFile).to.be.not.null;
		expect(returnedFile.isNull()).to.be.true;
	});

	it('should throw error if file is stream', function() {
		var error;
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents', false, true);
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		plugin.update(options); 

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('Stream is not supported');
	});

	it('should handle error coming from apigee.getDeployedRevision', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents');

		var error;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		apigeeGetDeployedRevisionMethod
			.yields(new Error('something happened in apigee'));

		plugin.update(options);

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('something happened in apigee');
	});

	it('should handle error coming from apigee.update method', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents');

		var apigeeGetDeployedRevisionResponseBody = JSON.parse(fs.readFileSync('./test/apigee-responses/getDeployedRevisionResponse.json', 'utf8'));

		var error;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		apigeeGetDeployedRevisionMethod
			.yields(null, apigeeGetDeployedRevisionResponseBody);

		apigeeUpdateMethod
			.yields(new Error('something happened in apigee'));

		plugin.update(options);

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('something happened in apigee');
	});

	it('should process successful response from apigee update', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents');

		var apigeeGetDeployedRevisionResponseBody = JSON.parse(fs.readFileSync('./test/apigee-responses/getDeployedRevisionResponse.json', 'utf8'));
		var apigeeUpdateResponseBody = JSON.parse(fs.readFileSync('./test/apigee-responses/updateRevisionResponse.json', 'utf8'));

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { });

		apigeeGetDeployedRevisionMethod
			.yields(null, apigeeGetDeployedRevisionResponseBody);

		apigeeUpdateMethod
			.yields(null, apigeeUpdateResponseBody); 

		var verbosity = options.verbose;
		options.verbose = false;
		plugin.update(options);
		options.verbose = verbosity;

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.green('deployed {"deployments":[{"revision":"1"}]}'));
		expect(gutilLogMethod.callCount).to.be.equal(1); //this is to make sure it understands verbose switch 

		verbosity = options.verbose;
		options.verbose = true;
		plugin.update(options);
		options.verbose = verbosity;

		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.green('deployed {"deployments":[{"revision":"1"}]}'));
		expect(gutilLogMethod.callCount).to.be.equal(3); //this is to make sure it understands verbose switch 
	});

});

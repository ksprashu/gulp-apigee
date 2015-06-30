/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var options = require('../helpers/options.js');
var apigee = require('../../source/apigee.js');
var gutil = require('gulp-util');
var vinylHelper = require('../helpers/vinylHelper.js');
var plugin = require('../../source/index.js');

var apigeeImportMethod,
	gutilLogMethod,
	throughObjMethod;

describe('feature: import plugin', function() {

	before(function() {
		apigeeImportMethod = sinon.stub(apigee, 'import');
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	after(function() {
		apigeeImportMethod.restore();
		gutilLogMethod.restore();
		throughObjMethod.restore();
	});

	it('should throw error if options is null or empty', function() {
		var exception;
		try { plugin.import(); } catch (e) { exception = e; }

		expect(exception).to.be.not.undefined;
		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');
	});

	it('should ignore null file and pass it along', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', null, true);

		var error, returnedFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; returnedFile = file; });

		plugin.import(options); 

		expect(error).to.be.null;
		expect(returnedFile).to.be.not.null;
		expect(returnedFile.isNull()).to.be.true;
	});

	it('should throw error if file is stream', function() {
		var error;
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents', false, true);
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		plugin.import(options); 

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('Stream is not supported');
	});

	it('should handle successful import', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents');

		var apigeeImportResponse = { name: 'api-v1', revision: '1' };
		apigeeImportMethod
			.yields(null, apigeeImportResponse);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) {});

		plugin.import(options);

		var e = { api: apigeeImportResponse.name, revision: apigeeImportResponse.revision };
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.green('imported ' + JSON.stringify(e)));
		expect(options.revision).to.be.equal('1');
	});

	it('should propagate apigee errors', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents');

		apigeeImportMethod
			.yields(new Error('something happened in Apigee'));

		var error;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		plugin.import(options);

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('something happened in Apigee');
	});

	it('should output verbose information when asked', function() {
		var vinylFile = vinylHelper.getVinyl('bundle.zip', 'bundle-contents');

		var apigeeImportResponse = { name: 'api-v1', revision: '1' };
		apigeeImportMethod
			.yields(null, apigeeImportResponse);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) {});

		options.verbose = true;
		plugin.import(options);

		var e = { api: apigeeImportResponse.name, revision: apigeeImportResponse.revision };
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.green('imported ' + JSON.stringify(e)));
		expect(gutilLogMethod.getCall(2).args[0]).to.be.equal(JSON.stringify(apigeeImportResponse));
		expect(options.revision).to.be.equal('1');
	});
});

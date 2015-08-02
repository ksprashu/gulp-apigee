/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var options = require('../helpers/options.js');
var apigee = require('../../source/helpers/apigee.js');
var gutil = require('gulp-util');
var fs = require('fs');
var plugin = require('../../source/index.js');

var apigeeGetDeployedRevisionMethod,
	gutilLogMethod;

describe('feature: get deployed revision plugin', function() {

	beforeEach(function() {
		apigeeGetDeployedRevisionMethod = sinon.stub(apigee, 'getDeployedRevision');
		gutilLogMethod = sinon.stub(gutil, 'log');
	});

	afterEach(function() {
		apigeeGetDeployedRevisionMethod.restore();
		gutilLogMethod.restore();
	});

	it('should throw error if options is null or empty', function() {
		var exception;
		try { plugin.getDeployedRevision(); } catch (e) { exception = e; }

		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');
	});
	
	it('should return revision data successfully', function() {
		var getDeployedRevisionResponse = fs.readFileSync('./test/apigee-responses/getDeployedRevisionResponse.json', 'utf8');
		apigeeGetDeployedRevisionMethod
			.yields(null, getDeployedRevisionResponse);

		var data = '';

		var s = plugin.getDeployedRevision(options);

		s.on('data', function(chunk) {
			data += chunk.contents.toString('utf8');
		});

		s.on('end', function() {
			var json = JSON.parse(data);
			expect(json.environment).to.be.equal('test');
			expect(json.revision.name).to.be.equal('1');
		});
	});

	it('should handle apigee error properly', function(done) {
		apigeeGetDeployedRevisionMethod
			.yields(new Error('something happened'));

		var data = '';

		var s = plugin.getDeployedRevision(options); 

		s.on('readable', function() {
			var buffer = s.read();
			expect(buffer).to.be.null;
			expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.red('something happened'));
			done();
		});

	});

});

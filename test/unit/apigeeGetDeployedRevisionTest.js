/*jshint expr: true*/

var expect = require('chai').expect;
var sinon = require('sinon');
var request = require('request');
var apigee = require('../../source/apigee.js');

var successResponse = {
	statusCode: 200
};

var options = {
	org: 'org',
	env: 'env',
	api: 'api',
	username: '',
	password: ''
};

var requestGetMethod;

describe('feature: Get deployed revision', function() {

	beforeEach(function(done) {
		requestGetMethod = sinon.stub(request, 'get');
		done();
	});

	afterEach(function(done) {
		requestGetMethod.restore();
		done();
	});

	it('should handle successful activate response', function(done) {
		var apigeeResponse = JSON.stringify({ a: 'b' });

		requestGetMethod
			.yields(null, successResponse, apigeeResponse);

		apigee.getDeployedRevision(options, function(err, body) {
			expect(err).to.be.null;
			expect(body.a).to.be.equal('b');
			done();
		});
	});

	it('should handle err returned from management api', function(done) {
		var err = JSON.stringify({ a: 'b' });

		requestGetMethod
			.yields(err, null, null);

		apigee.getDeployedRevision(options, function(err, body) {
			expect(err).to.not.be.null;
			var errJson = JSON.parse(err.message);
			expect(errJson.a).to.be.equal('b');
			done();
		});
	});

	it('should handle non-200 responses from management api', function(done) {
		var apigeeResponse = JSON.stringify({ a: 'b' });

		var response400 = {
			statusCode: 400
		};

		requestGetMethod
			.yields(null, response400, apigeeResponse);

		apigee.getDeployedRevision(options, function(err, body) {
			expect(err).to.not.be.null;
			var errJson = JSON.parse(err.message);
			expect(errJson.statusCode).to.be.equal(400);
			expect(errJson.body.a).to.be.equal('b');
			done();
		});
	});
			
});

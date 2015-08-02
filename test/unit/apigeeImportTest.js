/*jshint expr: true*/

var expect = require('chai').expect;
var sinon = require('sinon');
var request = require('request');
var apigee = require('../../source/apigee.js');

var successResponse = {
	statusCode: 201
};

var importResponseBody = {
	name: 'api-v1',
	revision: '1'
};

var options = {
	org: 'org',
	api: 'api',
	username: 'username',
	password: 'password'
};

var bundle = {
	contents: 'abcd'
};

var requestPostMethod;


describe('feature: import revision to apigee', function() {

	beforeEach(function(done) {
		requestPostMethod = sinon.stub(request, 'post');
		done();
	});

	afterEach(function(done) {
		requestPostMethod.restore();
		done();
	});

	it('should handle successful import response', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(importResponseBody));

		apigee.import(options, bundle, function(err, body) {
			expect(err).to.be.null;
			expect(body.name).to.be.equal('api-v1');
			expect(body.revision).to.be.equal('1');
			done();
		});
	});

	it('should return request module err', function(done) {
		requestPostMethod
			.yields({message: 'someerr'});

		apigee.import(options, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.be.equal('someerr');
			expect(body).to.be.undefined;
			done();
		});
	});

	it('should return err if response code is not 201', function(done) {
		requestPostMethod
			.yields(null, {statusCode: 200}, '{"message": "not-important"}');

		apigee.import(options, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.not.be.null;
			var message = JSON.parse(err.message);
			expect(message.statusCode).to.be.equal(200);
			expect(message.body.message).to.be.equal('not-important');
			done();
		});
	});

	it('should return err if response code is not 201 and body is empty', function(done) {
		requestPostMethod
			.yields(null, {statusCode: 401}, '');

		apigee.import(options, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.not.be.null;
			var message = JSON.parse(err.message);
			expect(message.statusCode).to.be.equal(401);
			expect(message.body.message).to.be.empty;
			done();
		});
	});

	it('should validate options being null', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(importResponseBody));

		var o = null;

		apigee.import(o, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('options is required');
			done();
		});

	});

	it('should validate options properties', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(importResponseBody));

		var o = {};

		apigee.import(o, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('A valid options.org is required');
			expect(err.message).to.contain('A valid options.api is required');
			expect(err.message).to.contain('A valid options.username is required');
			expect(err.message).to.contain('A valid options.password is required');
			done();
		});

	});

	it('should validate bundle being null', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(importResponseBody));

		apigee.import(options, null, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('bundle is required');
			done();
		});
	});

	it('should validate bundle properties', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(importResponseBody));

		apigee.import(options, {}, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('A valid bundle.contents is required');
			done();
		});
	});

});

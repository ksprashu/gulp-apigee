/*jshint expr: true*/

var expect = require('chai').expect;
var sinon = require('sinon');
var request = require('request');
var apigee = require('../../source/helpers/apigee.js');

var successResponse = {
	statusCode: 200
};

var updateResponseBody = {
	name: 'api-v1',
	revision: '1'
};

var options = {
	org: 'org',
	api: 'api',
	revision: '1',
	username: 'username',
	password: 'password'
};

var bundle = {
	contents: 'abcd'
};

var requestPostMethod;

describe('feature: update revision', function() {

	beforeEach(function(done) {
		requestPostMethod = sinon.stub(request, 'post');
		done();
	});

	afterEach(function(done) {
		requestPostMethod.restore();
		done();
	});

	it('should handle successful update response', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(updateResponseBody));

		apigee.update(options, bundle, function(err, body) {
			expect(err).to.be.null;
			expect(body.name).to.be.equal('api-v1');
			expect(body.revision).to.be.equal('1');
			done();
		});
	});

	it('should return request module err', function(done) {
		requestPostMethod
			.yields({message: 'someerr'});

		apigee.update(options, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.be.equal('someerr');
			expect(body).to.be.undefined;
			done();
		});
	});

	it('should return err if response code is not 200', function(done) {
		requestPostMethod
			.yields(null, {statusCode: 400}, '{"message": "not-important"}');

		apigee.update(options, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.not.be.null;
			var message = JSON.parse(err.message);
			expect(message.statusCode).to.be.equal(400);
			expect(message.body.message).to.be.equal('not-important');
			done();
		});
	});

	it('should return err if response code is not 200 and body is empty', function(done) {
		requestPostMethod
			.yields(null, {statusCode: 401}, '');

		apigee.update(options, bundle, function(err, body) {
			expect(err).to.be.not.null;
			expect(err.message).to.be.not.null;
			var message = JSON.parse(err.message);
			expect(message.statusCode).to.be.equal(401);
			expect(message.body.message).to.be.empty;
			done();
		});
	});

	it('should validate options being null', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(updateResponseBody));

		var o = null;

		apigee.update(o, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('options is required');
			done();
		});

	});

	it('should validate options properties', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(updateResponseBody));

		var o = {};

		apigee.update(o, bundle, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('A valid options.org is required');
			expect(err.message).to.contain('A valid options.api is required');
			expect(err.message).to.contain('A valid options.revision is required');
			expect(err.message).to.contain('A valid options.username is required');
			expect(err.message).to.contain('A valid options.password is required');
			done();
		});

	});

	it('should validate bundle being null', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(updateResponseBody));

		apigee.update(options, null, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('bundle is required');
			done();
		});
	});

	it('should validate bundle properties', function(done) {
		requestPostMethod
			.yields(null, successResponse, JSON.stringify(updateResponseBody));

		apigee.update(options, {}, function(err, body) {
			expect(err).to.not.be.null;
			expect(err.message).to.contain('A valid bundle.contents is required');
			done();
		});
	});

});

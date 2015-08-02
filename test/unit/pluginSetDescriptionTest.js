/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var gutil = require('gulp-util');
var vinylHelper = require('../helpers/vinylHelper.js');
var plugin = require('../../source/index.js');
var fs = require('fs');
var git = require('git-last-commit');

var gitGetLastCommitMethod;
var gutilLogMethod;
var throughObjMethod;

describe('feature: set proxy description from git', function() {

	beforeEach(function() {
		gitGetLastCommitMethod = sinon.stub(git, 'getLastCommit');
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	afterEach(function() {
		gitGetLastCommitMethod.restore();
		gutilLogMethod.restore();
		throughObjMethod.restore();
	});

	it('should ignore null file and pass it along', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', null, true);

		var error, returnedFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; returnedFile = file; });

		plugin.setProxyDescription(); 

		expect(error).to.be.null;
		expect(returnedFile).to.be.not.null;
		expect(returnedFile.isNull()).to.be.true;
	});

	it('should throw error if file is stream', function() {
		var error;
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 'contents', false, true);
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; });

		plugin.setProxyDescription();

		expect(error).to.be.not.undefined;
		expect(error).to.be.an.instanceof(gutil.PluginError);
		expect(error.message).to.be.equal('Stream is not supported');
	});

	it ('should not interfere if there are no proxy xml in the bundle - 1', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 'contents');
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal('contents');
			});

		plugin.setProxyDescription();
	});

	it ('should not interfere if there are no proxy xml in the bundle - 2', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.html', '<APIProxy');
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.html');
				expect(file.contents.toString('utf8')).to.be.equal('<APIProxy');
			});

		plugin.setProxyDescription();
	});

	it ('should not interfere if proxy description does not have placeholders', function(done) {
		var proxyDescriptionFileContents = 
			'<APIProxy>' + 
				'<Description>example api</Description>' + 
			'</APIProxy>';

		var vinylFile = vinylHelper.getVinyl('proxy.xml', proxyDescriptionFileContents);

		var commit = {
			shortHash: 'abcd',
			committer: {
				email: 'oseymen@gmail.com'
			},
			committedOn: 1437988060,
			tags: []
		};

		gitGetLastCommitMethod
			.yields(null, commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.yellow('proxy.xml does not contain any placeholders'));
				expect(file.contents.toString('utf8')).to.be.equal(proxyDescriptionFileContents);

				done();
			});

		plugin.setProxyDescription();
	});

	it ('should handle when git commands return error ', function(done) {
		var proxyDescriptionFileContents = 
			'<APIProxy>' + 
				'<Description>example api $tags</Description>' + 
			'</APIProxy>';

		var vinylFile = vinylHelper.getVinyl('proxy.xml', proxyDescriptionFileContents);

		gitGetLastCommitMethod
			.yields('command not found git', undefined);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.equal('command not found git');
				expect(file.name).to.be.equal('proxy.xml');
				expect(gutilLogMethod.callCount).to.be.equal(0);
				expect(file.contents.toString('utf8')).to.be.equal(proxyDescriptionFileContents);

				done();
			});

		plugin.setProxyDescription();
	});

	it ('should handle if proxy file does not have description element', function(done) {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', '<APIProxy />');
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.not.null;
				expect(err).to.be.equal('couldn\'t locate Description element in proxy.xml');
				expect(gutilLogMethod.callCount).to.be.equal(0);
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal('<APIProxy />');

				done();
			});

		plugin.setProxyDescription();
	});

	it('should set correct description for commit without tags', function(done) {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 
				'<APIProxy>' + 
					'<Description>example api $tags on commit $shortHash by $committer.email on $committedDate</Description>' + 
				'</APIProxy>');

		var commit = {
			shortHash: 'abcd',
			committer: {
				email: 'oseymen@gmail.com'
			},
			committedOn: 1437988060,
			tags: []
		};

		gitGetLastCommitMethod
			.yields(null, commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal(
						'<APIProxy>' +
							'<Description>example api on commit abcd by oseymen@gmail.com on 2015-07-27T10:07:40+01:00</Description>' + 
						'</APIProxy>');

				done();
			});

		plugin.setProxyDescription();
	});

	it('should set correct description for commit with single tags', function(done) {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 
				'<APIProxy>' + 
					'<Description>example api $tags on commit $shortHash by $committer.email on $committedDate</Description>' + 
				'</APIProxy>');

		var commit = {
			shortHash: 'abcd',
			committer: {
				email: 'oseymen@gmail.com'
			},
			committedOn: 1437988060,
			tags: ['tag1']
		};

		gitGetLastCommitMethod
			.yields(null, commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal(
						'<APIProxy>' +
							'<Description>example api tag1 on commit abcd by oseymen@gmail.com on 2015-07-27T10:07:40+01:00</Description>' + 
						'</APIProxy>');

				done();
			});

		plugin.setProxyDescription();
	});

	it('should set correct description for commit with multiple tags', function(done) {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 
				'<APIProxy>' + 
					'<Description>example api $tags on commit $shortHash by $committer.email on $committedDate</Description>' + 
				'</APIProxy>');

		var commit = {
			shortHash: 'abcd',
			committer: {
				email: 'oseymen@gmail.com'
			},
			committedOn: 1437988060,
			tags: ['tag1','tag2']
		};

		gitGetLastCommitMethod
			.yields(null, commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal(
						'<APIProxy>' +
							'<Description>example api tag1,tag2 on commit abcd by oseymen@gmail.com on 2015-07-27T10:07:40+01:00</Description>' + 
						'</APIProxy>');

				done();
			});

		plugin.setProxyDescription();
	});

});

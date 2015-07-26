/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var gutil = require('gulp-util');
var vinylHelper = require('../helpers/vinylHelper.js');
var plugin = require('../../source/index.js');
var fs = require('fs');
var git = require('../../source/git.js');

var gitGetLastCommitMethod;
var gutilLogMethod;
var throughObjMethod;

describe('feature: set proxy description from git', function() {

	before(function() {
		gitGetLastCommitMethod = sinon.stub(git, 'getLastCommit');
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	after(function() {
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

	it ('should handle if proxy file does not have description element', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', '<APIProxy />');
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.not.null;
				expect(err).to.be.equal('couldn\'t locate Description element in proxy.xml');
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal('<APIProxy />');
			});

		plugin.setProxyDescription();
	});

	it('should set correct description for commit without tags', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 
				'<APIProxy>' + 
					'<Description>example api $tags on commit $hash by $committer on $commitDate</Description>' + 
				'</APIProxy>');

		var commit = {
			shortHash: 'abcd',
			committer: 'Ozan',
			commitDate: 'date1',
			tags: []
		};

		gitGetLastCommitMethod
			.yields(commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal(
						'<APIProxy>' +
							'<Description>example api  on commit abcd by Ozan on date1</Description>' + 
						'</APIProxy>');
			});

		plugin.setProxyDescription();
	});

	it('should set correct description for commit with single tags', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 
				'<APIProxy>' + 
					'<Description>example api $tags on commit $hash by $committer on $commitDate</Description>' + 
				'</APIProxy>');

		var commit = {
			shortHash: 'abcd',
			committer: 'Ozan',
			commitDate: 'date1',
			tags: ['tag1']
		};

		gitGetLastCommitMethod
			.yields(commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal(
						'<APIProxy>' +
							'<Description>example api tag1 on commit abcd by Ozan on date1</Description>' + 
						'</APIProxy>');
			});

		plugin.setProxyDescription();
	});

	it('should set correct description for commit with multiple tags', function() {
		var vinylFile = vinylHelper.getVinyl('proxy.xml', 
				'<APIProxy>' + 
					'<Description>example api $tags on commit $hash by $committer on $commitDate</Description>' + 
				'</APIProxy>');

		var commit = {
			shortHash: 'abcd',
			committer: 'Ozan',
			commitDate: 'date1',
			tags: ['tag1', 'tag2']
		};

		gitGetLastCommitMethod
			.yields(commit);

		throughObjMethod
			.yields(vinylFile, null, function(err, file) { 
				expect(err).to.be.null;
				expect(file.name).to.be.equal('proxy.xml');
				expect(file.contents.toString('utf8')).to.be.equal(
						'<APIProxy>' +
							'<Description>example api tag1,tag2 on commit abcd by Ozan on date1</Description>' + 
						'</APIProxy>');
			});

		plugin.setProxyDescription();
	});

});

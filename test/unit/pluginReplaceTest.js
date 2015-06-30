/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var gutil = require('gulp-util');
var vinyl = require('../helpers/vinylHelper.js');
var options = require('../helpers/options.js');
var plugin = require('../../source/index.js');

var gutilLogMethod,
	throughObjMethod;

describe('feature: replace plugin', function() {

	beforeEach(function() {
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	afterEach(function() {
		gutilLogMethod.restore();
		throughObjMethod.restore();
	});

	it('should throw error if options is null or empty', function() {
		var exception;
		try { plugin.replace(); } catch (e) { exception = e; }

		expect(exception).to.be.not.undefined;
		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');
	});

	it('should bypass directories', function() {
		var vinylDirectory = vinyl.getVinyl('folder', 'bundle-contents', false, false, true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('folder');
	});

	it('should ignore null file and pass it along', function() {
		var vinylDirectory = vinyl.getVinyl('file', 'contents', true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.be.not.null;
		expect(nextFile.isNull()).to.be.true;
	});

	it('should bypass _this_ file if it is not mentioned at all in replacement options', function() {
		var options = {
			"apiproxy/gulp-v1.xml": [
				{
					xpath: "/APIProxy/Description",
					value: "test123"
				}
			]
		};

		var vinylDirectory = vinyl.getVinyl('apiproxy/someother.xml', 'contents');

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('apiproxy/someother.xml');
	});

	it('should bypass _this_ file if no replacements are defined in options', function() {
		var options = {
			"apiproxy/gulp-v1.xml": []
		};

		var vinylDirectory = vinyl.getVinyl('apiproxy/gulp-v1.xml', 'contents');

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('apiproxy/gulp-v1.xml');
	});

	it('should warn non-existing replacements mistakenly specified in options', function() {
		var options = {
			"apiproxy/gulp-v1.xml": [
				{
					xpath: "/root/x",
					value: "test123"
				}
			]
		};

		var fileContents = '<root><a>1</a></root>';

		var vinylFile = vinyl.getVinyl('apiproxy/gulp-v1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in apiproxy/gulp-v1.xml'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.yellow('couldn\'t resolve replacement xpath /root/x in apiproxy/gulp-v1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(fileContents);
	});

	it('should replace specified xpath element', function() {
		var options = {
			"apiproxy/gulp-v1.xml": [
				{
					xpath: "/root/a",
					value: "2"
				}
			]
		};

		var fileContents = '<root><a>1</a></root>';
		var expectedContents = '<root><a>2</a></root>';

		var vinylFile = vinyl.getVinyl('apiproxy/gulp-v1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in apiproxy/gulp-v1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(expectedContents);
	});

	it('should replace specified xpath attribute', function() {
		var options = {
			"apiproxy/gulp-v1.xml": [
				{
					xpath: "/root/a/@x",
					value: "g"
				}
			]
		};

		var fileContents = '<root><a x="f">1</a></root>';
		var expectedContents = '<root><a x="g">1</a></root>';

		var vinylFile = vinyl.getVinyl('apiproxy/gulp-v1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in apiproxy/gulp-v1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(expectedContents);
	});

	it('should handle a combo of non-existing, element and attribute replacements all at the same time', function() {
		var options = {
			"apiproxy/gulp-v1.xml": [
				{
					xpath: "/notexist",
					value: "fdfd"
				},
				{
					xpath: "/root/b",
					value: "1"
				},
				{
					xpath: "/root/a/@x",
					value: "g"
				}
			]
		};

		var fileContents = 
			'<root><a x="f">1</a><b>2</b></root>';
		var expectedContents = 
			'<root><a x="g">1</a><b>1</b></root>';

		var vinylFile = vinyl.getVinyl('apiproxy/gulp-v1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in apiproxy/gulp-v1.xml'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.yellow('couldn\'t resolve replacement xpath /notexist in apiproxy/gulp-v1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(expectedContents);
	});
});

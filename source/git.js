var exec = require('child_process').exec;

function _command(command, callback) {
	exec(command, {cwd: __dirname}, function(err, stdout, stderr) {
		callback(stdout.split('\n').join(','));
	});
}

var command = 'git tag --contains HEAD && git log -1 --pretty=format:"%h,%ce,%cd,%d"';
module.exports = {
	getLastCommit : function(callback) {
		_command(command, function(res) {
			console.log(res);
			var a = res.split(',');
			var tags = [];

			a.forEach(function(i) {
				i = i.trim();
				if (i.indexOf('tag: ') > -1) {
					tags.push(i.replace('tag: ', ''));
				}
			});

			callback({
				shortHash: a[0],
				committer: a[1],
				commitDate: a[2],
				tags: tags
			});
		});
	}
};

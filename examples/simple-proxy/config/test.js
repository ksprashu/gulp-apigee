module.exports = {
	org: process.env.org,
	api: process.env.api,
	env: 'test',
	username: process.env.username,
	password: process.env.password,
	override: true,
	delay: 5,
	verbose: false,
	replace: {
		"apiproxy/gulp-v1.xml": [
			{
				xpath: "/APIProxy/Description",
				value: "example api $tags on commit $shortHash at $committedDate"
			}
		]
	}
};

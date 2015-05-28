module.exports = {
	org: 'org',
	api: 'api',
	env: 'test',
	username: 'username',
	password: 'password',
	override: true,
	delay: 5,
	revision: '1',
	verbose: false,
	replace: {
		"apiproxy/gulp-v1.xml": [
			{
				xpath: "/APIProxy/Description",
				value: "test123"
			}
		]
	}
};

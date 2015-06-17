module.exports = {
	org: process.env.org,
	api: process.env.api,
	env: 'prod',
	username: process.env.username,
	password: process.env.password,
	override: true,
	delay: 5,
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

'use strict';

module.exports = {
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.ts$': ['ts-jest'],
	},
	moduleNameMapper: {
		'(.+)\\.js': '$1',
	},
};

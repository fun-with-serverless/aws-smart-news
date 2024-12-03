process.env.AWS_ENDPOINT_URL = 'http://127.0.0.1:5000';
export default {
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testMatch: ['**/tests/**/*.test.ts'],
  coveragePathIgnorePatterns: ['tests/', 'node_modules'],
};

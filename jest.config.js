module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Setup files to run before tests
  setupFiles: ['<rootDir>/test/unit/setup.ts'],
  // Mock all modules in node_modules except those that you want to use
  // directly in your tests
  moduleNameMapper: {
    'vscode': '<rootDir>/test/unit/mocks/vscode.ts'
  },
  // Ignore specific directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/'
  ],
  // Allow for __mocks__ directory to be used for manual mock files
  moduleDirectories: ['node_modules', '__mocks__'],
  // Automatically clear mock calls and instances between every test
  clearMocks: true
};

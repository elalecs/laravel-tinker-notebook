"use strict";
// Jest setup file
// This file runs before all tests
// Mock the vscode module
jest.mock('vscode', () => {
    return require('./mocks/vscode').default;
});
//# sourceMappingURL=setup.js.map
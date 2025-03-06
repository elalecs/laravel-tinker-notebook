import * as assert from 'assert';
import { activate, deactivate } from '../src/extension';
import vscode from '../mocks/vscode';

// Mock the imported classes
jest.mock('../src/editor/documentProvider', () => ({
  TinkerDocumentProvider: jest.fn().mockImplementation(() => ({
    // Mock implementation
  }))
}));

jest.mock('../src/execution/tinkerService', () => ({
  TinkerExecutionService: jest.fn().mockImplementation(() => ({
    executeCode: jest.fn().mockResolvedValue({ output: 'Mock output', isRaw: false })
  }))
}));

jest.mock('../src/editor/documentParser', () => ({
  DocumentParser: jest.fn().mockImplementation(() => ({
    findCodeBlockAtPosition: jest.fn(),
    findAllCodeBlocks: jest.fn()
  }))
}));

jest.mock('../src/editor/resultRenderer', () => ({
  ResultRenderer: jest.fn().mockImplementation(() => ({
    renderResult: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('Extension', () => {
  let context: vscode.ExtensionContext;
  
  beforeEach(() => {
    context = new (vscode as any).ExtensionContext();
    jest.clearAllMocks();
  });
  
  describe('activate', () => {
    it('should register commands and providers', () => {
      // Call the activate function
      activate(context);
      
      // Verify that the command was registered
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'laravel-tinker-notebook.runBlock',
        expect.any(Function)
      );
      
      // Verify that the code lens provider was registered
      expect(vscode.languages.registerCodeLensProvider).toHaveBeenCalledWith(
        [{ language: 'markdown' }, { pattern: '**/*.tinker' }],
        expect.any(Object)
      );
      
      // Verify that the subscriptions were added to the context
      expect(context.subscriptions.length).toBe(2);
    });
  });
  
  describe('runBlock command', () => {
    it('should show a message when no editor is active', async () => {
      // Set up the test
      (vscode.window as any).activeTextEditor = undefined;
      
      // Call the activate function
      activate(context);
      
      // Get the command handler
      const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
      
      // Call the command handler
      await commandHandler();
      
      // Verify that the information message was shown
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No editor is active');
    });
    
    it('should show a message for unsupported file types', async () => {
      // Set up the test with a non-markdown, non-tinker file
      (vscode.window as any).activeTextEditor = {
        document: {
          languageId: 'javascript',
          fileName: 'test.js'
        },
        selection: {
          active: { line: 0, character: 0 }
        }
      };
      
      // Call the activate function
      activate(context);
      
      // Get the command handler
      const commandHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
      
      // Call the command handler
      await commandHandler();
      
      // Verify that the information message was shown
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'This file type is not supported for Tinker execution'
      );
    });
  });
  
  describe('deactivate', () => {
    it('should not throw errors', () => {
      // Simply verify that deactivate doesn't throw
      expect(() => deactivate()).not.toThrow();
    });
  });
});

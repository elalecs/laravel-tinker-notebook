import { TinkerExecutionService, ExecutionOptions } from '../../src/execution/tinkerService';
import vscode from '../mocks/vscode';
import * as fs from 'fs';
import * as cp from 'child_process';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn()
}));

const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: mockExec
}));

describe('TinkerExecutionService', () => {
  let service: TinkerExecutionService;
  let mockExecCallback: Function;
  
  beforeEach(() => {
    service = new TinkerExecutionService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock the exec function to call the callback with test data
    mockExec.mockImplementation((cmd: string, options: any, callback: Function) => {
      mockExecCallback = callback;
      return { pid: 123 }; // Return a mock child process
    });
    
    // Mock filesystem functions
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      return path.includes('artisan');
    });
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);
    
    (fs.readdirSync as jest.Mock).mockReturnValue([
      { isDirectory: () => true, name: 'laravel-project' }
    ]);
  });
  
  describe('executeCode', () => {
    it('should execute code and return the result', async () => {
      // Set up the test
      const code = 'DB::table("users")->get();';
      const options: ExecutionOptions = {
        newSession: false,
        showRaw: false,
        hideResult: false
      };
      
      // Start the execution
      const resultPromise = service.executeCode(code, options);
      
      // Simulate successful execution
      mockExecCallback(null, '=> Illuminate\\Support\\Collection {}\n', '');
      
      // Get the result
      const result = await resultPromise;
      
      // Verify the result
      expect(result.output).toBe('=> Illuminate\\Support\\Collection {}');
      expect(result.error).toBeUndefined();
      expect(result.isRaw).toBe(false);
      
      // Verify that the command was executed correctly
      expect(mockExec).toHaveBeenCalled();
      const execCall = mockExec.mock.calls[0][0];
      expect(execCall).toContain('php artisan tinker --execute="DB::table(\"users\")->get();"');
    });
    
    it('should handle errors during execution', async () => {
      // Set up the test
      const code = 'invalid code;';
      const options: ExecutionOptions = {
        newSession: false,
        showRaw: false,
        hideResult: false
      };
      
      // Start the execution
      const resultPromise = service.executeCode(code, options);
      
      // Simulate an error
      const error = new Error('Syntax error');
      mockExecCallback(error, '', 'PHP Parse error: syntax error, unexpected token ";"');
      
      // Get the result
      const result = await resultPromise;
      
      // Verify the result
      expect(result.output).toBe('');
      expect(result.error).toBe('PHP Parse error: syntax error, unexpected token ";"');
    });
    
    it('should create a new session when requested', async () => {
      // First execution without new session
      let resultPromise = service.executeCode('$a = 1;', {
        newSession: false,
        showRaw: false,
        hideResult: false
      });
      
      mockExecCallback(null, '=> 1\n', '');
      await resultPromise;
      
      // Second execution with new session
      resultPromise = service.executeCode('$a;', {
        newSession: true,
        showRaw: false,
        hideResult: false
      });
      
      mockExecCallback(null, '=> null\n', '');
      const result = await resultPromise;
      
      expect(result.output).toBe('=> null');
      
      // Verify that two different commands were executed
      expect(mockExec).toHaveBeenCalledTimes(2);
    });
    
    it('should handle multi-line code', async () => {
      const multiLineCode = 'for ($i = 0; $i < 3; $i++) {\n    echo $i;\n}';
      
      const resultPromise = service.executeCode(multiLineCode, {
        newSession: false,
        showRaw: false,
        hideResult: false
      });
      
      mockExecCallback(null, '0\n1\n2\n=> null\n', '');
      const result = await resultPromise;
      
      expect(result.output).toBe('0\n1\n2\n=> null');
      
      // Verify that the command used cat and pipe for multi-line code
      expect(mockExec).toHaveBeenCalled();
      const execCall = mockExec.mock.calls[0][0];
      expect(execCall).toContain('cat "');
      expect(execCall).toContain('" | php artisan tinker -');
    });
  });
});

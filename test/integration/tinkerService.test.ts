import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TinkerExecutionService, ExecutionOptions } from '../../src/execution/tinkerService';

suite('TinkerExecutionService Integration Tests', () => {
    let tinkerService: TinkerExecutionService;
    let sandbox: sinon.SinonSandbox;
    
    setup(() => {
        sandbox = sinon.createSandbox();
        tinkerService = new TinkerExecutionService();
        
        // Mock the findLaravelProjectRoot method to return a fake project path
        sandbox.stub(tinkerService as any, 'findLaravelProjectRoot').resolves('/fake/laravel/project');
        
        // Mock executeCommand to avoid actual process execution
        sandbox.stub(tinkerService as any, 'executeCommand').resolves('Command executed successfully');
        
        // Mock file system operations
        sandbox.stub(fs, 'writeFileSync').returns();
        sandbox.stub(fs, 'unlinkSync').returns();
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(fs, 'readFileSync').returns('{"var1": "s:4:\\"test\\""}');
    });
    
    teardown(() => {
        sandbox.restore();
        
        // Dispose the service to clean up resources
        tinkerService.dispose();
    });
    
    test('Process pooling should reuse processes for the same session', async () => {
        // Create a spy on the getAvailableProcess method
        const getAvailableProcessSpy = sandbox.spy(tinkerService as any, 'getAvailableProcess');
        
        // Execute code in a new session
        const options: ExecutionOptions = {
            newSession: true,
            showRaw: false,
            hideResult: false
        };
        
        const result1 = await tinkerService.executeCode('$test = 1;', options);
        
        // Execute code in the same session
        options.newSession = false;
        options.sessionId = result1.sessionId;
        
        const result2 = await tinkerService.executeCode('$test = 2;', options);
        
        // Verify that getAvailableProcess was called twice
        assert.strictEqual(getAvailableProcessSpy.callCount, 2);
        
        // The second call should have found an available process for the same session
        const secondCallArgs = getAvailableProcessSpy.getCall(1).args;
        assert.strictEqual(secondCallArgs[0], '/fake/laravel/project');
        assert.strictEqual(secondCallArgs[1], result1.sessionId);
    });
    
    test('Timeout handling should terminate long-running operations', async () => {
        // Restore the original executeCommand stub
        (tinkerService as any).executeCommand.restore();
        
        // Create a new stub that simulates a timeout
        const executeCommandStub = sandbox.stub(tinkerService as any, 'executeCommand');
        
        // First call resolves normally
        executeCommandStub.onFirstCall().resolves('Command executed successfully');
        
        // Second call simulates a timeout by not resolving within the timeout period
        executeCommandStub.onSecondCall().callsFake(() => {
            return new Promise((resolve, reject) => {
                // This promise will never resolve within the test timeframe
                setTimeout(() => {
                    resolve('This should never be returned due to timeout');
                }, 60000); // 60 seconds, much longer than our timeout
            });
        });
        
        // Override the timeout configuration for testing
        (tinkerService as any).timeoutConfig = {
            enabled: true,
            durationMs: 100 // 100ms timeout for testing
        };
        
        // Execute code that completes normally
        const options: ExecutionOptions = {
            newSession: true,
            showRaw: false,
            hideResult: false
        };
        
        const result1 = await tinkerService.executeCode('$quick = 1;', options);
        assert.strictEqual(result1.error, undefined);
        
        // Execute code that will timeout
        const result2 = await tinkerService.executeCode('while(true) {}', options);
        
        // Verify that an error was returned due to timeout
        assert.notStrictEqual(result2.error, undefined);
        assert.ok(result2.error?.includes('timeout') || result2.error?.includes('Timeout'));
    });
    
    test('Resource cleanup should remove idle processes', async () => {
        // Create a spy on the cleanupResources method
        const cleanupResourcesSpy = sandbox.spy(tinkerService as any, 'cleanupResources');
        
        // Create a spy on the killProcess method
        const killProcessSpy = sandbox.spy(tinkerService as any, 'killProcess');
        
        // Add some idle processes to the pool
        const now = new Date();
        const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
        
        // Mock the process pool with some idle processes
        (tinkerService as any).processPool = [
            {
                process: { kill: () => {} },
                busy: false,
                lastUsed: sixMinutesAgo,
                projectRoot: '/fake/laravel/project',
                sessionId: 'session-1'
            },
            {
                process: { kill: () => {} },
                busy: true, // This one is busy and should not be cleaned up
                lastUsed: sixMinutesAgo,
                projectRoot: '/fake/laravel/project',
                sessionId: 'session-2'
            },
            {
                process: { kill: () => {} },
                busy: false,
                lastUsed: now, // This one was just used and should not be cleaned up
                projectRoot: '/fake/laravel/project',
                sessionId: 'session-3'
            }
        ];
        
        // Manually trigger the cleanup
        (tinkerService as any).cleanupResources();
        
        // Verify that cleanupResources was called
        assert.strictEqual(cleanupResourcesSpy.callCount, 1);
        
        // Verify that killProcess was called once for the idle process
        assert.strictEqual(killProcessSpy.callCount, 1);
        
        // Verify that only the idle process was removed
        assert.strictEqual((tinkerService as any).processPool.length, 2);
        assert.strictEqual((tinkerService as any).processPool[0].sessionId, 'session-2');
        assert.strictEqual((tinkerService as any).processPool[1].sessionId, 'session-3');
    });
});

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { ExecutionResult } from '../editor/resultRenderer';

// Process pool interface
interface ProcessPoolItem {
    process: cp.ChildProcess;
    busy: boolean;
    lastUsed: Date;
    projectRoot: string;
    sessionId: string | null;
}

// Execution timeout configuration
interface TimeoutConfig {
    enabled: boolean;
    durationMs: number;
}

export interface ExecutionOptions {
    newSession: boolean;
    showRaw: boolean;
    hideResult: boolean;
    sessionId?: string; // Optional: allows specifying a specific session
}

export interface TinkerSession {
    id: string;
    name: string;
    createdAt: Date;
    lastUsed: Date;
    variables: string[]; // Variables available in this session
    projectRoot: string;
    isActive: boolean;
}

export class TinkerExecutionService extends EventEmitter {
    private sessions: Map<string, TinkerSession> = new Map();
    private currentSessionId: string | null = null;
    private sessionVariablesDir: string;
    
    // Process pool configuration
    private processPool: ProcessPoolItem[] = [];
    private maxPoolSize: number = 5; // Maximum number of processes to keep in the pool
    private idleTimeoutMs: number = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Execution timeout configuration
    private timeoutConfig: TimeoutConfig = {
        enabled: true,
        durationMs: 30 * 1000 // 30 seconds default timeout
    };
    
    // Resource cleanup interval
    private cleanupInterval: NodeJS.Timeout | null = null;
    
    constructor() {
        super();
        // Create temporary directory to store session variables
        this.sessionVariablesDir = path.join(os.tmpdir(), 'laravel-tinker-sessions');
        if (!fs.existsSync(this.sessionVariablesDir)) {
            fs.mkdirSync(this.sessionVariablesDir, { recursive: true });
        }
        
        // Initialize cleanup interval for idle processes and resources
        this.cleanupInterval = setInterval(() => this.cleanupResources(), 60 * 1000); // Run cleanup every minute
        
        // Load configuration from settings
        this.loadConfiguration();
    }
    
    /**
     * Executes code in a Tinker session and maintains state between executions
     */
    public async executeCode(code: string, options: ExecutionOptions): Promise<ExecutionResult> {
        try {
            // Record start time for performance tracking
            const startTime = Date.now();
            
            // Find Laravel project root directory
            const projectRoot = await this.findLaravelProjectRoot();
            if (!projectRoot) {
                throw new Error('Laravel project not found. Make sure you are in a Laravel project directory.');
            }
            
            // Determine which session to use
            let sessionId = options.sessionId || this.currentSessionId;
            
            // Create a new session if needed
            if (options.newSession || !sessionId || !this.sessions.has(sessionId)) {
                sessionId = await this.createNewSession(projectRoot);
            }
            
            // Set the current session
            this.currentSessionId = sessionId;
            
            // Get the current session
            const session = this.sessions.get(sessionId)!;
            session.lastUsed = new Date();
            
            // Create a modified version of the code to capture defined variables
            const enhancedCode = this.enhanceCodeForVariableTracking(code, sessionId);
            
            // Create a temporary file for the code
            const tempFile = await this.createTempCodeFile(enhancedCode);
            
            // Prepare the session file to maintain variables
            const sessionFile = path.join(this.sessionVariablesDir, `${sessionId}.php`);
            
            // Prepare the command to execute
            let command: string;
            if (fs.existsSync(sessionFile)) {
                // If a session file exists, load the variables before executing the code
                command = `(echo "require '${sessionFile}';" && cat "${tempFile}") | php artisan tinker -`;
            } else {
                // If there is no session file, execute the code directly
                command = `cat "${tempFile}" | php artisan tinker -`;
            }
            
            // Execute the command using the process pool
            const output = await this.executeCommand(command, projectRoot, sessionId);
            
            // Update the session's variable list
            await this.updateSessionVariables(sessionId);
            
            // Notify session state change
            this.emit('session-updated', session);
            
            // Clean up the temporary file
            fs.unlinkSync(tempFile);
            
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            
            return {
                output: output.trim(),
                isRaw: options.showRaw,
                sessionId: sessionId,
                sessionActive: true,
                executionTime
            };
            
        } catch (error) {
            return {
                output: '',
                error: error instanceof Error ? error.message : String(error),
                isRaw: options.showRaw,
                sessionId: this.currentSessionId,
                sessionActive: !!this.currentSessionId
            };
        }
    }
    
    /**
     * Creates a new Tinker session
     */
    private async createNewSession(projectRoot: string): Promise<string> {
        const sessionId = `session-${Date.now()}`;
        const session: TinkerSession = {
            id: sessionId,
            name: `Session ${new Date().toLocaleTimeString()}`,
            createdAt: new Date(),
            lastUsed: new Date(),
            variables: [],
            projectRoot: projectRoot,
            isActive: true
        };
        
        this.sessions.set(sessionId, session);
        this.emit('session-created', session);
        return sessionId;
    }
    
    /**
     * Adds code to track variables defined in the session
     */
    private enhanceCodeForVariableTracking(code: string, sessionId: string): string {
        const outputFile = path.join(this.sessionVariablesDir, `${sessionId}-vars.json`);
        const sessionFile = path.join(this.sessionVariablesDir, `${sessionId}.php`);
        
        // Code that will be added at the end to export defined variables
        const trackerCode = `
// Code to track variables
$definedVars = get_defined_vars();
$sessionVars = [];
foreach ($definedVars as $key => $value) {
    if ($key !== 'definedVars' && $key !== 'sessionVars' && $key !== 'key' && $key !== 'value') {
        $sessionVars[$key] = serialize($value);
    }
}
file_put_contents('${outputFile}', json_encode($sessionVars));

// Create PHP code to restore variables in the next execution
$phpCode = "<?php\n";
foreach ($sessionVars as $key => $serialized) {
    $phpCode .= "\$$key = unserialize(\"" . addcslashes($serialized, '"\\') . "\");\n";
}
file_put_contents('${sessionFile}', $phpCode);
`;
        
        return code + trackerCode;
    }
    
    /**
     * Updates the list of variables available in the session
     */
    private async updateSessionVariables(sessionId: string): Promise<void> {
        const variablesFile = path.join(this.sessionVariablesDir, `${sessionId}-vars.json`);
        
        if (fs.existsSync(variablesFile)) {
            try {
                const variablesJson = fs.readFileSync(variablesFile, 'utf8');
                const variables = Object.keys(JSON.parse(variablesJson));
                
                const session = this.sessions.get(sessionId);
                if (session) {
                    session.variables = variables;
                    this.emit('variables-updated', { sessionId, variables });
                }
            } catch (error) {
                console.error('Error updating session variables:', error);
            }
        }
    }
    
    /**
     * Gets all active sessions
     */
    public getSessions(): TinkerSession[] {
        return Array.from(this.sessions.values());
    }
    
    /**
     * Gets the current session
     */
    public getCurrentSession(): TinkerSession | null {
        return this.currentSessionId ? this.sessions.get(this.currentSessionId) || null : null;
    }
    
    /**
     * Switches to an existing session
     */
    public switchToSession(sessionId: string): boolean {
        if (this.sessions.has(sessionId)) {
            this.currentSessionId = sessionId;
            const session = this.sessions.get(sessionId)!;
            session.lastUsed = new Date();
            this.emit('session-switched', session);
            return true;
        }
        return false;
    }
    
    /**
     * Closes a session and removes its associated files and processes
     */
    public closeSession(sessionId: string): boolean {
        if (this.sessions.has(sessionId)) {
            // Remove session files
            const sessionFile = path.join(this.sessionVariablesDir, `${sessionId}.php`);
            const variablesFile = path.join(this.sessionVariablesDir, `${sessionId}-vars.json`);
            
            if (fs.existsSync(sessionFile)) {
                fs.unlinkSync(sessionFile);
            }
            
            if (fs.existsSync(variablesFile)) {
                fs.unlinkSync(variablesFile);
            }
            
            // Kill any processes associated with this session
            this.processPool.forEach(item => {
                if (item.sessionId === sessionId) {
                    this.killProcess(item);
                }
            });
            
            // Remove the session from the pool
            this.processPool = this.processPool.filter(item => item.sessionId !== sessionId);
            
            // Remove the session from the map
            this.sessions.delete(sessionId);
            
            // If it was the current session, clear the reference
            if (this.currentSessionId === sessionId) {
                this.currentSessionId = null;
            }
            
            this.emit('session-closed', sessionId);
            return true;
        }
        return false;
    }
    
    private async findLaravelProjectRoot(): Promise<string | undefined> {
        // Start with the workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }
        
        // Check each workspace folder for an artisan file
        for (const folder of workspaceFolders) {
            const artisanPath = path.join(folder.uri.fsPath, 'artisan');
            if (fs.existsSync(artisanPath)) {
                return folder.uri.fsPath;
            }
        }
        
        // If no artisan file found directly in workspace folders,
        // try to find it in subdirectories (but only go one level deep)
        for (const folder of workspaceFolders) {
            const entries = fs.readdirSync(folder.uri.fsPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const artisanPath = path.join(folder.uri.fsPath, entry.name, 'artisan');
                    if (fs.existsSync(artisanPath)) {
                        return path.join(folder.uri.fsPath, entry.name);
                    }
                }
            }
        }
        
        return undefined;
    }
    
    private async createTempCodeFile(code: string): Promise<string> {
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `laravel-tinker-${Date.now()}.php`);
        
        fs.writeFileSync(tempFile, code);
        return tempFile;
    }
    
    /**
     * Execute a command with process pooling and timeout handling
     */
    private executeCommand(command: string, projectRoot: string, sessionId: string | null = null): Promise<string> {
        return new Promise((resolve, reject) => {
            // Try to find an available process in the pool
            let poolItem = this.getAvailableProcess(projectRoot, sessionId);
            let timeoutId: NodeJS.Timeout | null = null;
            let isTimedOut = false;
            
            // If no process is available, create a new one
            if (!poolItem) {
                const process = cp.exec(command, { 
                    maxBuffer: 1024 * 1024,
                    cwd: projectRoot
                });
                
                poolItem = {
                    process,
                    busy: true,
                    lastUsed: new Date(),
                    projectRoot,
                    sessionId
                };
                
                // Add to pool if there's room
                if (this.processPool.length < this.maxPoolSize) {
                    this.processPool.push(poolItem);
                }
            } else {
                // Mark the process as busy
                poolItem.busy = true;
                poolItem.lastUsed = new Date();
                
                // Send the command to the existing process
                if (poolItem.process.stdin) {
                    poolItem.process.stdin.write(command + '\n');
                }
            }
            
            // Set up timeout if enabled
            if (this.timeoutConfig.enabled) {
                timeoutId = setTimeout(() => {
                    isTimedOut = true;
                    
                    // Kill the process if it's still running
                    if (poolItem && poolItem.process) {
                        this.killProcess(poolItem);
                    }
                    
                    reject(new Error(`Execution timed out after ${this.timeoutConfig.durationMs / 1000} seconds`));
                }, this.timeoutConfig.durationMs);
            }
            
            // Handle output
            let stdout = '';
            let stderr = '';
            
            if (poolItem.process.stdout) {
                poolItem.process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }
            
            if (poolItem.process.stderr) {
                poolItem.process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            
            // Handle process completion
            poolItem.process.on('close', (code) => {
                // Clear timeout if it exists
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                // If not timed out, resolve or reject based on exit code
                if (!isTimedOut) {
                    if (code === 0) {
                        resolve(stdout);
                    } else {
                        reject(stderr || `Process exited with code ${code}`);
                    }
                }
                
                // Mark the process as available for reuse
                if (poolItem) {
                    poolItem.busy = false;
                    poolItem.lastUsed = new Date();
                }
            });
            
            // Handle process errors
            poolItem.process.on('error', (err) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                if (!isTimedOut) {
                    reject(err.message);
                }
                
                // Remove this process from the pool as it encountered an error
                this.removeFromPool(poolItem);
            });
        });
    }
    
    /**
     * Gets an available process from the pool or returns null if none is available
     */
    private getAvailableProcess(projectRoot: string, sessionId: string | null): ProcessPoolItem | null {
        // First, try to find a process for the same session
        if (sessionId) {
            const sessionProcess = this.processPool.find(item => 
                !item.busy && item.sessionId === sessionId && item.projectRoot === projectRoot);
            if (sessionProcess) {
                return sessionProcess;
            }
        }
        
        // Then, try to find any available process for the same project
        const projectProcess = this.processPool.find(item => 
            !item.busy && item.projectRoot === projectRoot);
        if (projectProcess) {
            return projectProcess;
        }
        
        // No suitable process found
        return null;
    }
    
    /**
     * Removes a process from the pool
     */
    private removeFromPool(poolItem: ProcessPoolItem): void {
        const index = this.processPool.findIndex(item => item === poolItem);
        if (index !== -1) {
            this.processPool.splice(index, 1);
        }
    }
    
    /**
     * Kills a process and removes it from the pool
     */
    private killProcess(poolItem: ProcessPoolItem): void {
        try {
            // Try to kill the process gracefully first
            if (poolItem.process && !poolItem.process.killed) {
                poolItem.process.kill('SIGTERM');
                
                // Force kill after a short delay if it's still running
                setTimeout(() => {
                    if (poolItem.process && !poolItem.process.killed) {
                        poolItem.process.kill('SIGKILL');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error killing process:', error);
        } finally {
            this.removeFromPool(poolItem);
        }
    }
    
    /**
     * Cleans up idle processes and resources
     */
    private cleanupResources(): void {
        const now = new Date();
        
        // Clean up idle processes
        this.processPool = this.processPool.filter(item => {
            const idleTime = now.getTime() - item.lastUsed.getTime();
            
            // If the process has been idle for too long, kill it
            if (!item.busy && idleTime > this.idleTimeoutMs) {
                this.killProcess(item);
                return false;
            }
            
            return true;
        });
        
        // Clean up old session files that don't have corresponding sessions
        if (fs.existsSync(this.sessionVariablesDir)) {
            fs.readdir(this.sessionVariablesDir, (err, files) => {
                if (err) {
                    console.error('Error reading session directory:', err);
                    return;
                }
                
                files.forEach(file => {
                    // Extract session ID from filename
                    const match = file.match(/^(session-\d+)/);
                    if (match && match[1]) {
                        const sessionId = match[1];
                        
                        // If the session doesn't exist anymore, delete the file
                        if (!this.sessions.has(sessionId)) {
                            const filePath = path.join(this.sessionVariablesDir, file);
                            fs.unlink(filePath, err => {
                                if (err) {
                                    console.error(`Error deleting old session file ${file}:`, err);
                                }
                            });
                        }
                    }
                });
            });
        }
    }
    
    /**
     * Loads configuration from VSCode settings
     */
    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('laravelTinkerNotebook');
        
        // Load process pool configuration
        this.maxPoolSize = config.get('processPool.maxSize', 5);
        this.idleTimeoutMs = config.get('processPool.idleTimeoutMinutes', 5) * 60 * 1000;
        
        // Load timeout configuration
        this.timeoutConfig = {
            enabled: config.get('execution.timeoutEnabled', true),
            durationMs: config.get('execution.timeoutSeconds', 30) * 1000
        };
    }
    
    /**
     * Disposes resources when the extension is deactivated
     */
    public dispose(): void {
        // Clear the cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Kill all processes in the pool
        this.processPool.forEach(item => {
            this.killProcess(item);
        });
        
        // Clear the pool
        this.processPool = [];
    }
}

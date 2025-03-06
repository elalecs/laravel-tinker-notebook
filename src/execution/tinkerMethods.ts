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
                const match = file.match(/^(session-\\d+)/);
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

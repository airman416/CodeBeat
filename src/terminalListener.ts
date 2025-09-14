import * as vscode from 'vscode';
import { SuccessDetectionSystem } from './successDetectionSystem';

export interface TerminalEvent {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    exitCode?: number;
    command?: string;
}

export class TerminalListener implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private isListening: boolean = false;
    private successDetectionSystem?: SuccessDetectionSystem;
    private terminalDataListeners: Map<vscode.Terminal, vscode.Disposable> = new Map();

    public startListening(successDetectionSystem: SuccessDetectionSystem): void {
        if (this.isListening) {
            return;
        }

        this.isListening = true;
        this.successDetectionSystem = successDetectionSystem;
        
        console.log('CodeBeat: Starting terminal monitoring...');

        // Monitor when terminals are created
        const terminalCreateDisposable = vscode.window.onDidOpenTerminal((terminal) => {
            this.attachToTerminal(terminal);
        });

        // Monitor when terminals are closed
        const terminalCloseDisposable = vscode.window.onDidCloseTerminal((terminal) => {
            this.detachFromTerminal(terminal);
        });

        // Monitor task execution
        const taskStartDisposable = vscode.tasks.onDidStartTask((event) => {
            this.onTaskStart(event);
        });

        const taskEndDisposable = vscode.tasks.onDidEndTask((event) => {
            this.onTaskEnd(event);
        });

        // Monitor task process execution
        const taskProcessEndDisposable = vscode.tasks.onDidEndTaskProcess((event) => {
            this.onTaskProcessEnd(event);
        });

        this.disposables.push(
            terminalCreateDisposable,
            terminalCloseDisposable,
            taskStartDisposable,
            taskEndDisposable,
            taskProcessEndDisposable
        );

        // Attach to existing terminals
        vscode.window.terminals.forEach(terminal => {
            this.attachToTerminal(terminal);
        });
    }

    public stopListening(): void {
        this.isListening = false;
        console.log('CodeBeat: Stopping terminal monitoring...');
        this.dispose();
    }

    private attachToTerminal(terminal: vscode.Terminal): void {
        if (this.terminalDataListeners.has(terminal)) {
            return;
        }

        console.log(`CodeBeat: Attaching to terminal: ${terminal.name}`);

        // Note: VSCode doesn't provide direct access to terminal output
        // We'll rely on task monitoring and file system watching instead
        // This is a limitation of the VSCode API for security reasons
        
        // We can still track terminal state changes
        const disposable = vscode.Disposable.from();
        this.terminalDataListeners.set(terminal, disposable);
    }

    private detachFromTerminal(terminal: vscode.Terminal): void {
        const disposable = this.terminalDataListeners.get(terminal);
        if (disposable) {
            disposable.dispose();
            this.terminalDataListeners.delete(terminal);
        }
        console.log(`CodeBeat: Detached from terminal: ${terminal.name}`);
    }

    private onTaskStart(event: vscode.TaskStartEvent): void {
        if (!this.isListening || !this.successDetectionSystem) {
            return;
        }

        const task = event.execution.task;
        console.log(`CodeBeat: Task started - ${task.name} (${task.source})`);

        // Create a starting event
        const taskEvent: TerminalEvent = {
            type: 'info',
            message: `Task started: ${task.name}`,
            timestamp: new Date(),
            command: this.getTaskCommand(task)
        };

        this.processTerminalEvent(taskEvent);
    }

    private onTaskEnd(event: vscode.TaskEndEvent): void {
        if (!this.isListening || !this.successDetectionSystem) {
            return;
        }

        const task = event.execution.task;
        console.log(`CodeBeat: Task ended - ${task.name}`);
        
        // The task end event doesn't provide exit code
        // We'll rely on onDidEndTaskProcess for that
    }

    private onTaskProcessEnd(event: vscode.TaskProcessEndEvent): void {
        if (!this.isListening || !this.successDetectionSystem) {
            return;
        }

        const task = event.execution.task;
        const exitCode = event.exitCode;
        
        console.log(`CodeBeat: Task process ended - ${task.name}, exit code: ${exitCode}`);

        // Determine event type based on exit code
        const eventType: TerminalEvent['type'] = exitCode === 0 ? 'success' : 'error';
        
        const taskEvent: TerminalEvent = {
            type: eventType,
            message: `Task ${task.name} ${exitCode === 0 ? 'succeeded' : 'failed'}`,
            timestamp: new Date(),
            exitCode: exitCode,
            command: this.getTaskCommand(task)
        };

        this.processTerminalEvent(taskEvent);

        // Trigger success detection if task succeeded
        if (exitCode === 0) {
            this.successDetectionSystem.detectSuccess({
                type: 'task_success',
                details: {
                    taskName: task.name,
                    taskType: task.source,
                    command: this.getTaskCommand(task),
                    exitCode: exitCode
                },
                timestamp: new Date()
            });
        }
    }

    private getTaskCommand(task: vscode.Task): string {
        if (task.execution && 'commandLine' in task.execution) {
            return (task.execution as any).commandLine;
        }
        if (task.execution && 'command' in task.execution) {
            return (task.execution as any).command;
        }
        return task.name;
    }

    private processTerminalEvent(event: TerminalEvent): void {
        // Analyze the event for patterns
        const patterns = this.analyzeEventMessage(event.message, event.type);
        
        // Log the event
        console.log(`CodeBeat: Terminal event - ${event.type}: ${event.message}`, patterns);

        // Check for success patterns in the message
        if (event.type === 'success' && this.successDetectionSystem) {
            this.successDetectionSystem.detectSuccess({
                type: 'terminal_output',
                details: {
                    message: event.message,
                    patterns: patterns,
                    command: event.command,
                    exitCode: event.exitCode
                },
                timestamp: event.timestamp
            });
        }
    }

    private analyzeEventMessage(message: string, eventType: string): string[] {
        const patterns: string[] = [];
        const lowerMessage = message.toLowerCase();

        // Success patterns
        const successPatterns = [
            '✓', 'success', 'passed', 'ok', 'done', 'completed', 'built successfully',
            'compilation successful', 'tests passed', 'build succeeded', 'deployed',
            'published', 'installed', 'updated', 'created', 'generated'
        ];

        // Error patterns
        const errorPatterns = [
            '✗', 'error', 'failed', 'exception', 'build failed', 'compilation failed',
            'tests failed', 'deployment failed', 'fatal', 'critical', 'crashed'
        ];

        // Warning patterns
        const warningPatterns = [
            'warning', 'warn', 'deprecated', 'caution', 'notice', 'advisory'
        ];

        // Check for patterns
        successPatterns.forEach(pattern => {
            if (lowerMessage.includes(pattern)) {
                patterns.push(`success:${pattern}`);
            }
        });

        errorPatterns.forEach(pattern => {
            if (lowerMessage.includes(pattern)) {
                patterns.push(`error:${pattern}`);
            }
        });

        warningPatterns.forEach(pattern => {
            if (lowerMessage.includes(pattern)) {
                patterns.push(`warning:${pattern}`);
            }
        });

        // Language-specific build success patterns
        const buildPatterns = [
            'webpack compiled successfully',
            'typescript compilation complete',
            'babel compiled successfully',
            'jest tests passed',
            'npm run build succeeded',
            'yarn build completed',
            'mvn clean install success',
            'gradle build successful',
            'cargo build finished',
            'go build successful',
            'python setup.py install',
            'pip install successful'
        ];

        buildPatterns.forEach(pattern => {
            if (lowerMessage.includes(pattern.toLowerCase())) {
                patterns.push(`build:${pattern}`);
            }
        });

        return patterns;
    }

    public dispose(): void {
        this.isListening = false;
        
        // Dispose of all terminal listeners
        this.terminalDataListeners.forEach(disposable => disposable.dispose());
        this.terminalDataListeners.clear();
        
        // Dispose of all other listeners
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

import * as vscode from 'vscode';
import { SunoApiClient } from './sunoApiClient';

export interface SuccessEvent {
    type: 'terminal_output' | 'task_success' | 'diagnostic_improvement' | 'file_system' | 'manual';
    details: {
        [key: string]: any;
    };
    timestamp: Date;
}

export interface SuccessPattern {
    pattern: string | RegExp;
    celebrationType: 'compilation_success' | 'bug_fix' | 'test_pass' | 'deployment';
    confidence: number; // 0-1 scale
    description: string;
}

export class SuccessDetectionSystem {
    private fileSystemWatcher?: vscode.FileSystemWatcher;
    private lastCelebrationTime: Date = new Date(0);
    private celebrationCooldown: number = 5000; // 5 seconds between celebrations

    // Predefined success patterns
    private readonly successPatterns: SuccessPattern[] = [
        // Compilation Success Patterns
        {
            pattern: /webpack.*compiled successfully/i,
            celebrationType: 'compilation_success',
            confidence: 0.95,
            description: 'Webpack compilation successful'
        },
        {
            pattern: /typescript.*compilation.*complete/i,
            celebrationType: 'compilation_success',
            confidence: 0.9,
            description: 'TypeScript compilation complete'
        },
        {
            pattern: /built? successfully/i,
            celebrationType: 'compilation_success',
            confidence: 0.85,
            description: 'Build successful'
        },
        {
            pattern: /compilation.*successful/i,
            celebrationType: 'compilation_success',
            confidence: 0.9,
            description: 'Compilation successful'
        },

        // Test Success Patterns
        {
            pattern: /all tests? pass(ed)?/i,
            celebrationType: 'test_pass',
            confidence: 0.95,
            description: 'All tests passed'
        },
        {
            pattern: /\d+ passing/i,
            celebrationType: 'test_pass',
            confidence: 0.8,
            description: 'Tests passing'
        },
        {
            pattern: /jest.*\d+.*passed/i,
            celebrationType: 'test_pass',
            confidence: 0.9,
            description: 'Jest tests passed'
        },
        {
            pattern: /mocha.*\d+.*passing/i,
            celebrationType: 'test_pass',
            confidence: 0.9,
            description: 'Mocha tests passing'
        },

        // Deployment Success Patterns
        {
            pattern: /deploy(ed|ment).*success/i,
            celebrationType: 'deployment',
            confidence: 0.95,
            description: 'Deployment successful'
        },
        {
            pattern: /published.*successfully/i,
            celebrationType: 'deployment',
            confidence: 0.9,
            description: 'Package published successfully'
        },
        {
            pattern: /build.*deployed/i,
            celebrationType: 'deployment',
            confidence: 0.85,
            description: 'Build deployed'
        },

        // Bug Fix Patterns (inferred from context)
        {
            pattern: /fix(ed)?.*bug/i,
            celebrationType: 'bug_fix',
            confidence: 0.7,
            description: 'Bug fix detected'
        },
        {
            pattern: /resolved.*issue/i,
            celebrationType: 'bug_fix',
            confidence: 0.7,
            description: 'Issue resolved'
        },
        {
            pattern: /error.*resolved/i,
            celebrationType: 'bug_fix',
            confidence: 0.8,
            description: 'Error resolved'
        }
    ];

    constructor(private sunoApiClient: SunoApiClient) {
        this.setupFileSystemWatcher();
    }

    public detectSuccess(event: SuccessEvent): void {
        console.log(`CodeBeat: Processing success event - ${event.type}`, event.details);

        // Check cooldown period
        if (this.isInCooldown()) {
            console.log('CodeBeat: Success detection in cooldown period, skipping celebration');
            return;
        }

        const detectedPattern = this.analyzeEvent(event);
        
        if (detectedPattern) {
            this.triggerCelebration(
                detectedPattern.celebrationType,
                detectedPattern.description,
                event.details
            );
        }
    }

    public triggerCelebration(
        celebrationType: 'compilation_success' | 'bug_fix' | 'test_pass' | 'deployment',
        description: string,
        context?: any
    ): void {
        // Check if celebrations are enabled
        const config = vscode.workspace.getConfiguration('codebeat');
        if (!config.get('enabled', true) || !config.get('celebrationDrops', true)) {
            return;
        }

        // Update last celebration time
        this.lastCelebrationTime = new Date();

        console.log(`CodeBeat: Triggering ${celebrationType} celebration - ${description}`);

        // Generate celebration music
        const contextString = context ? JSON.stringify(context) : undefined;
        this.sunoApiClient.generateCelebration(celebrationType, contextString);

        // Show user notification
        this.showCelebrationNotification(celebrationType, description);
    }

    private analyzeEvent(event: SuccessEvent): SuccessPattern | null {
        let bestMatch: SuccessPattern | null = null;
        let bestConfidence = 0;

        // Extract text to analyze based on event type
        const textToAnalyze = this.extractTextFromEvent(event);
        
        if (!textToAnalyze) {
            return null;
        }

        // Check each pattern
        for (const pattern of this.successPatterns) {
            const confidence = this.testPattern(pattern, textToAnalyze, event);
            
            if (confidence > bestConfidence && confidence >= pattern.confidence * 0.8) {
                bestMatch = pattern;
                bestConfidence = confidence;
            }
        }

        // Special case: Exit code 0 from build/test commands
        if (event.type === 'task_success' && event.details.exitCode === 0) {
            const taskName = event.details.taskName?.toLowerCase() || '';
            const command = event.details.command?.toLowerCase() || '';
            
            if (this.isBuildCommand(taskName, command)) {
                return {
                    pattern: 'exit_code_0_build',
                    celebrationType: 'compilation_success',
                    confidence: 0.8,
                    description: 'Build task completed successfully (exit code 0)'
                };
            } else if (this.isTestCommand(taskName, command)) {
                return {
                    pattern: 'exit_code_0_test',
                    celebrationType: 'test_pass',
                    confidence: 0.8,
                    description: 'Test task completed successfully (exit code 0)'
                };
            } else if (this.isDeployCommand(taskName, command)) {
                return {
                    pattern: 'exit_code_0_deploy',
                    celebrationType: 'deployment',
                    confidence: 0.8,
                    description: 'Deploy task completed successfully (exit code 0)'
                };
            }
        }

        return bestMatch;
    }

    private extractTextFromEvent(event: SuccessEvent): string | null {
        switch (event.type) {
            case 'terminal_output':
                return event.details.message || '';
            case 'task_success':
                return `${event.details.taskName} ${event.details.command} completed`;
            case 'diagnostic_improvement':
                return `errors reduced from ${event.details.previousErrors} to ${event.details.currentErrors}`;
            case 'file_system':
                return `new file created: ${event.details.filePath}`;
            case 'manual':
                return event.details.description || 'manual celebration';
            default:
                return null;
        }
    }

    private testPattern(pattern: SuccessPattern, text: string, event: SuccessEvent): number {
        if (typeof pattern.pattern === 'string') {
            return text.toLowerCase().includes(pattern.pattern.toLowerCase()) ? pattern.confidence : 0;
        } else {
            return pattern.pattern.test(text) ? pattern.confidence : 0;
        }
    }

    private isBuildCommand(taskName: string, command: string): boolean {
        const buildKeywords = [
            'build', 'compile', 'webpack', 'rollup', 'parcel', 'vite',
            'tsc', 'babel', 'esbuild', 'swc', 'maven', 'gradle',
            'cargo build', 'go build', 'make', 'cmake'
        ];
        
        const text = `${taskName} ${command}`.toLowerCase();
        return buildKeywords.some(keyword => text.includes(keyword));
    }

    private isTestCommand(taskName: string, command: string): boolean {
        const testKeywords = [
            'test', 'jest', 'mocha', 'jasmine', 'karma', 'cypress',
            'playwright', 'vitest', 'ava', 'tap', 'lab', 'pytest',
            'unittest', 'phpunit', 'rspec', 'gtest'
        ];
        
        const text = `${taskName} ${command}`.toLowerCase();
        return testKeywords.some(keyword => text.includes(keyword));
    }

    private isDeployCommand(taskName: string, command: string): boolean {
        const deployKeywords = [
            'deploy', 'publish', 'release', 'ship', 'upload',
            'push', 'heroku', 'vercel', 'netlify', 'aws deploy',
            'docker push', 'npm publish', 'yarn publish'
        ];
        
        const text = `${taskName} ${command}`.toLowerCase();
        return deployKeywords.some(keyword => text.includes(keyword));
    }

    private isInCooldown(): boolean {
        const now = new Date();
        return (now.getTime() - this.lastCelebrationTime.getTime()) < this.celebrationCooldown;
    }

    private showCelebrationNotification(
        celebrationType: 'compilation_success' | 'bug_fix' | 'test_pass' | 'deployment',
        description: string
    ): void {
        const emojis = {
            'compilation_success': '🎉',
            'bug_fix': '🐛✨',
            'test_pass': '✅',
            'deployment': '🚀'
        };

        const messages = {
            'compilation_success': 'Code compiled successfully!',
            'bug_fix': 'Bug resolved!',
            'test_pass': 'All tests passed!',
            'deployment': 'Deployment successful!'
        };

        const emoji = emojis[celebrationType];
        const message = messages[celebrationType];

        vscode.window.showInformationMessage(
            `${emoji} CodeBeat: ${message} ${description}`
        );
    }

    private setupFileSystemWatcher(): void {
        // Watch for new files in common build output directories
        const buildPaths = [
            '**/dist/**',
            '**/build/**',
            '**/out/**',
            '**/target/**',
            '**/.next/**',
            '**/public/**'
        ];

        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
            `{${buildPaths.join(',')}}`
        );

        this.fileSystemWatcher.onDidCreate((uri) => {
            console.log(`CodeBeat: New file created in build directory: ${uri.fsPath}`);
            
            // Check if this is a significant build artifact
            if (this.isSignificantBuildArtifact(uri.fsPath)) {
                this.detectSuccess({
                    type: 'file_system',
                    details: {
                        filePath: uri.fsPath,
                        event: 'created'
                    },
                    timestamp: new Date()
                });
            }
        });
    }

    private isSignificantBuildArtifact(filePath: string): boolean {
        const significantExtensions = [
            '.js', '.html', '.css', '.wasm', '.exe', '.jar',
            '.war', '.zip', '.tar.gz', '.deb', '.rpm', '.msi'
        ];
        
        const significantFilenames = [
            'index.html', 'main.js', 'bundle.js', 'app.js',
            'style.css', 'main.css', 'manifest.json'
        ];

        const fileName = filePath.toLowerCase();
        
        return significantExtensions.some(ext => fileName.endsWith(ext)) ||
               significantFilenames.some(name => fileName.includes(name));
    }

    public dispose(): void {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
    }
}

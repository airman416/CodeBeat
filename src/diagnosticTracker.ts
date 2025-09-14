import * as vscode from 'vscode';
import { MusicParameterGenerator } from './musicParameterGenerator';
import { SunoMockClient } from './sunoMockClient';

export interface DiagnosticSummary {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    hintCount: number;
    totalCount: number;
    timestamp: Date;
}

export class DiagnosticTracker implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private isTracking: boolean = false;
    private lastDiagnosticSummary?: DiagnosticSummary;
    private musicUpdateTimer?: NodeJS.Timeout;
    private readonly updateDelay = 1500; // 1.5 seconds delay to avoid rapid updates

    constructor(
        private musicGenerator: MusicParameterGenerator,
        private sunoMockClient: SunoMockClient
    ) {}

    public startTracking(): void {
        if (this.isTracking) {
            return;
        }

        this.isTracking = true;
        console.log('CodeBeat: Starting diagnostic monitoring...');

        // Monitor diagnostic changes
        const diagnosticDisposable = vscode.languages.onDidChangeDiagnostics((event) => {
            this.onDiagnosticsChanged(event);
        });

        this.disposables.push(diagnosticDisposable);

        // Get initial diagnostic state
        this.updateDiagnosticSummary();
    }

    public stopTracking(): void {
        this.isTracking = false;
        console.log('CodeBeat: Stopping diagnostic monitoring...');
        
        if (this.musicUpdateTimer) {
            clearTimeout(this.musicUpdateTimer);
            this.musicUpdateTimer = undefined;
        }
        
        this.dispose();
    }

    private onDiagnosticsChanged(event: vscode.DiagnosticChangeEvent): void {
        if (!this.isTracking) {
            return;
        }

        // Only process if this involves the currently active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }

        const activeDocumentUri = activeEditor.document.uri;
        const isActiveDocumentAffected = event.uris.some(uri => 
            uri.toString() === activeDocumentUri.toString()
        );

        if (!isActiveDocumentAffected) {
            return;
        }

        console.log('CodeBeat: Diagnostics changed for active document');

        // Debounce updates to avoid rapid successive calls
        if (this.musicUpdateTimer) {
            clearTimeout(this.musicUpdateTimer);
        }

        this.musicUpdateTimer = setTimeout(() => {
            this.updateDiagnosticSummary();
        }, this.updateDelay);
    }

    private updateDiagnosticSummary(): void {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }

        const documentUri = activeEditor.document.uri;
        const diagnostics = vscode.languages.getDiagnostics(documentUri);

        const newSummary = this.createDiagnosticSummary(diagnostics);
        
        console.log(`CodeBeat: Diagnostic summary - ${newSummary.errorCount} errors, ${newSummary.warningCount} warnings`);

        // Check if diagnostics have improved
        const hasImproved = this.hasImproved(this.lastDiagnosticSummary, newSummary);
        
        // Generate music based on current diagnostic state
        this.generateDiagnosticMusic(newSummary, this.lastDiagnosticSummary);

        // Check for significant improvement (might trigger celebration)
        if (hasImproved && this.lastDiagnosticSummary) {
            this.checkForCelebrationTrigger(this.lastDiagnosticSummary, newSummary);
        }

        this.lastDiagnosticSummary = newSummary;
    }

    private createDiagnosticSummary(diagnostics: vscode.Diagnostic[]): DiagnosticSummary {
        let errorCount = 0;
        let warningCount = 0;
        let infoCount = 0;
        let hintCount = 0;

        diagnostics.forEach(diagnostic => {
            switch (diagnostic.severity) {
                case vscode.DiagnosticSeverity.Error:
                    errorCount++;
                    break;
                case vscode.DiagnosticSeverity.Warning:
                    warningCount++;
                    break;
                case vscode.DiagnosticSeverity.Information:
                    infoCount++;
                    break;
                case vscode.DiagnosticSeverity.Hint:
                    hintCount++;
                    break;
            }
        });

        return {
            errorCount,
            warningCount,
            infoCount,
            hintCount,
            totalCount: errorCount + warningCount + infoCount + hintCount,
            timestamp: new Date()
        };
    }

    private hasImproved(previous?: DiagnosticSummary, current?: DiagnosticSummary): boolean {
        if (!previous || !current) {
            return false;
        }

        // Improvement means fewer errors or warnings
        return (
            current.errorCount < previous.errorCount ||
            (current.errorCount === previous.errorCount && current.warningCount < previous.warningCount)
        );
    }

    private async generateDiagnosticMusic(
        current: DiagnosticSummary,
        previous?: DiagnosticSummary
    ): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('codebeat');
            if (!config.get('enabled', true)) {
                return;
            }

            // Generate music parameters based on diagnostic state
            const musicParams = this.musicGenerator.generateFromDiagnostics(
                current.errorCount,
                current.warningCount,
                previous?.errorCount
            );

            // Send to Suno (mock) API
            await this.sunoMockClient.generateMusic(musicParams, 'error_feedback');

            console.log(`CodeBeat: Generated diagnostic feedback music - ${current.errorCount} errors, ${current.warningCount} warnings`);

        } catch (error) {
            console.error('CodeBeat: Error generating diagnostic music:', error);
        }
    }

    private checkForCelebrationTrigger(previous: DiagnosticSummary, current: DiagnosticSummary): void {
        // Trigger celebration if errors dropped to zero
        if (previous.errorCount > 0 && current.errorCount === 0) {
            console.log('CodeBeat: All errors resolved - triggering bug fix celebration!');
            
            this.sunoMockClient.generateCelebration('bug_fix', `Fixed ${previous.errorCount} errors`);
            
            vscode.window.showInformationMessage(
                `🐛✨ CodeBeat: All errors resolved! Fixed ${previous.errorCount} error(s)`
            );
            return;
        }

        // Trigger smaller celebration for significant error reduction
        const errorReduction = previous.errorCount - current.errorCount;
        if (errorReduction >= 3) {
            console.log(`CodeBeat: Significant error reduction (${errorReduction}) - mini celebration!`);
            
            vscode.window.showInformationMessage(
                `🎯 CodeBeat: Great progress! Resolved ${errorReduction} error(s)`
            );
        }
    }

    public getCurrentDiagnosticSummary(): DiagnosticSummary | undefined {
        return this.lastDiagnosticSummary;
    }

    public getDiagnosticTrend(): 'improving' | 'degrading' | 'stable' | 'unknown' {
        if (!this.lastDiagnosticSummary) {
            return 'unknown';
        }

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return 'unknown';
        }

        const currentDiagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri);
        const currentSummary = this.createDiagnosticSummary(currentDiagnostics);

        if (currentSummary.errorCount < this.lastDiagnosticSummary.errorCount) {
            return 'improving';
        } else if (currentSummary.errorCount > this.lastDiagnosticSummary.errorCount) {
            return 'degrading';
        } else {
            return 'stable';
        }
    }

    public getDetailedDiagnosticInfo(): { [severity: string]: vscode.Diagnostic[] } {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return {};
        }

        const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri);
        
        return {
            errors: diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error),
            warnings: diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning),
            information: diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Information),
            hints: diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Hint)
        };
    }

    public dispose(): void {
        this.isTracking = false;
        
        if (this.musicUpdateTimer) {
            clearTimeout(this.musicUpdateTimer);
            this.musicUpdateTimer = undefined;
        }
        
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

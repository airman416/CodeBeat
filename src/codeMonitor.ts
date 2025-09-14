import * as vscode from 'vscode';
import { TandemApiClient } from './tandemApiClient';
import { MusicParameterGenerator } from './musicParameterGenerator';
import { SunoApiClient } from './sunoApiClient';

export class CodeMonitor implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private analysisTimer: NodeJS.Timeout | undefined;
    private lastAnalyzedContent: string = '';
    private isMonitoring: boolean = false;

    constructor(
        private tandemClient: TandemApiClient,
        private musicGenerator: MusicParameterGenerator,
        private sunoApiClient: SunoApiClient
    ) {}

    public startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        console.log('CodeBeat: Starting code monitoring...');

        // Monitor active text editor changes
        const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor(
            (editor) => this.onActiveEditorChanged(editor)
        );

        // Monitor document content changes
        const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
            (event) => this.onDocumentChanged(event)
        );

        this.disposables.push(activeEditorDisposable, documentChangeDisposable);

        // Analyze current editor if available
        if (vscode.window.activeTextEditor) {
            this.scheduleAnalysis(vscode.window.activeTextEditor.document);
        }
    }

    public stopMonitoring(): void {
        this.isMonitoring = false;
        console.log('CodeBeat: Stopping code monitoring...');
        
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
            this.analysisTimer = undefined;
        }
        
        this.dispose();
    }

    private onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
        if (!this.isMonitoring || !editor) {
            return;
        }

        console.log(`CodeBeat: Active editor changed to ${editor.document.fileName}`);
        this.scheduleAnalysis(editor.document);
    }

    private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
        if (!this.isMonitoring) {
            return;
        }

        // Only analyze if this is the active document
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.toString() !== event.document.uri.toString()) {
            return;
        }

        this.scheduleAnalysis(event.document);
    }

    private scheduleAnalysis(document: vscode.TextDocument): void {
        // Clear existing timer
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
        }

        // Get sensitivity setting
        const config = vscode.workspace.getConfiguration('codebeat');
        const sensitivity = config.get('analysisSensitivity', 2000);

        // Schedule new analysis
        this.analysisTimer = setTimeout(() => {
            this.analyzeDocument(document);
        }, sensitivity);
    }

    private async analyzeDocument(document: vscode.TextDocument): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('codebeat');
            if (!config.get('enabled', true)) {
                return;
            }

            const content = document.getText();
            
            // Skip if content hasn't changed significantly
            if (content === this.lastAnalyzedContent) {
                return;
            }

            // Skip if document is too small or empty
            if (content.trim().length < 50) {
                return;
            }

            this.lastAnalyzedContent = content;

            console.log(`CodeBeat: Analyzing ${document.languageId} file: ${document.fileName}`);
            
            // Get file context
            const fileExtension = document.fileName.split('.').pop() || '';
            const languageId = document.languageId;
            
            // Analyze code with Tandemn API
            const codeAnalysis = await this.tandemClient.analyzeCode(content, languageId, fileExtension);
            
            if (codeAnalysis) {
                // Generate music parameters based on analysis
                const musicParams = this.musicGenerator.generateFromAnalysis(
                    codeAnalysis,
                    languageId,
                    content.split('\n').length
                );

                // Send to Suno (mock) API with code context
                const codeContext = {
                    code: content,
                    language: languageId,
                    fileName: document.fileName
                };
                await this.sunoApiClient.generateMusic(musicParams, 'code_analysis', codeContext);

                console.log(`CodeBeat: Generated music for ${languageId} code complexity`);
            }

        } catch (error) {
            console.error('CodeBeat: Error analyzing document:', error);
            vscode.window.showErrorMessage(`CodeBeat: Analysis failed - ${error}`);
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.analysisTimer) {
            clearTimeout(this.analysisTimer);
            this.analysisTimer = undefined;
        }
    }
}

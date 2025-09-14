import * as vscode from 'vscode';
import { CodeMonitor } from './codeMonitor';
import { TerminalListener } from './terminalListener';
import { DiagnosticTracker } from './diagnosticTracker';
import { TandemApiClient } from './tandemApiClient';
import { MusicParameterGenerator } from './musicParameterGenerator';
import { SuccessDetectionSystem } from './successDetectionSystem';
import { SunoMockClient } from './sunoMockClient';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeBeat extension is now active!');

    // Initialize core components
    const tandemClient = new TandemApiClient();
    const musicGenerator = new MusicParameterGenerator();
    const sunoMock = new SunoMockClient();
    
    const codeMonitor = new CodeMonitor(tandemClient, musicGenerator, sunoMock);
    const terminalListener = new TerminalListener();
    const diagnosticTracker = new DiagnosticTracker(musicGenerator, sunoMock);
    const successDetectionSystem = new SuccessDetectionSystem(sunoMock);

    // Set up event listeners and monitoring
    codeMonitor.startMonitoring();
    terminalListener.startListening(successDetectionSystem);
    diagnosticTracker.startTracking();

    // Register commands
    const toggleCommand = vscode.commands.registerCommand('codebeat.toggle', () => {
        const config = vscode.workspace.getConfiguration('codebeat');
        const isEnabled = config.get('enabled', true);
        config.update('enabled', !isEnabled, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
            `CodeBeat ${!isEnabled ? 'enabled' : 'disabled'}`
        );
        
        if (!isEnabled) {
            codeMonitor.startMonitoring();
        } else {
            codeMonitor.stopMonitoring();
        }
    });

    const celebrateCommand = vscode.commands.registerCommand('codebeat.celebrateNow', () => {
        successDetectionSystem.triggerCelebration('compilation_success', 'User triggered celebration');
    });

    // Add disposables to context
    context.subscriptions.push(
        toggleCommand,
        celebrateCommand,
        codeMonitor,
        terminalListener,
        diagnosticTracker
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        '🎵 CodeBeat is ready to enhance your coding experience with adaptive music!'
    );
}

export function deactivate() {
    console.log('CodeBeat extension is now deactivated');
}

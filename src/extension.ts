import * as vscode from 'vscode';
import { CodeMonitor } from './codeMonitor';
import { TerminalListener } from './terminalListener';
import { DiagnosticTracker } from './diagnosticTracker';
import { TandemApiClient } from './tandemApiClient';
import { MusicParameterGenerator } from './musicParameterGenerator';
import { SuccessDetectionSystem } from './successDetectionSystem';
import { SunoApiClient } from './sunoApiClient';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeBeat extension is now active!');

    // Initialize core components
    const tandemClient = new TandemApiClient();
    const musicGenerator = new MusicParameterGenerator();
    const sunoClient = new SunoApiClient();
    
    const codeMonitor = new CodeMonitor(tandemClient, musicGenerator, sunoClient);
    const terminalListener = new TerminalListener();
    const diagnosticTracker = new DiagnosticTracker(musicGenerator, sunoClient);
    const successDetectionSystem = new SuccessDetectionSystem(sunoClient);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.name = 'CodeBeat Control';
    
    let isPlaying = true; // Extension starts enabled by default
    
    function updateStatusBar() {
        const config = vscode.workspace.getConfiguration('codebeat');
        const isEnabled = config.get('enabled', true);
        
        if (isEnabled) {
            statusBarItem.text = '$(unmute) CodeBeat';
            statusBarItem.tooltip = 'CodeBeat is playing - Click to stop';
            statusBarItem.command = 'codebeat.stop';
            statusBarItem.backgroundColor = undefined;
        } else {
            statusBarItem.text = '$(mute) CodeBeat';
            statusBarItem.tooltip = 'CodeBeat is stopped - Click to play';
            statusBarItem.command = 'codebeat.play';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        statusBarItem.show();
    }
    
    updateStatusBar();

    // Set up event listeners and monitoring
    codeMonitor.startMonitoring();
    terminalListener.startListening(successDetectionSystem);
    diagnosticTracker.startTracking();

    // Register commands
    const playCommand = vscode.commands.registerCommand('codebeat.play', () => {
        const config = vscode.workspace.getConfiguration('codebeat');
        config.update('enabled', true, vscode.ConfigurationTarget.Global);
        
        codeMonitor.startMonitoring();
        updateStatusBar();
        
        vscode.window.showInformationMessage('🎵 CodeBeat started playing');
    });

    const stopCommand = vscode.commands.registerCommand('codebeat.stop', () => {
        const config = vscode.workspace.getConfiguration('codebeat');
        config.update('enabled', false, vscode.ConfigurationTarget.Global);
        
        codeMonitor.stopMonitoring();
        updateStatusBar();
        
        vscode.window.showInformationMessage('⏹️ CodeBeat stopped');
    });

    const toggleCommand = vscode.commands.registerCommand('codebeat.toggle', () => {
        const config = vscode.workspace.getConfiguration('codebeat');
        const isEnabled = config.get('enabled', true);
        config.update('enabled', !isEnabled, vscode.ConfigurationTarget.Global);
        
        if (!isEnabled) {
            codeMonitor.startMonitoring();
            vscode.window.showInformationMessage('🎵 CodeBeat enabled');
        } else {
            codeMonitor.stopMonitoring();
            vscode.window.showInformationMessage('⏹️ CodeBeat disabled');
        }
        
        updateStatusBar();
    });

    const celebrateCommand = vscode.commands.registerCommand('codebeat.celebrateNow', () => {
        successDetectionSystem.triggerCelebration('compilation_success', 'User triggered celebration');
    });

    const toggleAudioCommand = vscode.commands.registerCommand('codebeat.toggleAudio', () => {
        sunoClient.toggleAudio();
    });

    // Add disposables to context
    context.subscriptions.push(
        playCommand,
        stopCommand,
        toggleCommand,
        celebrateCommand,
        toggleAudioCommand,
        statusBarItem,
        codeMonitor,
        terminalListener,
        diagnosticTracker,
        sunoClient
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        '🎵 CodeBeat is ready to enhance your coding experience with adaptive music!'
    );
}

export function deactivate() {
    console.log('CodeBeat extension is now deactivated');
}

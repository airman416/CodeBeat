import * as vscode from 'vscode';
import { MusicParameters } from './musicParameterGenerator';
import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';

export interface SunoApiRequest {
    prompt: string;
    bpm: number;
    genre: string;
    mood: string;
    energy: number;
    instruments: string[];
    duration: number;
    tags: string[];
    structure: string;
    make_instrumental: boolean;
    model_version: string;
    wait_audio: boolean;
}

export interface SunoApiResponse {
    id: string;
    status: 'submitted' | 'queued' | 'streaming' | 'complete' | 'error';
    audio_url?: string;
    title?: string;
    image_url?: string;
    created_at?: string;
    metadata: {
        bpm: number;
        genre: string;
        duration: number;
        tags?: string;
        prompt?: string;
        error_type?: string;
        error_message?: string;
    };
}

class AudioPlayer {
    private audioProcess: ChildProcess | null = null;
    private isMuted: boolean = false;
    private currentUrl: string | null = null;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        // Status bar is now managed centrally in extension.ts
        // this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        // this.updateStatusBar();
    }

    public async playAudio(url: string, title?: string): Promise<void> {
        // Always update current URL for potential resume after unmute
        this.currentUrl = url;
        
        // Stop any existing audio first
        await this.stopAudio();
        
        if (this.isMuted) {
            this.outputChannel.appendLine('🔇 Audio is muted - not playing automatically');
            return;
        }

        this.outputChannel.appendLine(`\n🎵 Starting automatic playback...`);
        this.outputChannel.appendLine(`🌐 URL: ${url}`);
        
        if (title) {
            this.outputChannel.appendLine(`🎼 Title: ${title}`);
        }

        try {
            // Detect if this is a streaming URL or direct MP3
            const isStreamingUrl = url.includes('audiopipe.suno.ai') || url.includes('streaming');
            const players = this.getAvailableAudioPlayers(isStreamingUrl);
            
            this.outputChannel.appendLine(`🔍 Detected ${isStreamingUrl ? 'streaming' : 'direct'} URL type`);
            
            for (const player of players) {
                try {
                    let args: string[];
                    let command: string = player.command;

                    // Special handling for curl + afplay on macOS for streaming URLs
                    if (player.name === 'curl + afplay (macOS)' && isStreamingUrl) {
                        // Create a command that downloads and pipes to afplay
                        const curlCommand = `curl -s -L "${url}" | afplay -`;
                        args = [curlCommand];
                        this.outputChannel.appendLine(`🔄 Using curl + afplay for streaming: ${curlCommand.substring(0, 50)}...`);
                    } else {
                        args = [...player.args, url];
                    }

                    this.audioProcess = spawn(command, args, {
                        stdio: ['ignore', 'pipe', 'pipe'],
                        shell: player.name === 'curl + afplay (macOS)'
                    });

                    this.audioProcess.on('spawn', () => {
                        this.outputChannel.appendLine(`✅ Audio playback started with ${player.name}`);
                    });

                    this.audioProcess.on('error', (error) => {
                        this.outputChannel.appendLine(`❌ Audio player error (${player.name}): ${error.message}`);
                    });

                    this.audioProcess.on('exit', (code) => {
                        if (code === 0) {
                            this.outputChannel.appendLine(`🎵 Audio playback completed`);
                        } else {
                            this.outputChannel.appendLine(`⚠️  ${player.name} exited with code: ${code} - trying next player...`);
                        }
                        this.audioProcess = null;
                    });

                    // Wait a moment to see if the process starts successfully
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // If process is still running, we consider it successful
                    if (this.audioProcess && !this.audioProcess.killed) {
                        this.outputChannel.appendLine(`🎉 Successfully started ${player.name} for ${isStreamingUrl ? 'streaming' : 'direct'} playback`);
                        break;
                    } else {
                        this.outputChannel.appendLine(`⚠️  ${player.name} failed to start properly, trying next...`);
                        continue;
                    }

                } catch (error) {
                    this.outputChannel.appendLine(`⚠️  Failed to start ${player.name}: ${error}`);
                    continue;
                }
            }

            if (!this.audioProcess) {
                this.outputChannel.appendLine(`❌ No compatible audio player found for ${isStreamingUrl ? 'streaming' : 'direct'} URL`);
                this.outputChannel.appendLine(`💡 Suggestion: Install ffmpeg (for ffplay) or VLC for better streaming support`);
                this.showBrowserFallback(url);
            }

        } catch (error) {
            this.outputChannel.appendLine(`❌ Audio playback error: ${error}`);
            this.showBrowserFallback(url);
        }
    }

    private getAvailableAudioPlayers(isStreamingUrl: boolean = false): Array<{command: string, args: string[], name: string}> {
        const players = [];
        
        if (isStreamingUrl) {
            // For streaming URLs, prioritize players that handle HTTP streams well
            
            // ffplay with streaming options (comes with ffmpeg)
            players.push({
                command: 'ffplay',
                args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-reconnect', '1', '-reconnect_streamed', '1'],
                name: 'FFplay (streaming)'
            });

            // VLC (excellent for streaming)
            players.push({
                command: 'vlc',
                args: ['--intf', 'dummy', '--play-and-exit', '--no-video'],
                name: 'VLC (streaming)'
            });

            // mpv (great for streaming)
            players.push({
                command: 'mpv',
                args: ['--no-video', '--really-quiet', '--user-agent=CodeBeat-VSCode-Extension/1.0.0'],
                name: 'mpv (streaming)'
            });

            // curl + afplay for macOS (download then play)
            if (process.platform === 'darwin') {
                players.push({
                    command: 'sh',
                    args: ['-c'],
                    name: 'curl + afplay (macOS)'
                });
            }
        } else {
            // For local files or direct MP3 URLs
            
            // ffplay (comes with ffmpeg)
            players.push({
                command: 'ffplay',
                args: ['-nodisp', '-autoexit', '-loglevel', 'quiet'],
                name: 'FFplay'
            });

            // VLC (headless)
            players.push({
                command: 'vlc',
                args: ['--intf', 'dummy', '--play-and-exit'],
                name: 'VLC'
            });

            // mpv
            players.push({
                command: 'mpv',
                args: ['--no-video', '--really-quiet'],
                name: 'mpv'
            });

            // macOS specific for local files
            if (process.platform === 'darwin') {
                players.unshift({
                    command: 'afplay',
                    args: [],
                    name: 'afplay (macOS)'
                });
            }
        }

        return players;
    }

    private showBrowserFallback(url: string): void {
        const isStreamingUrl = url.includes('audiopipe.suno.ai');
        
        vscode.window.showInformationMessage(
            `🎵 CodeBeat: ${isStreamingUrl ? 'Streaming requires compatible audio player.' : 'Audio player not found.'} Opening in browser...`,
            'Open Audio',
            'Install ffmpeg'
        ).then(selection => {
            if (selection === 'Open Audio') {
                vscode.env.openExternal(vscode.Uri.parse(url));
            } else if (selection === 'Install ffmpeg') {
                // Open ffmpeg installation page
                const installUrl = process.platform === 'darwin' 
                    ? 'https://formulae.brew.sh/formula/ffmpeg'
                    : 'https://ffmpeg.org/download.html';
                vscode.env.openExternal(vscode.Uri.parse(installUrl));
            }
        });
        
        this.outputChannel.appendLine(`🌐 Browser fallback: Opening ${url} in default browser`);
        
        if (isStreamingUrl) {
            this.outputChannel.appendLine(`💡 For automatic playback, install one of these audio players:`);
            this.outputChannel.appendLine(`   • ffmpeg (includes ffplay): brew install ffmpeg (macOS) or apt install ffmpeg (Linux)`);
            this.outputChannel.appendLine(`   • VLC: https://www.videolan.org/vlc/`);
            this.outputChannel.appendLine(`   • mpv: https://mpv.io/`);
        }
    }

    public async stopAudio(): Promise<void> {
        if (this.audioProcess) {
            this.outputChannel.appendLine('⏹️  Stopping audio playback...');
            this.audioProcess.kill('SIGTERM');
            this.audioProcess = null;
        }
    }

    public toggleMute(): void {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.outputChannel.appendLine('🔇 Audio muted - stopping playback');
            // Immediately stop audio when muted
            this.stopAudio();
        } else {
            this.outputChannel.appendLine('🔊 Audio unmuted');
            if (this.currentUrl) {
                this.outputChannel.appendLine('▶️  Resuming playback...');
                // Resume playback with the last URL
                this.playAudio(this.currentUrl);
            }
        }
        
        vscode.window.showInformationMessage(
            `🎵 CodeBeat: Audio ${this.isMuted ? 'muted' : 'unmuted'}`
        );
    }

    public getMuteStatus(): boolean {
        return this.isMuted;
    }

    public dispose(): void {
        this.stopAudio();
    }
}

export class SunoApiClient {
    private lastGeneratedId: number = 0;
    private outputChannel: vscode.OutputChannel;
    private apiToken: string | undefined;
    private readonly baseUrl = 'https://studio-api.prod.suno.com/api/v2/external/hackmit';
    private audioPlayer: AudioPlayer;
    private activePollingIntervals: Set<NodeJS.Timeout> = new Set();

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('CodeBeat - Suno API');
        this.outputChannel.show(true);
        
        // Initialize audio player
        this.audioPlayer = new AudioPlayer(this.outputChannel);
        
        // Load environment variables
        this.loadEnvVars();
        
        if (this.apiToken) {
            this.outputChannel.appendLine('🎵 CodeBeat Suno API Client Initialized');
            this.outputChannel.appendLine('✅ API Token loaded successfully');
            this.outputChannel.appendLine('🎼 Audio player ready for automatic playback\n');
        } else {
            this.outputChannel.appendLine('🎵 CodeBeat Suno API Client Initialized');
            this.outputChannel.appendLine('⚠️  WARNING: SUNO_API_TOKEN not found in .env file');
            this.outputChannel.appendLine('Please add SUNO_API_TOKEN=your_token to your .env file');
            this.outputChannel.appendLine('🎼 Audio player ready for automatic playback\n');
        }
    }

    private loadEnvVars(): void {
        try {
            // Try to load from .env file in workspace root using dotenv
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env');
                
                this.outputChannel.appendLine(`📁 Looking for .env file at: ${envPath}`);
                
                if (fs.existsSync(envPath)) {
                    this.outputChannel.appendLine(`✅ Found .env file, loading...`);
                    
                    // Use dotenv to parse the file
                    const result = dotenv.config({ path: envPath });
                    
                    if (result.error) {
                        this.outputChannel.appendLine(`❌ Error parsing .env file: ${result.error}`);
                    } else {
                        this.outputChannel.appendLine(`✅ Loaded .env file successfully`);
                        
                        // Get the token from the parsed environment
                        this.apiToken = result.parsed?.SUNO_API_TOKEN;
                        
                        if (this.apiToken) {
                            this.outputChannel.appendLine(`✅ SUNO_API_TOKEN found in .env file`);
                        } else {
                            this.outputChannel.appendLine(`⚠️  SUNO_API_TOKEN not found in .env file`);
                        }
                    }
                } else {
                    this.outputChannel.appendLine(`❌ .env file not found at: ${envPath}`);
                }
            } else {
                this.outputChannel.appendLine(`❌ No workspace folders found`);
            }
            
            // Fallback to process.env if available
            if (!this.apiToken && process.env.SUNO_API_TOKEN) {
                this.apiToken = process.env.SUNO_API_TOKEN;
                this.outputChannel.appendLine(`✅ SUNO_API_TOKEN found in process.env`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error loading environment variables: ${error}`);
        }
    }

    public async generateMusic(
        params: MusicParameters,
        triggerType: 'code_analysis' | 'success_celebration' | 'error_feedback' | 'manual',
        codeContext?: { code: string; language: string; fileName?: string }
    ): Promise<SunoApiResponse> {
        const requestId = this.generateRequestId();
        const timestamp = new Date().toISOString();

        // Log the received music parameters
        console.log('CodeBeat: Suno API Client received music parameters:', JSON.stringify(params, null, 2));
        console.log('CodeBeat: Trigger type:', triggerType);

        // Create the Suno API request payload
        const sunoRequest: SunoApiRequest = {
            prompt: params.prompt,
            bpm: params.bpm,
            genre: params.genre,
            mood: params.mood,
            energy: params.energy,
            instruments: params.instruments,
            duration: params.duration,
            tags: params.tags,
            structure: params.structure,
            make_instrumental: true, // CodeBeat focuses on instrumental music
            model_version: 'v3.5', // Latest Suno model
            wait_audio: false // Async generation
        };

        // Log the API call details
        this.logApiCall(requestId, timestamp, triggerType, sunoRequest, params, codeContext);

        try {
            // Make real API call if token is available
            if (this.apiToken) {
                const response = await this.makeApiCall(sunoRequest);
                
                // Start polling for status updates and streaming
                this.startPollingForStatus(response.id, triggerType, params);
                
                // Show notification for important events
                if (triggerType === 'success_celebration') {
                    vscode.window.showInformationMessage(
                        `🎉 CodeBeat: Success celebration music generated! (${params.bpm} BPM, ${params.genre})`
                    );
                }
                
                return response;
            } else {
                // Fallback to mock response if no API token
                this.outputChannel.appendLine('⚠️  No API token available, using mock response');
                
                const mockResponse: SunoApiResponse = {
                    id: requestId,
                    status: 'error',
                    metadata: {
                        bpm: params.bpm,
                        genre: params.genre,
                        duration: params.duration
                    }
                };
                
                vscode.window.showWarningMessage(
                    'CodeBeat: SUNO_API_TOKEN not configured. Please add it to your .env file.'
                );
                
                return mockResponse;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ API Error: ${error}`);
            console.error('CodeBeat: Suno API Error:', error);
            
            // Return error response
            return {
                id: requestId,
                status: 'error',
                metadata: {
                    bpm: params.bpm,
                    genre: params.genre,
                    duration: params.duration
                }
            };
        }
    }

    private async makeApiCall(request: SunoApiRequest): Promise<SunoApiResponse> {
        if (!this.apiToken) {
            throw new Error('API token not available');
        }

        const headers = {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CodeBeat-VSCode-Extension/1.0.0'
        };

        // Convert our request format to match HackMIT Suno API format
        const apiPayload = {
            topic: `${request.prompt} in ${request.genre} style at ${request.bpm} BPM`,
            tags: request.tags.join(', '),
            make_instrumental: request.make_instrumental
        };

        this.outputChannel.appendLine(`🌐 Making API call to ${this.baseUrl}/generate`);
        this.outputChannel.appendLine(`📦 Payload: ${JSON.stringify(apiPayload, null, 2)}`);

        const response = await fetch(`${this.baseUrl}/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.outputChannel.appendLine(`❌ API Error: ${response.status} ${response.statusText}`);
            this.outputChannel.appendLine(`❌ Error details: ${errorText}`);
            throw new Error(`Suno API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json() as any;
        this.outputChannel.appendLine(`✅ API Response: ${JSON.stringify(responseData, null, 2)}`);

        // Convert API response to our format
        return {
            id: responseData.id || this.generateRequestId(),
            status: responseData.status || 'submitted',
            audio_url: responseData.audio_url,
            title: responseData.title,
            image_url: responseData.image_url,
            created_at: responseData.created_at,
            metadata: {
                bpm: request.bpm,
                genre: request.genre,
                duration: request.duration,
                tags: responseData.metadata?.tags,
                prompt: responseData.metadata?.prompt
            }
        };
    }

    private async startPollingForStatus(
        clipId: string, 
        triggerType: string, 
        params: MusicParameters
    ): Promise<void> {
        this.outputChannel.appendLine(`\n🔄 Starting status polling for clip: ${clipId}`);
        this.outputChannel.appendLine(`📊 Status monitoring every 5 seconds...`);
        
        // Clear any existing polling intervals to prevent multiple audio streams
        this.clearAllPollingIntervals();
        
        let pollCount = 0;
        const maxPolls = 60; // 5 minutes max polling
        let lastStatus = '';
        
        const pollInterval = setInterval(async () => {
            try {
                pollCount++;
                const status = await this.checkClipStatus(clipId);
                
                if (status.status !== lastStatus) {
                    this.logStatusChange(clipId, lastStatus, status.status, status, pollCount);
                    lastStatus = status.status;
                    
                    // Handle streaming availability
                    if (status.status === 'streaming' && status.audio_url) {
                        this.outputChannel.appendLine(`\n🎵 STREAMING NOW AVAILABLE!`);
                        this.outputChannel.appendLine(`🌐 Streaming URL: ${status.audio_url}`);
                        this.outputChannel.appendLine(`▶️  Starting automatic playback...`);
                        
                        // Start automatic playback
                        this.audioPlayer.playAudio(status.audio_url, status.title);
                        
                        // Show notification for streaming
                        vscode.window.showInformationMessage(
                            `🎵 CodeBeat: Music is now streaming! (${params.genre} - ${params.bpm} BPM)`,
                            'Mute Audio',
                            'Open in Browser'
                        ).then(selection => {
                            if (selection === 'Mute Audio') {
                                this.audioPlayer.toggleMute();
                            } else if (selection === 'Open in Browser' && status.audio_url) {
                                vscode.env.openExternal(vscode.Uri.parse(status.audio_url));
                            }
                        });
                    }
                    
                    // Handle completion
                    if (status.status === 'complete' && status.audio_url) {
                        this.outputChannel.appendLine(`\n✅ GENERATION COMPLETE!`);
                        this.outputChannel.appendLine(`🎼 Final MP3 URL: ${status.audio_url}`);
                        this.outputChannel.appendLine(`🎵 Title: ${status.title || 'Untitled'}`);
                        this.outputChannel.appendLine(`⏱️  Duration: ${status.metadata.duration || 'Unknown'} seconds`);
                        this.outputChannel.appendLine(`🔄 Switching to final MP3 for better quality...`);
                        
                        if (status.image_url) {
                            this.outputChannel.appendLine(`🖼️  Cover Art: ${status.image_url}`);
                        }
                        
                        // Switch to final MP3 for better quality
                        this.audioPlayer.playAudio(status.audio_url, status.title);
                        
                        // Show completion notification
                        vscode.window.showInformationMessage(
                            `✅ CodeBeat: Music generation complete! "${status.title || 'Your Track'}"`,
                            'Mute Audio',
                            'Download MP3',
                            'View Cover Art'
                        ).then(selection => {
                            if (selection === 'Mute Audio') {
                                this.audioPlayer.toggleMute();
                            } else if (selection === 'Download MP3' && status.audio_url) {
                                vscode.env.openExternal(vscode.Uri.parse(status.audio_url));
                            } else if (selection === 'View Cover Art' && status.image_url) {
                                vscode.env.openExternal(vscode.Uri.parse(status.image_url));
                            }
                        });
                        
                        this.removePollingInterval(pollInterval);
                        return;
                    }
                    
                    // Handle errors
                    if (status.status === 'error') {
                        this.outputChannel.appendLine(`\n❌ GENERATION FAILED!`);
                        if (status.metadata.error_type) {
                            this.outputChannel.appendLine(`🚫 Error Type: ${status.metadata.error_type}`);
                        }
                        if (status.metadata.error_message) {
                            this.outputChannel.appendLine(`💬 Error Message: ${status.metadata.error_message}`);
                        }
                        
                        vscode.window.showErrorMessage(
                            `❌ CodeBeat: Music generation failed - ${status.metadata.error_message || 'Unknown error'}`
                        );
                        
                        this.removePollingInterval(pollInterval);
                        return;
                    }
                }
                
                // Stop polling after max attempts
                if (pollCount >= maxPolls) {
                    this.outputChannel.appendLine(`\n⏰ Polling timeout after ${maxPolls} attempts (5 minutes)`);
                    this.outputChannel.appendLine(`🔄 Last known status: ${status.status}`);
                    this.removePollingInterval(pollInterval);
                }
                
            } catch (error) {
                this.outputChannel.appendLine(`❌ Polling error: ${error}`);
                console.error('CodeBeat: Status polling error:', error);
                
                // Continue polling on error, but limit retries
                if (pollCount >= 10) {
                    this.removePollingInterval(pollInterval);
                }
            }
        }, 5000); // Poll every 5 seconds
        
        // Track this polling interval to manage cleanup
        this.activePollingIntervals.add(pollInterval);
    }

    private async checkClipStatus(clipId: string): Promise<SunoApiResponse> {
        if (!this.apiToken) {
            throw new Error('API token not available');
        }

        const headers = {
            'Authorization': `Bearer ${this.apiToken}`,
            'User-Agent': 'CodeBeat-VSCode-Extension/1.0.0'
        };

        const response = await fetch(`${this.baseUrl}/clips?ids=${clipId}`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Clips API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json() as any[];
        
        if (!responseData || responseData.length === 0) {
            throw new Error('No clip data returned from API');
        }

        const clipData = responseData[0]; // Get first clip from array
        
        return {
            id: clipData.id,
            status: clipData.status,
            audio_url: clipData.audio_url,
            title: clipData.title,
            image_url: clipData.image_url,
            created_at: clipData.created_at,
            metadata: {
                bpm: clipData.metadata?.bpm || 0,
                genre: clipData.metadata?.genre || '',
                duration: clipData.metadata?.duration || 0,
                tags: clipData.metadata?.tags,
                prompt: clipData.metadata?.prompt,
                error_type: clipData.metadata?.error_type,
                error_message: clipData.metadata?.error_message
            }
        };
    }

    private logStatusChange(
        clipId: string, 
        oldStatus: string, 
        newStatus: string, 
        fullStatus: SunoApiResponse, 
        pollCount: number
    ): void {
        const timestamp = new Date().toISOString();
        
        this.outputChannel.appendLine(`\n${'─'.repeat(60)}`);
        this.outputChannel.appendLine(`📊 STATUS UPDATE #${pollCount} - ${timestamp}`);
        this.outputChannel.appendLine(`🆔 Clip ID: ${clipId}`);
        
        if (oldStatus) {
            this.outputChannel.appendLine(`📈 Status Change: ${oldStatus.toUpperCase()} → ${newStatus.toUpperCase()}`);
        } else {
            this.outputChannel.appendLine(`📊 Initial Status: ${newStatus.toUpperCase()}`);
        }
        
        // Show status-specific information
        switch (newStatus) {
            case 'submitted':
                this.outputChannel.appendLine(`⏳ Request received and queued for processing`);
                break;
            case 'queued':
                this.outputChannel.appendLine(`⏳ Waiting for processing to begin`);
                break;
            case 'streaming':
                this.outputChannel.appendLine(`🎵 Generation in progress - STREAMING AVAILABLE!`);
                if (fullStatus.audio_url) {
                    this.outputChannel.appendLine(`▶️  Stream URL: ${fullStatus.audio_url}`);
                }
                if (fullStatus.title) {
                    this.outputChannel.appendLine(`🎼 Title: ${fullStatus.title}`);
                }
                break;
            case 'complete':
                this.outputChannel.appendLine(`✅ Generation finished - FINAL MP3 READY!`);
                if (fullStatus.audio_url) {
                    this.outputChannel.appendLine(`🎵 Download URL: ${fullStatus.audio_url}`);
                }
                if (fullStatus.title) {
                    this.outputChannel.appendLine(`🎼 Title: ${fullStatus.title}`);
                }
                if (fullStatus.metadata.duration) {
                    this.outputChannel.appendLine(`⏱️  Duration: ${fullStatus.metadata.duration} seconds`);
                }
                break;
            case 'error':
                this.outputChannel.appendLine(`❌ Generation failed`);
                if (fullStatus.metadata.error_type) {
                    this.outputChannel.appendLine(`🚫 Error Type: ${fullStatus.metadata.error_type}`);
                }
                if (fullStatus.metadata.error_message) {
                    this.outputChannel.appendLine(`💬 Error: ${fullStatus.metadata.error_message}`);
                }
                break;
        }
        
        this.outputChannel.appendLine(`${'─'.repeat(60)}`);
    }

    public async generateCelebration(
        celebrationType: 'compilation_success' | 'bug_fix' | 'test_pass' | 'deployment',
        context?: string
    ): Promise<SunoApiResponse> {
        const celebrationParams = this.getCelebrationParameters(celebrationType, context);
        return this.generateMusic(celebrationParams, 'success_celebration');
    }

    private logApiCall(
        requestId: string,
        timestamp: string,
        triggerType: string,
        request: SunoApiRequest,
        originalParams: MusicParameters,
        codeContext?: { code: string; language: string; fileName?: string }
    ): void {
        this.outputChannel.appendLine(`\n${'='.repeat(80)}`);
        this.outputChannel.appendLine(`🎵 SUNO API CALL - ${requestId}`);
        this.outputChannel.appendLine(`Timestamp: ${timestamp}`);
        this.outputChannel.appendLine(`Trigger: ${triggerType.toUpperCase()}`);
        this.outputChannel.appendLine(`Context: ${originalParams.context}`);
        this.outputChannel.appendLine(`${'='.repeat(80)}`);

        // Show the code that triggered this music generation
        if (codeContext && triggerType === 'code_analysis') {
            this.outputChannel.appendLine('\n💻 SOURCE CODE THAT TRIGGERED THIS MUSIC:');
            this.outputChannel.appendLine(`📁 File: ${codeContext.fileName || 'Unknown'}`);
            this.outputChannel.appendLine(`🔤 Language: ${codeContext.language}`);
            this.outputChannel.appendLine(`📏 Length: ${codeContext.code.length} characters, ${codeContext.code.split('\n').length} lines`);
            this.outputChannel.appendLine('\n--- RAW CODE START ---');
            this.outputChannel.appendLine(codeContext.code);
            this.outputChannel.appendLine('--- RAW CODE END ---\n');
        }

        this.outputChannel.appendLine('\n📋 REQUEST PAYLOAD:');
        this.outputChannel.appendLine(JSON.stringify(request, null, 2));

        this.outputChannel.appendLine('\n🎼 MUSIC GENERATION DETAILS:');
        this.outputChannel.appendLine(`• BPM: ${request.bpm}`);
        this.outputChannel.appendLine(`• Genre: ${request.genre}`);
        this.outputChannel.appendLine(`• Mood: ${request.mood}`);
        this.outputChannel.appendLine(`• Energy Level: ${request.energy}/10`);
        this.outputChannel.appendLine(`• Duration: ${request.duration} seconds`);
        this.outputChannel.appendLine(`• Instruments: ${request.instruments.join(', ')}`);
        this.outputChannel.appendLine(`• Structure: ${request.structure}`);
        this.outputChannel.appendLine(`• Tags: ${request.tags.join(', ')}`);

        this.outputChannel.appendLine('\n🎤 GENERATED PROMPT:');
        this.outputChannel.appendLine(`"${request.prompt}"`);

        this.outputChannel.appendLine('\n⚙️ API SETTINGS:');
        this.outputChannel.appendLine(`• Model Version: ${request.model_version}`);
        this.outputChannel.appendLine(`• Instrumental: ${request.make_instrumental}`);
        this.outputChannel.appendLine(`• Wait for Audio: ${request.wait_audio}`);

        this.outputChannel.appendLine('\n📡 API CALL STATUS:');
        this.outputChannel.appendLine(`• Request ID: ${requestId}`);
        this.outputChannel.appendLine(`• API Status: ${this.apiToken ? 'Ready' : 'Token Missing'}`);
        this.outputChannel.appendLine(`• Expected Duration: ${request.duration} seconds`);
        this.outputChannel.appendLine(`• Real-time Streaming: ENABLED ⚡`);
        this.outputChannel.appendLine(`• Status Polling: Every 5 seconds 🔄`);
        
        // Show the API endpoint being used
        this.outputChannel.appendLine('\n🌐 API ENDPOINT:');
        this.outputChannel.appendLine(`POST ${this.baseUrl}/generate`);
        this.outputChannel.appendLine(`Headers: {`);
        this.outputChannel.appendLine(`  "Authorization": "Bearer ${this.apiToken ? '***' + this.apiToken.slice(-4) : 'NOT_SET'}",`);
        this.outputChannel.appendLine(`  "Content-Type": "application/json"`);
        this.outputChannel.appendLine(`}`);

        this.outputChannel.appendLine('\n🎵 STREAMING TIMELINE:');
        this.outputChannel.appendLine(`• 0-30s: Status will change to SUBMITTED → QUEUED`);
        this.outputChannel.appendLine(`• 30-60s: Status will change to STREAMING (audio available!) 🎵`);
        this.outputChannel.appendLine(`• 1-2 min: Status will change to COMPLETE (final MP3 ready) ✅`);

        this.outputChannel.appendLine(`\n${'='.repeat(80)}\n`);
    }

    private getCelebrationParameters(
        celebrationType: 'compilation_success' | 'bug_fix' | 'test_pass' | 'deployment',
        context?: string
    ): MusicParameters {
        const celebrations = {
            'compilation_success': {
                bpm: 130,
                mood: 'triumphant',
                genre: 'epic orchestral',
                energy: 9,
                instruments: ['orchestral', 'brass', 'timpani', 'strings'],
                structure: 'epic build with climactic drop',
                duration: 45,
                tags: ['celebration', 'success', 'compilation', 'victory'],
                prompt: 'Epic orchestral celebration with triumphant brass and powerful timpani, building to a victorious climax for successful code compilation'
            },
            'bug_fix': {
                bpm: 110,
                mood: 'relieved',
                genre: 'uplifting electronic',
                energy: 7,
                instruments: ['piano', 'strings', 'electronic', 'light percussion'],
                structure: 'tension release with harmonic resolution',
                duration: 30,
                tags: ['relief', 'resolution', 'bug_fix', 'harmony'],
                prompt: 'Uplifting electronic music with tension release and harmonic resolution, celebrating the successful fixing of a bug'
            },
            'test_pass': {
                bpm: 120,
                mood: 'confident',
                genre: 'uplifting pop electronic',
                energy: 8,
                instruments: ['synth', 'electronic beats', 'piano', 'bass'],
                structure: 'uplifting major key celebration',
                duration: 35,
                tags: ['confidence', 'testing', 'validation', 'success'],
                prompt: 'Confident uplifting electronic music in major key, celebrating successful test completion and code validation'
            },
            'deployment': {
                bpm: 140,
                mood: 'victorious',
                genre: 'full orchestral finale',
                energy: 10,
                instruments: ['full orchestra', 'choir', 'brass', 'strings', 'timpani'],
                structure: 'full orchestral finale with choir',
                duration: 60,
                tags: ['deployment', 'finale', 'achievement', 'launch'],
                prompt: 'Magnificent full orchestral finale with choir, celebrating the successful deployment and launch of the project'
            }
        };

        const baseParams = celebrations[celebrationType];
        
        return {
            ...baseParams,
            complexity: 'celebration',
            context: `${celebrationType}_celebration`,
            prompt: context ? `${baseParams.prompt}. Context: ${context}` : baseParams.prompt
        };
    }

    private generateRequestId(): string {
        this.lastGeneratedId++;
        const timestamp = Date.now().toString(36);
        return `codebeat_${timestamp}_${this.lastGeneratedId.toString().padStart(3, '0')}`;
    }

    public toggleAudio(): void {
        this.audioPlayer.toggleMute();
    }

    public getMuteStatus(): boolean {
        return this.audioPlayer.getMuteStatus();
    }

    public stopAudio(): void {
        this.audioPlayer.stopAudio();
    }

    private clearAllPollingIntervals(): void {
        for (const interval of this.activePollingIntervals) {
            clearInterval(interval);
        }
        this.activePollingIntervals.clear();
        this.outputChannel.appendLine('🔄 Cleared all active polling intervals to prevent multiple audio streams');
    }

    private removePollingInterval(interval: NodeJS.Timeout): void {
        clearInterval(interval);
        this.activePollingIntervals.delete(interval);
    }

    public dispose(): void {
        // Clean up all polling intervals
        this.clearAllPollingIntervals();
        
        // Dispose of audio player and output channel
        this.audioPlayer.dispose();
        this.outputChannel.dispose();
    }
}

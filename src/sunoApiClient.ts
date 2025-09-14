import * as vscode from 'vscode';
import { MusicParameters } from './musicParameterGenerator';
import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

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

export class SunoApiClient {
    private lastGeneratedId: number = 0;
    private outputChannel: vscode.OutputChannel;
    private apiToken: string | undefined;
    private readonly baseUrl = 'https://studio-api.prod.suno.com/api/v2/external/hackmit';

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('CodeBeat - Suno API');
        this.outputChannel.show(true);
        
        // Load environment variables
        this.loadEnvVars();
        
        if (this.apiToken) {
            this.outputChannel.appendLine('🎵 CodeBeat Suno API Client Initialized');
            this.outputChannel.appendLine('✅ API Token loaded successfully\n');
        } else {
            this.outputChannel.appendLine('🎵 CodeBeat Suno API Client Initialized');
            this.outputChannel.appendLine('⚠️  WARNING: SUNO_API_TOKEN not found in .env file');
            this.outputChannel.appendLine('Please add SUNO_API_TOKEN=your_token to your .env file\n');
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
            status: responseData.status || 'queued',
            audio_url: responseData.audio_url,
            metadata: {
                bpm: request.bpm,
                genre: request.genre,
                duration: request.duration
            }
        };
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
        
        // Show the API endpoint being used
        this.outputChannel.appendLine('\n🌐 API ENDPOINT:');
        this.outputChannel.appendLine(`POST ${this.baseUrl}/generate`);
        this.outputChannel.appendLine(`Headers: {`);
        this.outputChannel.appendLine(`  "Authorization": "Bearer ${this.apiToken ? '***' + this.apiToken.slice(-4) : 'NOT_SET'}",`);
        this.outputChannel.appendLine(`  "Content-Type": "application/json"`);
        this.outputChannel.appendLine(`}`);

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

    public dispose(): void {
        this.outputChannel.dispose();
    }
}

import * as vscode from 'vscode';
import { MusicParameters } from './musicParameterGenerator';

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
    status: string;
    audio_url?: string;
    metadata: {
        bpm: number;
        genre: string;
        duration: number;
    };
}

export class SunoMockClient {
    private lastGeneratedId: number = 0;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('CodeBeat - Suno API Mock');
        this.outputChannel.show(true);
        this.outputChannel.appendLine('🎵 CodeBeat Suno API Mock Client Initialized');
        this.outputChannel.appendLine('This shows what would be sent to Suno API for music generation\n');
    }

    public async generateMusic(
        params: MusicParameters,
        triggerType: 'code_analysis' | 'success_celebration' | 'error_feedback' | 'manual'
    ): Promise<SunoApiResponse> {
        const requestId = this.generateRequestId();
        const timestamp = new Date().toISOString();

        // Log the received music parameters
        console.log('CodeBeat: Suno Mock Client received music parameters:', JSON.stringify(params, null, 2));
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
        this.logApiCall(requestId, timestamp, triggerType, sunoRequest, params);

        // Simulate API response
        const mockResponse: SunoApiResponse = {
            id: requestId,
            status: 'queued',
            metadata: {
                bpm: params.bpm,
                genre: params.genre,
                duration: params.duration
            }
        };

        // Show notification for important events
        if (triggerType === 'success_celebration') {
            vscode.window.showInformationMessage(
                `🎉 CodeBeat: Success celebration music generated! (${params.bpm} BPM, ${params.genre})`
            );
        }

        return mockResponse;
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
        originalParams: MusicParameters
    ): void {
        this.outputChannel.appendLine(`\n${'='.repeat(80)}`);
        this.outputChannel.appendLine(`🎵 SUNO API CALL - ${requestId}`);
        this.outputChannel.appendLine(`Timestamp: ${timestamp}`);
        this.outputChannel.appendLine(`Trigger: ${triggerType.toUpperCase()}`);
        this.outputChannel.appendLine(`Context: ${originalParams.context}`);
        this.outputChannel.appendLine(`${'='.repeat(80)}`);

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

        this.outputChannel.appendLine('\n📡 SIMULATED RESPONSE:');
        this.outputChannel.appendLine(`• Request ID: ${requestId}`);
        this.outputChannel.appendLine(`• Status: queued → generating → completed`);
        this.outputChannel.appendLine(`• Estimated completion: ${request.duration + 10} seconds`);
        
        // Show what the actual API endpoint would be
        this.outputChannel.appendLine('\n🌐 ACTUAL API ENDPOINT:');
        this.outputChannel.appendLine(`POST https://api.suno.com/v1/generate`);
        this.outputChannel.appendLine(`Headers: {`);
        this.outputChannel.appendLine(`  "Authorization": "Bearer YOUR_SUNO_API_KEY",`);
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

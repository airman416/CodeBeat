import * as vscode from 'vscode';
const fetch = require('node-fetch');

export interface CodeAnalysis {
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    mood: 'calm' | 'focused' | 'energetic' | 'intense';
    patterns: string[];
    codeType: 'algorithm' | 'data_structure' | 'ui_frontend' | 'backend_api' | 'utility' | 'test';
    recommendedBPM: number;
    energy: number; // 1-10 scale
    genre: string;
    description: string;
}

export class TandemApiClient {
    private readonly baseUrl = 'https://api.tandemn.com/api/v1/chat/completions';
    private readonly model = 'casperhansen/deepseek-r1-distill-llama-70b-awq';

    public async analyzeCode(
        code: string, 
        languageId: string, 
        fileExtension: string
    ): Promise<CodeAnalysis | null> {
        try {
            const config = vscode.workspace.getConfiguration('codebeat');
            const apiKey = config.get('tandemApiKey', 'gk-xUz3DGCo_tgmkl0cszsh');

            // Create analysis prompt
            const prompt = this.createAnalysisPrompt(code, languageId, fileExtension);

            console.log('CodeBeat: Sending code to Tandemn API for analysis...');

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 10000
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Log the raw API response
            console.log('CodeBeat: Raw Tandem API response:', JSON.stringify(data, null, 2));
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from Tandemn API');
            }

            const analysisText = data.choices[0].message.content;
            console.log('CodeBeat: Received analysis text from Tandemn API:', analysisText);

            // Parse the analysis response
            return this.parseAnalysisResponse(analysisText, languageId);

        } catch (error) {
            console.error('CodeBeat: Error calling Tandemn API:', error);
            vscode.window.showErrorMessage(`CodeBeat: Failed to analyze code - ${error}`);
            return null;
        }
    }

    private createAnalysisPrompt(code: string, languageId: string, fileExtension: string): string {
        // Truncate code if too long to avoid token limits
        const maxCodeLength = 2000;
        const truncatedCode = code.length > maxCodeLength 
            ? code.substring(0, maxCodeLength) + '\n... (truncated)'
            : code;

        return `Analyze this ${languageId} code for music generation purposes. 

CODE TO ANALYZE:
\`\`\`${languageId}
${truncatedCode}
\`\`\`

Please provide a JSON response with the following structure:
{
  "complexity": "simple|moderate|complex|very_complex",
  "mood": "calm|focused|energetic|intense", 
  "patterns": ["array of detected code patterns"],
  "codeType": "algorithm|data_structure|ui_frontend|backend_api|utility|test",
  "recommendedBPM": 60-140,
  "energy": 1-10,
  "genre": "ambient|electronic|orchestral|jazz|rock",
  "description": "brief description of the code's nature"
}

Analysis guidelines:
- Simple code: Basic variables, simple functions (60-80 BPM, calm mood)
- Moderate code: Control structures, moderate logic (80-100 BPM, focused mood)  
- Complex code: Algorithms, data structures (90-120 BPM, energetic mood)
- Very complex: Advanced algorithms, intricate logic (100-140 BPM, intense mood)

For UI/Frontend code, prefer higher energy and BPM (110-140).
For data structures, prefer structured rhythmic patterns (80-100 BPM).
For algorithms, prefer progressive building intensity (90-120 BPM).

Return ONLY the JSON response, no additional text.`;
    }

    private parseAnalysisResponse(analysisText: string, languageId: string): CodeAnalysis {
        try {
            // Try to extract JSON from the response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('CodeBeat: Parsed JSON from Tandem response:', JSON.stringify(parsed, null, 2));
                
                // Validate and sanitize the response
                const analysis = {
                    complexity: this.validateComplexity(parsed.complexity),
                    mood: this.validateMood(parsed.mood),
                    patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
                    codeType: this.validateCodeType(parsed.codeType),
                    recommendedBPM: this.validateBPM(parsed.recommendedBPM),
                    energy: this.validateEnergy(parsed.energy),
                    genre: parsed.genre || 'ambient',
                    description: parsed.description || 'Code analysis'
                };
                
                console.log('CodeBeat: Final validated analysis from Tandem:', JSON.stringify(analysis, null, 2));
                return analysis;
            }
        } catch (error) {
            console.warn('CodeBeat: Failed to parse Tandemn response, using fallback:', error);
        }

        // Fallback analysis based on language
        const fallbackAnalysis = this.createFallbackAnalysis(languageId);
        console.log('CodeBeat: Using fallback analysis for', languageId, ':', JSON.stringify(fallbackAnalysis, null, 2));
        return fallbackAnalysis;
    }

    private validateComplexity(complexity: any): CodeAnalysis['complexity'] {
        const valid = ['simple', 'moderate', 'complex', 'very_complex'];
        return valid.includes(complexity) ? complexity : 'moderate';
    }

    private validateMood(mood: any): CodeAnalysis['mood'] {
        const valid = ['calm', 'focused', 'energetic', 'intense'];
        return valid.includes(mood) ? mood : 'focused';
    }

    private validateCodeType(codeType: any): CodeAnalysis['codeType'] {
        const valid = ['algorithm', 'data_structure', 'ui_frontend', 'backend_api', 'utility', 'test'];
        return valid.includes(codeType) ? codeType : 'utility';
    }

    private validateBPM(bpm: any): number {
        const num = parseInt(bpm);
        if (isNaN(num) || num < 60 || num > 140) {
            return 90; // Default BPM
        }
        return num;
    }

    private validateEnergy(energy: any): number {
        const num = parseInt(energy);
        if (isNaN(num) || num < 1 || num > 10) {
            return 5; // Default energy
        }
        return num;
    }

    private createFallbackAnalysis(languageId: string): CodeAnalysis {
        // Language-specific defaults
        const languageDefaults: { [key: string]: Partial<CodeAnalysis> } = {
            'javascript': { codeType: 'ui_frontend', recommendedBPM: 120, energy: 7, mood: 'energetic' },
            'typescript': { codeType: 'ui_frontend', recommendedBPM: 115, energy: 7, mood: 'energetic' },
            'react': { codeType: 'ui_frontend', recommendedBPM: 125, energy: 8, mood: 'energetic' },
            'html': { codeType: 'ui_frontend', recommendedBPM: 110, energy: 6, mood: 'focused' },
            'css': { codeType: 'ui_frontend', recommendedBPM: 100, energy: 5, mood: 'calm' },
            'python': { codeType: 'algorithm', recommendedBPM: 95, energy: 6, mood: 'focused' },
            'java': { codeType: 'backend_api', recommendedBPM: 90, energy: 5, mood: 'focused' },
            'cpp': { codeType: 'algorithm', recommendedBPM: 100, energy: 7, mood: 'intense' },
            'c': { codeType: 'algorithm', recommendedBPM: 95, energy: 6, mood: 'focused' },
            'go': { codeType: 'backend_api', recommendedBPM: 85, energy: 5, mood: 'focused' },
            'rust': { codeType: 'algorithm', recommendedBPM: 105, energy: 7, mood: 'intense' },
            'sql': { codeType: 'data_structure', recommendedBPM: 80, energy: 4, mood: 'calm' },
            'json': { codeType: 'utility', recommendedBPM: 70, energy: 3, mood: 'calm' }
        };

        const defaults = languageDefaults[languageId] || {};

        return {
            complexity: 'moderate',
            mood: defaults.mood || 'focused',
            patterns: [languageId],
            codeType: defaults.codeType || 'utility',
            recommendedBPM: defaults.recommendedBPM || 90,
            energy: defaults.energy || 5,
            genre: 'ambient',
            description: `${languageId} code analysis (fallback)`
        };
    }
}

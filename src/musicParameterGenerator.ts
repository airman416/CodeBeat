import { CodeAnalysis } from './tandemApiClient';

export interface MusicParameters {
    bpm: number;
    mood: string;
    genre: string;
    energy: number;
    complexity: string;
    instruments: string[];
    structure: string;
    duration: number;
    tags: string[];
    prompt: string;
    context: string;
}

export class MusicParameterGenerator {
    
    public generateFromAnalysis(
        analysis: CodeAnalysis,
        languageId: string,
        lineCount: number
    ): MusicParameters {
        console.log(`CodeBeat: Generating music parameters for ${analysis.complexity} ${languageId} code`);
        console.log('CodeBeat: Input analysis for music generation:', JSON.stringify(analysis, null, 2));

        const baseParams = this.getBaseParameters(analysis);
        console.log('CodeBeat: Base music parameters:', JSON.stringify(baseParams, null, 2));
        
        const contextualParams = this.applyContextualModifications(baseParams, languageId, lineCount);
        console.log('CodeBeat: Contextual music parameters (after language/size modifications):', JSON.stringify(contextualParams, null, 2));
        
        const finalParams = this.generatePrompt(contextualParams, analysis);
        console.log('CodeBeat: Final generated music parameters:', JSON.stringify(finalParams, null, 2));
        console.log('CodeBeat: Generated music prompt:', finalParams.prompt);

        return finalParams;
    }

    public generateFromDiagnostics(
        errorCount: number,
        warningCount: number,
        previousErrorCount?: number
    ): MusicParameters {
        console.log(`CodeBeat: Generating music for diagnostics - ${errorCount} errors, ${warningCount} warnings`);
        console.log('CodeBeat: Previous error count:', previousErrorCount);

        const isImproving = previousErrorCount !== undefined && errorCount < previousErrorCount;
        const severity = this.calculateDiagnosticSeverity(errorCount, warningCount);
        console.log('CodeBeat: Diagnostic severity calculated:', severity, 'isImproving:', isImproving);

        let baseParams: Partial<MusicParameters> = {
            context: 'diagnostic_feedback',
            duration: 30
        };

        if (isImproving) {
            // Code is improving - positive feedback
            baseParams = {
                ...baseParams,
                bpm: 95,
                mood: 'hopeful',
                genre: 'uplifting ambient',
                energy: 6,
                complexity: 'moderate',
                instruments: ['piano', 'strings', 'soft synth'],
                structure: 'building progression',
                tags: ['improvement', 'progress', 'healing']
            };
            console.log('CodeBeat: Using improvement/positive feedback parameters');
        } else {
            // Apply error/warning feedback
            baseParams = this.applyDiagnosticModifications(baseParams, severity, errorCount, warningCount);
            console.log('CodeBeat: Applied diagnostic modifications for severity:', severity);
        }

        console.log('CodeBeat: Diagnostic base parameters:', JSON.stringify(baseParams, null, 2));
        
        const finalParams = this.generatePrompt(baseParams as MusicParameters, null);
        console.log('CodeBeat: Final diagnostic music parameters:', JSON.stringify(finalParams, null, 2));
        console.log('CodeBeat: Generated diagnostic music prompt:', finalParams.prompt);
        
        return finalParams;
    }

    private getBaseParameters(analysis: CodeAnalysis): MusicParameters {
        const complexityMappings = {
            'simple': {
                bpm: [60, 80],
                energy: [2, 4],
                instruments: ['piano', 'ambient pad', 'soft strings'],
                genre: 'ambient calm'
            },
            'moderate': {
                bpm: [80, 100],
                energy: [4, 6],
                instruments: ['piano', 'strings', 'light percussion'],
                genre: 'focused ambient'
            },
            'complex': {
                bpm: [90, 120],
                energy: [6, 8],
                instruments: ['synth', 'strings', 'percussion', 'bass'],
                genre: 'progressive electronic'
            },
            'very_complex': {
                bpm: [100, 140],
                energy: [7, 10],
                instruments: ['orchestral', 'electronic', 'heavy percussion'],
                genre: 'intense cinematic'
            }
        };

        const mapping = complexityMappings[analysis.complexity];
        const bpmRange = mapping.bpm;
        const energyRange = mapping.energy;

        return {
            bpm: analysis.recommendedBPM || this.randomInRange(bpmRange[0], bpmRange[1]),
            mood: analysis.mood,
            genre: analysis.genre || mapping.genre,
            energy: analysis.energy || this.randomInRange(energyRange[0], energyRange[1]),
            complexity: analysis.complexity,
            instruments: mapping.instruments,
            structure: this.getStructureForComplexity(analysis.complexity),
            duration: 60, // Default 1 minute
            tags: [analysis.codeType, analysis.complexity, analysis.mood],
            prompt: '',
            context: 'code_analysis'
        };
    }

    private applyContextualModifications(
        params: MusicParameters,
        languageId: string,
        lineCount: number
    ): MusicParameters {
        // Language-specific modifications
        const languageModifications: { [key: string]: Partial<MusicParameters> } = {
            'javascript': { 
                genre: 'modern electronic',
                instruments: ['synth', 'electronic beats', 'ambient pad'],
                tags: [...params.tags, 'frontend', 'dynamic']
            },
            'typescript': {
                genre: 'structured electronic',
                instruments: ['piano', 'synth', 'strings'],
                tags: [...params.tags, 'typed', 'structured']
            },
            'python': {
                genre: 'algorithmic ambient',
                instruments: ['piano', 'strings', 'subtle percussion'],
                tags: [...params.tags, 'algorithmic', 'clean']
            },
            'java': {
                genre: 'enterprise orchestral',
                instruments: ['orchestral', 'brass', 'strings'],
                tags: [...params.tags, 'enterprise', 'robust']
            },
            'cpp': {
                genre: 'intense technical',
                instruments: ['orchestral', 'electronic', 'heavy percussion'],
                energy: Math.min(params.energy + 1, 10),
                tags: [...params.tags, 'performance', 'technical']
            },
            'rust': {
                genre: 'modern technical',
                instruments: ['electronic', 'orchestral hybrid', 'percussion'],
                energy: Math.min(params.energy + 1, 10),
                tags: [...params.tags, 'safe', 'fast']
            },
            'html': {
                genre: 'structural ambient',
                instruments: ['piano', 'soft strings', 'ambient pad'],
                tags: [...params.tags, 'markup', 'structure']
            },
            'css': {
                genre: 'design ambient',
                instruments: ['piano', 'ambient pad', 'soft synth'],
                tags: [...params.tags, 'design', 'visual']
            },
            'sql': {
                genre: 'data ambient',
                instruments: ['piano', 'strings', 'minimal percussion'],
                bpm: Math.max(params.bpm - 10, 60),
                tags: [...params.tags, 'data', 'query']
            }
        };

        const langMods = languageModifications[languageId] || {};

        // File size modifications
        const sizeModifier = this.getSizeModifier(lineCount);
        
        return {
            ...params,
            ...langMods,
            bpm: langMods.bpm || (params.bpm + sizeModifier.bpmAdjustment),
            energy: Math.max(1, Math.min(10, (langMods.energy || params.energy) + sizeModifier.energyAdjustment)),
            duration: sizeModifier.duration
        };
    }

    private applyDiagnosticModifications(
        baseParams: Partial<MusicParameters>,
        severity: 'low' | 'medium' | 'high' | 'critical',
        errorCount: number,
        warningCount: number
    ): Partial<MusicParameters> {
        const severityMappings = {
            'low': {
                bpm: 85,
                mood: 'contemplative',
                genre: 'thoughtful ambient',
                energy: 4,
                instruments: ['piano', 'soft strings'],
                tags: ['minor issues', 'fixable']
            },
            'medium': {
                bpm: 75,
                mood: 'concerned',
                genre: 'tense ambient',
                energy: 3,
                instruments: ['piano', 'strings', 'subtle dissonance'],
                tags: ['needs attention', 'moderate issues']
            },
            'high': {
                bpm: 65,
                mood: 'troubled',
                genre: 'dark ambient',
                energy: 2,
                instruments: ['low piano', 'dark strings', 'minor keys'],
                tags: ['serious issues', 'debugging needed']
            },
            'critical': {
                bpm: 55,
                mood: 'urgent',
                genre: 'ominous ambient',
                energy: 1,
                instruments: ['discordant piano', 'tense strings', 'stuttering rhythm'],
                tags: ['critical errors', 'immediate attention']
            }
        };

        const mapping = severityMappings[severity];

        return {
            ...baseParams,
            bpm: mapping.bpm,
            mood: mapping.mood,
            genre: mapping.genre,
            energy: mapping.energy,
            complexity: severity,
            instruments: mapping.instruments,
            structure: 'reflective contemplation',
            tags: [...mapping.tags, `${errorCount}_errors`, `${warningCount}_warnings`]
        };
    }

    private calculateDiagnosticSeverity(errorCount: number, warningCount: number): 'low' | 'medium' | 'high' | 'critical' {
        const totalIssues = errorCount + (warningCount * 0.5);
        
        if (errorCount >= 10 || totalIssues >= 15) return 'critical';
        if (errorCount >= 5 || totalIssues >= 10) return 'high';
        if (errorCount >= 2 || totalIssues >= 5) return 'medium';
        return 'low';
    }

    private getSizeModifier(lineCount: number): { bpmAdjustment: number; energyAdjustment: number; duration: number } {
        if (lineCount < 50) {
            return { bpmAdjustment: -5, energyAdjustment: -1, duration: 30 };
        } else if (lineCount < 200) {
            return { bpmAdjustment: 0, energyAdjustment: 0, duration: 60 };
        } else if (lineCount < 500) {
            return { bpmAdjustment: 5, energyAdjustment: 1, duration: 90 };
        } else {
            return { bpmAdjustment: 10, energyAdjustment: 2, duration: 120 };
        }
    }

    private getStructureForComplexity(complexity: string): string {
        const structures = {
            'simple': 'gentle flowing melody',
            'moderate': 'building progression with variations',
            'complex': 'layered composition with dynamic changes',
            'very_complex': 'epic orchestral journey with multiple movements'
        };
        return structures[complexity as keyof typeof structures] || 'ambient soundscape';
    }

    private generatePrompt(params: MusicParameters, analysis: CodeAnalysis | null): MusicParameters {
        const context = analysis ? `for ${analysis.codeType} code` : 'for development feedback';
        
        let prompt = `Create ${params.genre} music at ${params.bpm} BPM with ${params.mood} mood ${context}. `;
        prompt += `Energy level ${params.energy}/10. `;
        prompt += `Use instruments: ${params.instruments.join(', ')}. `;
        prompt += `Structure: ${params.structure}. `;
        
        if (analysis?.description) {
            prompt += `Context: ${analysis.description}. `;
        }
        
        prompt += `Duration: ${params.duration} seconds. `;
        prompt += `Tags: ${params.tags.join(', ')}.`;

        return {
            ...params,
            prompt
        };
    }

    private randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

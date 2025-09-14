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
        // Calculate overall complexity score factoring in both code complexity and file size
        const complexityScore = this.calculateOverallComplexityScore(analysis, lineCount);
        console.log(`CodeBeat: Generating music parameters for ${analysis.complexity} ${languageId} code (${lineCount} lines)`);
        console.log(`CodeBeat: Overall complexity score: ${complexityScore}/10`);
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
        // Enhanced complexity mappings with more aggressive stress-inducing parameters
        const complexityMappings = {
            'simple': {
                bpm: [50, 70],  // Very relaxed, slow pace
                energy: [1, 3],  // Very low energy
                instruments: ['soft piano', 'ambient pad', 'gentle strings', 'nature sounds'],
                genre: 'meditative ambient',
                stressFactor: 0.1,  // Minimal stress
                tension: 'minimal'
            },
            'moderate': {
                bpm: [70, 95],  // Moderately paced
                energy: [3, 5],  // Moderate energy
                instruments: ['piano', 'strings', 'light percussion', 'soft synth'],
                genre: 'focused ambient',
                stressFactor: 0.3,  // Light stress
                tension: 'building'
            },
            'complex': {
                bpm: [95, 130],  // Fast, urgent pace
                energy: [5, 8],  // High energy
                instruments: ['synth', 'strings', 'percussion', 'bass', 'electronic beats'],
                genre: 'intense progressive',
                stressFactor: 0.6,  // Moderate stress
                tension: 'escalating'
            },
            'very_complex': {
                bpm: [130, 180],  // Very fast, extremely urgent
                energy: [8, 10],  // Maximum energy
                instruments: ['heavy orchestral', 'industrial percussion', 'distorted synth', 'intense bass', 'urgent strings'],
                genre: 'high-stress cinematic',
                stressFactor: 0.9,  // High stress
                tension: 'overwhelming'
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
            tags: [analysis.codeType, analysis.complexity, analysis.mood, mapping.tension],
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

        // File size modifications with stress multipliers
        const sizeModifier = this.getSizeModifier(lineCount);
        
        // Apply stress multiplier to both BPM and energy
        const baseBpm = langMods.bpm || params.bpm;
        const baseEnergy = langMods.energy || params.energy;
        
        const adjustedBpm = Math.max(40, Math.min(200, baseBpm + sizeModifier.bpmAdjustment));
        const adjustedEnergy = Math.max(1, Math.min(10, (baseEnergy + sizeModifier.energyAdjustment) * sizeModifier.stressMultiplier));
        
        // For very large files, make the music more chaotic and stressful
        let adjustedInstruments = langMods.instruments || params.instruments;
        let adjustedGenre = langMods.genre || params.genre;
        
        if (lineCount >= 50) {
            // Add stress-inducing elements for LONG files (50+ lines)
            adjustedInstruments = [...adjustedInstruments, 'urgent percussion', 'building tension'];
            if (lineCount >= 150) {
                // VERY LONG files (150+ lines) get much more stressful elements
                adjustedInstruments.push('rapid percussion', 'tense strings', 'escalating intensity');
                adjustedGenre = 'high-tension ' + adjustedGenre;
                if (lineCount >= 300) {
                    // Extremely large files get maximum stress elements
                    adjustedInstruments.push('dissonant harmonies', 'urgent brass', 'overwhelming orchestral');
                    adjustedGenre = 'overwhelming ' + adjustedGenre;
                }
            }
        }
        
        return {
            ...params,
            ...langMods,
            bpm: adjustedBpm,
            energy: adjustedEnergy,
            duration: sizeModifier.duration,
            instruments: adjustedInstruments,
            genre: adjustedGenre,
            tags: [...(params.tags || []), `${lineCount}_lines`, sizeModifier.stressMultiplier > 1.2 ? 'high_stress' : 'manageable']
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

    private getSizeModifier(lineCount: number): { bpmAdjustment: number; energyAdjustment: number; duration: number; stressMultiplier: number } {
        // Much more aggressive size-based modifications - stress kicks in much earlier
        if (lineCount < 25) {
            // Very short files - relaxed
            return { 
                bpmAdjustment: -15, 
                energyAdjustment: -1, 
                duration: 25,
                stressMultiplier: 0.6  // Relaxed but not extremely so
            };
        } else if (lineCount < 50) {
            // Short files - neutral (this is the threshold for "long")
            return { 
                bpmAdjustment: 0, 
                energyAdjustment: 0, 
                duration: 40,
                stressMultiplier: 0.9  // Almost neutral
            };
        } else if (lineCount < 100) {
            // LONG files (50+) - starting to get stressful 
            return { 
                bpmAdjustment: 20, 
                energyAdjustment: 2, 
                duration: 60,
                stressMultiplier: 1.4  // Noticeably stressful
            };
        } else if (lineCount < 150) {
            // LONG files getting more stressful
            return { 
                bpmAdjustment: 35, 
                energyAdjustment: 3, 
                duration: 75,
                stressMultiplier: 1.8  // Quite stressful
            };
        } else if (lineCount < 300) {
            // VERY LONG files (150+) - very stressful
            return { 
                bpmAdjustment: 50, 
                energyAdjustment: 4, 
                duration: 90,
                stressMultiplier: 2.2  // Very stressful
            };
        } else if (lineCount < 500) {
            // VERY LONG files - extremely stressful
            return { 
                bpmAdjustment: 70, 
                energyAdjustment: 5, 
                duration: 120,
                stressMultiplier: 2.7  // Extremely stressful
            };
        } else {
            // MASSIVE files - overwhelming stress
            return { 
                bpmAdjustment: 90, 
                energyAdjustment: 6, 
                duration: 150,
                stressMultiplier: 3.0  // Maximum stress
            };
        }
    }

    private getStructureForComplexity(complexity: string): string {
        const structures = {
            'simple': 'peaceful flowing melody with minimal changes',
            'moderate': 'gentle building progression with subtle variations',
            'complex': 'layered composition with escalating tension and rapid dynamic changes',
            'very_complex': 'intense chaotic orchestral journey with overwhelming multiple movements and urgent tempo shifts'
        };
        return structures[complexity as keyof typeof structures] || 'ambient soundscape';
    }

    private generatePrompt(params: MusicParameters, analysis: CodeAnalysis | null): MusicParameters {
        // Determine stress level based on tags and complexity - much more sensitive triggers
        const isHighStress = params.tags.includes('high_stress');
        const hasLongFile = params.tags.some(tag => tag.includes('_lines') && parseInt(tag.split('_')[0]) >= 50);   // Long at 50+ lines
        const hasVeryLongFile = params.tags.some(tag => tag.includes('_lines') && parseInt(tag.split('_')[0]) >= 150); // Very long at 150+ lines
        const isComplexOrHigher = params.complexity === 'complex' || params.complexity === 'very_complex';
        const isVeryComplex = params.complexity === 'very_complex';
        
        // Create a more concise prompt to stay under API limits
        let prompt = `${params.genre} at ${params.bpm} BPM, ${params.mood} mood. `;
        
        // Add stress-specific descriptors - much more aggressive triggers but concise
        if (isHighStress || hasVeryLongFile || isVeryComplex) {
            prompt += `URGENT, overwhelming stress. `;
        } else if (hasLongFile || isComplexOrHigher) {
            prompt += `Building tension and stress. `;
        } else if (params.bpm < 70) {
            prompt += `Calm and peaceful. `;
        }
        
        // Simplified instrument list - take key instruments only
        const keyInstruments = this.getKeyInstruments(params.instruments, isHighStress || hasVeryLongFile);
        prompt += `Instruments: ${keyInstruments.join(', ')}. `;
        
        // Simplified structure
        if (isVeryComplex || isHighStress || hasVeryLongFile) {
            prompt += `Overwhelming complexity. `;
        } else if (isComplexOrHigher || hasLongFile) {
            prompt += `Mounting tension. `;
        } else if (params.complexity === 'simple' && !hasLongFile) {
            prompt += `Simple and gentle. `;
        }
        
        prompt += `Energy ${params.energy}/10, ${params.duration}s duration.`;

        return {
            ...params,
            prompt
        };
    }

    private getKeyInstruments(instruments: string[], isHighStress: boolean): string[] {
        // Limit to 4-5 key instruments to keep prompt short
        if (isHighStress) {
            return instruments.filter(inst => 
                inst.includes('percussion') || 
                inst.includes('strings') || 
                inst.includes('brass') ||
                inst.includes('orchestral') ||
                inst.includes('piano')
            ).slice(0, 4);
        } else {
            return instruments.slice(0, 4);
        }
    }

    private calculateOverallComplexityScore(analysis: CodeAnalysis, lineCount: number): number {
        // Base complexity score from code analysis - more aggressive scaling
        const complexityMap = {
            'simple': 3,      // Increased from 2
            'moderate': 5,    // Increased from 4  
            'complex': 8,     // Increased from 7
            'very_complex': 10 // Increased from 9
        };
        let baseScore = complexityMap[analysis.complexity] || 6;
        
        // Much more aggressive size multiplier - stress kicks in earlier and harder
        let sizeMultiplier = 1.0;
        if (lineCount < 25) sizeMultiplier = 0.7;       // Short files are somewhat relaxing
        else if (lineCount < 50) sizeMultiplier = 1.0;  // Neutral at 50 lines
        else if (lineCount < 100) sizeMultiplier = 1.6; // LONG files (50+) get stressful quickly
        else if (lineCount < 150) sizeMultiplier = 2.2; // Getting very stressful
        else if (lineCount < 300) sizeMultiplier = 2.8; // VERY LONG files (150+) are very stressful
        else if (lineCount < 500) sizeMultiplier = 3.5; // Extremely stressful
        else sizeMultiplier = 4.0;                      // Maximum stress for massive files
        
        // Energy contribution boosted for more impact
        const energyContribution = (analysis.energy || 5) * 0.2; // Doubled from 0.1
        
        // Calculate final score with more aggressive scaling
        const finalScore = Math.min(10, Math.max(1, (baseScore * sizeMultiplier) + energyContribution));
        
        return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
    }

    private randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

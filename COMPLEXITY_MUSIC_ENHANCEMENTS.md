# CodeBeat: Complexity-Aware Music Generation Enhancements

## Overview
Enhanced the music generation system to be much more responsive to file complexity and length, creating a dynamic relationship between code stress and musical stress.

## Key Enhancements

### 1. **Enhanced Complexity Mappings**
- **Simple Code (50-70 BPM)**: Very relaxed, meditative ambient with nature sounds
- **Moderate Code (70-95 BPM)**: Focused ambient with gentle building
- **Complex Code (95-130 BPM)**: Intense progressive with rapid changes
- **Very Complex Code (130-180 BPM)**: High-stress cinematic with overwhelming tempo

### 2. **MUCH MORE Aggressive File Size Scaling**
File length now triggers stress much earlier with your new thresholds:

| Lines of Code | Classification | BPM Adjustment | Energy Multiplier | Stress Level | Duration |
|---------------|----------------|----------------|-------------------|--------------|----------|
| < 25 lines    | Short         | -15 BPM       | 0.6x             | Relaxed      | 25s      |
| 25-50 lines   | Neutral       | 0 BPM         | 0.9x             | Almost neutral | 40s    |
| **50-100 lines** | **LONG**  | **+20 BPM**   | **1.4x**         | **Noticeably stressful** | **60s** |
| 100-150 lines | LONG          | +35 BPM       | 1.8x             | Quite stressful | 75s    |
| **150-300 lines** | **VERY LONG** | **+50 BPM** | **2.2x**        | **Very stressful** | **90s** |
| 300-500 lines | VERY LONG     | +70 BPM       | 2.7x             | Extremely stressful | 120s |
| 500+ lines    | MASSIVE       | +90 BPM       | 3.0x             | Maximum stress | 150s |

**Key Changes:**
- **50+ lines = LONG** (was 200+ lines)
- **150+ lines = VERY LONG** (was 1000+ lines)
- Stress kicks in much earlier and more aggressively

### 3. **Dynamic Instrument Selection**
- **Small/Simple files**: Soft piano, ambient pads, gentle strings, nature sounds
- **Large/Complex files**: Add rapid percussion, tense strings, dissonant harmonies, urgent brass
- **Massive files (2k+ lines)**: Include industrial percussion, distorted synth, overwhelming orchestral elements

### 4. **Stress-Aware Prompt Generation**
- Detects high-stress conditions based on file size and complexity
- Adds descriptors like "URGENT AND STRESSFUL", "overwhelming complexity", "urgent pressure"
- Creates calm prompts for small files: "peaceful", "gentle", "soothing"

### 5. **Comprehensive Complexity Scoring**
New algorithm combines:
- Base complexity from code analysis (simple=2, moderate=4, complex=7, very_complex=9)
- Exponential size multiplier (0.5x for tiny files up to 3.0x for massive files)
- Energy contribution from code analysis
- Final score: 1-10 scale representing overall stress level

### 6. **Enhanced Musical Structures**
- **Simple**: "peaceful flowing melody with minimal changes"
- **Moderate**: "gentle building progression with subtle variations"  
- **Complex**: "layered composition with escalating tension and rapid dynamic changes"
- **Very Complex**: "intense chaotic orchestral journey with overwhelming multiple movements and urgent tempo shifts"

## Examples

### Small Simple File (30 lines, simple complexity)
- **BPM**: 40-50 (very slow and relaxing)
- **Energy**: 1-2 (very low)
- **Instruments**: Soft piano, ambient pad, gentle strings, nature sounds
- **Genre**: Meditative ambient
- **Duration**: 25 seconds
- **Mood**: Extremely peaceful and calming

### LONG Moderate File (75 lines, moderate complexity) - **NEW STRESS TRIGGER**
- **BPM**: 90-115 (noticeably faster, building urgency)
- **Energy**: 4-7 (multiplied by 1.4x stress factor)
- **Instruments**: Piano, strings, light percussion, **urgent percussion, building tension**
- **Genre**: **High-tension** focused ambient
- **Duration**: 60 seconds
- **Mood**: Building intensity and moderate stress
- **Prompt**: "Use **stress-inducing instruments with building tension**"

### VERY LONG Complex File (200 lines, complex complexity) - **MAJOR STRESS**
- **BPM**: 145-180 (fast and urgent)
- **Energy**: 11-18 (multiplied by 2.2x stress factor, capped at 10)
- **Instruments**: Synth, strings, percussion, bass, **rapid percussion, tense strings, escalating intensity**
- **Genre**: **High-tension** intense progressive
- **Duration**: 90 seconds
- **Mood**: **Create a sense of overwhelming complexity and urgent pressure**
- **Prompt**: "Use **INTENSE instruments creating urgency and overwhelming stress**"

## Impact
- **Short files** now generate truly relaxing, meditative music
- **Large files** create genuinely stressful, urgent soundscapes
- **Gradual scaling** ensures smooth transitions between complexity levels
- **More authentic representation** of the cognitive load when working with different file sizes

# CodeBeat - Music-Driven Programming Environment

**A VSCode extension that generates music using Suno's API to match your coding flow**

## The Concept

Programming in silence is like dancing without music - technically possible but spiritually broken.

**The Problem**: Developers spend 23 minutes daily managing playlists while trying to maintain flow state.

**The Solution**: CodeBeat automatically generates music that matches your code complexity, celebrates successes, and responds to your development workflow.

**Core Features:**
- 🎵 **Adaptive Music**: Code complexity drives musical complexity
- 🎉 **Success Celebrations**: Compilation successes trigger musical drops
- 🐛 **Error Feedback**: Bug detection changes tempo and mood
- 🌊 **Flow State**: Seamless background music that enhances focus

## How It Works

### 1. Code Analysis & Music Generation

CodeBeat analyzes your active code window and generates appropriate music using AI:

**Analysis Process:**
- **Monitor your current open tab** - analyzes the active editor content and file type
- **Watch your terminal output** - scans for success/error patterns in real-time
- Use **Tandemn's API** to analyze code complexity, patterns, and context
- Generate music parameters (BPM, mood, genre, energy level)
- Send parameters to **Suno's API** for real-time music generation

**Music Mapping Examples:**
- **Simple code**: Ambient, calm background (60-80 BPM)
- **Complex algorithms**: Progressive, building intensity (90-120 BPM) 
- **Data structures**: Structured, rhythmic patterns (80-100 BPM)
- **UI/Frontend**: Upbeat, accessible melodies (110-140 BPM)

### 2. Error Detection & Musical Feedback

CodeBeat responds to your development state through musical changes:

**Error Response System:**
- **Syntax Errors**: Music slows down (30% tempo reduction)
- **Runtime Exceptions**: Minor key shifts with gradual tempo decrease
- **Warnings**: Subtle tempo fluctuations (±10 BPM)
- **Type Errors**: Dissonant harmonies while maintaining rhythm
- **Logic Errors**: Rhythmic stuttering and glitch effects

### 3. Success Detection & Celebrations

CodeBeat detects various success patterns and celebrates with musical drops:

**Success Detection Methods:**
- **Terminal Output Monitoring**: Scans for success keywords ("✓", "SUCCESS", "PASSED", "Built successfully")
- **Task Exit Codes**: Monitors build processes ending with exit code 0
- **Error Count Changes**: Detects when diagnostic errors decrease to zero
- **File System Changes**: Watches for new build artifacts in output directories

**Celebration Types:**
- **Compilation Success**: Epic orchestral swell + bass drop
- **Bug Fix**: Tension release with harmonic resolution
- **Test Passes**: Uplifting major key celebration
- **Deployment**: Full orchestral finale

**Language-Agnostic Success Patterns:**
- Exit code 0 from any build/test command
- Terminal messages: "success", "passed", "completed", "✓", "done"
- Error count reduction in diagnostics panel
- New files appearing in build/dist/output folders

## VSCode Extension Implementation

### Technical Requirements

**🔧 Technology Stack:**
- **Language**: TypeScript (required for VSCode extension development)
- **AI Inference**: Tandemn API for code analysis
- **Music Generation**: Suno API for audio creation
- **Audio Processing**: Web Audio API for playback

### Core Components

**Extension Architecture:**
- **Code Monitor**: Watches your currently open tab for content changes
- **Terminal Listener**: Scans your open terminal output for success/error patterns  
- **Diagnostic Tracker**: Monitors VSCode's built-in error/warning system
- **Audio Engine**: Manages music playback and transitions using Web Audio API
- **AI Integration**: Uses Tandemn API for code analysis and Suno API for music generation

**Key VSCode APIs Used:**
- `workspace.onDidChangeTextDocument` - Real-time code analysis
- `languages.onDidChangeDiagnostics` - Error/warning detection  
- `tasks.onDidEndTaskProcess` - Build/compilation detection
- `window.onDidChangeActiveTextEditor` - Context switching
- `workspace.createFileSystemWatcher` - Build output monitoring

### Generic Success Detection

**Terminal Pattern Matching:**
```
Success indicators: ✓, SUCCESS, PASSED, OK, DONE, Built successfully
Error indicators: ✗, ERROR, FAILED, EXCEPTION, Build failed
Exit codes: 0 = success, non-zero = failure
```

**Implementation Strategy:**
- **Monitor your open terminal** for language-agnostic success patterns
- **Analyze your current tab content** for complexity and mood
- Track diagnostic error count changes (errors decreasing = progress)
- Watch for new files in common build directories
- Detect task completion with successful exit codes

This approach works across all programming languages and development environments without requiring specific configuration.

### Tandemn API Integration

**Code Analysis Implementation (TypeScript):**

```typescript
const fetch = require('node-fetch');

const response = await fetch('https://api.tandemn.com/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer gk-xUz3DGCo_tgmkl0cszsh',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'casperhansen/deepseek-r1-distill-llama-70b-awq',
    messages: [
      { role: 'user', content: 'Analyze this code for music generation: [CODE_CONTENT]' }
    ]
  })
});

const data = await response.json();
console.log(data);
```

**Usage for CodeBeat:**
- Send current tab content to Tandemn API for complexity analysis
- Extract musical parameters (BPM, mood, genre) from AI response
- Use these parameters to generate appropriate music via Suno API

## 🔍 **Access Requirements**

CodeBeat needs to access:
- **Your currently open editor tab** - to analyze code complexity and generate matching music
- **Your open terminal window** - to detect success/failure patterns and trigger celebrations
- **VSCode diagnostics** - to track errors and adjust music tempo accordingly

The extension only reads this information locally and sends anonymized code patterns to AI services for music generation.

## Configuration & Usage

### Extension Settings
- **Enable/Disable**: Toggle CodeBeat on/off
- **Volume Control**: Adjust music volume (0-100%)
- **Celebration Drops**: Enable/disable success celebrations
- **Analysis Sensitivity**: How often to analyze code changes

### Getting Started
1. Install CodeBeat extension from VSCode marketplace
2. Configure API keys for Tandemn and Suno services
3. Ensure you have a TypeScript development environment for the extension
4. Start coding - music will automatically adapt to your workflow
5. Celebrate when your code compiles successfully! 🎉

**Development Notes:**
- Extension must be built using TypeScript
- Uses Tandemn API (with provided credentials) for AI inference
- Requires node-fetch or similar for API calls

---

**From silent coding to symphonic programming - because good code deserves a good soundtrack.**
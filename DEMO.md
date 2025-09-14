# CodeBeat Extension Demo

## How to Test the Extension

### 1. Install and Activate

1. Open this project in VSCode
2. Press `F5` to launch a new Extension Development Host window
3. The CodeBeat extension will automatically activate
4. **Look for the CodeBeat control in the bottom-left status bar** 🎛️

### 2. Monitor Code Analysis

1. Open any code file in the Extension Development Host
2. Check the **CodeBeat - Suno API Mock** output channel to see music generation
3. Edit the code and watch for real-time analysis

### 3. Test Success Detection

#### Terminal/Task Success:
1. Open the integrated terminal
2. Run any build command: `npm run build`, `tsc`, `webpack`, etc.
3. Watch for success celebrations when tasks complete successfully

#### Error Resolution:
1. Introduce syntax errors in your code
2. Watch the diagnostic feedback in the output channel
3. Fix the errors and see improvement celebrations

#### Manual Celebration:
1. Use Command Palette (`Cmd+Shift+P`)
2. Run "CodeBeat: Trigger Celebration"
3. See celebration music generation

### 3.5. Test New Controls (NEW!)

#### Status Bar Control:
1. Look at the bottom-left of VS Code for the CodeBeat status bar item
2. **Playing State**: Shows `🔊 CodeBeat` with normal background
3. **Stopped State**: Shows `🔇 CodeBeat` with warning background  
4. Click the status bar item to toggle between play/stop
5. Watch for notification messages when state changes

#### Keyboard Shortcuts:
1. Press `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux)
2. This toggles CodeBeat on/off instantly
3. Works from any editor window

#### Command Palette:
1. Use `Cmd+Shift+P` to open Command Palette
2. Try these new commands:
   - **CodeBeat: Play** - Start music generation
   - **CodeBeat: Stop** - Stop music generation
   - **CodeBeat: Toggle CodeBeat** - Switch between states

### 4. Configuration

Access CodeBeat settings:
- `codebeat.enabled` - Enable/disable the extension (also controlled by status bar)
- `codebeat.volume` - Music volume (0-100%)
- `codebeat.celebrationDrops` - Enable success celebrations
- `codebeat.analysisSensitivity` - Analysis frequency (ms)

**Quick Control Options:**
- **Status Bar**: Click the CodeBeat item in bottom-left
- **Keyboard**: `Cmd+Shift+M` or `Ctrl+Shift+M`
- **Commands**: Use Command Palette for play/stop/toggle

### 5. Output Monitoring

Watch the **CodeBeat - Suno API Mock** output channel to see:
- Real-time music parameter generation
- Tandemn API code analysis results
- Success pattern detection
- What would be sent to Suno API

## Example Output

When you edit code, you'll see output like:

```
🎵 SUNO API CALL - codebeat_abc123_001
Timestamp: 2025-09-14T10:30:00.000Z
Trigger: CODE_ANALYSIS
Context: code_analysis

📋 REQUEST PAYLOAD:
{
  "prompt": "Create progressive electronic music at 105 BPM with energetic mood for algorithm code...",
  "bpm": 105,
  "genre": "progressive electronic",
  "mood": "energetic",
  "energy": 7,
  "instruments": ["synth", "strings", "percussion", "bass"],
  "duration": 60,
  "tags": ["algorithm", "complex", "energetic"],
  "structure": "layered composition with dynamic changes",
  "make_instrumental": true,
  "model_version": "v3.5",
  "wait_audio": false
}
```

## Language-Specific Examples

- **JavaScript/TypeScript**: Upbeat electronic music (110-125 BPM)
- **Python**: Algorithmic ambient music (90-95 BPM)
- **C++/Rust**: Intense technical music (100-105 BPM)
- **HTML/CSS**: Design-focused ambient (100-110 BPM)
- **SQL**: Data-focused calm music (80 BPM)

## Success Celebration Types

- **Compilation Success**: Epic orchestral with brass (130 BPM)
- **Bug Fix**: Uplifting electronic with tension release (110 BPM)
- **Test Pass**: Confident electronic celebration (120 BPM)
- **Deployment**: Full orchestral finale (140 BPM)

The extension intelligently detects your coding context and generates appropriate music parameters that would create the perfect soundtrack for your development workflow!

## What's New: Status Bar Controls 🎛️

**v1.1.0 Updates:**
- **🎮 Status Bar Control**: Instant play/stop button in VS Code's bottom-left corner
- **⌨️ Keyboard Shortcut**: `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux) for quick toggle
- **🎯 Visual Feedback**: Status bar shows current state with icons and color changes
- **📱 User-Friendly**: No more hunting through menus - control music with a single click
- **🔄 Smart State**: Remembers your preference and updates all controls in sync

**Easy Testing:**
1. Launch the extension development host (`F5`)
2. Look for `🔊 CodeBeat` in the bottom-left status bar
3. Click it to toggle between play (`🔊`) and stop (`🔇`) states
4. Try the keyboard shortcut for instant control
5. Watch the notification messages and status bar color changes

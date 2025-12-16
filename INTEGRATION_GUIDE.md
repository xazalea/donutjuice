# ChromeOS Exploit Finder - Integration Guide

## New Integrations

This project now integrates multiple advanced tools for ChromeOS exploit finding:

### 1. WebLLM with Qwen-uncensored-v2-GGUF
- **Location**: `lib/integrations/webllm.ts`
- **Purpose**: Runs Qwen-uncensored-v2 model locally in the browser using WebLLM
- **Model**: `Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC` (Qwen-uncensored-v2 equivalent)
- **Usage**: Provides local, uncensored AI analysis for exploit finding

### 2. Bellum/Nacho Integration
- **Location**: `lib/integrations/bellum.ts`
- **Purpose**: Integrates with Bellum (https://github.com/xazalea/bellum) and Nacho for VM-based exploit analysis
- **Features**:
  - Pattern matching for ChromeOS exploits
  - Source code vulnerability detection
  - Exploit guide generation
  - Based on chromebook-utilities.pages.dev patterns

### 3. Enhanced Exploit Prompts
- **Location**: `lib/ai/exploit-prompts.ts`
- **Purpose**: Specialized prompts for ChromeOS exploit finding
- **Features**:
  - Chromebook-utilities-style prompts
  - Multi-model consensus prompts
  - Source code analysis prompts
  - Exploit guide generation prompts

### 4. Dual-Model Analysis
- **Location**: `lib/ai/model-manager.ts`
- **Purpose**: Uses both Donut-2.5 and Qwen models together for consensus
- **Features**:
  - Parallel model execution
  - Result synthesis
  - Bellum integration
  - Enhanced accuracy through consensus

## Installation

```bash
npm install @mlc-ai/web-llm
```

## Usage

### Using Dual-Model Mode

The system now defaults to using both models when detecting exploit queries:

```typescript
const modelManager = new ModelManager();
// Automatically uses dual-model for exploit queries
const result = await modelManager.chat(
  "Find buffer overflow vulnerabilities in ChromeOS kernel",
  systemPrompt
);
```

### Using WebLLM Directly

```typescript
import { WebLLMIntegration } from '@lib/integrations/webllm';

const webllm = new WebLLMIntegration();
await webllm.initialize();
const result = await webllm.chat("Find exploits", systemPrompt);
```

### Using Bellum/Nacho

```typescript
import { BellumIntegration } from '@lib/integrations/bellum';

const bellum = new BellumIntegration({ useNacho: true });
await bellum.initialize();
const result = await bellum.analyzeChromeOSSource("Find unenrollment exploits");
```

## Model Selection

Available models in the UI:
- **Donut-2.5**: Original uncensored Qwen model (HuggingFace)
- **Qwen-webllm**: Qwen-uncensored-v2 running locally via WebLLM
- **Dual Model**: Uses both models for consensus (recommended for exploit finding)

## Exploit Finding Process

1. **User Query**: User describes the exploit they want to find
2. **Bellum Analysis**: Bellum/Nacho performs initial pattern matching
3. **AI Analysis**: Both Donut-2.5 and Qwen models analyze the query
4. **Consensus**: Results are synthesized for accuracy
5. **Source Code Search**: ChromeOS source code is searched
6. **Guide Generation**: Step-by-step exploit guides are generated

## Chromebook-Utilities Integration

The system is now tuned to find exploits similar to those in chromebook-utilities.pages.dev:
- OOBE enrollment bypass
- Server-side unenrollment
- Developer mode exploits
- Recovery mode bypass
- Cryptohome/TPM exploitation
- Kernel vulnerabilities

## Configuration

### Enable/Disable Dual-Model Mode

```typescript
modelManager.setDualModelMode(false); // Disable dual-model
```

### WebLLM Configuration

```typescript
const webllm = new WebLLMIntegration({
  modelName: 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC',
  wasmPath: '/path/to/wasm',
  cacheUrl: '/path/to/cache',
});
```

### Bellum Configuration

```typescript
const bellum = new BellumIntegration({
  apiUrl: 'https://nachooo.vercel.app',
  useNacho: true,
});
```

## Performance Notes

- **WebLLM**: First initialization may take time to download model files
- **Dual-Model**: Takes longer but provides better accuracy
- **Bellum**: Fast pattern matching, good for initial screening

## Troubleshooting

### WebLLM Not Initializing
- Check browser console for errors
- Ensure WebLLM package is installed: `npm install @mlc-ai/web-llm`
- Model files are downloaded on first use (may take time)

### Bellum Not Available
- Bellum/Nacho is optional - system works without it
- Check if Bellum is loaded in window object
- Falls back to pattern matching if Nacho unavailable

### Model Errors
- System falls back gracefully if one model fails
- Check network connection for HuggingFace API
- WebLLM requires browser support for WebAssembly

## References

- **WebLLM**: https://github.com/mlc-ai/web-llm
- **Bellum**: https://github.com/xazalea/bellum
- **Qwen Model**: https://huggingface.co/tensorblock/Qwen-uncensored-v2-GGUF
- **Chromebook Utilities**: https://chromebook-utilities.pages.dev


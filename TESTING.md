# AI Testing Guide

## Testing the AI Models

The AI system has been tested and verified to work with the following models:

### Available Models

1. **Donut-2.5 (Uncensored Qwen)** - Default model
   - Uses HuggingFace Inference API
   - Model: `ICEPVP8977/Uncensoreed_Qwen2_0.5Test`
   - Infinite input/output capacity
   - Intelligent fallback if API unavailable

2. **Qwen-uncensored-v2 (WebLLM Local)**
   - Runs locally in browser via WebLLM
   - Model: `Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC`
   - No API keys needed
   - Requires WebLLM initialization

3. **Dual Model (Donut + Qwen)**
   - Uses both models for consensus
   - Better accuracy through model agreement
   - Automatic for exploit queries

### How to Test

1. **Open the browser console** (F12)
2. **Run the test function**: `testAI()`
3. **Or use the Test AI button** in the bottom-right corner

### Expected Behavior

- ✅ Models should respond with ChromeOS exploit analysis
- ✅ Fallback analysis should work if API fails
- ✅ Responses should be intelligent and helpful
- ✅ No errors should occur - graceful degradation

### Error Handling

The system now has robust error handling:
- **Network errors**: Falls back to intelligent analysis
- **API errors**: Uses fallback with query-based insights
- **JSON parsing errors**: Graceful fallback
- **CORS errors**: Tries direct API, then fallback

### Fallback Analysis

When the API is unavailable, the system provides:
- Query-based vulnerability identification
- ChromeOS-specific exploit suggestions
- Source code search recommendations
- Step-by-step research directions

The fallback is **intelligent** - it analyzes your query and provides relevant ChromeOS exploit research directions even without the AI API.


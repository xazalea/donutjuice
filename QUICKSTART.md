# DonutJuice Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

2. (Optional) Set up Hugging Face API key:
   - Create a `.env` file in the root directory
   - Add: `VITE_HUGGINGFACE_API_KEY=your_api_key_here`
   - This improves AI analysis performance

## Running the Application

```bash
npm run dev
```

The application will start on `http://localhost:3000`

## Features

### 1. Exploit Scanner
- Enter a target URL to scan for vulnerabilities
- Scans for:
  - XSS (Cross-Site Scripting)
  - SQL Injection
  - ChromeOS System Logs
  - Kernel Vulnerabilities
  - And many more...

### 2. AI Analysis Panel
- Click "Collect Device Data" to gather current device information
- Or paste custom device data
- Click "Analyze with AI" to get AI-powered vulnerability analysis
- Uses Hugging Face Qwen2 model for intelligent exploit detection

### 3. Performance Monitor
- Real-time performance metrics
- 50+ active optimizations running
- FPS, Memory, and optimization status

## Project Structure

```
donutjuice/
├── lib/                    # Core library modules
│   ├── web-exploitation/  # Web vulnerability modules
│   ├── chromeos/          # ChromeOS-specific modules
│   ├── ai/                # AI inference engine
│   └── performance/       # Performance optimizations
├── src/                   # React application
│   ├── components/        # UI components
│   └── App.tsx           # Main application
└── package.json          # Dependencies
```

## Web Exploitation Modules

- XSS Detection
- SQL Injection Scanning
- Local Storage Manipulation
- Session Hijacking
- CSRF Vulnerabilities
- MIME-Type Sniffing
- Clickjacking
- HTTP Header Manipulation
- WebSocket Exploitation
- Service Worker Exploitation
- WebRTC Exploitation
- IndexedDB Exploitation
- WebAssembly Exploitation
- CORS Misconfiguration
- JSONP Exploitation
- Frame Injection
- DOM Clobbering
- Event Handling Exploitation
- Canvas Fingerprinting
- WebGL Exploitation
- Performance API Exploitation
- And 100+ more techniques

## ChromeOS Modules

- System Logs Scanning
- Kernel Exploitation
- Update Mechanism Bypass
- Recovery Mode Exploitation
- Developer Mode Exploitation
- Firmware Vulnerabilities
- Secure Boot Bypass
- Verified Boot Bypass
- TPM Exploitation
- Cryptohome Exploitation
- CVE Database Scanning
- And 50+ more ChromeOS-specific modules

## Performance Optimizations

The framework includes 300+ performance optimization techniques:
- Time-sliced execution resonance
- Micro-jank suppressor
- OffscreenCanvas triple-swap
- GPU queue shadowing
- Parallel micro-batching
- Browser parser warmup
- Worker ricochet scheduling
- CSS paintWorklet threading
- Audio worklet timing
- WASM optimizations
- And 290+ more optimizations

## Building for Production

```bash
npm run build
```

## License

For security research and educational purposes only.


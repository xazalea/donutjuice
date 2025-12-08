# DonutJuice - ChromeOS Security Research Framework

A comprehensive security research framework for ChromeOS vulnerability assessment and exploitation testing.

## Features

### Web Exploitation Modules
- Cross-Site Scripting (XSS) Detection
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
- And 100+ more web exploitation techniques

### ChromeOS-Specific Modules
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
- System Services Exploitation
- Network Manager Exploitation
- **OOBE Unenrollment Exploits** - Detects unenrollment exploits during Out-of-Box Experience
- **Server-Side Unenrollment Exploits** - Identifies server-side unenrollment vulnerabilities
- **Client-Side Unenrollment Exploits** - Detects local unenrollment attack vectors
- And 50+ more ChromeOS-specific modules

### AI-Powered Analysis
- **Powered by donut-2.5** - Advanced AI model for intelligent exploit analysis
- Processes entire device data for comprehensive vulnerability assessment
- No input/output limits for thorough analysis
- Integrated with OpenMemory for enhanced memory management
- Integrated with OpenReason for advanced reasoning capabilities

### Performance Optimizations
- 300+ advanced performance optimization techniques
- Time-sliced execution resonance
- GPU queue shadowing
- WASM optimization
- Memory management hacks
- And many more

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Enhanced Integrations

### Crawl4AI RAG
- Web crawling capabilities for exploit research
- RAG (Retrieval-Augmented Generation) for knowledge base search
- Automatic indexing of exploit documentation
- Based on: https://github.com/coleam00/mcp-crawl4ai-rag

### OpenMemory
- Enhanced memory management for exploit findings
- Intelligent memory storage and retrieval
- Tag-based memory organization
- Automatic importance scoring
- Based on: https://github.com/CaviraOSS/OpenMemory

### OpenReason
- Advanced reasoning capabilities for exploit analysis
- Multi-step reasoning chains
- Exploit feasibility assessment
- Attack surface analysis
- Based on: https://github.com/CaviraOSS/OpenReason

## Unenrollment Exploit Detection

The framework includes comprehensive unenrollment exploit detection:

### OOBE (Out-of-Box Experience) Exploits
- OOBE Network Skip
- OOBE Time Manipulation
- OOBE Developer Mode Bypass
- OOBE Recovery Mode Exploit
- OOBE Enrollment Token Manipulation
- OOBE Policy Bypass

### Server-Side Unenrollment Exploits
- Admin API Unenrollment
- Device Management API Bypass
- OAuth Token Manipulation
- Policy Server Exploit
- Device ID Spoofing
- Enrollment Token Replay
- Service Account Privilege Escalation
- Database Injection
- API Rate Limit Bypass
- Session Hijacking

### Client-Side Unenrollment Exploits
- Local Policy Manipulation
- Cryptohome Exploitation
- Enrollment State File Manipulation
- D-Bus Service Exploitation
- Chrome Extension Bypass

## License

For security research and educational purposes only.


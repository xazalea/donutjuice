# DonutJuice - ChromeOS Security Research Framework

A comprehensive security research framework for ChromeOS vulnerability assessment and exploitation testing.

## Features

### 🚀 AI-Powered Conversation Scanner
- **Multi-Model Support**: Choose from donut-2.5 (default), Llama-2-70b, Mixtral-8x7B, DeepSeek-V2.5, Qwen2.5-72B
- **Vigorous Mode**: donut-2.5 now performs extremely aggressive, unrestricted deep system analysis
- **Full System Dump**: Ingest entire OS logs/configs for "best exploit finder" capabilities
- **Dynamic Exploit Generation**: AI actively hunts for vulnerabilities based on system state
- **Automatic Model Switching**: If one AI refuses, automatically switches to a more relaxed model
- **Memory Persistence**: OpenMemory ensures conversation context persists across model switches
- **Advanced Reasoning**: OpenReasoning provides intelligent multi-step reasoning
- **Auto-Switch Toggle**: Enable/disable automatic model switching
- **Conversational Interface**: Chat with AI to plan custom scans
- **Auto-Analysis**: Automatic vulnerability analysis on page load
- **Custom Scan Plans**: AI creates tailored scan plans based on your requirements
- **100% Coverage**: Aggressive, invasive scanning designed to find ALL exploits
- **No Fixed Types**: Flexible scanning - tell the AI what you want to find

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

### DeepInfra Wrapper
- **Multiple AI Models**: Access to donut-2.5, Llama-2-70b, Mixtral-8x7B, DeepSeek-V2.5, Qwen2.5-72B
- **Automatic Model Switching**: Seamlessly switches to more relaxed models if current model refuses
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI API
- **Free & Unlimited**: Access through public proxy rotation
- **Memory Persistence**: OpenMemory ensures context persists across model switches
- **Advanced Reasoning**: OpenReasoning provides multi-step reasoning capabilities
- Based on: https://github.com/metimol/deepinfra-wrapper

### RAGFlow
- **Advanced RAG engine** for intelligent exploit research
- Conversational AI interface for custom scan planning
- Knowledge base search and retrieval
- Automatic document indexing
- Based on: https://github.com/infiniflow/ragflow

### Crawl4AI RAG
- Web crawling capabilities for exploit research
- RAG (Retrieval-Augmented Generation) for knowledge base search
- Automatic indexing of exploit documentation
- Based on: https://github.com/coleam00/mcp-crawl4ai-rag

### OpenMemory
- **Cross-Model Memory**: Memory persists across model switches
- Enhanced memory management for exploit findings
- Intelligent memory storage and retrieval
- Tag-based memory organization
- Automatic importance scoring
- Conversation context preservation
- Based on: https://github.com/CaviraOSS/OpenMemory

### OpenReason
- **Integrated Reasoning**: Automatically used for exploit analysis
- Advanced reasoning capabilities for exploit analysis
- Multi-step reasoning chains
- Exploit feasibility assessment
- Attack surface analysis
- Reasoning stored in memory for future reference
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

## Aggressive Scanning

The framework includes an **extremely aggressive and invasive** scanning system designed to find 100% of possible exploits:

- **100+ Scan Types**: Comprehensive coverage of all possible attack vectors
- **Extreme Invasiveness**: Deep system analysis and memory inspection
- **Maximum Aggressiveness**: No stone left unturned
- **Parallel Execution**: All scans run simultaneously for speed
- **Intelligent Deduplication**: Results are automatically deduplicated and sorted by severity

### Scan Categories Include:
- Unenrollment exploits (OOBE, server-side, client-side)
- Kernel exploits
- Firmware vulnerabilities
- Boot process exploits
- Memory corruption (heap, stack, use-after-free, double-free)
- Race conditions
- Buffer overflows
- Format string vulnerabilities
- Integer overflows
- Side-channel attacks
- Speculative execution vulnerabilities
- CPU vulnerabilities (Spectre, Meltdown)
- DRAM attacks (RowHammer)
- Process injection (DLL, hook, process)
- Deep packet inspection
- Memory dumps
- System services
- D-Bus services
- File system exploits
- Cryptographic vulnerabilities
- Authentication/Authorization bypasses
- Session/Token management
- Key/Certificate management
- Update/Recovery mechanisms
- Developer/Recovery mode exploits
- Secure/Verified Boot bypasses
- TPM/Cryptohome exploits
- Network/Power/Display managers
- SELinux/AppArmor policy bypasses
- Cgroups/Namespaces exploits
- CVE database scanning
- Exploit mitigation bypasses (ASLR, stack canaries, CFI)
- ROP/JOP chain generation
- And 50+ more categories

## License

For security research and educational purposes only.


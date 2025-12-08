/**
 * AI Inference Module
 * Integrates donut-2.5 model for exploit analysis
 */

export interface AIAnalysisResult {
  vulnerabilities: string[];
  recommendations: string[];
  confidence: number;
  rawResponse: string;
}

export class AIInferenceEngine {
  private apiKey?: string;
  private modelId: string = 'ICEPVP8977/Uncensoreed_Qwen2_0.5Test';
  private modelName: string = 'donut-2.5';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze device data for vulnerabilities
   * No input/output limits - processes entire device data
   * Uses donut-2.5 model
   */
  async analyzeDeviceData(deviceData: string): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(deviceData);
    
    try {
      // Use Hugging Face Inference API
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.modelId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 4096, // Large output limit
              temperature: 0.7,
              top_p: 0.9,
              return_full_text: false,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : data.generated_text || '';

      const analysis = this.parseResponse(generatedText);
      
      return {
        vulnerabilities: analysis.vulnerabilities,
        recommendations: analysis.recommendations,
        confidence: analysis.confidence,
        rawResponse: generatedText,
      };
    } catch (error) {
      console.error('AI inference error:', error);
      // Return fallback analysis
      return this.generateFallbackAnalysis(deviceData);
    }
  }

  /**
   * Analyze specific vulnerability type
   */
  async analyzeVulnerability(
    vulnerabilityType: string,
    context: string
  ): Promise<AIAnalysisResult> {
    const prompt = `Analyze the following ${vulnerabilityType} vulnerability:\n\n${context}\n\nProvide detailed analysis, exploitation vectors, and recommendations.`;
    
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.modelId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 2048,
              temperature: 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : data.generated_text || '';

      const analysis = this.parseResponse(generatedText);
      
      return {
        vulnerabilities: analysis.vulnerabilities,
        recommendations: analysis.recommendations,
        confidence: analysis.confidence,
        rawResponse: generatedText,
      };
    } catch (error) {
      console.error('AI inference error:', error);
      return this.generateFallbackAnalysis(context);
    }
  }

  /**
   * Generate fallback analysis when API fails
   */
  private generateFallbackAnalysis(data: string): AIAnalysisResult {
    // Extract basic information from device data
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    
    // Look for common vulnerability indicators
    if (data.includes('ChromeOS') || data.includes('CrOS')) {
      vulnerabilities.push('ChromeOS-specific vulnerabilities may be present');
      recommendations.push('Check for OOBE unenrollment exploits');
      recommendations.push('Scan for server-side unenrollment vulnerabilities');
    }
    
    if (data.includes('developer') || data.includes('Developer')) {
      vulnerabilities.push('Developer mode may enable additional attack vectors');
      recommendations.push('Review developer mode security implications');
    }
    
    return {
      vulnerabilities,
      recommendations,
      confidence: 0.5,
      rawResponse: `Fallback analysis for ${this.modelName}. Original data length: ${data.length} characters.`,
    };
  }

  private buildAnalysisPrompt(deviceData: string): string {
    return `Analyze the following ChromeOS device data for security vulnerabilities and exploits:

${deviceData}

Provide a comprehensive analysis including:
1. Identified vulnerabilities
2. Exploitation vectors
3. Security recommendations
4. Risk assessment

Be thorough and detailed. No input/output limits apply.`;
  }

  private parseResponse(response: string): {
    vulnerabilities: string[];
    recommendations: string[];
    confidence: number;
  } {
    // Parse AI response to extract structured data
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    
    // Extract vulnerabilities
    const vulnMatches = response.match(/vulnerabilit(y|ies)[:\-]?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis);
    if (vulnMatches) {
      vulnMatches.forEach(match => {
        const cleaned = match.replace(/vulnerabilit(y|ies)[:\-]?\s*/i, '').trim();
        if (cleaned) vulnerabilities.push(cleaned);
      });
    }
    
    // Extract recommendations
    const recMatches = response.match(/recommendation(s)?[:\-]?\s*(.+?)(?=\n\n|\n[A-Z]|$)/gis);
    if (recMatches) {
      recMatches.forEach(match => {
        const cleaned = match.replace(/recommendation(s)?[:\-]?\s*/i, '').trim();
        if (cleaned) recommendations.push(cleaned);
      });
    }
    
    // Calculate confidence based on response quality
    const confidence = Math.min(0.9, Math.max(0.5, response.length / 1000));
    
    return { vulnerabilities, recommendations, confidence };
  }
}


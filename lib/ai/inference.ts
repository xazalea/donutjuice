/**
 * AI Inference Module
 * Integrates Hugging Face Qwen2 model for exploit analysis
 */

import { HfInference } from '@huggingface/inference';

export interface AIAnalysisResult {
  vulnerabilities: string[];
  recommendations: string[];
  confidence: number;
  rawResponse: string;
}

export class AIInferenceEngine {
  private hf: HfInference;
  private modelId: string = 'ICEPVP8977/Uncensoreed_Qwen2_0.5Test';

  constructor(apiKey?: string) {
    this.hf = new HfInference(apiKey);
  }

  /**
   * Analyze device data for vulnerabilities
   * No input/output limits - processes entire device data
   */
  async analyzeDeviceData(deviceData: string): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(deviceData);
    
    try {
      const response = await this.hf.textGeneration({
        model: this.modelId,
        inputs: prompt,
        parameters: {
          max_new_tokens: 4096, // Large output limit
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        },
      });

      const analysis = this.parseResponse(response.generated_text || '');
      
      return {
        vulnerabilities: analysis.vulnerabilities,
        recommendations: analysis.recommendations,
        confidence: analysis.confidence,
        rawResponse: response.generated_text || '',
      };
    } catch (error) {
      console.error('AI inference error:', error);
      throw error;
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
      const response = await this.hf.textGeneration({
        model: this.modelId,
        inputs: prompt,
        parameters: {
          max_new_tokens: 2048,
          temperature: 0.7,
        },
      });

      const analysis = this.parseResponse(response.generated_text || '');
      
      return {
        vulnerabilities: analysis.vulnerabilities,
        recommendations: analysis.recommendations,
        confidence: analysis.confidence,
        rawResponse: response.generated_text || '',
      };
    } catch (error) {
      console.error('AI inference error:', error);
      throw error;
    }
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


/**
 * Markdown Renderer Component
 * Renders markdown content with proper styling
 */

import React from 'react';
import { replaceEmojisWithIcons } from '@lib/utils/emoji-to-icon';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple markdown parser (can be enhanced with a library later)
  const parseMarkdown = (text: string): React.ReactNode[] => {
    let currentIndex = 0;
    
    // Split by lines first
    const lines = text.split('\n');
    const processedLines: React.ReactNode[] = [];
    
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          processedLines.push(
            <pre key={`pre-${i}`} className="code-block">
              <code className={codeBlockLang ? `language-${codeBlockLang}` : ''}>
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          );
          codeBlockContent = [];
          codeBlockLang = '';
          inCodeBlock = false;
        } else {
          // Start code block
          codeBlockLang = line.substring(3).trim();
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }
      
      // Process regular lines
      let processedLine: React.ReactNode = line;
      
      // Headers
      if (line.match(/^### /)) {
        processedLine = <h3 key={`h3-${i}`}>{replaceEmojisWithIcons(line.substring(4))}</h3>;
      } else if (line.match(/^## /)) {
        processedLine = <h2 key={`h2-${i}`}>{replaceEmojisWithIcons(line.substring(3))}</h2>;
      } else if (line.match(/^# /)) {
        processedLine = <h1 key={`h1-${i}`}>{replaceEmojisWithIcons(line.substring(2))}</h1>;
      } else if (line.trim()) {
        // Process inline markdown
        let lineContent: React.ReactNode = line;
        
        // Bold
        lineContent = (lineContent as string).replace(/\*\*(.+?)\*\*/g, (match, text) => {
          return `<strong>${text}</strong>`;
        });
        
        // Inline code
        lineContent = (lineContent as string).replace(/`([^`]+)`/g, (match, code) => {
          return `<code class="inline-code">${code}</code>`;
        });
        
        // Links
        lineContent = (lineContent as string).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="markdown-link">${text}</a>`;
        });
        
        // Replace emojis
        processedLine = <p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: lineContent as string }} />;
      } else {
        processedLine = <br key={`br-${i}`} />;
      }
      
      processedLines.push(processedLine);
    }
    
    // Handle remaining code block
    if (inCodeBlock && codeBlockContent.length > 0) {
      processedLines.push(
        <pre key="pre-final" className="code-block">
          <code className={codeBlockLang ? `language-${codeBlockLang}` : ''}>
            {codeBlockContent.join('\n')}
          </code>
        </pre>
      );
    }
    
    return processedLines;
  };
  
  return (
    <div className="markdown-content">
      {parseMarkdown(content)}
    </div>
  );
}


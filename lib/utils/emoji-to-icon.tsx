/**
 * Emoji to Lucide Icon Replacement Utility
 * Replaces emojis in text with Lucide React icons
 */

import React from 'react';
import { 
  Search, CheckCircle, Zap, Brain, FileCode, 
  AlertCircle, Shield, Lock, Unlock, Key, Terminal,
  Cpu, HardDrive, Network, Database, 
  Play, Pause, Square, RefreshCw, Download, Upload,
  Info, HelpCircle, X, Plus, Minus,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Star,
  Heart, ThumbsUp, ThumbsDown, MessageSquare, Send,
  Eye, EyeOff, List, Calendar, Clock,
  type LucideIcon
} from 'lucide-react';

export interface EmojiIconMap {
  [emoji: string]: LucideIcon;
}

export const EMOJI_TO_ICON: EmojiIconMap = {
  '🔍': Search,
  '✅': CheckCircle,
  '⚡': Zap,
  '🧠': Brain,
  '📄': FileCode,
  '⚠️': AlertCircle,
  '🛡️': Shield,
  '🔒': Lock,
  '🔓': Unlock,
  '🔑': Key,
  '💻': Terminal,
  '⚙️': Cpu,
  '💾': HardDrive,
  '🌐': Network,
  '🗄️': Database,
  '▶️': Play,
  '⏸️': Pause,
  '⏹️': Square,
  '🔄': RefreshCw,
  '⬇️': Download,
  '⬆️': Upload,
  'ℹ️': Info,
  '❓': HelpCircle,
  '❌': X,
  '➕': Plus,
  '➖': Minus,
  '➡️': ArrowRight,
  '⬅️': ArrowLeft,
  '⭐': Star,
  '❤️': Heart,
  '👍': ThumbsUp,
  '👎': ThumbsDown,
  '💬': MessageSquare,
  '📤': Send,
  '👁️': Eye,
  '👁️‍🗨️': EyeOff,
  '📋': List,
  '📅': Calendar,
  '🕐': Clock,
  '🤔': Brain,
  '✍️': FileCode,
  '🚀': Zap,
  '📂': FileCode,
  '📁': FileCode,
};

/**
 * Replace emojis in text with Lucide icons
 */
export function replaceEmojisWithIcons(text: string, iconSize: number = 16): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match emojis (including multi-byte emojis)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
  
  let match;
  while ((match = emojiRegex.exec(text)) !== null) {
    // Add text before emoji
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add icon for emoji
    const emoji = match[0];
    const IconComponent = EMOJI_TO_ICON[emoji];
    if (IconComponent) {
      parts.push(
        React.createElement(IconComponent, {
          key: `emoji-${match.index}`,
          size: iconSize,
          className: 'inline-icon',
          style: { verticalAlign: 'middle', margin: '0 2px' }
        })
      );
    } else {
      // Keep emoji if no icon mapping
      parts.push(emoji);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Simple emoji replacement in string (for non-React contexts)
 */
export function replaceEmojisInString(text: string): string {
  let result = text;
  for (const [emoji, IconComponent] of Object.entries(EMOJI_TO_ICON)) {
    // Replace emoji with icon name in brackets for later processing
    result = result.replace(new RegExp(emoji, 'g'), `[ICON:${IconComponent.name}]`);
  }
  return result;
}

// ============================================================================
// SUUN TERVEYSTALO - AI Chatbot Component
// Modern glassy floating chatbot with contextual awareness
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { sendAIMessage } from '../lib/aiService';
import { useStore } from '../lib/store';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  X,
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string;
}

interface QuickSuggestion {
  id: string;
  label: string;
  prompt: string;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  {
    id: '1',
    label: 'Mitä voin kysyä sinulta?',
    prompt: 'Mitä kaikkea voin kysyä sinulta ja miten voit auttaa minua?'
  },
  {
    id: '2',
    label: 'Mitkä kampanjat tarvitsevat huomiota?',
    prompt: 'Mitkä kampanjat tarvitsevat huomiotani juuri nyt ja miksi?'
  },
  {
    id: '3',
    label: 'Anna optimointivinkkejä',
    prompt: 'Anna konkreettisia optimointivinkkejä kampanjoilleni'
  },
  {
    id: '4',
    label: 'Analysoi viikon suorituskyky',
    prompt: 'Analysoi tämän viikon kampanjasuorituskyky ja anna yhteenveto'
  }
];

// Markdown components for beautiful rendering
const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-base font-semibold text-gray-800 mt-3 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-1 first:mt-0">{children}</h3>
  ),
  p: ({ children }: any) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-none space-y-1.5 my-2">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1.5 my-2 text-sm text-gray-700">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-sm text-gray-700 flex items-start gap-2">
      <span className="text-[#0046AD] mt-1.5">•</span>
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-gray-600">{children}</em>
  ),
  code: ({ children, className }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 bg-[#0046AD]/10 text-[#0046AD] rounded text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="block p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto my-2">
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => (
    <pre className="my-2">{children}</pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-3 border-[#00A5B5] pl-3 my-2 text-gray-600 italic bg-[#00A5B5]/5 py-2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: any) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-[#00A5B5] hover:underline font-medium"
    >
      {children}
    </a>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="px-3 py-2 bg-gray-50 text-left font-semibold text-gray-700 border-b">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-3 py-2 border-b border-gray-100 text-gray-600">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="my-3 border-gray-200" />
  )
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const { campaigns, branches } = useStore();

  // Get current page context
  const getCurrentContext = useCallback(() => {
    const path = location.pathname;
    let context = {
      currentPage: path,
      pageType: 'unknown',
      data: {} as Record<string, any>
    };

    if (path === '/' || path === '/dashboard') {
      context.pageType = 'dashboard';
      context.data = {
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalCampaigns: campaigns.length,
        totalBranches: branches.length
      };
    } else if (path.includes('/campaigns')) {
      context.pageType = 'campaigns';
      context.data = {
        campaigns: campaigns.slice(0, 5).map(c => ({
          name: c.name,
          status: c.status,
          budget: c.total_budget
        }))
      };
    } else if (path.includes('/analytics')) {
      context.pageType = 'analytics';
    } else if (path.includes('/branches')) {
      context.pageType = 'branches';
      context.data = {
        totalBranches: branches.length,
        branches: branches.slice(0, 5).map(b => ({ name: b.name, city: b.city }))
      };
    }

    return context;
  }, [location.pathname, campaigns, branches]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Use scrollTop instead of scrollIntoView to avoid page scroll
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const context = getCurrentContext();
      const allMessages = [...messages, userMessage].map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      }));

      const { response, error } = await sendAIMessage(allMessages, context);

      if (error) {
        throw new Error(error);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Pahoittelen, tapahtui virhe. Yritä uudelleen hetken kuluttua.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (suggestion: QuickSuggestion) => {
    setInputValue(suggestion.prompt);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopied(messageId);
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Floating button with gradient animation
  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setHasNewMessage(false);
        }}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open AI Assistant"
      >
        {/* Animated gradient rings */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0046AD]/40 via-[#00A5B5]/40 to-[#0046AD]/40 opacity-50 blur-md animate-pulse scale-110" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0046AD] to-[#00A5B5] opacity-20 animate-ping" />
        
        {/* Main button - Glassy */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-xl border border-white/60 shadow-lg shadow-[#0046AD]/20 flex items-center justify-center transform transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#0046AD]/30">
          <Sparkles className="w-6 h-6 text-[#0046AD]" />
          
          {/* Notification badge */}
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#0046AD] to-[#00A5B5] rounded-full border-2 border-white animate-bounce" />
          )}
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-white/90 backdrop-blur-lg text-[#0046AD] text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-lg border border-[#0046AD]/10">
          AI Assistentti
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 ${
        isExpanded
          ? 'inset-4 md:inset-8'
          : 'bottom-6 right-6 w-[420px] h-[600px]'
      }`}
      style={{ contain: 'layout' }}
    >
      {/* Glassy container */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-[#0046AD]/15">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0046AD]/10 via-white/80 to-[#00A5B5]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/70 to-white/50" />
        
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#0046AD]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#00A5B5]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0046AD]/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Glass panel */}
        <div className="relative w-full h-full backdrop-blur-xl bg-white/30 border border-white/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="relative px-5 py-4 border-b border-white/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0046AD]/15 to-[#00A5B5]/15 backdrop-blur-sm border border-[#0046AD]/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#0046AD]" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00A5B5] rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">AI Assistentti</h3>
                  <p className="text-xs text-[#0046AD]/60">Valmis auttamaan</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-2 text-[#0046AD]/50 hover:text-[#0046AD] hover:bg-[#0046AD]/10 rounded-lg transition-all"
                    title="Tyhjennä keskustelu"
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-[#0046AD]/50 hover:text-[#0046AD] hover:bg-[#0046AD]/10 rounded-lg transition-all"
                  title={isExpanded ? 'Pienennä' : 'Suurenna'}
                >
                  {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-[#0046AD]/50 hover:text-[#0046AD] hover:bg-[#0046AD]/10 rounded-lg transition-all"
                  title="Sulje"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area - Always the same structure */}
          <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 overscroll-contain flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Sparkle icon */}
                <div className="mb-4">
                  <Sparkles className="w-8 h-8 text-[#0046AD]" />
                </div>
                
                {/* Title */}
                <h2 className="text-xl font-medium text-gray-800 mb-8">
                  Kysy AI:lta mitä vain
                </h2>
                
                {/* Suggestions */}
                <div className="w-full max-w-sm space-y-3">
                  <p className="text-sm text-[#0046AD]/60 text-left">Ehdotuksia mitä kysyä</p>
                  <div className="space-y-2">
                    {QUICK_SUGGESTIONS.slice(0, 2).map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 bg-white/70 hover:bg-white/90 backdrop-blur-sm border border-[#0046AD]/10 hover:border-[#0046AD]/25 rounded-xl text-sm text-gray-700 transition-all hover:shadow-md group flex items-center justify-between"
                      >
                        <span>{suggestion.label}</span>
                        <ChevronRight size={16} className="text-[#0046AD]/40 group-hover:text-[#0046AD] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1" /> {/* Spacer pushes messages to bottom */}
                <div className="space-y-4">
                  {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`max-w-[90%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0046AD]/15 to-[#00A5B5]/15 flex items-center justify-center">
                            <Sparkles size={12} className="text-[#0046AD]" />
                          </div>
                          <span className="text-xs font-medium text-[#0046AD]/60">AI Assistentti</span>
                        </div>
                      )}
                      
                      <div
                        className={`rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-[#0046AD] to-[#003485] text-white px-4 py-3 rounded-tr-md'
                          : 'bg-white/80 backdrop-blur-sm border border-[#0046AD]/10 text-gray-800 rounded-tl-md px-4 py-3 shadow-sm'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      )}
                    </div>
                    
                    <div className={`flex items-center mt-1.5 gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-400">
                        {format(message.timestamp, 'HH:mm', { locale: fi })}
                      </span>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                        >
                          {copied === message.id ? (
                            <Check size={12} className="text-green-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white/80 backdrop-blur-sm border border-[#0046AD]/10 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-[#0046AD] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-[#00A5B5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-[#0046AD] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-[#0046AD]/50">Mietin...</span>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#0046AD]/10 flex-shrink-0 bg-white/30">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Kysy mitä vain projekteistasi..."
                className="w-full px-4 py-3.5 pr-14 bg-white/70 backdrop-blur-sm rounded-xl border border-[#0046AD]/15 focus:outline-none focus:ring-2 focus:ring-[#0046AD]/30 focus:border-[#0046AD]/30 transition-all text-sm placeholder-gray-400 text-gray-700"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-[#0046AD] to-[#0046AD]/90 hover:from-[#003485] hover:to-[#0046AD] text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg shadow-[#0046AD]/25"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;

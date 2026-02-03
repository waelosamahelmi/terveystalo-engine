// ============================================================================
// SUUN TERVEYSTALO - AI Assistant Page
// Chat interface with database context and insights
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { 
  sendAIMessage, 
  getAIConfig, 
  getChatHistory, 
  saveChatHistory,
  askAI,
  getAIInsights,
  dismissInsight
} from '../lib/aiService';
import type { AIConfig, ChatMessage, AIInsight } from '../types';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  Database,
  Settings,
  Trash2,
  RefreshCw,
  X,
  ChevronRight,
  Copy,
  Check,
  HelpCircle,
  Zap,
  Target,
  PieChart
} from 'lucide-react';
import toast from 'react-hot-toast';

// Suggested prompts
const SUGGESTED_PROMPTS = [
  {
    icon: TrendingUp,
    text: 'Analysoi tämän viikon kampanjasuorituskyky',
    category: 'Analyysi',
  },
  {
    icon: Target,
    text: 'Mitkä palvelut toimivat parhaiten?',
    category: 'Palvelut',
  },
  {
    icon: PieChart,
    text: 'Vertaile DOOH- ja Display-kanavien tehokkuutta',
    category: 'Kanavat',
  },
  {
    icon: Lightbulb,
    text: 'Anna suosituksia seuraavalle kampanjalle',
    category: 'Suositukset',
  },
];

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A5B5] to-[#1B365D] flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">AI Assistentti</span>
          </div>
        )}

        {/* Message */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-[#00A5B5] text-white rounded-tr-md' 
            : 'bg-gray-100 text-gray-800 rounded-tl-md'
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Actions & timestamp */}
        <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-400 ${isUser ? 'justify-end' : ''}`}>
          <span>
            {format(new Date(message.timestamp), 'HH:mm', { locale: fi })}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="p-1 hover:text-gray-600 transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Insight Card Component
interface InsightCardProps {
  insight: AIInsight;
  onDismiss: () => void;
  onClick: () => void;
}

const InsightCard = ({ insight, onDismiss, onClick }: InsightCardProps) => {
  const priorityColors = {
    high: 'border-l-[#E31E24] bg-red-50',
    medium: 'border-l-[#F59E0B] bg-yellow-50',
    low: 'border-l-[#00A5B5] bg-teal-50',
  };

  return (
    <div 
      className={`p-4 rounded-xl border-l-4 cursor-pointer hover:shadow-md transition-shadow ${priorityColors[insight.priority]}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Lightbulb size={14} className="text-[#00A5B5]" />
            <span className="text-xs font-medium text-gray-500 uppercase">{insight.category}</span>
          </div>
          <p className="text-sm text-gray-800 font-medium">{insight.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{insight.description}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="p-1 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const AIAssistant = () => {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load AI config
      const aiConfig = await getAIConfig();
      setConfig(aiConfig);

      // Load chat history
      const history = await getChatHistory();
      setMessages(history);

      // Load insights
      const aiInsights = await getAIInsights();
      setInsights(aiInsights);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Tietojen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      // Use askAI which includes database context
      const response = await askAI(inputValue.trim());
      
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save to history
      await saveChatHistory([userMessage, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Viestin lähettäminen epäonnistui');
      
      // Remove the user message if failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const handleInsightClick = async (insight: AIInsight) => {
    // Generate a question based on the insight
    const prompt = `Kerro lisää tästä: ${insight.title}. ${insight.description}`;
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const handleDismissInsight = async (insightId: string) => {
    await dismissInsight(insightId);
    setInsights(prev => prev.filter(i => i.id !== insightId));
  };

  const clearHistory = async () => {
    if (!confirm('Haluatko varmasti tyhjentää keskusteluhistorian?')) return;
    setMessages([]);
    toast.success('Historia tyhjennetty');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner text-[#00A5B5]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 animate-fade-in">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A5B5] to-[#1B365D] flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Assistentti</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Tyhjennä historia"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Päivitä"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-[#00A5B5]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Tervetuloa AI Assistenttiin
              </h3>
              <p className="text-gray-500 max-w-md mb-8">
                Kysy minulta mitä tahansa kampanjoista, analytiikasta tai suosituksista. 
                Minulla on pääsy tietokantaasi.
              </p>

              {/* Suggested prompts */}
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt.text)}
                    className="flex items-start space-x-3 p-4 rounded-xl border border-gray-200 hover:border-[#00A5B5] hover:bg-[#00A5B5]/5 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <prompt.icon size={16} className="text-[#00A5B5]" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 uppercase">{prompt.category}</span>
                      <p className="text-sm text-gray-700 mt-0.5">{prompt.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {sending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A5B5] to-[#1B365D] flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kirjoita viesti..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                disabled={sending}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="p-3 rounded-xl bg-[#00A5B5] text-white hover:bg-[#008A98] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI voi tehdä virheitä. Tarkista tärkeät tiedot.
          </p>
        </div>
      </div>

      {/* Sidebar - Insights */}
      <div className="w-80 flex flex-col space-y-4">
        {/* Insights */}
        <div className="card p-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Lightbulb size={18} className="mr-2 text-[#00A5B5]" />
              Oivallukset
            </h3>
            <span className="badge badge-primary text-xs">{insights.length}</span>
          </div>

          {insights.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Lightbulb size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">Ei uusia oivalluksia</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={() => handleDismissInsight(insight.id)}
                  onClick={() => handleInsightClick(insight)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Pikavalinnat</h3>
          <div className="space-y-2">
            {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPrompt(prompt.text)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 text-left transition-colors"
              >
                <div className="p-2 rounded-lg bg-gray-100">
                  <prompt.icon size={14} className="text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 flex-1">{prompt.text}</span>
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;

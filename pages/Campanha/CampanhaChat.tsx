import React, { useEffect, useState, useRef } from 'react';
import { campaignChatService } from '../../services/campaign.service';
import { Loader2, Send } from 'lucide-react';

type Message = {
  id: string;
  sender: 'LEAD' | 'BOT' | 'OPERATOR';
  message: string;
  created_at: string;
};

export const CampanhaChat: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const sessionToken = params.get('session');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionToken]);

  const loadMessages = async () => {
    if (!sessionToken) return;
    try {
      const data = await campaignChatService.listMessages(sessionToken);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !sessionToken) return;

    setSending(true);
    try {
      await campaignChatService.sendLeadMessage(sessionToken, newMessage);
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Sessão inválida.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900 text-white font-bold uppercase text-sm">
        Atendimento CapitalFlow
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-xs p-3 rounded-xl text-sm ${
              msg.sender === 'LEAD'
                ? 'bg-blue-600 text-white ml-auto'
                : 'bg-slate-800 text-slate-200'
            }`}
          >
            {msg.message}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg text-white flex items-center justify-center"
        >
          {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};
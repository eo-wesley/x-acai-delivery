'use client';

import { useState } from 'react';
import { Bot, Send, X, MessageCircle, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

export default function CopilotChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        { role: 'ai', content: 'Olá! Sou seu Copilot de IA. Como posso ajudar com sua loja hoje?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        const slug = localStorage.getItem('admin_slug') || 'default';
        const token = localStorage.getItem('admin_token');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/${slug}/ai/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: userMsg })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', content: 'Ops, tive um problema ao processar sua dúvida.' }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', content: 'Erro de conexão com o servidor de IA.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {/* TOGGLE BUTTON */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition group relative"
                >
                    <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                    <Bot size={28} />
                </button>
            )}

            {/* CHAT WINDOW */}
            {isOpen && (
                <div className="w-[400px] h-[600px] bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] rounded-[2.5rem] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <header className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Sparkles size={20} className="text-indigo-200" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tighter">AI Admin Copilot</h3>
                                <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Business Intelligence</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                            <X size={20} />
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${m.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                                        : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200 shadow-sm'
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-50 p-4 rounded-3xl rounded-tl-none border border-gray-100 flex gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                    </main>

                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button onClick={() => setInput('Vendas de hoje')} className="text-[10px] font-black uppercase p-2 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 transition text-gray-400 hover:text-indigo-600 flex items-center justify-center gap-2">
                                <TrendingUp size={12} /> Vendas Hoje
                            </button>
                            <button onClick={() => setInput('Estoque crítico')} className="text-[10px] font-black uppercase p-2 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 transition text-gray-400 hover:text-indigo-600 flex items-center justify-center gap-2">
                                <AlertTriangle size={12} /> Estoque
                            </button>
                        </div>
                        <form onSubmit={handleSend} className="relative">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Pergunte ao Copilot..."
                                className="w-full bg-white border border-gray-200 p-4 pr-12 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

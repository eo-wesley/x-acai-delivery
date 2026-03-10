'use client';

import { useState, useEffect } from 'react';
import {
    X,
    Copy,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Store,
    ArrowRight
} from 'lucide-react';

interface CloneMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CloneMenuModal({ isOpen, onClose }: CloneMenuModalProps) {
    const [step, setStep] = useState(1);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetch(`${API}/api/admin/scaling/consolidated-stats?owner_id=default_owner`)
                .then(res => res.json())
                .then(data => setRestaurants(data.stores || []))
                .catch(err => console.error(err));
        }
    }, [isOpen]);

    const handleClone = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/admin/scaling/clone-menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_id: source, target_id: target })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.message);
                setStep(3);
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Módulo de Clonagem</h2>
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none mt-1">Padronização de Cardápio entre Unidades</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                                <AlertCircle className="text-blue-500 shrink-0" size={20} />
                                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                    Selecione a unidade que servirá de **modelo**. Todos os itens, categorias e adicionais serão duplicados.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Loja de Origem (Modelo)</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                                    value={source}
                                    onChange={e => setSource(e.target.value)}
                                >
                                    <option value="">Selecione a origem...</option>
                                    {restaurants.map(r => (
                                        <option key={r.restaurant_id} value={r.restaurant_id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                disabled={!source}
                                onClick={() => setStep(2)}
                                className="w-full bg-black text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 disabled:opacity-50 transition"
                            >
                                Próximo Passo <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Store className="text-gray-400" size={20} />
                                    <span className="text-xs font-black uppercase text-gray-500">Origem:</span>
                                    <span className="text-xs font-bold text-gray-900">{restaurants.find(r => r.restaurant_id === source)?.name}</span>
                                </div>
                                <ArrowRight className="text-gray-300" size={16} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Loja de Destino (Novo)</label>
                                <select
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                                    value={target}
                                    onChange={e => setTarget(e.target.value)}
                                >
                                    <option value="">Selecione o destino...</option>
                                    {restaurants.filter(r => r.restaurant_id !== source).map(r => (
                                        <option key={r.restaurant_id} value={r.restaurant_id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 p-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition">Voltar</button>
                                <button
                                    disabled={!target || loading}
                                    onClick={handleClone}
                                    className="flex-[2] bg-purple-600 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 transition shadow-lg shadow-purple-200"
                                >
                                    {loading ? 'Sincronizando...' : 'confirmar clonagem'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Operação Concluída!</h3>
                            <p className="text-sm text-gray-500 font-medium px-8">{result}</p>
                            <button
                                onClick={onClose}
                                className="bg-black text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-900 transition mt-4"
                            >
                                Fechar Painel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

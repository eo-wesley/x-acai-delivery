'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
function getToken() { return localStorage.getItem('admin_token') || ''; }
function getSlug() { return localStorage.getItem('admin_slug') || 'default'; }

type Profile = {
    name?: string; description?: string; phone?: string; address?: string; whatsapp?: string;
    prep_time_minutes?: number; delivery_fee_cents?: number; min_order_cents?: number;
    max_orders_simultaneous?: number; store_status?: string; temp_close_reason?: string;
    primary_color?: string; secondary_color?: string; logo_url?: string; banner_url?: string;
    custom_domain?: string; font_family?: string; theme_id?: string;
    facebook_pixel_id?: string; google_analytics_id?: string; tiktok_pixel_id?: string;
    opening_hours?: Record<string, { open: string; close: string; enabled: boolean }>;

};

const DAYS: { key: string; label: string }[] = [
    { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' }, { key: 'wed', label: 'Qua' },
    { key: 'thu', label: 'Qui' }, { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sáb' },
    { key: 'sun', label: 'Dom' },
];

function defaultHours() {
    return DAYS.reduce((acc, d) => ({
        ...acc,
        [d.key]: { open: '10:00', close: '22:00', enabled: d.key !== 'sun' }
    }), {} as Required<Profile>['opening_hours']);
}

export default function AdminSettings() {
    const [profile, setProfile] = useState<Profile>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [hours, setHours] = useState(defaultHours());

    const load = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/admin/restaurant/config`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const d = await res.json();
                setProfile(d);
                if (d.opening_hours) setHours({ ...defaultHours(), ...d.opening_hours });
            }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const update = (k: keyof Profile, v: any) => setProfile(p => ({ ...p, [k]: v }));

    const save = async () => {
        setSaving(true); setError(''); setSaved(false);
        try {
            const res = await fetch(`${API}/api/admin/restaurant/config`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...profile, opening_hours: JSON.stringify(hours) }),
            });
            if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
            else { const d = await res.json(); setError(d.error || 'Erro ao salvar'); }
        } catch { setError('Falha na comunicação'); }
        setSaving(false);
    };

    const setStoreStatus = async (status: string, reason = '') => {
        await fetch(`${API}/api/admin/store?slug=${getSlug()}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_status: status, temp_close_reason: reason || undefined }),
        });
        update('store_status', status);
        if (reason) update('temp_close_reason', reason);
    };

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;

    const storeStatus = profile.store_status || 'open';

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-gray-800">⚙️ Configurações da Loja</h1>
                <div className="flex items-center gap-2">
                    <Link href="/admin/settings/pixels" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-tight flex items-center gap-2 hover:bg-gray-200 transition">
                        📊 Pixels & Integrações
                    </Link>
                    <Link href="/admin/settings/pricing" className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-tight flex items-center gap-2 hover:bg-amber-200 transition">
                        <Zap size={14} /> Inteligência de Preços
                    </Link>
                </div>
            </div>

            {/* Store Status */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">Estado da Loja</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                        { s: 'open', label: 'Aberta', emoji: '🟢', desc: 'Aceita pedidos' },
                        { s: 'closed', label: 'Fechada', emoji: '🔴', desc: 'Sem pedidos' },
                        { s: 'paused', label: 'Pausada', emoji: '🟡', desc: 'Temporariamente' },
                        { s: 'busy', label: 'Lotada', emoji: '🟠', desc: 'Sem capacidade' },
                    ].map(({ s, label, emoji, desc }) => (
                        <button key={s} onClick={() => setStoreStatus(s)}
                            className={`p-3 rounded-xl border-2 text-center transition font-bold ${storeStatus === s
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                                }`}>
                            <div className="text-2xl mb-1">{emoji}</div>
                            <div className="text-sm font-black">{label}</div>
                            <div className="text-xs text-gray-500 font-normal">{desc}</div>
                        </button>
                    ))}
                </div>
                {(storeStatus === 'closed' || storeStatus === 'paused') && (
                    <input
                        className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500"
                        placeholder="Motivo (ex: feriado, manutenção...)"
                        value={profile.temp_close_reason || ''}
                        onChange={e => update('temp_close_reason', e.target.value)}
                        onBlur={() => setStoreStatus(storeStatus, profile.temp_close_reason || '')}
                    />
                )}
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">Informações Básicas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { k: 'name', label: 'Nome do restaurante', placeholder: 'X-Açaí' },
                        { k: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                        { k: 'whatsapp', label: 'WhatsApp', placeholder: '5511999999999' },
                        { k: 'address', label: 'Endereço', placeholder: 'Rua Principal, 100' },
                    ].map(({ k, label, placeholder }) => (
                        <div key={k}>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
                            <input className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                                placeholder={placeholder}
                                value={(profile as any)[k] || ''}
                                onChange={e => update(k as any, e.target.value)}
                            />
                        </div>
                    ))}
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descrição</label>
                        <textarea className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1 h-20 resize-none"
                            placeholder="Uma frase sobre sua loja..."
                            value={profile.description || ''}
                            onChange={e => update('description', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Branding */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">Identidade Visual (White Label)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Logo URL</label>
                        <div className="flex gap-3 mt-1">
                            <input className="flex-1 border rounded-xl p-3 text-sm outline-none focus:border-purple-500"
                                placeholder="https://exemplo.com/logo.png"
                                value={profile.logo_url || ''}
                                onChange={e => update('logo_url', e.target.value)}
                            />
                            {profile.logo_url && <img src={profile.logo_url} className="w-12 h-12 rounded-lg object-contain border bg-gray-50" />}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Banner URL</label>
                        <input className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                            placeholder="https://exemplo.com/banner.png"
                            value={profile.banner_url || ''}
                            onChange={e => update('banner_url', e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cor Primária</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-none"
                                    value={profile.primary_color || '#9333ea'}
                                    onChange={e => update('primary_color', e.target.value)} />
                                <input className="flex-1 border rounded-xl p-3 text-sm outline-none focus:border-purple-500"
                                    value={profile.primary_color || '#9333ea'}
                                    onChange={e => update('primary_color', e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cor Secundária</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-none"
                                    value={profile.secondary_color || '#ffffff'}
                                    onChange={e => update('secondary_color', e.target.value)} />
                                <input className="flex-1 border rounded-xl p-3 text-sm outline-none focus:border-purple-500"
                                    value={profile.secondary_color || '#ffffff'}
                                    onChange={e => update('secondary_color', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Domínio Customizado</label>
                            <input className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                                placeholder="ex: acai.sualoja.com"
                                value={profile.custom_domain || ''}
                                onChange={e => update('custom_domain', e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fonte do Menu</label>
                            <select className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1 bg-white"
                                value={profile.font_family || 'Inter'}
                                onChange={e => update('font_family', e.target.value)}
                            >
                                <option value="Inter">Inter (Padrão)</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Montserrat">Montserrat</option>
                                <option value="Poppins">Poppins</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operational Settings */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">Operação</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Tempo de preparo (min)</label>
                        <input type="number" className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                            value={profile.prep_time_minutes || 30}
                            onChange={e => update('prep_time_minutes', parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Taxa de entrega (R$)</label>
                        <input type="number" step="0.01" className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                            value={(profile.delivery_fee_cents || 0) / 100}
                            onChange={e => update('delivery_fee_cents', Math.round(parseFloat(e.target.value) * 100))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Pedido mínimo (R$)</label>
                        <input type="number" step="0.01" className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                            value={(profile.min_order_cents || 0) / 100}
                            onChange={e => update('min_order_cents', Math.round(parseFloat(e.target.value) * 100))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Max pedidos simultâneos (0=ilimitado)</label>
                        <input type="number" className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                            value={profile.max_orders_simultaneous || 0}
                            onChange={e => update('max_orders_simultaneous', parseInt(e.target.value))} />
                    </div>
                </div>
            </div>

            {/* Opening Hours */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">Horário de Funcionamento</h2>
                <div className="space-y-2">
                    {DAYS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3">
                            <div className="w-10 text-sm font-bold text-gray-600 flex-shrink-0">{label}</div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer"
                                    checked={hours[key]?.enabled ?? true}
                                    onChange={e => setHours(h => ({ ...h, [key]: { ...h[key], enabled: e.target.checked } }))} />
                                <div className="w-10 h-5 bg-gray-200 peer-checked:bg-purple-600 rounded-full transition peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition" />
                            </label>
                            {hours[key]?.enabled
                                ? <div className="flex gap-2 flex-1">
                                    <input type="time" value={hours[key]?.open || '10:00'}
                                        className="border rounded-lg p-1.5 text-sm flex-1 outline-none focus:border-purple-500"
                                        onChange={e => setHours(h => ({ ...h, [key]: { ...h[key], open: e.target.value } }))} />
                                    <span className="text-gray-400 self-center">–</span>
                                    <input type="time" value={hours[key]?.close || '22:00'}
                                        className="border rounded-lg p-1.5 text-sm flex-1 outline-none focus:border-purple-500"
                                        onChange={e => setHours(h => ({ ...h, [key]: { ...h[key], close: e.target.value } }))} />
                                </div>
                                : <span className="text-sm text-gray-400 italic">Fechado</span>
                            }
                        </div>
                    ))}
                </div>
            </div>

            {/* Marketing & Pixels */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-600 uppercase text-xs tracking-widest mb-4">Marketing & Pixels</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { k: 'facebook_pixel_id', label: 'Meta Pixel ID (Facebook)', placeholder: '1234567890' },
                        { k: 'google_analytics_id', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX' },
                        { k: 'tiktok_pixel_id', label: 'TikTok Pixel ID', placeholder: 'CXXXXXXXXXXXXXXX' },
                    ].map(({ k, label, placeholder }) => (
                        <div key={k}>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
                            <input className="w-full border rounded-xl p-3 text-sm outline-none focus:border-purple-500 mt-1"
                                placeholder={placeholder}
                                value={(profile as any)[k] || ''}
                                onChange={e => update(k as any, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-xs text-gray-400 italic">
                    Insira apenas o ID numérico/alfanumérico fornecido pelas plataformas. Os scripts serão injetados automaticamente no menu do cliente.
                </p>
            </div>


            {/* Save */}
            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
            <button onClick={save} disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl text-lg shadow-lg disabled:opacity-50 transition">
                {saving ? '⏳ Salvando...' : saved ? '✅ Salvo!' : '💾 Salvar Configurações'}
            </button>
        </div>
    );
}

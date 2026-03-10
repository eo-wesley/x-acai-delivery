'use client';

import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, Calendar, Lock, User as UserIcon, Activity } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    username: string;
    role: 'owner' | 'manager' | 'staff';
    last_login: string | null;
    active: number;
    created_at: string;
}

interface AuditLog {
    id: string;
    user_name: string;
    action: string;
    resource: string;
    created_at: string;
    payload: string | null;
}

export default function TeamManagementPage() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const [form, setForm] = useState({
        name: '',
        username: '',
        password: '',
        role: 'staff' as 'owner' | 'manager' | 'staff'
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const resMembers = await fetch(`${API_URL}/api/admin/team`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resMembers.ok) {
                const data = await resMembers.json();
                setMembers(data);
            }

            if (showLogs) {
                const resLogs = await fetch(`${API_URL}/api/admin/audit`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resLogs.ok) {
                    const data = await resLogs.json();
                    setLogs(data);
                }
            }
        } catch (e) {
            console.error('Failed to fetch team data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [showLogs]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/admin/team`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setShowAddModal(false);
                setForm({ name: '', username: '', password: '', role: 'staff' });
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao adicionar membro');
            }
        } catch (e) {
            alert('Erro de conexão');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este membro da equipe?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/api/admin/team/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchData();
        } catch (e) {
            alert('Erro ao excluir');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando dados da equipe...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                        <Shield className="text-purple-600" size={32} />
                        Gestão de Equipe
                    </h1>
                    <p className="text-gray-500">Controle quem acessa o seu painel administrativo</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${showLogs ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600 border'}`}
                    >
                        <Activity size={20} />
                        {showLogs ? 'Ver Membros' : 'Ver Auditoria'}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 transition shadow-lg"
                    >
                        <UserPlus size={20} />
                        Novo Membro
                    </button>
                </div>
            </header>

            {!showLogs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.map(member => (
                        <div key={member.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative group">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${member.role === 'owner' ? 'bg-purple-100 text-purple-600' : member.role === 'manager' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                    <UserIcon size={24} />
                                </div>
                                <span className={`text-xs font-black uppercase px-2 py-1 rounded ${member.role === 'owner' ? 'bg-purple-600 text-white' : member.role === 'manager' ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}>
                                    {member.role}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg uppercase">{member.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">@{member.username}</p>

                            <div className="space-y-2 border-t pt-4">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Calendar size={14} />
                                    Desde {new Date(member.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Lock size={14} />
                                    {member.last_login ? `Último login: ${new Date(member.last_login).toLocaleString()}` : 'Nunca logou'}
                                </div>
                            </div>

                            {member.role !== 'owner' && (
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                    title="Remover membro"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 text-xs font-black uppercase text-gray-400">Data/Hora</th>
                                <th className="p-4 text-xs font-black uppercase text-gray-400">Usuário</th>
                                <th className="p-4 text-xs font-black uppercase text-gray-400">Ação</th>
                                <th className="p-4 text-xs font-black uppercase text-gray-400">Recurso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="border-t hover:bg-gray-50 transition">
                                    <td className="p-4 text-sm text-gray-600">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="p-4 font-bold text-gray-800">{log.user_name || 'Admin Legacy'}</td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${log.action.includes('CREATE') ? 'bg-green-100 text-green-700' : log.action.includes('DELETE') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">{log.resource}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Add Member */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-gray-800 mb-6">Novo Membro de Equipe</h2>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase px-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Ex: João Silva"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase px-1">Usuário (Username)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Ex: joao.acai"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, '') })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase px-1">Senha Provisória</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase px-1">Cargo / Nível de Acesso</label>
                                <select
                                    className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-gray-700"
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value as any })}
                                >
                                    <option value="staff">Funcionário (Pedidos/Estoque)</option>
                                    <option value="manager">Gerente (Relatórios/Menu)</option>
                                    <option value="owner">Dono (Controle Total)</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-purple-700 transition"
                                >
                                    Cadastrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

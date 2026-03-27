'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function WelcomeOnboardingPage() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-xl w-full bg-white p-10 rounded-3xl shadow-2xl space-y-8">
                <div className="text-7xl animate-bounce">🎉</div>
                <h1 className="text-4xl font-extrabold text-gray-900">Parabéns! Seu delivery está no ar!</h1>

                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-left space-y-4">
                    <p className="font-bold text-gray-800">Sua URL exclusiva:</p>
                    <div className="bg-white p-3 rounded-lg border border-purple-200 text-[#9333ea] font-mono break-all">
                        https://xacai.com/{slug}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                        href={`/admin?id=${id}`}
                        className="bg-[#9333ea] text-white font-bold py-4 rounded-xl hover:bg-[#7c3aed] transition-all flex flex-col items-center justify-center"
                    >
                        <span>Painel Admin</span>
                        <span className="text-xs font-normal opacity-70">Configurar cardápio</span>
                    </Link>
                    <a
                        href={`/?slug=${slug}`}
                        target="_blank"
                        className="bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex flex-col items-center justify-center"
                    >
                        <span>Ver Loja</span>
                        <span className="text-xs font-normal opacity-70">Visão do cliente</span>
                    </a>
                </div>

                <div className="pt-6 border-t border-gray-100 space-y-4">
                    <p className="text-sm text-gray-500">O que fazer agora?</p>
                    <div className="flex justify-center space-x-6 text-2xl">
                        <span title="Configurar logo">🖼️</span>
                        <span title="Cadastrar produtos">🍟</span>
                        <span title="Ativar pagamentos">💳</span>
                        <span title="Divulgar no WhatsApp">📱</span>
                    </div>
                </div>
            </div>

            <p className="mt-8 text-gray-400 text-sm">
                ID do Restaurante: <span className="font-mono">{id}</span>
            </p>
        </div>
    );
}

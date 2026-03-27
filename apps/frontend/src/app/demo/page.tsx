'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
    const router = useRouter();

    useEffect(() => {
        // O middleware já terá setado o cookie de tenant_slug = 'demo'
        // Redirecionamos para a home após um breve delay para o usuário ver que é um ambiente demo
        const timer = setTimeout(() => {
            router.push('/');
        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#9333ea] text-white p-6">
            <div className="max-w-md w-full text-center space-y-8 animate-pulse">
                <div className="text-6xl">🍧</div>
                <h1 className="text-4xl font-bold tracking-tight">X-Açaí Demo</h1>
                <p className="text-xl opacity-90">
                    Preparando o ambiente do <span className="font-bold">Açaí do Dudu</span>...
                </p>

                <div className="flex justify-center space-x-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>

                <div className="pt-8 text-sm opacity-70 italic">
                    Você está entrando em uma demonstração pública.
                </div>
            </div>
        </div>
    );
}

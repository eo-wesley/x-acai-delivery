import PricingWorkspace from '@/components/admin/PricingWorkspace';

export const metadata = {
    title: 'X-Açaí | Painel de Precificação e Custos',
    description: 'Painel executivo de precificação, custos e margem de contribuição do X-Açaí.',
};

export default function PrecificacaoPublicaPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-6 px-3 md:px-8 max-w-[1600px] mx-auto">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-black text-purple-900">Painel de Precificação & Centro de Custos — X-Açaí</h1>
                    <p className="text-sm text-gray-600 font-medium">Centro de custeio canônico, fichas técnicas de 4 camadas e margens de contribuição aprovadas.</p>
                </div>
                <div className="flex gap-2">
                    <a href="/admin/costing" className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800 transition shadow-sm">
                        Painel Lojista
                    </a>
                    <a href="/" className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition shadow-sm">
                        Cardápio Delivery
                    </a>
                </div>
            </div>
            <PricingWorkspace />
        </div>
    );
}

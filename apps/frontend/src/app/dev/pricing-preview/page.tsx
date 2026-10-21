import { notFound } from 'next/navigation';
import PricingWorkspace from '@/components/admin/PricingWorkspace';

// Preview of documentary pricing data only. Never available in production.
export default function PricingPreview() {
    if (process.env.NODE_ENV !== 'development') notFound();
    return <div className="mx-auto max-w-[1600px] px-3 py-5 pb-24 md:px-8">
        <p className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900"><strong>Prévia local do módulo de precificação.</strong> Navegue pelas abas e revise os valores. Os ajustes ficam neste navegador; esta prévia não altera pedidos nem publica preços.</p>
        <PricingWorkspace />
    </div>;
}

import PricingWorkspace from '@/components/admin/PricingWorkspace';

export default function PricingPreview() {
    return (
        <div className="mx-auto max-w-[1600px] px-3 py-5 pb-24 md:px-8">
            <p className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                <strong>Prévia do módulo de precificação X-Açaí.</strong> Navegue pelas abas e revise os valores, fichas técnicas e insumos.
            </p>
            <PricingWorkspace />
        </div>
    );
}

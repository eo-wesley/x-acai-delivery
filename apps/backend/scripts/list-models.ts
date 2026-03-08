import { env } from '../src/config/env';

async function listModels() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Sem GEMINI_API_KEY no .env');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log('🔄 Buscando modelos...');
        const res = await fetch(url);
        const data = await res.json() as any;

        if (!res.ok) {
            console.error('❌ Erro HTTP:', data);
            return;
        }

        console.log('✅ Modelos disponíveis na Key:');
        data.models.forEach((m: any) => {
            console.log(` - ${m.name} (Methods: ${m.supportedGenerationMethods?.join(', ') || 'none'})`);
        });

    } catch (e) {
        console.error('Falha:', e);
    }
}

listModels();

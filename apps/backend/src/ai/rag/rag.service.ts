import { inMemoryKB } from './knowledge.base';

export class RAGService {
    // Simple Keyword Overlap Ranking
    private rankByKeywords(query: string) {
        // Minimal tokenization
        const tokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const scoredDocs = inMemoryKB.map(doc => {
            let score = 0;
            const searchableText = `${doc.content.toLowerCase()} ${doc.tags.join(' ')}`;
            tokens.forEach(token => {
                if (searchableText.includes(token)) {
                    score += 1;
                }
            });
            return { doc, score };
        });

        return scoredDocs
            .filter(sd => sd.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(sd => sd.doc);
    }

    retrieveContext(query: string, limitChars: number = 1200): string {
        const topDocs = this.rankByKeywords(query);

        if (topDocs.length === 0) return '';

        let contextString = 'RELEVANT STORE KNOWLEDGE BASE (USE THIS TO ANSWER):\n';
        for (const doc of topDocs) {
            const snippet = `[${doc.type.toUpperCase()}] ${doc.content}\n`;
            if ((contextString.length + snippet.length) <= limitChars) {
                contextString += snippet;
            } else {
                break;
            }
        }

        return contextString;
    }
}

export const ragService = new RAGService();

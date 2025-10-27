import { SheetData, KnowledgeGraph, CachedAnalysis } from '../types';

// Using Web Crypto API for a robust hash.
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Generates a unique cache key for a given set of sheet data.
 * @param data The sheet data.
 * @returns A promise that resolves to a SHA-256 hash string.
 */
export const generateCacheKey = async (data: SheetData[]): Promise<string> => {
    // Stringify with a replacer to ensure consistent key order
    const dataString = JSON.stringify(data, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
              .sort()
              .reduce((sorted: any, key) => {
                sorted[key] = value[key];
                return sorted;
              }, {});
        }
        return value;
    });
    return await sha256(dataString);
};

/**
 * Retrieves a cached analysis object from localStorage.
 * @param key The cache key.
 * @returns The parsed CachedAnalysis object or null if not found or invalid.
 */
export const getCachedAnalysis = (key: string): CachedAnalysis | null => {
    try {
        const cachedItem = localStorage.getItem(key);
        if (cachedItem) {
            const parsed = JSON.parse(cachedItem) as CachedAnalysis;
            if (parsed.metadata && parsed.graph && parsed.sheets) {
                return parsed;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to parse cached analysis:", error);
        localStorage.removeItem(key); // Clear invalid item
        return null;
    }
};

/**
 * Stores an analysis (graph and sheets) and its metadata in localStorage.
 * @param key The cache key.
 * @param graph The KnowledgeGraph object to store.
 * @param sheets The SheetData array to store.
 */
export const setCachedAnalysis = (key: string, graph: KnowledgeGraph, sheets: SheetData[]): void => {
    try {
        const analysisToCache: CachedAnalysis = {
            metadata: {
                key,
                generatedAt: new Date().toISOString(),
            },
            graph,
            sheets,
        };
        const dataString = JSON.stringify(analysisToCache);
        localStorage.setItem(key, dataString);
    } catch (error) {
        console.error("Failed to save analysis to cache:", error);
    }
};

/**
 * GEMINI AI CONFIGURATION MODULE
 * Maneja la configuración segura de API keys y conexión con Google AI Studio
 */

class GeminiConfig {
    constructor() {
        this.STORAGE_KEY = 'gemini_config';
        this.API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.MODELS = {
            PRO: 'gemini-2.5-pro',
            FLASH_LITE: 'gemini-2.5-flash'
        };
        this.config = this.loadConfig();
    }

    /**
     * Carga configuración guardada desde localStorage
     */
    loadConfig() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error al cargar configuración de Gemini:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Guarda configuración de manera segura
     */
    saveConfig(apiKey) {
        const config = {
            apiKey: apiKey,
            savedAt: new Date().toISOString(),
            isConfigured: true
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        this.config = config;
        return true;
    }

    /**
     * Obtiene la configuración actual
     */
    getConfig() {
        return this.config;
    }

    /**
     * Verifica si está configurado
     */
    isConfigured() {
        return this.config && this.config.apiKey && this.config.isConfigured;
    }

    /**
     * Obtiene la API Key
     */
    getApiKey() {
        return this.config ? this.config.apiKey : null;
    }

    /**
     * Elimina la configuración (logout)
     */
    clearConfig() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.config = null;
    }

    /**
     * Valida la API Key con una petición de prueba
     */
    async validateApiKey(apiKey) {
        try {
            const response = await fetch(
                `${this.API_ENDPOINT}/${this.MODELS.FLASH_LITE}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: 'Prueba'
                            }]
                        }],
                        generationConfig: {
                            maxOutputTokens: 10
                        }
                    })
                }
            );

            if (response.status === 401) {
                return { valid: false, error: 'API Key inválida' };
            }
            if (!response.ok) {
                return { valid: false, error: 'Error al validar API Key' };
            }

            return { valid: true, error: null };
        } catch (error) {
            console.error('Error validando API Key:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Obtiene el nombre del modelo actual
     */
    getModelName(modelType = 'FLASH_LITE') {
        return this.MODELS[modelType] || this.MODELS.FLASH_LITE;
    }

    /**
     * Lista los modelos disponibles
     */
    getAvailableModels() {
        return [
            { id: 'PRO', name: 'Gemini 2.5 Pro', description: 'Modelo más potente y preciso', value: this.MODELS.PRO },
            { id: 'FLASH_LITE', name: 'Gemini 2.0 Flash', description: 'Modelo rápido y ligero', value: this.MODELS.FLASH_LITE }
        ];
    }
}

// Instancia global
const geminiConfig = new GeminiConfig();

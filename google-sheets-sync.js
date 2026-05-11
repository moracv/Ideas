/**
 * GOOGLE SHEETS SYNC MODULE
 * Sincroniza ideas entre la app y Google Sheets
 */

class GoogleSheetsSync {
    constructor() {
        this.STORAGE_KEY = 'google_sheets_config';
        this.SPREADSHEET_ID = '1yonePNK1fyNYycLAt_D_h1YybMHpA4ZBgMxb_dFYsts';
        this.SHEET_NAME = 'Ideas';
        this.config = this.loadConfig();
    }

    /**
     * Guarda configuración de Google Sheets
     */
    saveConfig(accessToken, refreshToken = null) {
        const config = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            savedAt: new Date().toISOString(),
            isConfigured: true
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        this.config = config;
        return true;
    }

    /**
     * Carga configuración guardada
     */
    loadConfig() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error al cargar config de Google Sheets:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Verifica si está configurado
     */
    isConfigured() {
        return this.config && this.config.accessToken && this.config.isConfigured;
    }

    /**
     * Obtiene el access token
     */
    getAccessToken() {
        return this.config ? this.config.accessToken : null;
    }

    /**
     * Limpia la configuración
     */
    clearConfig() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.config = null;
    }

    /**
     * Convierte una idea a un array para Google Sheets
     */
    ideaToSheetRow(idea) {
        const aiResponses = idea.aiResponses || [];
        const aiHistory = aiResponses.map(r => 
            `[${new Date(r.timestamp).toLocaleString()}]\nP: ${r.question}\nR: ${r.response}`
        ).join('\n\n---\n\n');

        return [
            idea.id || '',
            idea.title || '',
            idea.description || '',
            idea.type || '',
            idea.priority || '',
            idea.status || 'pending',
            idea.summary || '',
            idea.viability || '0',
            idea.pros || '',
            idea.cons || '',
            idea.budget || '',
            idea.timeline || '',
            idea.resources || '',
            aiHistory || 'Sin consultas de IA',
            new Date(idea.createdAt).toLocaleString() || new Date().toLocaleString(),
            idea.updatedAt ? new Date(idea.updatedAt).toLocaleString() : ''
        ];
    }

    /**
     * Convierte un array de Google Sheets a objeto idea
     */
    sheetRowToIdea(row, headers) {
        const idea = {};
        headers.forEach((header, index) => {
            const value = row[index] || '';
            
            if (header === 'Historial IA') {
                // Parsear el historial de IA
                idea.aiResponses = this.parseAiHistory(value);
            } else if (header === 'Viabilidad') {
                idea.viability = parseInt(value) || 0;
            } else {
                idea[this.headerToKey(header)] = value;
            }
        });

        return idea;
    }

    /**
     * Convierte header de sheet a clave de objeto
     */
    headerToKey(header) {
        const mapping = {
            'ID': 'id',
            'Título': 'title',
            'Descripción': 'description',
            'Tipo': 'type',
            'Prioridad': 'priority',
            'Estado': 'status',
            'Resumen': 'summary',
            'Viabilidad': 'viability',
            'Pros': 'pros',
            'Contras': 'cons',
            'Presupuesto': 'budget',
            'Timeline': 'timeline',
            'Recursos': 'resources',
            'Historial IA': 'aiResponses',
            'Creado': 'createdAt',
            'Actualizado': 'updatedAt'
        };
        return mapping[header] || header.toLowerCase();
    }

    /**
     * Parsea el historial de IA desde texto de sheet
     */
    parseAiHistory(historyText) {
        if (!historyText || historyText === 'Sin consultas de IA') {
            return [];
        }

        const responses = [];
        const entries = historyText.split('\n\n---\n\n');

        entries.forEach(entry => {
            const match = entry.match(/\[(.*?)\]\nP: (.*?)\nR: (.*)/s);
            if (match) {
                responses.push({
                    timestamp: new Date(match[1]).toISOString(),
                    question: match[2].trim(),
                    response: match[3].trim()
                });
            }
        });

        return responses;
    }

    /**
     * Sube todas las ideas a Google Sheets
     */
    async uploadIdeas(ideas, accessToken) {
        try {
            // Preparar datos
            const headers = [
                'ID', 'Título', 'Descripción', 'Tipo', 'Prioridad', 'Estado',
                'Resumen', 'Viabilidad', 'Pros', 'Contras', 'Presupuesto',
                'Timeline', 'Recursos', 'Historial IA', 'Creado', 'Actualizado'
            ];

            const values = [headers];
            ideas.forEach(idea => {
                values.push(this.ideaToSheetRow(idea));
            });

            // Hacer request a Google Sheets API
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.SHEET_NAME}?valueInputOption=USER_ENTERED`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: values
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Error al subir ideas: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Error subiendo ideas a Google Sheets:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Descarga ideas desde Google Sheets
     */
    async downloadIdeas(accessToken) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.SHEET_NAME}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error al descargar ideas: ${response.statusText}`);
            }

            const data = await response.json();
            const values = data.values || [];

            if (values.length === 0) {
                return { success: true, ideas: [] };
            }

            const headers = values[0];
            const ideas = [];

            for (let i = 1; i < values.length; i++) {
                const row = values[i];
                if (row.length > 0 && row[0]) { // Si tiene ID
                    ideas.push(this.sheetRowToIdea(row, headers));
                }
            }

            return { success: true, ideas: ideas };
        } catch (error) {
            console.error('Error descargando ideas desde Google Sheets:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sincroniza (merge) ideas locales con las de Google Sheets
     */
    async syncIdeas(localIdeas, accessToken) {
        try {
            // Descargar ideas del sheet
            const downloadResult = await this.downloadIdeas(accessToken);
            if (!downloadResult.success) {
                return downloadResult;
            }

            const sheetIdeas = downloadResult.ideas;
            const merged = this.mergeIdeas(localIdeas, sheetIdeas);

            // Subir ideas mezcladas
            await this.uploadIdeas(merged, accessToken);

            return { 
                success: true, 
                ideas: merged,
                message: `Sincronizadas ${merged.length} ideas`
            };
        } catch (error) {
            console.error('Error sincronizando ideas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Combina ideas locales con las de Google Sheets (gana la más reciente)
     */
    mergeIdeas(localIdeas, sheetIdeas) {
        const merged = new Map();

        // Agregar ideas locales
        localIdeas.forEach(idea => {
            merged.set(idea.id, { ...idea, source: 'local' });
        });

        // Agregar o actualizar con ideas del sheet
        sheetIdeas.forEach(idea => {
            const existing = merged.get(idea.id);
            if (!existing) {
                merged.set(idea.id, { ...idea, source: 'sheet' });
            } else {
                // Usar la más reciente
                const localTime = new Date(existing.updatedAt || existing.createdAt).getTime();
                const sheetTime = new Date(idea.updatedAt || idea.createdAt).getTime();
                if (sheetTime > localTime) {
                    merged.set(idea.id, { ...idea, source: 'sheet' });
                }
            }
        });

        return Array.from(merged.values());
    }
}

// Instancia global
const googleSheetsSync = new GoogleSheetsSync();

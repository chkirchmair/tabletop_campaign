
/**
 * State Management für das Tabletop-Kampagnentool
 * Verwaltet den aktuellen Spielstand und localStorage-Integration
 */

class CampaignState {
    constructor() {
        this.state = {
            hexes: {},
            factions: {},
            pois: [],
            regions: [],
            history: [],
            settings: {}
        };
        this.subscribers = [];
        this.storageKey = 'tabletop-campaign-state';
    }

    /**
     * Initialisiert den State - lädt aus localStorage oder von data.json
     */
    async initialize() {
        const savedState = this.loadFromStorage();
        
        if (savedState) {
            this.state = savedState;
            console.log('State aus localStorage geladen');
        } else {
            await this.loadInitialData();
            console.log('Initialdaten aus data.json geladen');
        }
        
        this.notifySubscribers();
    }

    /**
     * Lädt Initialdaten aus data.json
     */
    async loadInitialData() {
        try {
            const response = await fetch('./data.json');
            const data = await response.json();
            this.state = data;
            this.saveToStorage();
        } catch (error) {
            console.error('Fehler beim Laden der Initialdaten:', error);
            // Fallback zu Default-State
            this.resetToDefault();
        }
    }

    /**
     * Setzt den State auf Standardwerte zurück
     */
    resetToDefault() {
        this.state = {
            hexes: {},
            factions: {
                chaos: { name: "Chaos", points: 0, color: "#a83232" },
                ordnung: { name: "Ordnung", points: 0, color: "#32a852" },
                tod: { name: "Tod", points: 0, color: "#7e7e7e" },
                zerstoerung: { name: "Zerstörung", points: 0, color: "#a8772d" }
            },
            pois: [],
            regions: [
                { name: "Nordwälder", description: "Dichte Waldgebiete im Norden" },
                { name: "Westberge", description: "Gebirgskette im Westen" },
                { name: "Ostebenen", description: "Weite Ebenen im Osten" },
                { name: "Südsumpf", description: "Sumpfland im Süden" }
            ],
            history: [],
            settings: {
                mapWidth: 800,
                mapHeight: 600,
                hexSize: 50,
                adminMode: false,
                campaignName: "Die Vier Fraktionen",
                campaignDescription: "Eine epische Kampagne um die Vorherrschaft in den Grenzlanden"
            }
        };
        this.saveToStorage();
    }

    /**
     * Lädt State aus localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Fehler beim Laden aus localStorage:', error);
            return null;
        }
    }

    /**
     * Speichert State in localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.error('Fehler beim Speichern in localStorage:', error);
        }
    }

    /**
     * Subscribes zu State-Änderungen
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    /**
     * Benachrichtigt alle Subscriber über State-Änderungen
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Fehler beim Benachrichtigen eines Subscribers:', error);
            }
        });
    }

    /**
     * Gibt aktuellen State zurück
     */
    getState() {
        return this.state;
    }

    /**
     * Gibt alle Hexfelder zurück
     */
    getHexes() {
        return this.state.hexes || {};
    }

    /**
     * Gibt spezifisches Hexfeld zurück
     */
    getHex(hexId) {
        return this.state.hexes[hexId] || null;
    }

    /**
     * Gibt alle Fraktionen zurück
     */
    getFactions() {
        return this.state.factions || {};
    }

    /**
     * Gibt spezifische Fraktion zurück
     */
    getFaction(factionId) {
        return this.state.factions[factionId] || null;
    }

    /**
     * Gibt alle POIs zurück
     */
    getPOIs() {
        return this.state.pois || [];
    }

    /**
     * Gibt spezifischen POI zurück
     */
    getPOI(poiId) {
        return this.state.pois.find(poi => poi.id === poiId) || null;
    }

    /**
     * Gibt alle Regionen zurück
     */
    getRegions() {
        return this.state.regions || [];
    }

    /**
     * Gibt Kampfhistorie zurück
     */
    getHistory() {
        return this.state.history || [];
    }

    /**
     * Gibt Einstellungen zurück
     */
    getSettings() {
        return this.state.settings || {};
    }

    /**
     * Aktualisiert ein Hexfeld
     */
    updateHex(hexId, updates) {
        if (!this.state.hexes) {
            this.state.hexes = {};
        }
        
        this.state.hexes[hexId] = {
            ...this.state.hexes[hexId],
            ...updates
        };
        
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Setzt Fraktionspunkte
     */
    updateFactionPoints(factionId, points) {
        if (this.state.factions[factionId]) {
            this.state.factions[factionId].points = points;
            this.saveToStorage();
            this.notifySubscribers();
        }
    }

    /**
     * Fügt Fraktionspunkte hinzu
     */
    addFactionPoints(factionId, points) {
        if (this.state.factions[factionId]) {
            this.state.factions[factionId].points += points;
            this.saveToStorage();
            this.notifySubscribers();
        }
    }

    /**
     * Fügt Historien-Eintrag hinzu
     */
    addHistoryEntry(entry) {
        if (!this.state.history) {
            this.state.history = [];
        }
        
        this.state.history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...entry
        });
        
        // Nur die letzten 100 Einträge behalten
        if (this.state.history.length > 100) {
            this.state.history = this.state.history.slice(0, 100);
        }
        
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Aktualisiert POI
     */
    updatePOI(poiId, updates) {
        const poiIndex = this.state.pois.findIndex(poi => poi.id === poiId);
        if (poiIndex >= 0) {
            this.state.pois[poiIndex] = {
                ...this.state.pois[poiIndex],
                ...updates
            };
            this.saveToStorage();
            this.notifySubscribers();
        }
    }

    /**
     * Fügt neuen POI hinzu
     */
    addPOI(poi) {
        this.state.pois.push(poi);
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Aktualisiert Einstellungen
     */
    updateSettings(updates) {
        this.state.settings = {
            ...this.state.settings,
            ...updates
        };
        
        // Titel und Beschreibung auch im DOM aktualisieren
        if (updates.campaignName) {
            const titleElement = document.getElementById('campaignTitle');
            if (titleElement) titleElement.textContent = updates.campaignName;
        }
        
        if (updates.campaignDescription) {
            const descElement = document.getElementById('campaignDescription');
            if (descElement) descElement.textContent = updates.campaignDescription;
        }
        
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Exportiert State als JSON
     */
    exportState() {
        return JSON.stringify(this.state, null, 2);
    }

    /**
     * Importiert State aus JSON
     */
    importState(jsonString) {
        try {
            const newState = JSON.parse(jsonString);
            this.state = newState;
            this.saveToStorage();
            this.notifySubscribers();
            return true;
        } catch (error) {
            console.error('Fehler beim Importieren des States:', error);
            return false;
        }
    }

    /**
     * Löscht gespeicherten State
     */
    clearStorage() {
        localStorage.removeItem(this.storageKey);
        this.resetToDefault();
    }
}

// Globale State-Instanz
const campaignState = new CampaignState();


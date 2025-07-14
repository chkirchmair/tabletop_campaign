
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
                zerstoerung: { name: "Zerstörung", points: 0, color: "#a8772d" },
                neutral: { name: "Neutral", points: 0, color: "#d0d0d0" }
            },
            pois: [],
            regions: [],
            history: [],
            settings: {
                mapWidth: 800,
                mapHeight: 600,
                hexSize: 50,
                adminMode: false,
                campaignName: "Neue Kampagne",
                campaignDescription: ""
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
     * Registriert einen Subscriber für State-Änderungen
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
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

    // === GETTER METHODEN ===

    /**
     * Gibt den kompletten State zurück
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Gibt alle Hexfelder zurück
     */
    getHexes() {
        return { ...this.state.hexes };
    }

    /**
     * Gibt ein bestimmtes Hexfeld zurück
     */
    getHex(hexId) {
        return this.state.hexes[hexId] || null;
    }

    /**
     * Gibt alle Fraktionen zurück
     */
    getFactions() {
        return { ...this.state.factions };
    }

    /**
     * Gibt eine bestimmte Fraktion zurück
     */
    getFaction(factionId) {
        return this.state.factions[factionId] || null;
    }

    /**
     * Gibt alle POIs zurück
     */
    getPOIs() {
        return [...this.state.pois];
    }

    /**
     * Gibt einen bestimmten POI zurück
     */
    getPOI(poiId) {
        return this.state.pois.find(poi => poi.id === poiId) || null;
    }

    /**
     * Gibt alle Regionen zurück
     */
    getRegions() {
        return [...this.state.regions];
    }

    /**
     * Gibt die Geschichte zurück
     */
    getHistory() {
        return [...this.state.history];
    }

    /**
     * Gibt die Einstellungen zurück
     */
    getSettings() {
        return { ...this.state.settings };
    }

    // === SETTER METHODEN ===

    /**
     * Aktualisiert ein Hexfeld
     */
    updateHex(hexId, updates) {
        if (!this.state.hexes[hexId]) {
            this.state.hexes[hexId] = {};
        }
        
        this.state.hexes[hexId] = {
            ...this.state.hexes[hexId],
            ...updates
        };
        
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Aktualisiert Fraktionspunkte
     */
    updateFactionPoints(factionId, points) {
        if (this.state.factions[factionId]) {
            this.state.factions[factionId].points = Math.max(0, points);
            this.saveToStorage();
            this.notifySubscribers();
        }
    }

    /**
     * Fügt Punkte zu einer Fraktion hinzu
     */
    addFactionPoints(factionId, points) {
        if (this.state.factions[factionId]) {
            this.state.factions[factionId].points += points;
            this.saveToStorage();
            this.notifySubscribers();
        }
    }

    /**
     * Fügt einen Eintrag zur Geschichte hinzu
     */
    addHistoryEntry(entry) {
        const id = this.state.history.length > 0 
            ? Math.max(...this.state.history.map(h => h.id)) + 1 
            : 1;
            
        const historyEntry = {
            id,
            date: new Date().toISOString().split('T')[0],
            ...entry
        };
        
        this.state.history.unshift(historyEntry); // Neuste Einträge zuerst
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Aktualisiert einen POI
     */
    updatePOI(poiId, updates) {
        const poiIndex = this.state.pois.findIndex(poi => poi.id === poiId);
        if (poiIndex !== -1) {
            this.state.pois[poiIndex] = {
                ...this.state.pois[poiIndex],
                ...updates
            };
            this.saveToStorage();
            this.notifySubscribers();
        }
    }

    /**
     * Fügt einen neuen POI hinzu
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
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Exportiert den aktuellen State als JSON
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
     * Löscht alle gespeicherten Daten
     */
    clearStorage() {
        localStorage.removeItem(this.storageKey);
        this.resetToDefault();
        this.notifySubscribers();
    }
}

// Globale State-Instanz
const campaignState = new CampaignState();
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'
diff --git a/state.js b/state.js
--- a/state.js
+++ b/state.js
@@ -0,0 +1,331 @@
+/**
+ * State Management für das Tabletop-Kampagnentool
+ * Verwaltet den aktuellen Spielstand und localStorage-Integration
+ */
+
+class CampaignState {
+    constructor() {
+        this.state = {
+            hexes: {},
+            factions: {},
+            pois: [],
+            regions: [],
+            history: [],
+            settings: {}
+        };
+        this.subscribers = [];
+        this.storageKey = 'tabletop-campaign-state';
+    }
+
+    /**
+     * Initialisiert den State - lädt aus localStorage oder von data.json
+     */
+    async initialize() {
+        const savedState = this.loadFromStorage();
+        
+        if (savedState) {
+            this.state = savedState;
+            console.log('State aus localStorage geladen');
+        } else {
+            await this.loadInitialData();
+            console.log('Initialdaten aus data.json geladen');
+        }
+        
+        this.notifySubscribers();
+    }
+
+    /**
+     * Lädt Initialdaten aus data.json
+     */
+    async loadInitialData() {
+        try {
+            const response = await fetch('./data.json');
+            const data = await response.json();
+            this.state = data;
+            this.saveToStorage();
+        } catch (error) {
+            console.error('Fehler beim Laden der Initialdaten:', error);
+            // Fallback zu Default-State
+            this.resetToDefault();
+        }
+    }
+
+    /**
+     * Setzt den State auf Standardwerte zurück
+     */
+    resetToDefault() {
+        this.state = {
+            hexes: {},
+            factions: {
+                chaos: { name: "Chaos", points: 0, color: "#a83232" },
+                ordnung: { name: "Ordnung", points: 0, color: "#32a852" },
+                tod: { name: "Tod", points: 0, color: "#7e7e7e" },
+                zerstoerung: { name: "Zerstörung", points: 0, color: "#a8772d" },
+                neutral: { name: "Neutral", points: 0, color: "#d0d0d0" }
+            },
+            pois: [],
+            regions: [],
+            history: [],
+            settings: {
+                mapWidth: 800,
+                mapHeight: 600,
+                hexSize: 50,
+                adminMode: false,
+                campaignName: "Neue Kampagne",
+                campaignDescription: ""
+            }
+        };
+        this.saveToStorage();
+    }
+
+    /**
+     * Lädt State aus localStorage
+     */
+    loadFromStorage() {
+        try {
+            const saved = localStorage.getItem(this.storageKey);
+            return saved ? JSON.parse(saved) : null;
+        } catch (error) {
+            console.error('Fehler beim Laden aus localStorage:', error);
+            return null;
+        }
+    }
+
+    /**
+     * Speichert State in localStorage
+     */
+    saveToStorage() {
+        try {
+            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
+        } catch (error) {
+            console.error('Fehler beim Speichern in localStorage:', error);
+        }
+    }
+
+    /**
+     * Registriert einen Subscriber für State-Änderungen
+     */
+    subscribe(callback) {
+        this.subscribers.push(callback);
+        return () => {
+            this.subscribers = this.subscribers.filter(sub => sub !== callback);
+        };
+    }
+
+    /**
+     * Benachrichtigt alle Subscriber über State-Änderungen
+     */
+    notifySubscribers() {
+        this.subscribers.forEach(callback => {
+            try {
+                callback(this.state);
+            } catch (error) {
+                console.error('Fehler beim Benachrichtigen eines Subscribers:', error);
+            }
+        });
+    }
+
+    // === GETTER METHODEN ===
+
+    /**
+     * Gibt den kompletten State zurück
+     */
+    getState() {
+        return { ...this.state };
+    }
+
+    /**
+     * Gibt alle Hexfelder zurück
+     */
+    getHexes() {
+        return { ...this.state.hexes };
+    }
+
+    /**
+     * Gibt ein bestimmtes Hexfeld zurück
+     */
+    getHex(hexId) {
+        return this.state.hexes[hexId] || null;
+    }
+
+    /**
+     * Gibt alle Fraktionen zurück
+     */
+    getFactions() {
+        return { ...this.state.factions };
+    }
+
+    /**
+     * Gibt eine bestimmte Fraktion zurück
+     */
+    getFaction(factionId) {
+        return this.state.factions[factionId] || null;
+    }
+
+    /**
+     * Gibt alle POIs zurück
+     */
+    getPOIs() {
+        return [...this.state.pois];
+    }
+
+    /**
+     * Gibt einen bestimmten POI zurück
+     */
+    getPOI(poiId) {
+        return this.state.pois.find(poi => poi.id === poiId) || null;
+    }
+
+    /**
+     * Gibt alle Regionen zurück
+     */
+    getRegions() {
+        return [...this.state.regions];
+    }
+
+    /**
+     * Gibt die Geschichte zurück
+     */
+    getHistory() {
+        return [...this.state.history];
+    }
+
+    /**
+     * Gibt die Einstellungen zurück
+     */
+    getSettings() {
+        return { ...this.state.settings };
+    }
+
+    // === SETTER METHODEN ===
+
+    /**
+     * Aktualisiert ein Hexfeld
+     */
+    updateHex(hexId, updates) {
+        if (!this.state.hexes[hexId]) {
+            this.state.hexes[hexId] = {};
+        }
+        
+        this.state.hexes[hexId] = {
+            ...this.state.hexes[hexId],
+            ...updates
+        };
+        
+        this.saveToStorage();
+        this.notifySubscribers();
+    }
+
+    /**
+     * Aktualisiert Fraktionspunkte
+     */
+    updateFactionPoints(factionId, points) {
+        if (this.state.factions[factionId]) {
+            this.state.factions[factionId].points = Math.max(0, points);
+            this.saveToStorage();
+            this.notifySubscribers();
+        }
+    }
+
+    /**
+     * Fügt Punkte zu einer Fraktion hinzu
+     */
+    addFactionPoints(factionId, points) {
+        if (this.state.factions[factionId]) {
+            this.state.factions[factionId].points += points;
+            this.saveToStorage();
+            this.notifySubscribers();
+        }
+    }
+
+    /**
+     * Fügt einen Eintrag zur Geschichte hinzu
+     */
+    addHistoryEntry(entry) {
+        const id = this.state.history.length > 0 
+            ? Math.max(...this.state.history.map(h => h.id)) + 1 
+            : 1;
+            
+        const historyEntry = {
+            id,
+            date: new Date().toISOString().split('T')[0],
+            ...entry
+        };
+        
+        this.state.history.unshift(historyEntry); // Neuste Einträge zuerst
+        this.saveToStorage();
+        this.notifySubscribers();
+    }
+
+    /**
+     * Aktualisiert einen POI
+     */
+    updatePOI(poiId, updates) {
+        const poiIndex = this.state.pois.findIndex(poi => poi.id === poiId);
+        if (poiIndex !== -1) {
+            this.state.pois[poiIndex] = {
+                ...this.state.pois[poiIndex],
+                ...updates
+            };
+            this.saveToStorage();
+            this.notifySubscribers();
+        }
+    }
+
+    /**
+     * Fügt einen neuen POI hinzu
+     */
+    addPOI(poi) {
+        this.state.pois.push(poi);
+        this.saveToStorage();
+        this.notifySubscribers();
+    }
+
+    /**
+     * Aktualisiert Einstellungen
+     */
+    updateSettings(updates) {
+        this.state.settings = {
+            ...this.state.settings,
+            ...updates
+        };
+        this.saveToStorage();
+        this.notifySubscribers();
+    }
+
+    /**
+     * Exportiert den aktuellen State als JSON
+     */
+    exportState() {
+        return JSON.stringify(this.state, null, 2);
+    }
+
+    /**
+     * Importiert State aus JSON
+     */
+    importState(jsonString) {
+        try {
+            const newState = JSON.parse(jsonString);
+            this.state = newState;
+            this.saveToStorage();
+            this.notifySubscribers();
+            return true;
+        } catch (error) {
+            console.error('Fehler beim Importieren des States:', error);
+            return false;
+        }
+    }
+
+    /**
+     * Löscht alle gespeicherten Daten
+     */
+    clearStorage() {
+        localStorage.removeItem(this.storageKey);
+        this.resetToDefault();
+        this.notifySubscribers();
+    }
+}
+
+// Globale State-Instanz
+const campaignState = new CampaignState();
+
EOF
)


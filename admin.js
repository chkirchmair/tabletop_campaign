/**
 * Admin-Modul für das Tabletop-Kampagnentool
 * Erweiterte Verwaltungsfunktionen für Organisatoren
 */

class AdminPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.currentTab = 'hexes';
        this.adminPassword = 'kampagnen-admin-2025'; // In Produktion sollte dies sicherer sein
    }

    /**
     * Initialisiert das Admin-Panel
     */
    initialize() {
        this.panel = document.getElementById('adminPanel');
        
        if (!this.panel) {
            console.error('Admin-Panel nicht gefunden');
            return;
        }

        this.setupEventListeners();
        this.checkAdminMode();
        
        console.log('Admin-Panel initialisiert');
    }

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        // Admin-Toggle Button
        const toggleButton = document.getElementById('adminToggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.toggleAdminMode();
            });
        }

        // Panel schließen
        const closeButton = document.getElementById('closeAdmin');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hidePanel();
            });
        }

        // Tab-Navigation
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Settings-Formular
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }

        // Datenmanagement-Buttons
        this.setupDataManagementButtons();

        // ESC-Taste zum Schließen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hidePanel();
            }
        });
    }

    /**
     * Richtet Datenmanagement-Buttons ein
     */
    setupDataManagementButtons() {
        const exportBtn = document.getElementById('exportData');
        const importBtn = document.getElementById('importData');
        const resetBtn = document.getElementById('resetData');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importData();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetData();
            });
        }
    }

    /**
     * Prüft Admin-Modus Status
     */
    checkAdminMode() {
        const settings = campaignState.getSettings();
        const toggleButton = document.getElementById('adminToggle');
        
        if (settings.adminMode && toggleButton) {
            toggleButton.classList.add('active');
        }
    }

    /**
     * Schaltet Admin-Modus um
     */
    async toggleAdminMode() {
        const settings = campaignState.getSettings();
        const toggleButton = document.getElementById('adminToggle');
        
        if (!settings.adminMode) {
            // Admin-Modus aktivieren - Passwort abfragen
            const password = prompt('Admin-Passwort eingeben:');
            
            if (password !== this.adminPassword) {
                if (window.showToast) {
                    window.showToast('Falsches Passwort!', 'error');
                }
                return;
            }
            
            // Admin-Modus aktivieren
            campaignState.updateSettings({ adminMode: true });
            toggleButton?.classList.add('active');
            this.showPanel();
            
            if (window.showToast) {
                window.showToast('Admin-Modus aktiviert', 'success');
            }
            
        } else {
            // Admin-Modus deaktivieren
            campaignState.updateSettings({ adminMode: false });
            toggleButton?.classList.remove('active');
            this.hidePanel();
            
            if (window.showToast) {
                window.showToast('Admin-Modus deaktiviert', 'info');
            }
        }
    }

    /**
     * Zeigt das Admin-Panel an
     */
    showPanel() {
        if (!this.panel) return;
        
        this.panel.style.display = 'flex';
        this.isVisible = true;
        
        // Aktuelle Daten laden
        this.loadCurrentData();
        
        // Body-Scroll deaktivieren
        document.body.style.overflow = 'hidden';
    }

    /**
     * Versteckt das Admin-Panel
     */
    hidePanel() {
        if (!this.panel) return;
        
        this.panel.style.display = 'none';
        this.isVisible = false;
        
        // Body-Scroll wieder aktivieren
        document.body.style.overflow = '';
    }

    /**
     * Wechselt zwischen Tabs
     */
    switchTab(tabName) {
        // Tab-Buttons aktualisieren
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Tab-Inhalte aktualisieren
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        this.currentTab = tabName;
        
        // Tab-spezifische Initialisierung
        this.initializeTab(tabName);
    }

    /**
     * Initialisiert spezifische Tabs
     */
    initializeTab(tabName) {
        switch (tabName) {
            case 'hexes':
                this.initializeHexTab();
                break;
            case 'pois':
                this.initializePOITab();
                break;
            case 'settings':
                this.initializeSettingsTab();
                break;
            case 'data':
                this.initializeDataTab();
                break;
        }
    }

    /**
     * Lädt aktuelle Daten in das Panel
     */
    loadCurrentData() {
        this.initializeTab(this.currentTab);
    }

    /**
     * Initialisiert Hexfeld-Tab
     */
    initializeHexTab() {
        const hexEditor = document.getElementById('hexEditor');
        if (!hexEditor) return;

        hexEditor.innerHTML = `
            <div class="hex-admin-tools">
                <h4>Hexfeld-Verwaltung</h4>
                <p>Klicke auf ein Hexfeld auf der Karte, um es zu bearbeiten, oder erstelle ein neues:</p>
                
                <div class="new-hex-form">
                    <h5>Neues Hexfeld erstellen</h5>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newHexId">Hexfeld-ID:</label>
                            <input type="text" id="newHexId" placeholder="z.B. 07.10" pattern="\\d{2}\\.\\d{2}">
                        </div>
                        <div class="form-group">
                            <label for="newHexOwner">Besitzer:</label>
                            <select id="newHexOwner">
                                ${this.getFactionOptions()}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newHexTerrain">Terrain:</label>
                            <select id="newHexTerrain">
                                <option value="wald">Wald</option>
                                <option value="berg">Berg</option>
                                <option value="ebene">Ebene</option>
                                <option value="sumpf">Sumpf</option>
                                <option value="wüste">Wüste</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="newHexRegion">Region:</label>
                            <select id="newHexRegion">
                                <option value="">-- Keine Region --</option>
                                ${this.getRegionOptions()}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="newHexPOI">
                            <span class="checkmark"></span>
                            Point of Interest
                        </label>
                    </div>
                    <button type="button" id="createHexBtn" class="btn-secondary">Hexfeld erstellen</button>
                </div>
                
                <div class="hex-overview">
                    <h5>Aktuelle Hexfelder (${Object.keys(campaignState.getHexes()).length})</h5>
                    <div class="hex-list">
                        ${this.generateHexList()}
                    </div>
                </div>
            </div>
        `;

        // Event-Listener für neues Hexfeld
        const createBtn = document.getElementById('createHexBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createNewHex();
            });
        }
    }

    /**
     * Initialisiert POI-Tab
     */
    initializePOITab() {
        const poiAdmin = document.getElementById('poiAdmin');
        if (!poiAdmin) return;

        const pois = campaignState.getPOIs();

        poiAdmin.innerHTML = `
            <div class="poi-admin-tools">
                <h4>POI-Verwaltung</h4>
                
                <div class="poi-overview">
                    <h5>Aktuelle POIs (${pois.length})</h5>
                    <div class="poi-list-admin">
                        ${pois.map(poi => this.generatePOIAdminItem(poi)).join('')}
                    </div>
                </div>
                
                <div class="new-poi-form">
                    <h5>Neuen POI erstellen</h5>
                    <div class="form-group">
                        <label for="newPOIHex">Hexfeld:</label>
                        <select id="newPOIHex">
                            <option value="">-- Hexfeld wählen --</option>
                            ${this.getAvailableHexOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="newPOIName">Name:</label>
                        <input type="text" id="newPOIName" placeholder="z.B. Turm der Macht">
                    </div>
                    <div class="form-group">
                        <label for="newPOIDescription">Beschreibung:</label>
                        <textarea id="newPOIDescription" rows="3" placeholder="Beschreibung des POI..."></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="newPOIBonus">Bonuspunkte:</label>
                            <input type="number" id="newPOIBonus" value="5" min="1" max="20">
                        </div>
                        <div class="form-group">
                            <label for="newPOIStatus">Status:</label>
                            <select id="newPOIStatus">
                                <option value="neutral">Neutral</option>
                                <option value="umkämpft">Umkämpft</option>
                                <option value="verschlossen">Verschlossen</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="newPOIActive" checked>
                            <span class="checkmark"></span>
                            Aktiv
                        </label>
                    </div>
                    <button type="button" id="createPOIBtn" class="btn-secondary">POI erstellen</button>
                </div>
            </div>
        `;

        // Event-Listener
        const createPOIBtn = document.getElementById('createPOIBtn');
        if (createPOIBtn) {
            createPOIBtn.addEventListener('click', () => {
                this.createNewPOI();
            });
        }

        // POI-Bearbeitung Event-Listener
        this.setupPOIEditListeners();
    }

    /**
     * Initialisiert Einstellungs-Tab
     */
    initializeSettingsTab() {
        const settings = campaignState.getSettings();
        
        const nameField = document.getElementById('adminCampaignName');
        const descField = document.getElementById('adminCampaignDescription');
        
        if (nameField) nameField.value = settings.campaignName || '';
        if (descField) descField.value = settings.campaignDescription || '';
    }

    /**
     * Initialisiert Daten-Tab
     */
    initializeDataTab() {
        const dataTextarea = document.getElementById('dataTextarea');
        if (dataTextarea) {
            dataTextarea.value = campaignState.exportState();
        }
    }

    /**
     * Generiert Fraktionsoptionen
     */
    getFactionOptions() {
        const factions = campaignState.getFactions();
        return Object.entries(factions).map(([id, faction]) => 
            `<option value="${id}">${faction.name}</option>`
        ).join('');
    }

    /**
     * Generiert Regionsoptionen
     */
    getRegionOptions() {
        const regions = campaignState.getRegions();
        return regions.map(region => 
            `<option value="${region.name}">${region.name}</option>`
        ).join('');
    }

    /**
     * Generiert Hexfeld-Liste
     */
    generateHexList() {
        const hexes = campaignState.getHexes();
        return Object.entries(hexes).map(([id, hex]) => 
            `<div class="hex-list-item" data-hex-id="${id}">
                <span class="hex-id">${id}</span>
                <span class="hex-owner" style="color: ${campaignState.getFaction(hex.owner)?.color || '#999'}">${campaignState.getFaction(hex.owner)?.name || hex.owner}</span>
                <span class="hex-terrain">${hex.terrain}</span>
                ${hex.isPOI ? '<span class="hex-poi">⭐ POI</span>' : ''}
                <button class="btn-small btn-danger" onclick="adminPanel.deleteHex('${id}')">❌</button>
            </div>`
        ).join('');
    }

    /**
     * Generiert verfügbare Hexfeld-Optionen für POI
     */
    getAvailableHexOptions() {
        const hexes = campaignState.getHexes();
        const pois = campaignState.getPOIs();
        const poiHexIds = new Set(pois.map(poi => poi.id));
        
        return Object.entries(hexes)
            .filter(([id]) => !poiHexIds.has(id))
            .map(([id, hex]) => 
                `<option value="${id}">${id} (${hex.region || 'Keine Region'})</option>`
            ).join('');
    }

    /**
     * Generiert POI-Admin-Element
     */
    generatePOIAdminItem(poi) {
        return `
            <div class="poi-admin-item" data-poi-id="${poi.id}">
                <div class="poi-admin-header">
                    <h6>${poi.name}</h6>
                    <div class="poi-admin-actions">
                        <button class="btn-small btn-secondary" onclick="adminPanel.editPOI('${poi.id}')">✏️</button>
                        <button class="btn-small btn-danger" onclick="adminPanel.deletePOI('${poi.id}')">❌</button>
                    </div>
                </div>
                <div class="poi-admin-details">
                    <span>Hex: ${poi.id}</span>
                    <span>Bonus: +${poi.bonus}</span>
                    <span>Status: ${poi.status}</span>
                    <span class="${poi.active ? 'text-success' : 'text-muted'}">${poi.active ? 'Aktiv' : 'Inaktiv'}</span>
                </div>
            </div>
        `;
    }

    /**
     * Erstellt neues Hexfeld
     */
    createNewHex() {
        const hexId = document.getElementById('newHexId')?.value.trim();
        const owner = document.getElementById('newHexOwner')?.value;
        const terrain = document.getElementById('newHexTerrain')?.value;
        const region = document.getElementById('newHexRegion')?.value;
        const isPOI = document.getElementById('newHexPOI')?.checked;

        if (!hexId || !owner || !terrain) {
            if (window.showToast) {
                window.showToast('Bitte alle Pflichtfelder ausfüllen', 'error');
            }
            return;
        }

        // Hexfeld-Format validieren
        if (!/^\d{2}\.\d{2}$/.test(hexId)) {
            if (window.showToast) {
                window.showToast('Hexfeld-Format ungültig (XX.XX erwartet)', 'error');
            }
            return;
        }

        // Prüfen ob Hexfeld bereits existiert
        if (campaignState.getHex(hexId)) {
            if (window.showToast) {
                window.showToast('Hexfeld existiert bereits', 'error');
            }
            return;
        }

        // Hexfeld erstellen
        const hexData = {
            owner,
            terrain,
            region: region || null,
            isPOI: isPOI || false
        };

        campaignState.updateHex(hexId, hexData);
        
        if (window.showToast) {
            window.showToast(`Hexfeld ${hexId} erstellt`, 'success');
        }

        // Tab neu laden
        this.initializeHexTab();
    }

    /**
     * Löscht ein Hexfeld
     */
    deleteHex(hexId) {
        if (!confirm(`Hexfeld ${hexId} wirklich löschen?`)) return;

        const state = campaignState.getState();
        if (state.hexes && state.hexes[hexId]) {
            delete state.hexes[hexId];
            campaignState.saveToStorage();
            campaignState.notifySubscribers();
            
            if (window.showToast) {
                window.showToast(`Hexfeld ${hexId} gelöscht`, 'info');
            }
            
            this.initializeHexTab();
        }
    }

    /**
     * Erstellt neuen POI
     */
    createNewPOI() {
        const hexId = document.getElementById('newPOIHex')?.value;
        const name = document.getElementById('newPOIName')?.value.trim();
        const description = document.getElementById('newPOIDescription')?.value.trim();
        const bonus = parseInt(document.getElementById('newPOIBonus')?.value) || 5;
        const status = document.getElementById('newPOIStatus')?.value;
        const active = document.getElementById('newPOIActive')?.checked;

        if (!hexId || !name) {
            if (window.showToast) {
                window.showToast('Hexfeld und Name sind erforderlich', 'error');
            }
            return;
        }

        // Prüfen ob POI bereits existiert
        if (campaignState.getPOI(hexId)) {
            if (window.showToast) {
                window.showToast('POI für dieses Hexfeld existiert bereits', 'error');
            }
            return;
        }

        // Hexfeld als POI markieren
        campaignState.updateHex(hexId, { isPOI: true });

        // POI erstellen
        const poi = {
            id: hexId,
            name,
            description,
            bonus,
            status,
            active: active || false,
            region: campaignState.getHex(hexId)?.region || null
        };

        campaignState.addPOI(poi);
        
        if (window.showToast) {
            window.showToast(`POI "${name}" erstellt`, 'success');
        }

        // Tab neu laden
        this.initializePOITab();
    }

    /**
     * Bearbeitet POI
     */
    editPOI(poiId) {
        // Implementierung für POI-Bearbeitung
        // Für Einfachheit hier nur als Placeholder
        const poi = campaignState.getPOI(poiId);
        if (!poi) return;

        const newName = prompt('Neuer Name:', poi.name);
        if (newName && newName.trim() !== poi.name) {
            campaignState.updatePOI(poiId, { name: newName.trim() });
            
            if (window.showToast) {
                window.showToast(`POI "${newName}" aktualisiert`, 'success');
            }
            
            this.initializePOITab();
        }
    }

    /**
     * Löscht POI
     */
    deletePOI(poiId) {
        if (!confirm('POI wirklich löschen?')) return;

        const state = campaignState.getState();
        
        // POI aus Liste entfernen
        const poiIndex = state.pois.findIndex(poi => poi.id === poiId);
        if (poiIndex !== -1) {
            state.pois.splice(poiIndex, 1);
        }

        // Hexfeld als nicht-POI markieren
        campaignState.updateHex(poiId, { isPOI: false });

        campaignState.saveToStorage();
        campaignState.notifySubscribers();
        
        if (window.showToast) {
            window.showToast('POI gelöscht', 'info');
        }
        
        this.initializePOITab();
    }

    /**
     * Richtet POI-Bearbeitungs-Listener ein
     */
    setupPOIEditListeners() {
        // Event-Delegation für dynamisch erstellte Elemente
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="editPOI"]')) {
                const poiId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.editPOI(poiId);
            }
            
            if (e.target.matches('[onclick*="deletePOI"]')) {
                const poiId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.deletePOI(poiId);
            }
        });
    }

    /**
     * Speichert Einstellungen
     */
    saveSettings() {
        const name = document.getElementById('adminCampaignName')?.value.trim();
        const description = document.getElementById('adminCampaignDescription')?.value.trim();

        if (name) {
            campaignState.updateSettings({
                campaignName: name,
                campaignDescription: description
            });

            // Header aktualisieren
            const titleElement = document.getElementById('campaignTitle');
            const descElement = document.getElementById('campaignDescription');
            
            if (titleElement) titleElement.textContent = name;
            if (descElement) descElement.textContent = description;
            
            if (window.showToast) {
                window.showToast('Einstellungen gespeichert', 'success');
            }
        }
    }

    /**
     * Exportiert Daten
     */
    exportData() {
        const data = campaignState.exportState();
        const dataTextarea = document.getElementById('dataTextarea');
        
        if (dataTextarea) {
            dataTextarea.value = data;
        }

        // Download-Link erstellen
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kampagne-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (window.showToast) {
            window.showToast('Daten exportiert', 'success');
        }
    }

    /**
     * Importiert Daten
     */
    importData() {
        const dataTextarea = document.getElementById('dataTextarea');
        if (!dataTextarea) return;

        const jsonData = dataTextarea.value.trim();
        if (!jsonData) {
            if (window.showToast) {
                window.showToast('Keine Daten zum Importieren', 'error');
            }
            return;
        }

        if (!confirm('Warnung: Der Import überschreibt alle aktuellen Daten. Fortfahren?')) {
            return;
        }

        try {
            const success = campaignState.importState(jsonData);
            if (success) {
                if (window.showToast) {
                    window.showToast('Daten erfolgreich importiert', 'success');
                }
                
                // Panel neu laden
                this.loadCurrentData();
            } else {
                throw new Error('Import fehlgeschlagen');
            }
        } catch (error) {
            if (window.showToast) {
                window.showToast('Fehler beim Importieren: ' + error.message, 'error');
            }
        }
    }

    /**
     * Setzt alle Daten zurück
     */
    resetData() {
        if (!confirm('Warnung: Dies löscht ALLE Kampagnendaten unwiderruflich. Fortfahren?')) {
            return;
        }

        const doubleCheck = prompt('Gib "RESET" ein, um zu bestätigen:');
        if (doubleCheck !== 'RESET') {
            return;
        }

        campaignState.clearStorage();
        
        if (window.showToast) {
            window.showToast('Alle Daten wurden zurückgesetzt', 'warning');
        }
        
        // Panel neu laden
        this.loadCurrentData();
    }
}

// Globale Admin-Instanz und Initialisierungsfunktion
let adminPanel;

function initializeAdmin() {
    adminPanel = new AdminPanel();
    adminPanel.initialize();


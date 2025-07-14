
/**
 * Map-Modul für das Tabletop-Kampagnentool
 * Verwaltet die interaktive SVG-Hexagon-Karte
 */

class CampaignMap {
    constructor() {
        this.svg = null;
        this.mapGroup = null;
        this.selectedHex = null;
        this.selectedRegion = null;
        this.regionMode = false; // Toggle zwischen Hex- und Region-Auswahl
        this.zoomLevel = 1;
        this.zoomMin = 0.5;
        this.zoomMax = 3;
        this.zoomStep = 0.2;
        this.hexSize = 25; // Angepasst für 21x11 Grid
        this.hexes = new Map();
        this.regions = new Map();
        this.tooltip = null;
        
        // Hexagon-Koordinaten für ein regelmäßiges Sechseck
        this.hexCoords = this.generateHexCoords();
        
        // Terrain-zu-Farbe Mapping
        this.terrainColors = {
            'wald': '#2d5016',
            'berg': '#6b5b73',
            'ebene': '#7a8450',
            'sumpf': '#4a5c2a',
            'wüste': '#c4a484',
            'wueste': '#c4a484' // Fallback ohne Umlaut
        };
    }

    /**
     * Initialisiert die Karte
     */
    initialize() {
        this.svg = document.getElementById('campaignMap');
        this.tooltip = document.getElementById('hexTooltip');
        
        if (!this.svg) {
            console.error('Karten-SVG Element nicht gefunden');
            return;
        }

        this.setupSVG();
        this.setupEventListeners();
        this.setupZoomControls();
        
        // Initial State laden
        campaignState.subscribe(state => this.updateMap(state));
        
        console.log('Karte initialisiert');
    }

    /**
     * Richtet das SVG-Element ein
     */
    setupSVG() {
        // SVG leeren
        this.svg.innerHTML = '';
        
        // Hauptgruppe für Zoom/Pan erstellen
        this.mapGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.mapGroup.setAttribute('class', 'map-group');
        this.svg.appendChild(this.mapGroup);
        
        // Hintergrund-Rect für Klick-Events
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', '100%');
        background.setAttribute('height', '100%');
        background.setAttribute('fill', 'transparent');
        background.addEventListener('click', () => this.clearSelection());
        this.mapGroup.appendChild(background);
    }

    /**
     * Generiert Hexagon-Koordinaten
     */
    generateHexCoords() {
        const coords = [];
        const size = this.hexSize;
        
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            coords.push([x, y]);
        }
        
        return coords;
    }

    /**
     * Berechnet Hexagon-Position basierend auf Grid-Koordinaten
     */
    hexToPixel(col, row) {
        const size = this.hexSize;
        const width = size * 2;
        const height = size * Math.sqrt(3);
        
        const x = col * width * 0.75;
        const y = row * height + (col % 2) * height / 2;
        
        return {
            x: x + 100, // Offset für Rand
            y: y + 100
        };
    }

    /**
     * Parst Hex-ID in Spalte und Reihe
     */
    parseHexId(hexId) {
        const parts = hexId.split('.');
        if (parts.length !== 2) return null;
        
        return {
            col: parseInt(parts[0], 10),
            row: parseInt(parts[1], 10)
        };
    }

    /**
     * Erstellt ein Hexagon-Element
     */
    createHexagon(hexId, hexData) {
        const coords = this.parseHexId(hexId);
        if (!coords) return null;
        
        const position = this.hexToPixel(coords.col, coords.row);
        
        // Hexagon-Gruppe erstellen
        const hexGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        hexGroup.setAttribute('class', 'hex-group');
        hexGroup.setAttribute('data-hex-id', hexId);
        hexGroup.setAttribute('transform', `translate(${position.x}, ${position.y})`);
        
        // Hexagon-Pfad erstellen
        const hexPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = this.hexCoords.map(coord => `${coord[0]},${coord[1]}`).join(' ');
        hexPath.setAttribute('points', points);
        hexPath.setAttribute('class', `hex ${hexData.isPOI ? 'poi' : ''}`);
        
        // Farbe basierend auf Besitzer und Terrain
        const factionColor = this.getFactionColor(hexData.owner);
        const terrainColor = this.terrainColors[hexData.terrain] || '#555';
        const fillColor = factionColor || terrainColor;
        
        hexPath.setAttribute('fill', fillColor);
        hexPath.setAttribute('data-faction', hexData.owner);
        hexPath.setAttribute('data-terrain', hexData.terrain);
        
        hexGroup.appendChild(hexPath);
        
        // Hex-Label (Koordinaten)
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'hex-label');
        label.setAttribute('x', 0);
        label.setAttribute('y', 5);
        label.textContent = hexId;
        hexGroup.appendChild(label);
        
        // POI-Icon wenn nötig
        if (hexData.isPOI) {
            const poiIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            poiIcon.setAttribute('class', 'poi-icon');
            poiIcon.setAttribute('x', 0);
            poiIcon.setAttribute('y', -10);
            poiIcon.textContent = '⭐';
            hexGroup.appendChild(poiIcon);
        }
        
        // Event-Listener
        hexGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.regionMode) {
                this.selectRegion(hexData.region);
            } else {
                this.selectHex(hexId, hexData);
            }
        });
        
        hexGroup.addEventListener('mouseenter', (e) => {
            this.showTooltip(e, hexId, hexData);
        });
        
        hexGroup.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
        
        hexGroup.addEventListener('mousemove', (e) => {
            this.updateTooltipPosition(e);
        });
        
        return hexGroup;
    }

    /**
     * Holt Fraktionsfarbe
     */
    getFactionColor(factionId) {
        const factions = campaignState.getFactions();
        return factions[factionId]?.color || null;
    }

    /**
     * Aktualisiert die komplette Karte
     */
    updateMap(state) {
        if (!this.mapGroup) return;
        
        // Alle vorhandenen Hexagone entfernen (außer Hintergrund)
        const hexGroups = this.mapGroup.querySelectorAll('.hex-group');
        hexGroups.forEach(group => group.remove());
        
        this.hexes.clear();
        
        // Neue Hexagone erstellen
        Object.entries(state.hexes || {}).forEach(([hexId, hexData]) => {
            const hexElement = this.createHexagon(hexId, hexData);
            if (hexElement) {
                this.mapGroup.appendChild(hexElement);
                this.hexes.set(hexId, hexElement);
            }
        });
        
        // Selektion aktualisieren falls nötig
        if (this.selectedHex && this.hexes.has(this.selectedHex)) {
            this.updateHexSelection();
        }
    }

    /**
     * Selektiert ein Hexagon
     */
    selectHex(hexId, hexData) {
        // Vorherige Selektion entfernen
        this.clearSelection();
        
        this.selectedHex = hexId;
        
        // Visuelle Selektion
        this.updateHexSelection();
        
        // Zielfeld im Formular setzen
        const targetHexField = document.getElementById('targetHex');
        if (targetHexField) {
            targetHexField.value = hexId;
        }
        
        // Admin-Panel aktualisieren wenn offen
        if (document.getElementById('adminPanel').style.display !== 'none') {
            this.updateAdminHexEditor(hexId, hexData);
        }
        
        console.log(`Hexagon ${hexId} ausgewählt`);
    }

    /**
     * Entfernt die Selektion
     */
    clearSelection() {
        if (this.selectedHex && this.hexes.has(this.selectedHex)) {
            const hexElement = this.hexes.get(this.selectedHex);
            const hexPath = hexElement.querySelector('.hex');
            if (hexPath) {
                hexPath.classList.remove('selected');
            }
        }
        
        this.selectedHex = null;
        
        // Zielfeld im Formular leeren
        const targetHexField = document.getElementById('targetHex');
        if (targetHexField) {
            targetHexField.value = '';
        }
    }

    /**
     * Aktualisiert die visuelle Selektion
     */
    updateHexSelection() {
        if (!this.selectedHex || !this.hexes.has(this.selectedHex)) return;
        
        const hexElement = this.hexes.get(this.selectedHex);
        const hexPath = hexElement.querySelector('.hex');
        if (hexPath) {
            hexPath.classList.add('selected');
        }
    }

    /**
     * Selektiert eine ganze Region
     */
    selectRegion(regionName) {
        // Vorherige Selektion entfernen
        this.clearRegionSelection();
        
        this.selectedRegion = regionName;
        
        // Alle Hexfelder der Region hervorheben
        this.updateRegionSelection();
        
        // Region-Auswahl UI aktualisieren
        this.updateRegionUI();
        
        console.log(`Region ${regionName} ausgewählt`);
    }

    /**
     * Entfernt die Region-Selektion
     */
    clearRegionSelection() {
        if (this.selectedRegion) {
            // Alle Hexfelder der vorherigen Region de-highlighten
            this.hexes.forEach((hexElement, hexId) => {
                const hexPath = hexElement.querySelector('.hex');
                if (hexPath) {
                    hexPath.classList.remove('region-selected');
                }
            });
        }
        
        this.selectedRegion = null;
        this.updateRegionUI();
    }

    /**
     * Aktualisiert die visuelle Region-Selektion
     */
    updateRegionSelection() {
        if (!this.selectedRegion) return;
        
        // Aktuelle State holen
        const state = campaignState.getState();
        
        // Alle Hexfelder der ausgewählten Region highlighten
        Object.entries(state.hexes || {}).forEach(([hexId, hexData]) => {
            if (hexData.region === this.selectedRegion && this.hexes.has(hexId)) {
                const hexElement = this.hexes.get(hexId);
                const hexPath = hexElement.querySelector('.hex');
                if (hexPath) {
                    hexPath.classList.add('region-selected');
                }
            }
        });
    }

    /**
     * Aktualisiert die Region-Auswahl UI
     */
    updateRegionUI() {
        // Region-Display aktualisieren
        const regionDisplay = document.getElementById('selectedRegionDisplay');
        if (regionDisplay) {
            if (this.selectedRegion) {
                regionDisplay.textContent = `Ausgewählte Region: ${this.selectedRegion}`;
                regionDisplay.style.display = 'block';
            } else {
                regionDisplay.style.display = 'none';
            }
        }

        // Zielregion im Formular setzen
        const targetRegionField = document.getElementById('targetRegion');
        if (targetRegionField) {
            targetRegionField.value = this.selectedRegion || '';
        }
    }

    /**
     * Schaltet zwischen Hex- und Region-Modus um
     */
    toggleRegionMode() {
        this.regionMode = !this.regionMode;
        
        // Aktuelle Selektion löschen
        this.clearSelection();
        this.clearRegionSelection();
        
        // Mode-Button aktualisieren
        const modeButton = document.getElementById('regionModeToggle');
        if (modeButton) {
            modeButton.textContent = this.regionMode ? '🗺️ Hex-Modus' : '🏰 Region-Modus';
            modeButton.title = this.regionMode ? 'Zu Hex-Auswahl wechseln' : 'Zu Region-Auswahl wechseln';
        }
        
        // Status anzeigen
        const statusDisplay = document.getElementById('selectionModeDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = this.regionMode ? 'Region-Auswahl aktiv' : 'Hex-Auswahl aktiv';
        }
        
        console.log(`Modus gewechselt: ${this.regionMode ? 'Region' : 'Hex'}`);
    }

    /**
     * Zeigt Tooltip an
     */
    showTooltip(event, hexId, hexData) {
        if (!this.tooltip) return;
        
        const pois = campaignState.getPOIs();
        const poi = pois.find(p => p.id === hexId);
        const factions = campaignState.getFactions();
        const ownerFaction = factions[hexData.owner];
        
        // Tooltip-Inhalt erstellen
        const title = poi ? poi.name : `Hexfeld ${hexId}`;
        const ownerText = ownerFaction ? ownerFaction.name : 'Neutral';
        const terrainText = this.getTerrainDisplayName(hexData.terrain);
        const regionText = hexData.region || 'Unbekannt';
        
        this.tooltip.querySelector('.tooltip-title').textContent = title;
        this.tooltip.querySelector('.tooltip-info').textContent = 
            `Region: ${regionText} | Terrain: ${terrainText}`;
        
        let details = `Besitzer: ${ownerText}`;
        if (poi && poi.description) {
            details += `\n${poi.description}`;
        }
        if (poi && poi.bonus) {
            details += `\nBonus: +${poi.bonus} Punkte`;
        }
        
        this.tooltip.querySelector('.tooltip-details').textContent = details;
        
        // Tooltip positionieren und anzeigen
        this.updateTooltipPosition(event);
        this.tooltip.style.display = 'block';
    }

    /**
     * Versteckt Tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }

    /**
     * Aktualisiert Tooltip-Position
     */
    updateTooltipPosition(event) {
        if (!this.tooltip || this.tooltip.style.display === 'none') return;
        
        const rect = this.svg.getBoundingClientRect();
        const x = event.clientX - rect.left + 10;
        const y = event.clientY - rect.top - 10;
        
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    /**
     * Terrain-Anzeigename holen
     */
    getTerrainDisplayName(terrain) {
        const terrainNames = {
            'wald': 'Wald',
            'berg': 'Berg',
            'ebene': 'Ebene',
            'sumpf': 'Sumpf',
            'wüste': 'Wüste',
            'wueste': 'Wüste'
        };
        return terrainNames[terrain] || terrain;
    }

    /**
     * Richtet Event-Listener ein
     */
    setupEventListeners() {
        // Clear-Button für Hexfeld-Selektion
        const clearHexButton = document.getElementById('clearHex');
        if (clearHexButton) {
            clearHexButton.addEventListener('click', () => {
                this.clearSelection();
            });
        }

        // Clear-Button für Region-Selektion
        const clearRegionButton = document.getElementById('clearRegion');
        if (clearRegionButton) {
            clearRegionButton.addEventListener('click', () => {
                this.clearRegionSelection();
            });
        }

        // Region-Modus Toggle Button
        const regionModeToggle = document.getElementById('regionModeToggle');
        if (regionModeToggle) {
            regionModeToggle.addEventListener('click', () => {
                this.toggleRegionMode();
            });
        }
    }

    /**
     * Richtet Zoom-Kontrollen ein
     */
    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const resetViewBtn = document.getElementById('resetView');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => this.resetView());
        }
        
        // Mausrad-Zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        });
    }

    /**
     * Zoomt hinein
     */
    zoomIn() {
        if (this.zoomLevel < this.zoomMax) {
            this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.zoomMax);
            this.applyZoom();
        }
    }

    /**
     * Zoomt heraus
     */
    zoomOut() {
        if (this.zoomLevel > this.zoomMin) {
            this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.zoomMin);
            this.applyZoom();
        }
    }

    /**
     * Setzt Zoom zurück
     */
    resetView() {
        this.zoomLevel = 1;
        this.applyZoom();
    }

    /**
     * Wendet aktuellen Zoom an
     */
    applyZoom() {
        if (this.mapGroup) {
            this.mapGroup.setAttribute('transform', `scale(${this.zoomLevel})`);
        }
    }

    /**
     * Animiert Hexagon-Eroberung
     */
    animateHexCapture(hexId) {
        if (!this.hexes.has(hexId)) return;
        
        const hexElement = this.hexes.get(hexId);
        const hexPath = hexElement.querySelector('.hex');
        
        if (hexPath) {
            hexPath.classList.add('hex-captured');
            setTimeout(() => {
                hexPath.classList.remove('hex-captured');
            }, 1000);
        }
    }

    /**
     * Aktualisiert Admin-Hexfeld-Editor
     */
    updateAdminHexEditor(hexId, hexData) {
        const hexEditor = document.getElementById('hexEditor');
        if (!hexEditor) return;
        
        const state = campaignState.getState();
        const factions = state.factions || {};
        const regions = state.regions || [];
        
        hexEditor.innerHTML = `
            <div class="hex-edit-form">
                <h4>Hexfeld ${hexId} bearbeiten</h4>
                
                <div class="form-group">
                    <label for="editHexOwner">Besitzer:</label>
                    <select id="editHexOwner">
                        <option value="neutral" ${hexData.owner === 'neutral' ? 'selected' : ''}>Neutral</option>
                        ${Object.entries(factions).map(([id, faction]) => 
                            `<option value="${id}" ${hexData.owner === id ? 'selected' : ''}>${faction.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="editHexTerrain">Terrain:</label>
                    <select id="editHexTerrain">
                        <option value="wald" ${hexData.terrain === 'wald' ? 'selected' : ''}>Wald</option>
                        <option value="berg" ${hexData.terrain === 'berg' ? 'selected' : ''}>Berg</option>
                        <option value="ebene" ${hexData.terrain === 'ebene' ? 'selected' : ''}>Ebene</option>
                        <option value="sumpf" ${hexData.terrain === 'sumpf' ? 'selected' : ''}>Sumpf</option>
                        <option value="wüste" ${hexData.terrain === 'wüste' ? 'selected' : ''}>Wüste</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="editHexRegion">Region:</label>
                    <select id="editHexRegion">
                        <option value="">-- Keine Region --</option>
                        ${regions.map(region => 
                            `<option value="${region.name}" ${hexData.region === region.name ? 'selected' : ''}>${region.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="editHexPOI" ${hexData.isPOI ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        Point of Interest
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="saveHexChanges" class="btn-secondary">Änderungen speichern</button>
                    <button type="button" id="deleteHex" class="btn-danger">Hexfeld löschen</button>
                </div>
            </div>
        `;
        
        // Event-Listener für Speichern-Button
        const saveBtn = document.getElementById('saveHexChanges');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveHexChanges(hexId);
            });
        }
        
        // Event-Listener für Löschen-Button
        const deleteBtn = document.getElementById('deleteHex');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteHex(hexId);
            });
        }
    }

    /**
     * Speichert Änderungen am Hexfeld
     */
    saveHexChanges(hexId) {
        const owner = document.getElementById('editHexOwner')?.value;
        const terrain = document.getElementById('editHexTerrain')?.value;
        const region = document.getElementById('editHexRegion')?.value;
        const isPOI = document.getElementById('editHexPOI')?.checked;
        
        if (owner && terrain) {
            campaignState.updateHex(hexId, {
                owner,
                terrain,
                region: region || null,
                isPOI: isPOI || false
            });
            
            // Toast-Nachricht
            if (window.showToast) {
                window.showToast(`Hexfeld ${hexId} erfolgreich aktualisiert`, 'success');
            }
        }
    }

    /**
     * Löscht ein Hexfeld
     */
    deleteHex(hexId) {
        if (confirm(`Hexfeld ${hexId} wirklich löschen?`)) {
            const state = campaignState.getState();
            if (state.hexes && state.hexes[hexId]) {
                delete state.hexes[hexId];
                campaignState.saveToStorage();
                campaignState.notifySubscribers();
                
                // Toast-Nachricht
                if (window.showToast) {
                    window.showToast(`Hexfeld ${hexId} wurde gelöscht`, 'info');
                }
                
                // Selektion löschen falls nötig
                if (this.selectedHex === hexId) {
                    this.clearSelection();
                }
            }
        }
    }

    /**
     * Fügt neues Hexfeld hinzu
     */
    addNewHex(hexId, hexData) {
        campaignState.updateHex(hexId, hexData);
        
        // Toast-Nachricht
        if (window.showToast) {
            window.showToast(`Neues Hexfeld ${hexId} hinzugefügt`, 'success');
        }
    }
}

// Globale Map-Instanz und Initialisierungsfunktion
let campaignMap;

function initializeMap() {
    campaignMap = new CampaignMap();
    campaignMap.initialize();
}


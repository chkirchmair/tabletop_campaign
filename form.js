(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'
diff --git a/form.js b/form.js
--- a/form.js
+++ b/form.js
@@ -0,0 +1,599 @@
+/**
+ * Form-Modul für das Tabletop-Kampagnentool
+ * Verwaltet das Spielmeldungsformular und dessen Validierung
+ */
+
+class GameForm {
+    constructor() {
+        this.form = null;
+        this.isSubmitting = false;
+        this.lastSubmissionTime = 0;
+        this.submissionCooldown = 2000; // 2 Sekunden Cooldown
+    }
+
+    /**
+     * Initialisiert das Formular
+     */
+    initialize() {
+        this.form = document.getElementById('gameForm');
+        
+        if (!this.form) {
+            console.error('Spielformular nicht gefunden');
+            return;
+        }
+
+        this.setupEventListeners();
+        this.setupFormElements();
+        
+        // State-Änderungen abonnieren
+        campaignState.subscribe(state => this.updateFormOptions(state));
+        
+        console.log('Spielformular initialisiert');
+    }
+
+    /**
+     * Richtet Event-Listener ein
+     */
+    setupEventListeners() {
+        // Formular-Submit
+        this.form.addEventListener('submit', (e) => {
+            e.preventDefault();
+            this.handleSubmit();
+        });
+
+        // Fraktions-Validierung - Sieger und Verlierer dürfen nicht gleich sein
+        const winnerSelect = document.getElementById('winnerFaction');
+        const loserSelect = document.getElementById('loserFaction');
+        
+        if (winnerSelect && loserSelect) {
+            winnerSelect.addEventListener('change', () => {
+                this.validateFactionSelection();
+            });
+            
+            loserSelect.addEventListener('change', () => {
+                this.validateFactionSelection();
+            });
+        }
+
+        // Region-Änderung - update verfügbare Hexfelder
+        const regionSelect = document.getElementById('targetRegion');
+        if (regionSelect) {
+            regionSelect.addEventListener('change', () => {
+                this.updateAvailableHexes();
+            });
+        }
+
+        // Clear-Button für Hexfeld
+        const clearHexButton = document.getElementById('clearHex');
+        if (clearHexButton) {
+            clearHexButton.addEventListener('click', () => {
+                this.clearTargetHex();
+            });
+        }
+
+        // Auto-Save für Formularfelder (bei längeren Beschreibungen)
+        const descriptionField = document.getElementById('description');
+        if (descriptionField) {
+            let saveTimeout;
+            descriptionField.addEventListener('input', () => {
+                clearTimeout(saveTimeout);
+                saveTimeout = setTimeout(() => {
+                    this.saveDraftToStorage();
+                }, 1000);
+            });
+        }
+    }
+
+    /**
+     * Richtet Formularelemente ein
+     */
+    setupFormElements() {
+        // Fokus auf erstes Feld
+        const firstField = this.form.querySelector('input, select');
+        if (firstField) {
+            firstField.focus();
+        }
+
+        // Draft laden falls vorhanden
+        this.loadDraftFromStorage();
+    }
+
+    /**
+     * Aktualisiert Formularoptionen basierend auf State
+     */
+    updateFormOptions(state) {
+        this.populateFactionOptions(state.factions || {});
+        this.populateRegionOptions(state.regions || []);
+        this.updateFactionOverview(state.factions || {});
+        this.updatePOIList(state.pois || []);
+        this.updateHistoryList(state.history || []);
+    }
+
+    /**
+     * Füllt Fraktionsoptionen
+     */
+    populateFactionOptions(factions) {
+        const winnerSelect = document.getElementById('winnerFaction');
+        const loserSelect = document.getElementById('loserFaction');
+        
+        if (!winnerSelect || !loserSelect) return;
+
+        // Aktuelle Auswahl merken
+        const currentWinner = winnerSelect.value;
+        const currentLoser = loserSelect.value;
+
+        // Optionen leeren (außer der ersten)
+        winnerSelect.innerHTML = '<option value="">-- Wählen --</option>';
+        loserSelect.innerHTML = '<option value="">-- Wählen --</option>';
+
+        // Fraktionen hinzufügen (außer neutral)
+        Object.entries(factions).forEach(([id, faction]) => {
+            if (id !== 'neutral') {
+                const winnerOption = document.createElement('option');
+                winnerOption.value = id;
+                winnerOption.textContent = faction.name;
+                winnerSelect.appendChild(winnerOption);
+
+                const loserOption = document.createElement('option');
+                loserOption.value = id;
+                loserOption.textContent = faction.name;
+                loserSelect.appendChild(loserOption);
+            }
+        });
+
+        // Auswahl wiederherstellen
+        winnerSelect.value = currentWinner;
+        loserSelect.value = currentLoser;
+    }
+
+    /**
+     * Füllt Regionsoptionen
+     */
+    populateRegionOptions(regions) {
+        const regionSelect = document.getElementById('targetRegion');
+        if (!regionSelect) return;
+
+        // Aktuelle Auswahl merken
+        const currentSelection = regionSelect.value;
+
+        // Optionen leeren (außer der ersten)
+        regionSelect.innerHTML = '<option value="">-- Keine spezielle Region --</option>';
+
+        // Regionen hinzufügen
+        regions.forEach(region => {
+            const option = document.createElement('option');
+            option.value = region.name;
+            option.textContent = region.name;
+            regionSelect.appendChild(option);
+        });
+
+        // Auswahl wiederherstellen
+        regionSelect.value = currentSelection;
+    }
+
+    /**
+     * Aktualisiert verfügbare Hexfelder basierend auf ausgewählter Region
+     */
+    updateAvailableHexes() {
+        const regionSelect = document.getElementById('targetRegion');
+        const targetHexField = document.getElementById('targetHex');
+        
+        if (!regionSelect || !targetHexField) return;
+
+        const selectedRegion = regionSelect.value;
+        
+        // Wenn keine Region ausgewählt, Platzhalter anzeigen
+        if (!selectedRegion) {
+            targetHexField.placeholder = 'z.B. 04.07 (klicke auf Karte)';
+            return;
+        }
+
+        // Verfügbare Hexfelder für die Region finden
+        const state = campaignState.getState();
+        const regionHexes = Object.entries(state.hexes || {})
+            .filter(([hexId, hexData]) => hexData.region === selectedRegion)
+            .map(([hexId]) => hexId);
+
+        if (regionHexes.length > 0) {
+            targetHexField.placeholder = `Verfügbare Felder in ${selectedRegion}: ${regionHexes.join(', ')}`;
+        } else {
+            targetHexField.placeholder = `Keine Felder in ${selectedRegion} gefunden`;
+        }
+    }
+
+    /**
+     * Validiert Fraktionsauswahl
+     */
+    validateFactionSelection() {
+        const winnerSelect = document.getElementById('winnerFaction');
+        const loserSelect = document.getElementById('loserFaction');
+        
+        if (!winnerSelect || !loserSelect) return;
+
+        const winner = winnerSelect.value;
+        const loser = loserSelect.value;
+
+        // Fehler-Stil entfernen
+        winnerSelect.style.borderColor = '';
+        loserSelect.style.borderColor = '';
+
+        // Validierung: Sieger und Verlierer dürfen nicht gleich sein
+        if (winner && loser && winner === loser) {
+            winnerSelect.style.borderColor = 'var(--danger)';
+            loserSelect.style.borderColor = 'var(--danger)';
+            
+            if (window.showToast) {
+                window.showToast('Sieger und besiegte Fraktion dürfen nicht identisch sein!', 'error');
+            }
+        }
+    }
+
+    /**
+     * Leert das Zielfeld
+     */
+    clearTargetHex() {
+        const targetHexField = document.getElementById('targetHex');
+        if (targetHexField) {
+            targetHexField.value = '';
+        }
+
+        // Selektion auf der Karte entfernen
+        if (window.campaignMap) {
+            window.campaignMap.clearSelection();
+        }
+    }
+
+    /**
+     * Behandelt Formular-Submit
+     */
+    async handleSubmit() {
+        // Cooldown-Check
+        const now = Date.now();
+        if (now - this.lastSubmissionTime < this.submissionCooldown) {
+            if (window.showToast) {
+                window.showToast('Bitte warte einen Moment zwischen den Meldungen', 'warning');
+            }
+            return;
+        }
+
+        if (this.isSubmitting) {
+            return;
+        }
+
+        this.isSubmitting = true;
+        this.lastSubmissionTime = now;
+
+        try {
+            // Formulardaten sammeln
+            const formData = this.collectFormData();
+            
+            // Validierung
+            if (!this.validateFormData(formData)) {
+                return;
+            }
+
+            // Spiel verarbeiten
+            if (window.processGame) {
+                await window.processGame(formData);
+                
+                // Formular zurücksetzen bei Erfolg
+                this.resetForm();
+                this.clearDraftFromStorage();
+                
+                if (window.showToast) {
+                    window.showToast('Kampf erfolgreich gemeldet!', 'success');
+                }
+            } else {
+                throw new Error('Spiellogik nicht verfügbar');
+            }
+
+        } catch (error) {
+            console.error('Fehler beim Verarbeiten der Spielmeldung:', error);
+            if (window.showToast) {
+                window.showToast('Fehler beim Melden des Kampfes: ' + error.message, 'error');
+            }
+        } finally {
+            this.isSubmitting = false;
+        }
+    }
+
+    /**
+     * Sammelt Formulardaten
+     */
+    collectFormData() {
+        return {
+            system: document.getElementById('gameSystem')?.value?.trim() || '',
+            winner: document.getElementById('winnerFaction')?.value || '',
+            loser: document.getElementById('loserFaction')?.value || '',
+            targetRegion: document.getElementById('targetRegion')?.value || '',
+            targetHex: document.getElementById('targetHex')?.value?.trim() || '',
+            description: document.getElementById('description')?.value?.trim() || '',
+            paintBonus: document.getElementById('paintBonus')?.checked || false,
+            storyBonus: document.getElementById('storyBonus')?.checked || false
+        };
+    }
+
+    /**
+     * Validiert Formulardaten
+     */
+    validateFormData(data) {
+        const errors = [];
+
+        // Pflichfelder prüfen
+        if (!data.system) {
+            errors.push('Spielsystem ist erforderlich');
+        }
+
+        if (!data.winner) {
+            errors.push('Siegerfraktion ist erforderlich');
+        }
+
+        if (!data.loser) {
+            errors.push('Besiegte Fraktion ist erforderlich');
+        }
+
+        // Fraktionen dürfen nicht gleich sein
+        if (data.winner && data.loser && data.winner === data.loser) {
+            errors.push('Sieger und besiegte Fraktion dürfen nicht identisch sein');
+        }
+
+        // Hexfeld-Format validieren (falls angegeben)
+        if (data.targetHex && !this.validateHexFormat(data.targetHex)) {
+            errors.push('Hexfeld-Format ungültig (erwartet: XX.XX)');
+        }
+
+        // Hexfeld in ausgewählter Region validieren (falls beide angegeben)
+        if (data.targetRegion && data.targetHex) {
+            const state = campaignState.getState();
+            const hex = state.hexes[data.targetHex];
+            if (!hex || hex.region !== data.targetRegion) {
+                errors.push('Hexfeld gehört nicht zur ausgewählten Region');
+            }
+        }
+
+        // Fehler anzeigen
+        if (errors.length > 0) {
+            if (window.showToast) {
+                errors.forEach(error => window.showToast(error, 'error'));
+            }
+            return false;
+        }
+
+        return true;
+    }
+
+    /**
+     * Validiert Hexfeld-Format
+     */
+    validateHexFormat(hexId) {
+        const pattern = /^\d{2}\.\d{2}$/;
+        return pattern.test(hexId);
+    }
+
+    /**
+     * Setzt das Formular zurück
+     */
+    resetForm() {
+        this.form.reset();
+        
+        // Hexfeld-Selektion entfernen
+        this.clearTargetHex();
+        
+        // Fokus auf erstes Feld
+        const firstField = this.form.querySelector('input, select');
+        if (firstField) {
+            firstField.focus();
+        }
+    }
+
+    /**
+     * Speichert Draft in localStorage
+     */
+    saveDraftToStorage() {
+        try {
+            const draft = this.collectFormData();
+            localStorage.setItem('game-form-draft', JSON.stringify(draft));
+        } catch (error) {
+            console.warn('Fehler beim Speichern des Entwurfs:', error);
+        }
+    }
+
+    /**
+     * Lädt Draft aus localStorage
+     */
+    loadDraftFromStorage() {
+        try {
+            const draftJson = localStorage.getItem('game-form-draft');
+            if (!draftJson) return;
+
+            const draft = JSON.parse(draftJson);
+            
+            // Nur laden, wenn nicht alle Felder leer sind
+            if (Object.values(draft).some(value => value)) {
+                this.populateFormWithData(draft);
+                
+                if (window.showToast) {
+                    window.showToast('Entwurf wiederhergestellt', 'info');
+                }
+            }
+        } catch (error) {
+            console.warn('Fehler beim Laden des Entwurfs:', error);
+        }
+    }
+
+    /**
+     * Löscht Draft aus localStorage
+     */
+    clearDraftFromStorage() {
+        localStorage.removeItem('game-form-draft');
+    }
+
+    /**
+     * Füllt Formular mit Daten
+     */
+    populateFormWithData(data) {
+        if (data.system) {
+            const systemField = document.getElementById('gameSystem');
+            if (systemField) systemField.value = data.system;
+        }
+
+        if (data.winner) {
+            const winnerField = document.getElementById('winnerFaction');
+            if (winnerField) winnerField.value = data.winner;
+        }
+
+        if (data.loser) {
+            const loserField = document.getElementById('loserFaction');
+            if (loserField) loserField.value = data.loser;
+        }
+
+        if (data.targetRegion) {
+            const regionField = document.getElementById('targetRegion');
+            if (regionField) regionField.value = data.targetRegion;
+        }
+
+        if (data.targetHex) {
+            const hexField = document.getElementById('targetHex');
+            if (hexField) hexField.value = data.targetHex;
+        }
+
+        if (data.description) {
+            const descField = document.getElementById('description');
+            if (descField) descField.value = data.description;
+        }
+
+        if (data.paintBonus) {
+            const paintField = document.getElementById('paintBonus');
+            if (paintField) paintField.checked = true;
+        }
+
+        if (data.storyBonus) {
+            const storyField = document.getElementById('storyBonus');
+            if (storyField) storyField.checked = true;
+        }
+    }
+
+    /**
+     * Aktualisiert Fraktionsübersicht
+     */
+    updateFactionOverview(factions) {
+        const factionGrid = document.getElementById('factionGrid');
+        if (!factionGrid) return;
+
+        factionGrid.innerHTML = '';
+
+        Object.entries(factions).forEach(([id, faction]) => {
+            if (id === 'neutral') return; // Neutral nicht anzeigen
+
+            const card = document.createElement('div');
+            card.className = 'faction-card';
+            card.style.setProperty('--faction-color', faction.color);
+            
+            card.innerHTML = `
+                <div class="faction-name">${faction.name}</div>
+                <div class="faction-points">${faction.points}</div>
+                <div class="faction-label">Siegpunkte</div>
+            `;
+            
+            factionGrid.appendChild(card);
+        });
+    }
+
+    /**
+     * Aktualisiert POI-Liste
+     */
+    updatePOIList(pois) {
+        const poiList = document.getElementById('poiList');
+        if (!poiList) return;
+
+        poiList.innerHTML = '';
+
+        const activePOIs = pois.filter(poi => poi.active);
+
+        if (activePOIs.length === 0) {
+            poiList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Keine aktiven POIs</p>';
+            return;
+        }
+
+        activePOIs.forEach(poi => {
+            const item = document.createElement('div');
+            item.className = 'poi-item';
+            item.setAttribute('data-poi-id', poi.id);
+            
+            // Status-Farbe bestimmen
+            let statusColor = 'var(--text-secondary)';
+            if (poi.status === 'umkämpft') statusColor = 'var(--warning)';
+            else if (poi.status === 'neutral') statusColor = 'var(--info)';
+            
+            item.innerHTML = `
+                <div class="poi-name">${poi.name}</div>
+                <div class="poi-status" style="color: ${statusColor}">Status: ${poi.status}</div>
+                <div class="poi-bonus">+${poi.bonus} Punkte bei Kontrolle</div>
+            `;
+            
+            // Klick-Event für Hexfeld-Auswahl
+            item.addEventListener('click', () => {
+                const targetHexField = document.getElementById('targetHex');
+                if (targetHexField) {
+                    targetHexField.value = poi.id;
+                }
+                
+                // Auf Karte selektieren
+                if (window.campaignMap) {
+                    const state = campaignState.getState();
+                    const hexData = state.hexes[poi.id];
+                    if (hexData) {
+                        window.campaignMap.selectHex(poi.id, hexData);
+                    }
+                }
+            });
+            
+            poiList.appendChild(item);
+        });
+    }
+
+    /**
+     * Aktualisiert Historie-Liste
+     */
+    updateHistoryList(history) {
+        const historyList = document.getElementById('historyList');
+        if (!historyList) return;
+
+        // Nur die letzten 5 Einträge anzeigen
+        const recentHistory = history.slice(0, 5);
+        
+        historyList.innerHTML = '';
+
+        if (recentHistory.length === 0) {
+            historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Noch keine Kämpfe</p>';
+            return;
+        }
+
+        recentHistory.forEach(entry => {
+            const item = document.createElement('div');
+            item.className = 'history-item';
+            
+            const date = new Date(entry.date).toLocaleDateString('de-DE');
+            const factions = campaignState.getFactions();
+            const winnerName = factions[entry.winner]?.name || entry.winner;
+            const loserName = factions[entry.loser]?.name || entry.loser;
+            
+            item.innerHTML = `
+                <div class="history-date">${date}</div>
+                <div class="history-battle">${winnerName} vs ${loserName}</div>
+                <div class="history-details">${entry.system}${entry.region ? ` • ${entry.region}` : ''}</div>
+            `;
+            
+            historyList.appendChild(item);
+        });
+    }
+}
+
+// Globale Form-Instanz und Initialisierungsfunktion
+let gameForm;
+
+function initializeForm() {
+    gameForm = new GameForm();
+    gameForm.initialize();
+}
+
EOF
)

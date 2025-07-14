
/**
 * Logic-Modul für das Tabletop-Kampagnentool
 * Zentrale Spiellogik und Punkteberechnung
 */

class GameLogic {
    constructor() {
        this.pointsConfig = {
            victory: 1,        // Grundpunkte für Sieg
            hexCapture: 2,     // Zusätzliche Punkte für Hexfeld-Eroberung
            poiControl: 5,     // Zusätzliche Punkte für POI-Kontrolle
            paintBonus: 1,     // Bonus für bemalte Figuren
            storyBonus: 1      // Bonus für Storybeitrag
        };
    }

    /**
     * Verarbeitet ein gemeldetes Spiel
     */
    async processGame(gameData) {
        console.log('Verarbeite Spiel:', gameData);

        try {
            // Spielergebnis erstellen
            const result = this.calculateGameResult(gameData);
            
            // State aktualisieren
            this.updateGameState(result);
            
            // Animationen triggern
            this.triggerAnimations(result);
            
            return result;
            
        } catch (error) {
            console.error('Fehler bei der Spielverarbeitung:', error);
            throw error;
        }
    }

    /**
     * Berechnet das Spielergebnis
     */
    calculateGameResult(gameData) {
        const state = campaignState.getState();
        const { winner, loser, targetHex, paintBonus, storyBonus } = gameData;
        
        const result = {
            winner,
            loser,
            targetHex,
            bonuses: {
                paint: paintBonus,
                story: storyBonus
            },
            points: {
                [winner]: 0,
                [loser]: 0
            },
            hexCaptured: false,
            poiCaptured: false,
            capturedFrom: null,
            newOwner: null,
            details: []
        };

        // Grundpunkte für Sieg
        result.points[winner] += this.pointsConfig.victory;
        result.details.push(`+${this.pointsConfig.victory} für Sieg`);

        // Bonuspunkte
        if (paintBonus) {
            result.points[winner] += this.pointsConfig.paintBonus;
            result.details.push(`+${this.pointsConfig.paintBonus} für Bemalbonus`);
        }

        if (storyBonus) {
            result.points[winner] += this.pointsConfig.storyBonus;
            result.details.push(`+${this.pointsConfig.storyBonus} für Storybeitrag`);
        }

        // Hexfeld-Eroberung prüfen
        if (targetHex && state.hexes[targetHex]) {
            const hex = state.hexes[targetHex];
            const previousOwner = hex.owner;
            
            // Nur erobern wenn anderer Besitzer oder neutral
            if (previousOwner !== winner) {
                result.hexCaptured = true;
                result.capturedFrom = previousOwner;
                result.newOwner = winner;
                result.points[winner] += this.pointsConfig.hexCapture;
                result.details.push(`+${this.pointsConfig.hexCapture} für Hexfeld-Eroberung`);

                // POI-Kontrolle prüfen
                if (hex.isPOI) {
                    result.poiCaptured = true;
                    result.points[winner] += this.pointsConfig.poiControl;
                    result.details.push(`+${this.pointsConfig.poiControl} für POI-Kontrolle`);
                }
            }
        }

        return result;
    }

    /**
     * Aktualisiert den Spielstand
     */
    updateGameState(result) {
        const { winner, loser, targetHex, hexCaptured, newOwner } = result;
        
        // Fraktionspunkte aktualisieren
        campaignState.addFactionPoints(winner, result.points[winner]);
        
        // Hexfeld-Besitzer ändern falls erobert
        if (hexCaptured && targetHex && newOwner) {
            campaignState.updateHex(targetHex, { owner: newOwner });
            
            // POI-Status aktualisieren falls nötig
            this.updatePOIStatus(targetHex, newOwner);
        }

        // Historie-Eintrag erstellen
        const historyEntry = this.createHistoryEntry(result);
        campaignState.addHistoryEntry(historyEntry);
    }

    /**
     * Aktualisiert POI-Status
     */
    updatePOIStatus(hexId, newOwner) {
        const poi = campaignState.getPOI(hexId);
        if (!poi) return;

        let newStatus = 'neutral';
        if (newOwner !== 'neutral') {
            newStatus = 'kontrolliert';
        }

        campaignState.updatePOI(hexId, { 
            status: newStatus,
            controlledBy: newOwner
        });
    }

    /**
     * Erstellt Historie-Eintrag
     */
    createHistoryEntry(result) {
        const gameData = this.currentGameData; // Von processGame gesetzt
        
        const entry = {
            system: gameData.system,
            winner: result.winner,
            loser: result.loser,
            region: gameData.targetRegion,
            targetHex: result.targetHex,
            points: result.points,
            bonuses: result.bonuses,
            description: gameData.description || this.generateBattleDescription(result)
        };

        return entry;
    }

    /**
     * Generiert automatische Kampfbeschreibung
     */
    generateBattleDescription(result) {
        const factions = campaignState.getFactions();
        const winnerName = factions[result.winner]?.name || result.winner;
        const loserName = factions[result.loser]?.name || result.loser;
        
        let description = `${winnerName} besiegt ${loserName}`;
        
        if (result.hexCaptured) {
            description += ` und erobert Hexfeld ${result.targetHex}`;
            
            if (result.poiCaptured) {
                const poi = campaignState.getPOI(result.targetHex);
                if (poi) {
                    description += ` (${poi.name})`;
                }
            }
        }
        
        return description;
    }

    /**
     * Triggert Animationen
     */
    triggerAnimations(result) {
        // Hexfeld-Eroberung animieren
        if (result.hexCaptured && result.targetHex && window.campaignMap) {
            setTimeout(() => {
                window.campaignMap.animateHexCapture(result.targetHex);
            }, 100);
        }

        // Fraktionskarten animieren
        setTimeout(() => {
            this.animateFactionCards(result.winner);
        }, 200);
    }

    /**
     * Animiert Fraktionskarten
     */
    animateFactionCards(winnerFaction) {
        const factionGrid = document.getElementById('factionGrid');
        if (!factionGrid) return;

        const cards = factionGrid.querySelectorAll('.faction-card');
        cards.forEach(card => {
            const factionName = card.querySelector('.faction-name')?.textContent?.toLowerCase();
            const factions = campaignState.getFactions();
            
            // Finde passende Fraktion
            const factionId = Object.keys(factions).find(id => 
                factions[id].name.toLowerCase() === factionName
            );
            
            if (factionId === winnerFaction) {
                card.classList.add('updated');
                setTimeout(() => {
                    card.classList.remove('updated');
                }, 500);
            }
        });
    }

    /**
     * Validiert Spielregeln
     */
    validateGameRules(gameData) {
        const errors = [];
        const state = campaignState.getState();

        // Grundvalidierung
        if (!gameData.winner || !gameData.loser) {
            errors.push('Sieger und Verlierer müssen angegeben werden');
        }

        if (gameData.winner === gameData.loser) {
            errors.push('Sieger und Verlierer dürfen nicht identisch sein');
        }

        // Hexfeld-Validierung
        if (gameData.targetHex) {
            const hex = state.hexes[gameData.targetHex];
            if (!hex) {
                errors.push(`Hexfeld ${gameData.targetHex} existiert nicht`);
            } else {
                // Prüfe ob Eroberung möglich ist
                if (hex.owner === gameData.winner) {
                    // Warnung aber kein Fehler - vielleicht Verteidigung
                    console.warn(`Hexfeld ${gameData.targetHex} gehört bereits der Siegerfraktion`);
                }
            }
        }

        // Region-Hexfeld-Konsistenz
        if (gameData.targetRegion && gameData.targetHex) {
            const hex = state.hexes[gameData.targetHex];
            if (hex && hex.region !== gameData.targetRegion) {
                errors.push('Hexfeld gehört nicht zur ausgewählten Region');
            }
        }

        return errors;
    }

    /**
     * Berechnet aktuelle Fraktionsstatistiken
     */
    calculateFactionStats() {
        const state = campaignState.getState();
        const stats = {};

        // Initialisiere Stats für alle Fraktionen
        Object.keys(state.factions || {}).forEach(factionId => {
            if (factionId !== 'neutral') {
                stats[factionId] = {
                    points: state.factions[factionId].points || 0,
                    hexesControlled: 0,
                    poisControlled: 0,
                    recentVictories: 0,
                    winRate: 0
                };
            }
        });

        // Hexfeld-Kontrolle zählen
        Object.values(state.hexes || {}).forEach(hex => {
            if (stats[hex.owner]) {
                stats[hex.owner].hexesControlled++;
                
                if (hex.isPOI) {
                    stats[hex.owner].poisControlled++;
                }
            }
        });

        // Letzte 10 Kämpfe für Win-Rate analysieren
        const recentBattles = (state.history || []).slice(0, 10);
        recentBattles.forEach(battle => {
            if (stats[battle.winner]) {
                stats[battle.winner].recentVictories++;
            }
        });

        // Win-Rate berechnen
        Object.keys(stats).forEach(factionId => {
            const battlesParticipated = recentBattles.filter(battle => 
                battle.winner === factionId || battle.loser === factionId
            ).length;
            
            if (battlesParticipated > 0) {
                stats[factionId].winRate = 
                    (stats[factionId].recentVictories / battlesParticipated * 100).toFixed(1);
            }
        });

        return stats;
    }

    /**
     * Prüft auf besondere Events oder Trigger
     */
    checkForSpecialEvents(result) {
        const state = campaignState.getState();
        const events = [];

        // POI-Eroberung Event
        if (result.poiCaptured) {
            const poi = campaignState.getPOI(result.targetHex);
            if (poi) {
                events.push({
                    type: 'poi_captured',
                    title: `${poi.name} erobert!`,
                    description: `${state.factions[result.winner].name} kontrolliert jetzt ${poi.name}`,
                    points: this.pointsConfig.poiControl
                });
            }
        }

        // Erste Eroberung einer Region
        const regionHexes = Object.entries(state.hexes).filter(([id, hex]) => 
            hex.region === result.targetRegion && hex.owner === result.winner
        );
        
        if (regionHexes.length === 1 && result.hexCaptured) {
            events.push({
                type: 'first_in_region',
                title: 'Erster Fuß in der Region!',
                description: `${state.factions[result.winner].name} etabliert Präsenz in ${result.targetRegion}`,
                points: 0
            });
        }

        // Regionale Dominanz (>50% der Hexfelder einer Region)
        if (result.hexCaptured && result.targetRegion) {
            const totalRegionHexes = Object.values(state.hexes).filter(hex => 
                hex.region === result.targetRegion
            ).length;
            
            const factionRegionHexes = Object.values(state.hexes).filter(hex => 
                hex.region === result.targetRegion && hex.owner === result.winner
            ).length;
            
            if (factionRegionHexes > totalRegionHexes / 2) {
                events.push({
                    type: 'regional_dominance',
                    title: 'Regionale Dominanz!',
                    description: `${state.factions[result.winner].name} dominiert ${result.targetRegion}`,
                    points: 3
                });
                
                // Bonuspunkte vergeben
                campaignState.addFactionPoints(result.winner, 3);
            }
        }

        // Events anzeigen
        events.forEach(event => {
            if (window.showToast) {
                window.showToast(`🎉 ${event.title}: ${event.description}`, 'success');
            }
        });

        return events;
    }

    /**
     * Auto-Balance Funktion (optional)
     */
    suggestBalanceAdjustments() {
        const stats = this.calculateFactionStats();
        const suggestions = [];
        
        // Finde die stärkste und schwächste Fraktion
        const sortedFactions = Object.entries(stats).sort((a, b) => b[1].points - a[1].points);
        
        if (sortedFactions.length >= 2) {
            const strongest = sortedFactions[0];
            const weakest = sortedFactions[sortedFactions.length - 1];
            const pointDifference = strongest[1].points - weakest[1].points;
            
            if (pointDifference > 20) {
                suggestions.push({
                    type: 'balance',
                    message: `Große Punktedifferenz erkannt (${pointDifference}). Erwäge POI-Events für schwächere Fraktionen.`,
                    severity: 'warning'
                });
            }
        }
        
        return suggestions;
    }
}

// Globale Logic-Instanz
const gameLogic = new GameLogic();

/**
 * Globale Funktionen für externe Aufrufe
 */

/**
 * Verarbeitet ein gemeldetes Spiel
 */
async function processGame(gameData) {
    try {
        // Validierung
        const errors = gameLogic.validateGameRules(gameData);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
        
        // Spieldaten für Historie speichern
        gameLogic.currentGameData = gameData;
        
        // Spiel verarbeiten
        const result = await gameLogic.processGame(gameData);
        
        // Spezielle Events prüfen
        gameLogic.checkForSpecialEvents(result);
        
        // Balance-Vorschläge (nur in Admin-Modus)
        const settings = campaignState.getSettings();
        if (settings.adminMode) {
            const suggestions = gameLogic.suggestBalanceAdjustments();
            suggestions.forEach(suggestion => {
                if (window.showToast) {
                    window.showToast(suggestion.message, suggestion.severity);
                }
            });
        }
        
        return result;
        
    } catch (error) {
        console.error('Fehler bei der Spielverarbeitung:', error);
        throw error;
    }
}

/**
 * Berechnet Fraktionsstatistiken
 */
function getFactionStats() {
    return gameLogic.calculateFactionStats();
}

/**
 * Simuliert ein zufälliges Spiel (für Testing)
 */
function simulateRandomGame() {
    const state = campaignState.getState();
    const factions = Object.keys(state.factions).filter(f => f !== 'neutral');
    const hexes = Object.keys(state.hexes);
    const systems = ['Age of Sigmar', 'Warhammer 40k', 'Kill Team', 'Necromunda', 'Blood Bowl'];
    
    if (factions.length < 2) return;
    
    // Zufällige Fraktionen
    const winner = factions[Math.floor(Math.random() * factions.length)];
    let loser = factions[Math.floor(Math.random() * factions.length)];
    while (loser === winner) {
        loser = factions[Math.floor(Math.random() * factions.length)];
    }
    
    const gameData = {
        system: systems[Math.floor(Math.random() * systems.length)],
        winner,
        loser,
        targetHex: Math.random() > 0.3 ? hexes[Math.floor(Math.random() * hexes.length)] : '',
        description: 'Simuliertes Spiel für Testzwecke',
        paintBonus: Math.random() > 0.7,
        storyBonus: Math.random() > 0.8
    };
    
    return processGame(gameData);
}
=======
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'
diff --git a/logic.js b/logic.js
--- a/logic.js
+++ b/logic.js
@@ -0,0 +1,507 @@
+/**
+ * Logic-Modul für das Tabletop-Kampagnentool
+ * Zentrale Spiellogik und Punkteberechnung
+ */
+
+class GameLogic {
+    constructor() {
+        this.pointsConfig = {
+            victory: 1,        // Grundpunkte für Sieg
+            hexCapture: 2,     // Zusätzliche Punkte für Hexfeld-Eroberung
+            poiControl: 5,     // Zusätzliche Punkte für POI-Kontrolle
+            paintBonus: 1,     // Bonus für bemalte Figuren
+            storyBonus: 1      // Bonus für Storybeitrag
+        };
+    }
+
+    /**
+     * Verarbeitet ein gemeldetes Spiel
+     */
+    async processGame(gameData) {
+        console.log('Verarbeite Spiel:', gameData);
+
+        try {
+            // Spielergebnis erstellen
+            const result = this.calculateGameResult(gameData);
+            
+            // State aktualisieren
+            this.updateGameState(result);
+            
+            // Animationen triggern
+            this.triggerAnimations(result);
+            
+            return result;
+            
+        } catch (error) {
+            console.error('Fehler bei der Spielverarbeitung:', error);
+            throw error;
+        }
+    }
+
+    /**
+     * Berechnet das Spielergebnis
+     */
+    calculateGameResult(gameData) {
+        const state = campaignState.getState();
+        const { winner, loser, targetHex, paintBonus, storyBonus } = gameData;
+        
+        const result = {
+            winner,
+            loser,
+            targetHex,
+            bonuses: {
+                paint: paintBonus,
+                story: storyBonus
+            },
+            points: {
+                [winner]: 0,
+                [loser]: 0
+            },
+            hexCaptured: false,
+            poiCaptured: false,
+            capturedFrom: null,
+            newOwner: null,
+            details: []
+        };
+
+        // Grundpunkte für Sieg
+        result.points[winner] += this.pointsConfig.victory;
+        result.details.push(`+${this.pointsConfig.victory} für Sieg`);
+
+        // Bonuspunkte
+        if (paintBonus) {
+            result.points[winner] += this.pointsConfig.paintBonus;
+            result.details.push(`+${this.pointsConfig.paintBonus} für Bemalbonus`);
+        }
+
+        if (storyBonus) {
+            result.points[winner] += this.pointsConfig.storyBonus;
+            result.details.push(`+${this.pointsConfig.storyBonus} für Storybeitrag`);
+        }
+
+        // Hexfeld-Eroberung prüfen
+        if (targetHex && state.hexes[targetHex]) {
+            const hex = state.hexes[targetHex];
+            const previousOwner = hex.owner;
+            
+            // Nur erobern wenn anderer Besitzer oder neutral
+            if (previousOwner !== winner) {
+                result.hexCaptured = true;
+                result.capturedFrom = previousOwner;
+                result.newOwner = winner;
+                result.points[winner] += this.pointsConfig.hexCapture;
+                result.details.push(`+${this.pointsConfig.hexCapture} für Hexfeld-Eroberung`);
+
+                // POI-Kontrolle prüfen
+                if (hex.isPOI) {
+                    result.poiCaptured = true;
+                    result.points[winner] += this.pointsConfig.poiControl;
+                    result.details.push(`+${this.pointsConfig.poiControl} für POI-Kontrolle`);
+                }
+            }
+        }
+
+        return result;
+    }
+
+    /**
+     * Aktualisiert den Spielstand
+     */
+    updateGameState(result) {
+        const { winner, loser, targetHex, hexCaptured, newOwner } = result;
+        
+        // Fraktionspunkte aktualisieren
+        campaignState.addFactionPoints(winner, result.points[winner]);
+        
+        // Hexfeld-Besitzer ändern falls erobert
+        if (hexCaptured && targetHex && newOwner) {
+            campaignState.updateHex(targetHex, { owner: newOwner });
+            
+            // POI-Status aktualisieren falls nötig
+            this.updatePOIStatus(targetHex, newOwner);
+        }
+
+        // Historie-Eintrag erstellen
+        const historyEntry = this.createHistoryEntry(result);
+        campaignState.addHistoryEntry(historyEntry);
+    }
+
+    /**
+     * Aktualisiert POI-Status
+     */
+    updatePOIStatus(hexId, newOwner) {
+        const poi = campaignState.getPOI(hexId);
+        if (!poi) return;
+
+        let newStatus = 'neutral';
+        if (newOwner !== 'neutral') {
+            newStatus = 'kontrolliert';
+        }
+
+        campaignState.updatePOI(hexId, { 
+            status: newStatus,
+            controlledBy: newOwner
+        });
+    }
+
+    /**
+     * Erstellt Historie-Eintrag
+     */
+    createHistoryEntry(result) {
+        const gameData = this.currentGameData; // Von processGame gesetzt
+        
+        const entry = {
+            system: gameData.system,
+            winner: result.winner,
+            loser: result.loser,
+            region: gameData.targetRegion,
+            targetHex: result.targetHex,
+            points: result.points,
+            bonuses: result.bonuses,
+            description: gameData.description || this.generateBattleDescription(result)
+        };
+
+        return entry;
+    }
+
+    /**
+     * Generiert automatische Kampfbeschreibung
+     */
+    generateBattleDescription(result) {
+        const factions = campaignState.getFactions();
+        const winnerName = factions[result.winner]?.name || result.winner;
+        const loserName = factions[result.loser]?.name || result.loser;
+        
+        let description = `${winnerName} besiegt ${loserName}`;
+        
+        if (result.hexCaptured) {
+            description += ` und erobert Hexfeld ${result.targetHex}`;
+            
+            if (result.poiCaptured) {
+                const poi = campaignState.getPOI(result.targetHex);
+                if (poi) {
+                    description += ` (${poi.name})`;
+                }
+            }
+        }
+        
+        return description;
+    }
+
+    /**
+     * Triggert Animationen
+     */
+    triggerAnimations(result) {
+        // Hexfeld-Eroberung animieren
+        if (result.hexCaptured && result.targetHex && window.campaignMap) {
+            setTimeout(() => {
+                window.campaignMap.animateHexCapture(result.targetHex);
+            }, 100);
+        }
+
+        // Fraktionskarten animieren
+        setTimeout(() => {
+            this.animateFactionCards(result.winner);
+        }, 200);
+    }
+
+    /**
+     * Animiert Fraktionskarten
+     */
+    animateFactionCards(winnerFaction) {
+        const factionGrid = document.getElementById('factionGrid');
+        if (!factionGrid) return;
+
+        const cards = factionGrid.querySelectorAll('.faction-card');
+        cards.forEach(card => {
+            const factionName = card.querySelector('.faction-name')?.textContent?.toLowerCase();
+            const factions = campaignState.getFactions();
+            
+            // Finde passende Fraktion
+            const factionId = Object.keys(factions).find(id => 
+                factions[id].name.toLowerCase() === factionName
+            );
+            
+            if (factionId === winnerFaction) {
+                card.classList.add('updated');
+                setTimeout(() => {
+                    card.classList.remove('updated');
+                }, 500);
+            }
+        });
+    }
+
+    /**
+     * Validiert Spielregeln
+     */
+    validateGameRules(gameData) {
+        const errors = [];
+        const state = campaignState.getState();
+
+        // Grundvalidierung
+        if (!gameData.winner || !gameData.loser) {
+            errors.push('Sieger und Verlierer müssen angegeben werden');
+        }
+
+        if (gameData.winner === gameData.loser) {
+            errors.push('Sieger und Verlierer dürfen nicht identisch sein');
+        }
+
+        // Hexfeld-Validierung
+        if (gameData.targetHex) {
+            const hex = state.hexes[gameData.targetHex];
+            if (!hex) {
+                errors.push(`Hexfeld ${gameData.targetHex} existiert nicht`);
+            } else {
+                // Prüfe ob Eroberung möglich ist
+                if (hex.owner === gameData.winner) {
+                    // Warnung aber kein Fehler - vielleicht Verteidigung
+                    console.warn(`Hexfeld ${gameData.targetHex} gehört bereits der Siegerfraktion`);
+                }
+            }
+        }
+
+        // Region-Hexfeld-Konsistenz
+        if (gameData.targetRegion && gameData.targetHex) {
+            const hex = state.hexes[gameData.targetHex];
+            if (hex && hex.region !== gameData.targetRegion) {
+                errors.push('Hexfeld gehört nicht zur ausgewählten Region');
+            }
+        }
+
+        return errors;
+    }
+
+    /**
+     * Berechnet aktuelle Fraktionsstatistiken
+     */
+    calculateFactionStats() {
+        const state = campaignState.getState();
+        const stats = {};
+
+        // Initialisiere Stats für alle Fraktionen
+        Object.keys(state.factions || {}).forEach(factionId => {
+            if (factionId !== 'neutral') {
+                stats[factionId] = {
+                    points: state.factions[factionId].points || 0,
+                    hexesControlled: 0,
+                    poisControlled: 0,
+                    recentVictories: 0,
+                    winRate: 0
+                };
+            }
+        });
+
+        // Hexfeld-Kontrolle zählen
+        Object.values(state.hexes || {}).forEach(hex => {
+            if (stats[hex.owner]) {
+                stats[hex.owner].hexesControlled++;
+                
+                if (hex.isPOI) {
+                    stats[hex.owner].poisControlled++;
+                }
+            }
+        });
+
+        // Letzte 10 Kämpfe für Win-Rate analysieren
+        const recentBattles = (state.history || []).slice(0, 10);
+        recentBattles.forEach(battle => {
+            if (stats[battle.winner]) {
+                stats[battle.winner].recentVictories++;
+            }
+        });
+
+        // Win-Rate berechnen
+        Object.keys(stats).forEach(factionId => {
+            const battlesParticipated = recentBattles.filter(battle => 
+                battle.winner === factionId || battle.loser === factionId
+            ).length;
+            
+            if (battlesParticipated > 0) {
+                stats[factionId].winRate = 
+                    (stats[factionId].recentVictories / battlesParticipated * 100).toFixed(1);
+            }
+        });
+
+        return stats;
+    }
+
+    /**
+     * Prüft auf besondere Events oder Trigger
+     */
+    checkForSpecialEvents(result) {
+        const state = campaignState.getState();
+        const events = [];
+
+        // POI-Eroberung Event
+        if (result.poiCaptured) {
+            const poi = campaignState.getPOI(result.targetHex);
+            if (poi) {
+                events.push({
+                    type: 'poi_captured',
+                    title: `${poi.name} erobert!`,
+                    description: `${state.factions[result.winner].name} kontrolliert jetzt ${poi.name}`,
+                    points: this.pointsConfig.poiControl
+                });
+            }
+        }
+
+        // Erste Eroberung einer Region
+        const regionHexes = Object.entries(state.hexes).filter(([id, hex]) => 
+            hex.region === result.targetRegion && hex.owner === result.winner
+        );
+        
+        if (regionHexes.length === 1 && result.hexCaptured) {
+            events.push({
+                type: 'first_in_region',
+                title: 'Erster Fuß in der Region!',
+                description: `${state.factions[result.winner].name} etabliert Präsenz in ${result.targetRegion}`,
+                points: 0
+            });
+        }
+
+        // Regionale Dominanz (>50% der Hexfelder einer Region)
+        if (result.hexCaptured && result.targetRegion) {
+            const totalRegionHexes = Object.values(state.hexes).filter(hex => 
+                hex.region === result.targetRegion
+            ).length;
+            
+            const factionRegionHexes = Object.values(state.hexes).filter(hex => 
+                hex.region === result.targetRegion && hex.owner === result.winner
+            ).length;
+            
+            if (factionRegionHexes > totalRegionHexes / 2) {
+                events.push({
+                    type: 'regional_dominance',
+                    title: 'Regionale Dominanz!',
+                    description: `${state.factions[result.winner].name} dominiert ${result.targetRegion}`,
+                    points: 3
+                });
+                
+                // Bonuspunkte vergeben
+                campaignState.addFactionPoints(result.winner, 3);
+            }
+        }
+
+        // Events anzeigen
+        events.forEach(event => {
+            if (window.showToast) {
+                window.showToast(`🎉 ${event.title}: ${event.description}`, 'success');
+            }
+        });
+
+        return events;
+    }
+
+    /**
+     * Auto-Balance Funktion (optional)
+     */
+    suggestBalanceAdjustments() {
+        const stats = this.calculateFactionStats();
+        const suggestions = [];
+        
+        // Finde die stärkste und schwächste Fraktion
+        const sortedFactions = Object.entries(stats).sort((a, b) => b[1].points - a[1].points);
+        
+        if (sortedFactions.length >= 2) {
+            const strongest = sortedFactions[0];
+            const weakest = sortedFactions[sortedFactions.length - 1];
+            const pointDifference = strongest[1].points - weakest[1].points;
+            
+            if (pointDifference > 20) {
+                suggestions.push({
+                    type: 'balance',
+                    message: `Große Punktedifferenz erkannt (${pointDifference}). Erwäge POI-Events für schwächere Fraktionen.`,
+                    severity: 'warning'
+                });
+            }
+        }
+        
+        return suggestions;
+    }
+}
+
+// Globale Logic-Instanz
+const gameLogic = new GameLogic();
+
+/**
+ * Globale Funktionen für externe Aufrufe
+ */
+
+/**
+ * Verarbeitet ein gemeldetes Spiel
+ */
+async function processGame(gameData) {
+    try {
+        // Validierung
+        const errors = gameLogic.validateGameRules(gameData);
+        if (errors.length > 0) {
+            throw new Error(errors.join(', '));
+        }
+        
+        // Spieldaten für Historie speichern
+        gameLogic.currentGameData = gameData;
+        
+        // Spiel verarbeiten
+        const result = await gameLogic.processGame(gameData);
+        
+        // Spezielle Events prüfen
+        gameLogic.checkForSpecialEvents(result);
+        
+        // Balance-Vorschläge (nur in Admin-Modus)
+        const settings = campaignState.getSettings();
+        if (settings.adminMode) {
+            const suggestions = gameLogic.suggestBalanceAdjustments();
+            suggestions.forEach(suggestion => {
+                if (window.showToast) {
+                    window.showToast(suggestion.message, suggestion.severity);
+                }
+            });
+        }
+        
+        return result;
+        
+    } catch (error) {
+        console.error('Fehler bei der Spielverarbeitung:', error);
+        throw error;
+    }
+}
+
+/**
+ * Berechnet Fraktionsstatistiken
+ */
+function getFactionStats() {
+    return gameLogic.calculateFactionStats();
+}
+
+/**
+ * Simuliert ein zufälliges Spiel (für Testing)
+ */
+function simulateRandomGame() {
+    const state = campaignState.getState();
+    const factions = Object.keys(state.factions).filter(f => f !== 'neutral');
+    const hexes = Object.keys(state.hexes);
+    const systems = ['Age of Sigmar', 'Warhammer 40k', 'Kill Team', 'Necromunda', 'Blood Bowl'];
+    
+    if (factions.length < 2) return;
+    
+    // Zufällige Fraktionen
+    const winner = factions[Math.floor(Math.random() * factions.length)];
+    let loser = factions[Math.floor(Math.random() * factions.length)];
+    while (loser === winner) {
+        loser = factions[Math.floor(Math.random() * factions.length)];
+    }
+    
+    const gameData = {
+        system: systems[Math.floor(Math.random() * systems.length)],
+        winner,
+        loser,
+        targetHex: Math.random() > 0.3 ? hexes[Math.floor(Math.random() * hexes.length)] : '',
+        description: 'Simuliertes Spiel für Testzwecke',
+        paintBonus: Math.random() > 0.7,
+        storyBonus: Math.random() > 0.8
+    };
+    
+    return processGame(gameData);
+}
+
EOF
)


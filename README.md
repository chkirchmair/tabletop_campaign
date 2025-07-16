# 🧭 Age of Sigmar Kampagnen-Companion

## 📌 Projektziel

Diese Web-App dient als digitales Werkzeug zur Verwaltung einer narrativen Age of Sigmar Kampagne. 
Spieler können ihre Spielergebnisse eintragen, wodurch sich der Besitz von Regionen auf einer Hexfeldkarte verändert. 
Ziel ist es, eine einfache, übersichtliche und immersive Möglichkeit zu schaffen, eine Weltkarte gemeinsam zu beeinflussen.

---

## 🌍 Features

### 1. Hexfeldkarte anzeigen

* 21 Spalten × 11 Reihen große Hexfeldkarte
* Terrain-Typ pro Feld (z. B. Wald, Ebene, Ruine)
* 2–4 benachbarte Hexfelder ergeben eine Region
* Regionen sind farblich hervorgehoben und besitzen eine eindeutige ID
* Zugehörigkeit zu einer der vier Großfraktionen:

  * Ordnung
  * Tod
  * Chaos
  * Zerstörung

### 2. Interaktive Regionen

* Regionen sind auswählbar (Klick, Hover)
* Anzeige von:

  * Region-ID oder Name
  * aktueller Besitzer (Fraktion)
  * evtl. Beschreibung / Besonderheiten

### 3. Spielergebnisse eintragen

* Eingabemaske für Kampagnenteilnehmer\:innen:

  * Spieler 1 & 2 (optional)
  * Gespielte Armeen (optional)
  * Siegerfraktion (Pflichtfeld)
  * Gespielte Region
* Nach Absenden wird der Besitz der Region automatisch aktualisiert

---

## ⚙️ Umsetzung (Technikstack – Vorschlag)

* **Frontend**: Vite + JavaScript oder React
* **Datenhaltung**: JSON-Datei oder einfaches Backend (Node/Express, Supabase, etc.)
* **Kartenvisualisierung**: Canvas, SVG oder Hexmap-Bibliothek
* **Deployment**: Netlify, Vercel oder GitHub Pages (für reines Frontend)

---

## 🎯 MVP-Ziele

* Hexkarte anzeigen
* Regionen definieren & anzeigen
* Fraktionsbesitz pro Region
* Spielergebnisse melden & Besitz aktualisieren

---

## 🛠️ Weiterentwicklungsideen (optional)

* Benutzer-Authentifizierung
* Besitzverlauf & Statistiken
* Kartenanimationen (z. B. bei Besitzerwechsel)
* Kampagnenlogbuch & Fraktionsnachrichten

---

## 👥 Zielgruppe

Teilnehmer der AoS-Kampagne sowie Spielleiter/Organisatoren, die den Fortschritt mitverfolgen oder moderieren wollen.

# Schulheft Pro — Digitales Schulheft für PWA & Android

Eine moderne, für Stifteingabe optimierte Schulheft-Web-App (Progressive Web App), inspiriert von den beliebtesten Android Schulheft-Apps.

## ✨ Hauptfunktionen

- **Digitales Heftregal (Startseite)**: Übersichtliche Darstellung deiner Schulhefte mit Fächer-Filter, Coverfarben und Deckblättern.
- **Stifteingabe & Zeichnen**:
  - **Füller / Stift**: Exakter, feiner Strich für Aufschriebe.
  - **Pinsel**: Druckempfindliche Kalligraphie & Schönschrift.
  - **Textmarker**: Fest auf **50% Deckkraft** kalibriert – der darunterliegende Text oder Karos bleiben stets lesbar.
  - **Radiergummi**: Berührte Striche werden sauber gelöscht.
  - **Gerader Strich Modus**: Begradigt handgezeichnete Linien automatisch (oder durch kurzes Anhalten des Stifts).
  - **Handballenschutz (Stylus-Only Mode)**: Ignoriert versehentliche Handflächenberührungen beim Schreiben mit einem Eingabestift.
  - **Rückgängig (Undo) & Wiederholen (Redo)**: Verlauf für alle Zeichnungen.
- **Geometriewerkzeuge**:
  - **Echtes Deutsches Geodreieck**: Drehbar & verschiebbar, mit Nullpunkt-Zentrierung, Millimeterskala (-7 bis +7 cm), 45°- und 90°-Winkeln, gelbem Gradbogen (10°–170°) und Mittellinie.
  - **15cm Schullineal**: Drehbar & verschiebbar mit Millimetereinteilung.
- **Texte & Bilder**:
  - **Verschiebbare Textboxen**: Frei platzierbar mit Schriftarten (Druckschrift, Handschrift, Schreibschrift), Schriftgröße und Farben.
  - **Bilder einfügen**: Fotos von Tafelbildern oder Arbeitsblättern importieren, skalieren und beschriften.
- **Schul-Lineaturen**:
  - 5mm Kariert (Mathematik mit Korrekturrand)
  - 7mm Kariert (Grundschule)
  - Liniert mit rotem Lehrerkorrekturrand
  - Liniert Standard
  - Punkteraster (Dot Grid)
  - Vokabelheft (2 Spalten mit Trennlinie)
  - Notenlinien
  - Blanko
- **OCR-Volltextsuche**: Handschrift und Notizen werden erkannt und können über die globale Suchleiste blitzschnell durchsucht werden.
- **PDF-Export**: Exportiert das gesamte Schulheft als druckfertiges DIN A4 PDF.
- **Dunkler Modus & Dunkles Papier**: Augenfreundlicher Modus für Arbeiten am Abend.
- **Offline-First & PWA**: Funktioniert auch ohne Internetverbindung im Klassenzimmer. Installierbar als eigenständige Android App auf dem Homescreen.
- **Interaktives Tutorial**: Führt neue Nutzer Schritt für Schritt durch alle Werkzeuge.

---

## 📁 Dateibasierte JSON-Speicherung

Jedes Schulheft wird in einem eigenen Unterordner verwaltet:
```
data/
└── notebooks/
    └── [notebook-id]/
        ├── notebook.json      # Metadaten (Titel, Fach, Lineatur, Seitenliste)
        ├── pages/
        │   ├── p1.json        # Striche, Textboxen, Bildkoordinaten
        │   └── p2.json
        ├── images/            # Importierte Tafelbilder & Fotos
        └── ocr_cache.json     # Volltext-Index für Suchfunktion
```

---

## 🐳 Installation mit Docker

### 1. Schnellstart mit Docker Compose
```bash
docker compose up -d
```
Die App ist anschließend unter `http://localhost:3000` erreichbar.
Alle Notizen und Bilder werden im lokalen `./data` Ordner persistent gespeichert.

### 2. Manuelles Bauen mit Docker
```bash
docker build -t schulheft-app .
docker run -p 3000:3000 -v $(pwd)/data:/app/data schulheft-app
```

---

## 📱 Auf Android installieren

1. Öffne die Web-App im Chrome-Browser auf deinem Android-Tablet oder Smartphone.
2. Klicke auf den Button **"App installieren"** in der oberen Leiste oder im Browser-Menü auf **"Zum Startbildschirm hinzufügen"**.
3. Die App startet nun im Vollbildmodus wie eine native Android Schulheft-App.

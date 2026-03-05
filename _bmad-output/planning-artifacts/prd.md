---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: ['_bmad-output/planning-artifacts/product-brief-lds-symptome-tracker-2026-02-28.md', '_bmad-output/brainstorming/brainstorming-session-2026-02-28.md']
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 1
projectDocsCount: 0
classification:
  projectType: web_app
  domain: healthcare
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document - lds-symptome-tracker

**Author:** Andy
**Date:** 2026-03-01

## Executive Summary

Der **LDS Symptom Tracker** ist eine ereignisbasierte Web-App zur Symptomerfassung für Patienten mit seltenen Erkrankungen. Patienten beschreiben Symptome per Sprache oder Text in unter 10 Sekunden — KI extrahiert automatisch strukturierte medizinische Daten (Bezeichnung, Körperregion, Seite, Art, Intensität). Über Monate entsteht eine differenzierte, quantifizierbare Symptomgeschichte, die bei der Spezialisten-Konsultation als objektive Entscheidungsgrundlage dient — für frühzeitiges Handeln bei auffälligen Mustern und für den Verzicht auf unnötige Untersuchungen bei unauffälligem Verlauf. Beides erhöht die Lebensqualität und gibt dem Patienten ein Gefühl von Sicherheit.

Das Produkt wird als Pilot mit einer 17-jährigen LDS-Patientin entwickelt und validiert, bevor es auf weitere Patienten mit seltenen Erkrankungen ausgeweitet wird. Geschäftsmodell: Freemium — kostenlose Symptomerfassung, kostenpflichtiges Abo für Arzt-Sharing.

### What Makes This Special

- **Anti-Tagebuch-Prinzip:** Event-basiert statt pflichtbasiert. Keine Eingabe = guter Tag. Radikal anders als alle bestehenden Symptom-Tracker, die an täglichem Ausfüllen scheitern.
- **Sprache → Struktur in 10 Sekunden:** Patient spricht frei (auch Schweizerdeutsch), KI erzeugt strukturierte medizinische Daten. Der Arzt bekommt nicht "ich hatte öfter Rückenschmerzen", sondern "Rückenschmerzen links, Schulterblatt, 12x in 3 Monaten, Intensität steigend, 8x abends."
- **Bidirektionaler Nutzen:** Auffällige Muster → frühzeitiges Handeln. Unauffälliger Verlauf → Vermeidung unnötiger Eingriffe. Die objektive Symptomhistorie ist ein Puzzlestück, das heute komplett fehlt.
- **Null Hürde für Ärzte:** Sharing-Link statt Portal. Kein Account, kein Login, kein System. PDF zum Ausdrucken oder interaktives Dashboard auf dem iPad.
- **Lernendes System:** Jede Patienten-Korrektur verbessert die Erkennung. Nach Monaten kennt die App das persönliche Vokabular — sinkender Aufwand statt steigender Ermüdung.
- **Timing:** Zuverlässige Speech-to-Text-Transkription (inkl. Dialekte) und KI-basierte Informationsextraktion aus Text sind erst seit kurzem in der nötigen Qualität verfügbar.

## Project Classification

| Dimension | Klassifikation | Begründung |
|-----------|---------------|------------|
| **Projekt-Typ** | Web-App (mobilfähig, PWA) | MVP als responsive Web-App, kein native App |
| **Domäne** | Healthcare (patienten-zentriert) | Symptom-Tracking, medizinische Daten, Arzt-Konsultation — aber kein Medizinprodukt, keine Diagnosen |
| **Komplexität** | Hoch | Gesundheitsdaten (nDSG), KI-Spracherkennung (Schweizerdeutsch), Symptom-Extraktion, granulare Zugriffsrechte |
| **Kontext** | Greenfield | Komplett neues Produkt, keine bestehende Codebasis |

## Success Criteria

### User Success

**Patientin (Celia):**
- Erfasst Symptome konsistent über mindestens 3 Monate ohne Abbruch
- Durchschnittliche Erfassungszeit unter 15 Sekunden (Aufnahme-Start bis Abschluss)
- KI-Korrekturrate sinkt über Zeit — System lernt persönliches Vokabular
- Entdeckt Muster in eigenen Daten, die ihr vorher nicht bewusst waren (Aha-Moment)
- Nutzt Sharing-Link / PDF-Report als Gesprächsgrundlage bei der Spezialisten-Sprechstunde

**Arzt (Konsument):**
- Benötigt null Einarbeitung — Link klicken, sofort verstehen
- Bestätigt informell: "Die Daten waren hilfreich für meine Beurteilung"
- Read-only Zugriff, kein Editieren, kein Account nötig

### Business Success

| Phase | Zeitraum | Erfolgskriterien |
|-------|----------|-----------------|
| **Pilot** | 0–6 Monate | Erfolgreicher Pilot mit Celia. App wird bei mind. 1 Spezialisten-Konsultation als Grundlage genutzt. KI-Extraktion funktioniert zuverlässig für Schweizerdeutsch und Hochdeutsch. |
| **Erste Nutzer** | 6–12 Monate | Ausweitung auf weitere LDS-Patienten (Selbsthilfegruppen). Validierung Freemium → Abo-Konversion bei Arzt-Sharing. |
| **Wachstum** | 12+ Monate | Ausweitung auf andere seltene Erkrankungen (Marfan, Ehlers-Danlos). Gespräche mit Krankenkassen über Finanzierung. |

### Technical Success

- **Verarbeitungszeit:** Asynchrone Sprach-Verarbeitung, KI-Extraktion innerhalb 10 Sekunden abgeschlossen. Push-Benachrichtigung zur Überprüfung der extrahierten Daten.
- **Verfügbarkeit:** 7x24 Betrieb, kleine Wartungsunterbrüche akzeptabel
- **Schweizerdeutsch → Hochdeutsch:** Transkription übersetzt Dialekt ins Hochdeutsche (keine wörtliche Abschrift). Erfolgskriterium: extrahierte Symptome sind korrekt, nicht die Transkription wörtlich.
- **Pseudonymisierung:** Keine personenidentifizierenden Daten strukturiert gespeichert. Daten nur über Account-ID verknüpft. Personenzuordnung existiert nur im Sharing-Link (E-Mail des Patienten). Bei unbefugtem Datenbankzugriff ist keine Verbindung zur Person herstellbar.
- **Foto-Speicherung:** Fotos werden pseudonymisiert wie alle anderen Daten gespeichert. Im Sharing-Link sichtbar (Stream/Ansicht), kein Download.
- **Datenschutz:** Schweizer nDSG als Rahmen. Gesundheitsdaten als besonders schützenswerte Personendaten behandelt.

### Measurable Outcomes

| KPI | Ziel | Messmethode |
|-----|------|-------------|
| Langzeit-Retention | >80% nach 3 Monaten | Aktive Nutzer mit mind. 1 Event/Monat |
| Erfassungszeit | <15 Sekunden | Durchschnitt Aufnahme-Start bis Abschluss |
| KI-Extraktion | <10 Sekunden | Verarbeitungsdauer Sprache → extrahierte Symptome |
| KI-Korrekturrate | Sinkend über Zeit | % korrigierte Extraktionen pro Patient |
| Konsultations-Conversion | >70% der aktiven Nutzer | Sharing-Link generiert vor Arzttermin |
| Freemium → Abo | >30% Konversion | Nutzer die Sharing-Feature aktivieren |

## Product Scope

### MVP — Minimum Viable Product

1. **Symptom-Erfassung:** Web-App (mobilfähig), Sprache (Schweizerdeutsch + Hochdeutsch) + Text + Foto-Dokumentation (Kamera-Aufnahme direkt aus der App), Event-basiert, Symptom-Ende markieren
2. **KI-Verarbeitung:** Asynchrone Transkription (Dialekt → Hochdeutsch), Symptom-Extraktion (Multi-Symptom: eine Eingabe kann mehrere Symptome/Medikamente enthalten, die separat extrahiert werden), Sofort-Feedback, Nachfrage bei niedriger Konfidenz, Patienten-Korrektur mit Lerneffekt, Push-Benachrichtigung
3. **Patienten-Ansicht:** Chronologischer Feed, Symptom-Häufigkeits-Ranking, Timeline über Monate
4. **Arzt-Export:** Sharing-Link (read-only, zeitbegrenzt, kein Download), PDF-Export, KI-Zusammenfassung, Timeline + Drill-Down, Original-Audio (Stream), Fotos im Drill-Down sichtbar, Handy + iPad + Desktop
5. **Onboarding:** Apple ID Login, Zero-Formular, sofort nutzbar
6. **Daten-Souveränität:** Server-basiert, Pseudonymisierung (nur Account-ID), Audit-Log

### Growth Features (Post-MVP)

- Native iOS/Android App mit Apple Watch
- Angehörigen-Berechtigung (Erfassung im Auftrag + eigene Beobachtungen)
- Uhrdaten-Integration (Apple Health, passive Baseline)
- Erweiterte Analyse (Tageszeit-Muster, Aktivitäts-Symptom-Matrix)

### Vision (Future)

- Intelligente Insights mit Handlungsvorschlägen
- Stimmanalyse als Biomarker
- Proaktive Anomalie-Erkennung
- Notfall-System (3-Stufen-Eskalation, Notruf mit Kontext)
- Ausweitung auf andere seltene Erkrankungen
- Krankenkassen-Finanzierung

## User Journeys

### Journey 1: Celia — Symptom-Erfassung (Core Happy Path)

**Szene:** Celia (17) sitzt abends auf dem Sofa. Ein ziehendes Gefühl links neben dem Schulterblatt meldet sich — stärker als letzte Woche.

**Aktion:** Sie öffnet die Web-App auf dem Handy, tippt den Mikrofon-Button und sagt: *"Habe gerade es Zieh im Rügge, links näbem Schulterblatt, stärcher als letschti Wuche."* 8 Sekunden.

**Verarbeitung:** Die App zeigt sofort "Wird verarbeitet..." — innerhalb von 10 Sekunden kommt eine Push-Benachrichtigung: *"Erfasst: Rückenschmerzen, links, Schulterblatt, ziehend. Bitte überprüfen."* Celia tippt darauf, sieht die extrahierte Struktur, bestätigt mit einem Tap. Fertig.

**Alternative — Text:** Im Mathe-Unterricht spürt Celia Kopfschmerzen aufkommen. Sie kann nicht sprechen. Sie öffnet die App, tippt: *"Kopfschmerzen, pochend, rechte Schläfe"* — die KI extrahiert sofort.

**Symptom-Ende:** Zwei Stunden später sind die Rückenschmerzen weg. Celia öffnet die App und markiert das Symptom als beendet. Dauer: 2h 14min — ein wertvoller Datenpunkt.

**Medikamenten-Event:** Am nächsten Tag hat Celia eine Migräne. Sie nimmt ein Schmerzmittel und spricht: *"Han 1g Dafalgan gno wäge Migräne."* Die KI extrahiert: *"Medikament: Dafalgan 1g, Grund: Migräne."* Abends fällt ihr ein, dass sie morgens das Losartan vergessen hat: *"Hüt ha i vergässe s Losartan z näh."* Beide Events werden als spezielle Datenpunkte erfasst — gleicher Mechanismus wie Symptome, sichtbar auf der Timeline und im Arzt-Dashboard.

**Reveal:** Nach 3 Monaten zeigt der chronologische Feed: Rückenschmerzen 12x, davon 8x abends, Intensität leicht steigend. Celia denkt: *"Das wusste ich gar nicht."*

### Journey 2: Celia — Foto-Dokumentation

**Szene:** Celia bemerkt einen Bluterguss am linken Unterarm — ohne Sturz oder Anstoss. Bei LDS können spontane Hämatome ein relevantes Symptom sein.

**Aktion:** Sie öffnet die App, spricht: *"Hämatom am lingge Underarm, isch eifach so cho, ohni dass i mi gschlage han."* Dann tippt sie auf das Kamera-Symbol und fotografiert den Bluterguss — frontal und im Grössenvergleich mit einer Münze. Zwei Fotos, an das Symptom-Event angehängt.

**Verarbeitung:** KI extrahiert: *"Hämatom, linker Unterarm, spontan."* Fotos werden pseudonymisiert gespeichert. Celia bestätigt.

**Langzeit-Wert:** Bei der Spezialisten-Sprechstunde scrollt der Arzt im Drill-Down zum Event — sieht die Fotos, hört Celias Original-Audio, liest die KI-Extraktion. Die visuelle Dokumentation zeigt Grösse und Farbe des Hämatoms zum Zeitpunkt des Auftretens.

### Journey 3: Celia — Onboarding

**Szene:** Andy zeigt Celia die App. *"Die ist wie WhatsApp — du sprichst einfach rein wenn was ist."*

**Aktion:** Celia öffnet die Web-App, tippt "Mit Apple ID anmelden". Ein Tap, Face ID, Account erstellt. Keine weiteren Daten nötig — kein Name, keine Diagnose, kein Medikamentenplan, kein Formular.

**Sofort loslegen:** Die App zeigt einen grossen Mikrofon-Button und den Hinweis: *"Sprich oder tippe dein erstes Symptom."* Celia kann innerhalb von 15 Sekunden nach der Registrierung ihr erstes Symptom erfassen. Keine Diagnose, kein Medikamentenplan — einfach loslegen.

### Journey 4: Celia — Konsultations-Vorbereitung

**Szene:** In zwei Tagen hat Celia ihre jährliche Spezialisten-Sprechstunde in der Kardiologie. Sie hat seit 4 Monaten Symptome erfasst.

**Aktion:** Celia öffnet die Patienten-Ansicht, sieht ihre Timeline und das Symptom-Ranking. Sie tippt auf "Für Arzt teilen", gibt die E-Mail-Adresse des Spezialisten ein, wählt Zeitraum (letzte 4 Monate), setzt Zugriffsdauer (48h).

**Ergebnis:** Der Arzt erhält eine E-Mail mit einem Sharing-Link. Celia kann zusätzlich einen PDF-Report generieren und ausdrucken — für die Patientenakte.

**Kontrolle:** Celia sieht im Audit-Log, wann der Arzt den Link geöffnet hat. Nach 48h erlischt der Zugang automatisch.

### Journey 5: Arzt — Konsultation

**Szene:** Dr. Müller, Kardiologe am Universitätsspital, bereitet sich auf Celias Jahreskonsultation vor. 5 Minuten Vorbereitungszeit.

**Vorbereitung (5 Min):** Er klickt den Sharing-Link in seiner E-Mail. Kein Login, kein Account. Sofort sieht er:
- **KI-Zusammenfassung (60 Sekunden):** *"4 Monate, 37 Symptom-Events. Häufigste: Rückenschmerzen links (12x, Trend steigend), Kopfschmerzen (8x, stabil), Atemnot bei Belastung (5x). 2 spontane Hämatome dokumentiert mit Fotos. 3 Dafalgan-Einnahmen bei Migräne. 1 vergessene Losartan-Einnahme."*
- **Timeline:** Farbcodierte Zeitleiste über 4 Monate
- **Symptom-Ranking:** Sortiert nach Häufigkeit mit Trendlinien

**Drill-Down:** Die steigenden Rückenschmerzen links fallen auf. Dr. Müller tippt darauf, sieht alle 12 Events, hört Celias Original-Audio bei einem auffälligen Event, sieht die Fotos der Hämatome.

**Sprechstunde (auf dem iPad):** Dr. Müller und Celia schauen gemeinsam den interaktiven Report auf dem iPad an. Der Arzt zeigt auf die Trendlinie: *"Die Rückenschmerzen links nehmen zu. Das sollten wir abklären."* Er ordnet eine Bildgebung an.

**Alternativ (Papier):** Dr. Müller hat den PDF-Report ausgedruckt und zur Patientenakte gelegt. Er referenziert die Daten im interdisziplinären Board.

### Journey Requirements Summary

| Journey | Aufgedeckte Capabilities |
|---------|------------------------|
| **Symptom-Erfassung** | Sprach-Eingabe, Text-Eingabe, Schweizerdeutsch→Hochdeutsch, KI-Extraktion, Push-Benachrichtigung, Symptom-Bestätigung/Korrektur, Symptom-Ende markieren |
| **Foto-Dokumentation** | Kamera-Integration, mehrere Fotos pro Event, pseudonymisierte Foto-Speicherung, Foto-Anzeige im Drill-Down und Sharing |
| **Medikamenten-Events** | Gleicher Erfassungsmechanismus wie Symptome, KI-Extraktion (Medikament, Dosis, Grund), spezielle Datenpunkt-Kategorie, sichtbar in Timeline und Arzt-Export |
| **Onboarding** | Apple ID Login (Self-Service), Zero-Formular-Onboarding, sofort nutzbar |
| **Konsultations-Vorbereitung** | Sharing-Link erstellen, E-Mail-Versand, Zeitraum-Auswahl, Zugriffsdauer setzen, PDF-Export, Audit-Log |
| **Arzt-Konsultation** | Link ohne Login, KI-Zusammenfassung, Timeline, Symptom-Ranking, Drill-Down, Audio-Stream, Foto-Ansicht, iPad-optimiert, PDF-Druck |

## Domain-Specific Requirements

### Regulatorische Einordnung

- **Kein Medizinprodukt:** Die App stellt keine Diagnosen, gibt keine medizinischen Empfehlungen, trifft keine klinischen Entscheidungen. Sie ist ein digitales Erfassungs- und Aufbereitungswerkzeug — analog einem papierbasierten Symptom-Notizblock.
- **Keine MDR/MepV-Klassifikation:** Reine Datenerfassung und -aufbereitung ohne diagnostische oder therapeutische Funktion.
- **Schweizer nDSG:** Gesundheitsdaten als besonders schützenswerte Personendaten. Die Pseudonymisierung (nur Account-ID, keine Personenzuordnung im Datenbestand) minimiert das Risiko.

### Datenschutz & Datenhaltung

- **Speicherort:** Europa (z.B. Azure West Europe, AWS Frankfurt/Zürich)
- **Pseudonymisierung:** Daten im System sind keiner Person zuordenbar — analog einem Notizblock ohne Namensbeschriftung. Zuordnung existiert nur im Sharing-Moment (E-Mail des Patienten).
- **Keine Löschfrist:** Patient entscheidet selbst über Löschung seiner Daten. Kein automatisches Verfallsdatum.
- **Audio & Fotos:** Gleiche Speicherlogik wie strukturierte Daten — pseudonymisiert, europäischer Serverstandort, Patient kontrolliert Lebenszyklus.
- **Recht auf Löschung:** Patient kann jederzeit einzelne Events oder den gesamten Account löschen.

### Haftung & Disclaimer

- **Disclaimer erforderlich:** "Diese App ist kein Medizinprodukt. Sie ersetzt keine ärztliche Beratung, Diagnose oder Behandlung. Die App dokumentiert Ihre Symptome — die Entscheidung, was Sie erfassen, liegt bei Ihnen."
- **Analogie Papier:** Die App verhält sich wie eine papierbasierte Symptomerfassung — sie senkt die Hürde maximal, übernimmt aber keine medizinische Verantwortung.
- **Kein Vollständigkeitsversprechen:** Die App garantiert nicht, dass alle relevanten Symptome erfasst werden. Patient entscheidet was er erfasst.

### Risiken & Mitigationen

| Risiko | Mitigation |
|--------|-----------|
| Patient verlässt sich auf App statt Arzt zu kontaktieren | Disclaimer bei Onboarding und in App-Footer. Kein Panik-Modus im MVP. |
| Unbefugter Datenbankzugriff | Pseudonymisierung — keine Personenzuordnung möglich |
| KI extrahiert falsches Symptom | Patient prüft und korrigiert jede Extraktion. Konfidenz-Score sichtbar. |
| Sharing-Link wird weitergeleitet | Zeitlich begrenzter Zugang, Audit-Log, kein Download |
| Datenverlust | Europäische Server mit Standard-Backup-Strategie |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Anti-Tagebuch-Paradigmenwechsel**
Alle bestehenden Symptom-Tracker basieren auf dem Tagebuch-Paradigma (tägliches Ausfüllen, Formulare, Checklisten). Dieses Produkt bricht fundamental damit — event-basiert statt pflichtbasiert. Keine Eingabe = guter Tag. Das ist kein Feature, sondern ein neues Paradigma für Symptom-Tracking.

**2. Dialekt-Freisprache → strukturierte medizinische Daten**
Die Kombination aus Schweizerdeutsch-Spracherkennung, Hochdeutsch-Übersetzung und KI-Symptom-Extraktion (Bezeichnung, Körperregion, Seite, Art, Intensität) in einem einzigen Schritt ist neuartig. Kein bestehendes Tool macht das.

**3. Lernendes persönliches Vokabular**
Jede Patienten-Korrektur trainiert ein individuelles Sprachmodell. Nach Monaten kennt die App die persönlichen Ausdrücke des Patienten — sinkender Aufwand statt steigender Ermüdung. Gegenteil des üblichen "App-Fatigue"-Problems.

**4. Pseudonymisierte Sharing-Links**
Null Hürde für Ärzte (kein Account, kein Login), volle Kontrolle für Patienten (zeitbegrenzt, kein Download, Audit-Log), und Daten im System keiner Person zuordenbar. Löst gleichzeitig Datenschutz, Arzt-Adoption und Patienten-Souveränität.

### Market Context & Competitive Landscape

- **Schmerztagebücher (Migraine Buddy, PainScale):** Formularbasiert, krankheitsspezifisch, tägliches Ausfüllen — Langzeit-Nutzung scheitert
- **Apple Health / Fitness-Tracker:** Objektive Vitaldaten, aber keine subjektive Symptombeschreibung und kein medizinischer Kontext
- **Keine bestehende Lösung** kombiniert Freisprache-Erfassung mit KI-Extraktion und arztgerechter Aufbereitung für seltene Erkrankungen
- **Timing:** Schweizerdeutsch-Spracherkennung und KI-Informationsextraktion haben erst kürzlich die nötige Qualität erreicht

### Validation Approach

| Innovation | Validierung | Pilot-Kriterium |
|-----------|------------|-----------------|
| Anti-Tagebuch | Langzeit-Retention >80% nach 3 Monaten | Celia nutzt App konsistent ohne Abbruch |
| Dialekt → Struktur | KI-Korrekturrate sinkend über Zeit | Schweizerdeutsch-Extraktion zuverlässig |
| Persönliches Vokabular | Weniger Nachfragen über Zeit | Nach 3 Monaten selten Korrekturen nötig |
| Sharing-Links | Arzt nutzt Dashboard in Konsultation | Dr. bestätigt Nutzen der Daten |

### Risk Mitigation

| Innovations-Risiko | Fallback |
|--------------------|----------|
| Schweizerdeutsch-Erkennung unzureichend | Hochdeutsch als Eingabesprache, Text-Eingabe als primäre Alternative |
| KI-Symptom-Extraktion zu ungenau | Patient korrigiert manuell, System lernt — akzeptable Anfangs-Fehlerrate wenn Korrektur einfach ist |
| Anti-Tagebuch-Prinzip funktioniert nicht (zu wenig Events) | Optionale sanfte Erinnerungen einführen (kein Tagebuch-Zwang, aber "Wie geht es dir?"-Check-in) |
| Ärzte ignorieren Sharing-Links | PDF-Export als Fallback, Patient druckt Report selbst aus |

## Web-App Specific Requirements

### Project-Type Overview

Single Page Application (SPA), mobilfähig, mit zwei klar getrennten Nutzungsmodi:
- **Erfassungsmodus:** Event-basierte Symptom-Eingabe (Sprache, Text, Foto) — optimiert auf Geschwindigkeit und minimale Interaktion
- **Auswertungsmodus:** Interaktives Dashboard mit Timeline, Symptom-Ranking, Drill-Down — optimiert auf Exploration und Informationstiefe

Zusätzlich: Marketing-Seite mit Demo-Video als öffentlicher Einstiegspunkt.

### Technical Architecture Considerations

**API-First Architektur:**
- Backend als klar definierte REST/GraphQL API — die Web-App ist der erste Client
- API-Design so, dass eine native iOS App und Apple Watch App als zusätzliche Clients angebunden werden können ohne Backend-Änderungen
- Authentifizierung über Standard-Protokoll (z.B. OAuth2/OIDC mit Apple ID), das sowohl Web als auch native Clients unterstützt
- Klare API-Contracts für: Symptom-Erfassung (Audio-Upload, Text, Fotos), KI-Ergebnis-Abruf, Patienten-Daten, Sharing-Link-Verwaltung

**Frontend-Architektur:**
- SPA für die App (Patient + Arzt-Ansicht)
- Klare Trennung Erfassung vs. Auswertung — zwei Modi, ein Datenmodell
- Arzt-Sharing-Ansicht als eigenständige Route (kein Login erforderlich, Token-basierter Zugang)
- Marketing-Seite kann statisch/SSR sein (SEO-relevant, Demo-Video)

**Browser-Matrix:**

| Browser | Version | Priorität |
|---------|---------|-----------|
| Safari (iOS) | Aktuelle + 1 zurück | Primär (Celia, Handy) |
| Safari (iPadOS) | Aktuelle + 1 zurück | Primär (Arzt, Sprechstunde) |
| Chrome (Desktop) | Aktuelle + 1 zurück | Primär (Arzt, Vorbereitung) |
| Edge (Desktop) | Aktuelle + 1 zurück | Sekundär |

**Responsive Design:**
- Mobile-first für Erfassungsmodus (iPhone-Grösse primär)
- Tablet-optimiert für Arzt-Ansicht (iPad in der Sprechstunde)
- Desktop-fähig für Arzt-Vorbereitung und Patienten-Auswertung

**Performance Targets:**
- Erfassungsmodus: App-Start bis Mikrofon-Button < 3 Sekunden
- Push-Benachrichtigung nach KI-Extraktion < 10 Sekunden
- Dashboard-Laden (6 Monate Daten) < 2 Sekunden
- PDF-Generierung < 20 Sekunden

**PWA-Capabilities:**
- Push-Benachrichtigungen (Überprüfung der KI-Extraktion)
- Kamera-Zugriff (Foto-Dokumentation)
- Mikrofon-Zugriff (Sprach-Erfassung)
- Offline: nicht erforderlich im MVP (Server-basiert)

### Marketing-Seite

- Öffentliche Landing Page mit SEO-Optimierung
- Demo-Video eingebettet
- Registrierungs-Link zur App
- Kein Login erforderlich

### Implementation Considerations

- **API-First:** Backend-API ist das Produkt, Web-App ist ein Client. Jede Funktion muss über die API erreichbar sein — kein Business-Logic im Frontend.
- **Native-Readiness:** API-Endpoints für Audio-Upload und Kamera-Upload so designen, dass sie von iOS/watchOS nativ angesprochen werden können (multipart upload, streaming-fähig).
- **Barrierefreiheit (WCAG):** Nicht Teil des MVP. Für spätere Ausweitung auf breitere Patientengruppen vormerken.
- **Internationalisierung:** MVP nur Deutsch. Sprachstruktur so anlegen, dass spätere Mehrsprachigkeit möglich ist.
- **Native Features nicht benötigt im MVP:** Kein App Store, kein Apple Watch, keine nativen APIs. Web-APIs (MediaRecorder, Camera) reichen. API-First-Architektur ermöglicht nahtlosen Ausbau.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP-Ansatz: Problem-Solving MVP**
Beweisen, dass event-basierte Spracherfassung mit KI-Extraktion für eine LDS-Patientin funktioniert und bei der Spezialisten-Konsultation einen echten Mehrwert liefert. Kein Revenue-MVP, kein Platform-MVP — reiner Proof of Concept mit echtem Nutzen.

**Ressourcen:**
- Solo-Entwickler (Andy) mit KI-gestützter Entwicklung (Claude Code + BMAD 6.0)
- Kein Team, kein Budget für externe Entwickler
- Implikation: MVP muss mit verfügbaren Cloud-Services und APIs realisierbar sein, keine Custom-ML-Modelle, keine aufwendige Infrastruktur

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

| Journey | MVP-Status |
|---------|-----------|
| Symptom-Erfassung (Sprache, Text, Foto) | ✅ Vollständig |
| Foto-Dokumentation (mehrere pro Event) | ✅ Vollständig |
| Medikamenten-Events (als Datenpunkte) | ✅ Vollständig |
| Onboarding (Apple ID, Zero-Formular) | ✅ Vollständig |
| Konsultations-Vorbereitung (Sharing, PDF) | ✅ Vollständig |
| Arzt-Konsultation (Dashboard, Drill-Down) | ✅ Vollständig |

**Must-Have Capabilities:**
1. Sprach-Eingabe mit Schweizerdeutsch → Hochdeutsch-Übersetzung
2. Text-Eingabe als Alternative
3. Foto-Erfassung (mehrere pro Symptom)
4. KI-Symptom-Extraktion (Bezeichnung, Körperregion, Seite, Art, Intensität)
5. Push-Benachrichtigung zur Überprüfung
6. Patienten-Korrektur mit Lerneffekt
7. Symptom-Ende markieren (Dauer)
8. Chronologischer Feed, Timeline, Symptom-Ranking
9. Sharing-Link (read-only, zeitbegrenzt, Audit-Log)
10. PDF-Export
11. KI-Zusammenfassung für Arzt
12. Original-Audio-Stream im Drill-Down
13. Apple ID Login
14. API-First Backend (native-ready)
15. Marketing-Seite mit Demo-Video
16. Disclaimer (kein Medizinprodukt)

### Post-MVP Features

**Phase 2 — Intelligent (nach erfolgreichem Pilot):**
- Native iOS App + Apple Watch
- Angehörigen-Berechtigung (Erfassung im Auftrag + Beobachtungen)
- Uhrdaten-Integration (Apple Health, passive Baseline)
- Erweiterte Analyse (Tageszeit-Muster, Aktivitäts-Matrix)
- Panik-Modus mit Nachfrage-Dialog
- WCAG Barrierefreiheit

**Phase 3 — Lebensretter (nach Nutzer-Wachstum):**
- Intelligente Insights mit Handlungsvorschlägen
- Stimmanalyse als Biomarker
- Proaktive Anomalie-Erkennung
- Notfall-System (3-Stufen-Eskalation)
- Ausweitung auf andere seltene Erkrankungen
- Krankenkassen-Finanzierung
- Mehrsprachigkeit

### Risk Mitigation Strategy

**Technische Risiken:**

| Risiko | Schwere | Mitigation |
|--------|---------|-----------|
| Schweizerdeutsch-Transkription unzureichend | Hoch | Evaluation mehrerer STT-Services (Whisper, Google, Azure). Fallback: Hochdeutsch sprechen oder Text-Eingabe. |
| KI-Symptom-Extraktion ungenau | Mittel | Manuell bereits validiert (Gemini, ChatGPT). Automatisierung über bestehende LLM-APIs. Patient korrigiert, System lernt. |
| Audio-Streaming ohne Download | Mittel | Standard Web Audio API. Technisch gelöst, aber Implementierungsaufwand. |
| Solo-Entwickler-Bottleneck | Hoch | Claude Code + BMAD beschleunigen Entwicklung. API-First ermöglicht modularen Ausbau. MVP-Scope bewusst schlank. |

**Markt-Risiken:**

| Risiko | Mitigation |
|--------|-----------|
| Celia nutzt App nicht langfristig | Anti-Tagebuch-Prinzip, 10s-Erfassung, kein Zwang. Direktes Feedback im Pilot. |
| Arzt sieht keinen Wert | PDF als Fallback. Informelles Feedback im Pilot, iterative Anpassung. |
| Datenschutz-Bedenken | Pseudonymisierung, europäische Server, Patienten-Kontrolle, Disclaimer. |

**Ressourcen-Risiken:**

| Risiko | Mitigation |
|--------|-----------|
| Scope zu gross für Solo-Entwickler | MVP bewusst auf 6 Core-Bereiche beschränkt. Kein native, kein Watch, keine Angehörigen. |
| Externe API-Kosten | STT und LLM Pay-per-Use — bei Pilot-Volumen (1 Patientin) minimal. |
| Zeitrahmen unklar | Kein fixer Deadline. Pilot startet wenn App nutzbar, nicht wenn perfekt. |

## Functional Requirements

### 1. Symptom-Erfassung

- **FR1:** Patient kann ein Symptom per Spracheingabe erfassen
- **FR2:** Patient kann ein Symptom per Texteingabe erfassen
- **FR3:** Patient kann ein oder mehrere Fotos zu einem Symptom-Event anhängen
- **FR4:** Patient kann ein Medikamenten-Event per Sprache oder Text erfassen (Einnahme, vergessene Einnahme, Dosis, Grund)
- **FR5:** Patient kann ein aktives Symptom als beendet markieren (Dauer wird berechnet)
- **FR6:** System transkribiert Schweizerdeutsch-Spracheingabe ins Hochdeutsche
- **FR7:** System extrahiert automatisch strukturierte Daten aus der Eingabe (Symptombezeichnung, Körperregion, Seite, Art, Intensität). Bei mehreren Symptomen/Medikamenten in einer Eingabe wird pro Eintrag ein separates Event erstellt.
- **FR8:** System unterscheidet zwischen Symptom-Events und Medikamenten-Events
- **FR9:** System zeigt nach Erfassung sofort eine Verarbeitungs-Bestätigung an
- **FR10:** System sendet Push-Benachrichtigung wenn die KI-Extraktion abgeschlossen ist

### 2. KI-Verarbeitung & Lernen

- **FR11:** System fragt bei Konfidenz unter 70% gezielt nach (z.B. "Oberer oder unterer Rücken?")
- **FR12:** Patient kann extrahierte Daten nach Verarbeitung überprüfen und korrigieren
- **FR13:** System lernt aus Patienten-Korrekturen und verbessert die Erkennung für diesen Patienten über Zeit
- **FR14:** System baut ein persönliches Symptom-Vokabular pro Patient auf
- **FR15:** System zeigt einen Konfidenz-Score pro extrahiertem Datenpunkt (bestätigt vs. KI-extrahiert)

### 3. Patienten-Ansicht

- **FR16:** Patient kann seine Symptom-Events in einem chronologischen Feed ansehen
- **FR17:** Patient kann eine Timeline-Ansicht über Monate einsehen
- **FR18:** Patient kann ein Symptom-Häufigkeits-Ranking mit Trendlinien einsehen
- **FR19:** Patient kann einzelne Events im Detail ansehen (inkl. Audio, Fotos, extrahierte Daten)
- **FR20:** Patient kann einzelne Events oder alle Daten löschen

### 4. Arzt-Konsultations-Export

- **FR21:** Patient kann einen Sharing-Link für einen Arzt generieren
- **FR22:** Patient kann den Zeitraum für den Sharing-Link auswählen
- **FR23:** Patient kann die Zugriffsdauer des Sharing-Links festlegen
- **FR24:** Patient kann den Sharing-Link per E-Mail an den Arzt versenden
- **FR25:** Patient kann einen PDF-Report generieren und herunterladen/drucken
- **FR26:** Arzt kann über den Sharing-Link ohne Login auf das Dashboard zugreifen
- **FR27:** Arzt kann eine KI-generierte Zusammenfassung des Zeitraums einsehen
- **FR28:** Arzt kann die Timeline mit allen Events einsehen
- **FR29:** Arzt kann ein Symptom-Ranking mit Trendlinien einsehen
- **FR30:** Arzt kann in einzelne Events eintauchen (Drill-Down)
- **FR31:** Arzt kann Original-Audio-Aufnahmen im Drill-Down anhören (Stream, kein Download)
- **FR32:** Arzt kann Fotos im Drill-Down ansehen (Ansicht, kein Download)
- **FR33:** Arzt-Dashboard ist auf Handy, iPad und Desktop nutzbar (responsive)

### 5. Account & Authentifizierung

- **FR34:** Nutzer kann sich mit Apple ID registrieren und anmelden
- **FR35:** Nutzer kann sofort nach Registrierung Symptome erfassen (kein Formular, kein Onboarding-Zwang)
- **FR36:** System speichert keine personenidentifizierenden Daten strukturiert — nur Account-ID

### 6. Daten-Souveränität & Sicherheit

- **FR37:** System speichert alle Daten pseudonymisiert (nur Account-ID, keine Personenzuordnung)
- **FR38:** Patient kann im Audit-Log einsehen, wer wann auf seine Daten zugegriffen hat
- **FR39:** Sharing-Links erlöschen automatisch nach der festgelegten Zugriffsdauer
- **FR40:** Sharing-Links erlauben nur Ansicht/Stream, keinen Download von Audio oder Fotos
- **FR41:** System zeigt beim Onboarding und in der App einen Disclaimer an (kein Medizinprodukt)
- **FR42:** Patient kann seinen Account und alle Daten vollständig löschen

### 7. Marketing & Plattform

- **FR43:** Öffentliche Marketing-Seite mit eingebettetem Demo-Video ist verfügbar
- **FR44:** Marketing-Seite enthält einen Registrierungs-Link zur App
- **FR45:** Backend stellt eine vollständige API bereit, über die alle Funktionen erreichbar sind (API-First)

## Non-Functional Requirements

### Performance

- **NFR1:** Erfassungsmodus: App-Start bis Mikrofon-Button bereit in < 3 Sekunden
- **NFR2:** KI-Extraktion (Transkription + Symptom-Extraktion) abgeschlossen in < 10 Sekunden nach Audio-Upload
- **NFR3:** Patienten-Dashboard mit 6 Monaten Daten lädt in < 2 Sekunden
- **NFR4:** PDF-Report-Generierung abgeschlossen in < 20 Sekunden
- **NFR5:** Arzt-Sharing-Dashboard lädt beim ersten Klick in < 3 Sekunden
- **NFR6:** Audio-Streaming im Drill-Down startet ohne spürbare Verzögerung (< 1 Sekunde)

### Security & Datenschutz

- **NFR7:** Alle Daten verschlüsselt bei Übertragung (TLS) und Speicherung (encryption at rest)
- **NFR8:** Keine personenidentifizierenden Daten strukturiert gespeichert — nur Account-ID als Referenz
- **NFR9:** Sharing-Links kryptographisch gesichert (nicht erratbar, nicht aufzählbar)
- **NFR10:** Audio- und Foto-Dateien nur per Stream/Ansicht zugänglich, kein direkter Download-Link
- **NFR11:** Audit-Log unveränderbar (append-only) — wer hat wann auf welche Daten zugegriffen
- **NFR12:** Schweizer nDSG-konform — Gesundheitsdaten als besonders schützenswerte Personendaten behandelt
- **NFR13:** Account-Löschung entfernt alle Daten vollständig und unwiderruflich (inkl. Audio, Fotos, Backups innerhalb von 30 Tagen)

### Reliability & Verfügbarkeit

- **NFR14:** System 7x24 verfügbar, Verfügbarkeit ≥ 99.5% — Symptome können jederzeit auftreten (auch nachts um 3)
- **NFR15:** Kleine Wartungsunterbrüche akzeptabel (< 30 Minuten, mit Vorankündigung)
- **NFR16:** Kein Datenverlust bei Systemausfall — erfasste Events und Uploads dürfen nicht verloren gehen
- **NFR17:** Tägliche automatische Backups der Datenbank und Medien-Dateien mit 30 Tagen Aufbewahrung

### Integration

- **NFR18:** Externe Speech-to-Text-API muss Schweizerdeutsch → Hochdeutsch-Übersetzung unterstützen
- **NFR19:** LLM-API für Symptom-Extraktion muss bei API-Ausfall graceful degraden (Erfassung trotzdem möglich, Extraktion wird nachgeholt)
- **NFR20:** Apple ID Login über Standard OAuth2/OIDC
- **NFR21:** Push-Benachrichtigungen über Web Push API (kein nativer Push)
- **NFR22:** E-Mail-Versand für Sharing-Links über native Mail-App des Patienten (mailto:-Link mit vorausgefülltem Entwurf)

### Scalability & Kosten

- **NFR23:** MVP-Architektur muss horizontal skalierbar sein — von 1 Patient auf 1000 ohne Architektur-Änderung
- **NFR24:** Medien-Speicher (Audio, Fotos) über Cloud Object Storage — unbegrenzt skalierbar
- **NFR25:** Infrastruktur und externe Services ausschliesslich pay-per-use — keine fixen Monatskosten für Server, Datenbank, STT, LLM, Storage oder E-Mail. Kosten skalieren linear mit der tatsächlichen Nutzung.

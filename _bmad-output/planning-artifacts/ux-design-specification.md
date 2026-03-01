---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/product-brief-lds-symptome-tracker-2026-02-28.md']
---

# UX Design Specification lds-symptome-tracker

**Author:** Andy
**Date:** 2026-03-01

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Der LDS Symptom Tracker ist eine ereignisbasierte Web-App mit zwei radikal unterschiedlichen Nutzungsmodi: Ein ultra-schneller Erfassungsmodus (Sprache/Text/Foto, <10 Sekunden) und ein informationsreicher Auswertungsmodus (Dashboard, Timeline, Drill-Down). Die UX-Herausforderung liegt in der Vereinigung dieser gegensätzlichen Anforderungen — Minimalismus bei der Erfassung, Informationstiefe bei der Auswertung — in einer kohärenten Produkterfahrung.

Das Anti-Tagebuch-Prinzip definiert die UX-Philosophie: Event-basiert statt pflichtbasiert. Keine Eingabe = guter Tag. Die App meldet sich nicht proaktiv — der Patient kommt, wenn etwas ist.

### Target Users

**Celia (17, LDS-Patientin) — Primäre Nutzerin**
- Gerät: iPhone (primär), Desktop (sekundär für Auswertung)
- Kontext: Erfasst spontan — abends auf dem Sofa (Sprache), im Unterricht (Text), unterwegs
- UX-Erwartung: So schnell und beiläufig wie eine WhatsApp-Sprachnachricht. Kein medizinisches UI-Gefühl
- Kritischer Moment: Push-Benachrichtigung → Review → Bestätigung/Korrektur muss in 1-2 Taps erledigt sein
- Emotional: Der "Aha-Moment" nach 3 Monaten — Muster entdecken, die ihr nicht bewusst waren

**Arzt/Spezialist — Konsument (kein aktiver Nutzer)**
- Geräte: iPad (Sprechstunde, gemeinsam mit Patientin), Desktop/Chrome (Vorbereitung, 5 Min)
- Kontext: Klickt Sharing-Link, braucht in 60 Sekunden Überblick, taucht bei Bedarf in Drill-Down ein
- UX-Erwartung: Null Einarbeitung. Klinische Klarheit. Sofortige Orientierung ohne Erklärung
- Kritischer Moment: KI-Zusammenfassung muss den Einstieg liefern — danach selbstgesteuerte Exploration
- Doppelnutzung: Allein am Desktop (Vorbereitung) UND gemeinsam mit Patientin auf iPad (Sprechstunde)

### Key Design Challenges

1. **Zwei-Modi-Architektur:** Erfassungsmodus (Speed, Minimalismus, mobile-first) vs. Auswertungsmodus (Informationstiefe, Exploration, responsive). Klare Trennung nötig — der Erfassungsmodus darf nicht durch Dashboard-Elemente verlangsamt werden. Gleichzeitig muss der Wechsel zwischen Modi natürlich sein.

2. **Asynchroner KI-Interaktions-Loop:** Erfassung (8s) → Verarbeitung (bis 10s) → Push-Benachrichtigung → Review → Bestätigung/Korrektur. Der Patient verlässt die App nach der Erfassung und kehrt per Push zurück. Die Korrektur-UI muss gleichzeitig einfach (1-Tap-Bestätigung) und mächtig (Symptomdetails ändern) sein.

3. **Drei-Geräte-Arzt-Ansicht:** Das Arzt-Dashboard muss auf iPhone, iPad und Desktop ohne Anpassung funktionieren. Der Arzt wählt nicht — er nimmt was da ist. Besonders die gemeinsame Nutzung auf dem iPad (Arzt + Patientin gleichzeitig) ist eine seltene UX-Anforderung.

4. **Null-Onboarding-Zwang:** Sowohl für die Patientin (Apple ID → sofort erstes Symptom) als auch für den Arzt (Link klicken → sofort KI-Zusammenfassung). Kein Tutorial, kein Wizard, kein "Lerne die App kennen".

### Design Opportunities

1. **Aha-Moment inszenieren:** Die App zeigt nach Monaten Muster, die der Patient nicht kannte. Dieser emotionale Höhepunkt muss UX-seitig gestaltet werden — nicht als trockene Statistik, sondern als persönliche Entdeckung.

2. **Gemeinsame Konsultations-Erfahrung:** Arzt und Patientin am iPad — eine UX, die für zwei Perspektiven gleichzeitig funktioniert. Chance für ein einzigartiges Interaktionsmodell, das in keiner bestehenden Health-App existiert.

3. **Anti-Tagebuch als UX-Prinzip:** Stille ist ein Feature. Leerer Zustand = guter Tag. Das erfordert ein radikales Umdenken bei Empty States, Notifications und Engagement-Patterns. Keine Gamification, keine Streaks, kein Schuldgefühl.

## Core User Experience

### Defining Experience

Die definierende Interaktion des LDS Symptom Trackers ist die **8-Sekunden-Spracherfassung**: App öffnen → Mikrofon-Button tippen → frei sprechen → fertig. Alles andere — KI-Extraktion, Strukturierung, Push-Benachrichtigung — passiert im Hintergrund. Der Patient investiert 8 Sekunden, das System liefert strukturierte medizinische Daten.

Diese Interaktion muss so natürlich sein wie eine Sprachnachricht senden. Kein Formular, kein Menü, kein Nachdenken. Der Mikrofon-Button ist das erste und wichtigste UI-Element — er definiert das Produkt visuell und funktional.

**Core Loop:**
1. Symptom tritt auf → Patient öffnet App (<3s bis Mikrofon bereit)
2. Spricht/tippt Symptom (8s) → "Wird verarbeitet..."
3. Patient verlässt App → KI arbeitet im Hintergrund
4. Push-Benachrichtigung: "Erfasst: [Extraktion]. Bitte überprüfen."
5. Patient tippt Push → Review-Screen → Bestätigen (1 Tap) oder Korrigieren
6. Event gespeichert → Timeline wächst still über Wochen und Monate

### Platform Strategy

**Primäre Plattform:** Progressive Web App (PWA), mobile-first

| Plattform | Nutzer | Modus | Priorität |
|-----------|--------|-------|-----------|
| iPhone (Safari) | Celia | Erfassung (Sprache, Text, Foto) | Primär |
| iPhone (Safari) | Celia | Auswertung (Feed, Timeline) | Sekundär |
| iPad (Safari) | Arzt | Konsultation (Dashboard, Drill-Down) | Primär |
| Desktop (Chrome) | Arzt | Vorbereitung (Dashboard, PDF) | Primär |
| Desktop (Chrome/Edge) | Celia | Auswertung (Timeline, Ranking) | Sekundär |

**PWA-Capabilities genutzt:**
- MediaRecorder API → Sprach-Erfassung
- Camera API → Foto-Dokumentation
- Web Push API → KI-Ergebnis-Benachrichtigung
- Kein Offline-Modus im MVP (KI-Verarbeitung server-basiert)

**Touch vs. Pointer:**
- Erfassungsmodus: 100% touch-optimiert (grosse Tap-Targets, Swipe-Gesten)
- Auswertungsmodus: Touch + Pointer (responsive, funktioniert auf allen Geräten)
- Arzt-Dashboard: Pointer-freundlich (Desktop-Vorbereitung) UND touch-freundlich (iPad-Sprechstunde)

### Effortless Interactions

**Muss sich wie Luft anfühlen (Zero Friction):**
1. **App-Start → Mikrofon:** <3 Sekunden. Kein Splash-Screen, kein Dashboard dazwischen. Erfassungsmodus ist der Default-Zustand.
2. **Push → Review → Bestätigung:** 1 Tap auf Push öffnet Review-Screen. Alles korrekt? 1 Tap "Bestätigen". Gesamtdauer: 3 Sekunden.
3. **Sharing-Link generieren:** Zeitraum wählen → E-Mail eingeben → Senden. Drei Schritte, kein Wizard.
4. **Arzt-Einstieg:** Link klicken → KI-Zusammenfassung sofort sichtbar. Kein Login, kein Cookie-Banner, kein Onboarding.

**Muss automatisch passieren (System-Arbeit):**
- Schweizerdeutsch → Hochdeutsch-Übersetzung
- Symptom-Extraktion (Bezeichnung, Region, Seite, Art, Intensität)
- Symptom vs. Medikament unterscheiden
- Konfidenz-Score berechnen
- Dauer berechnen bei Symptom-Ende
- Sharing-Link-Ablauf und Audit-Log

**Korrektur-UI — der kritische Balanceakt:**
- Default: 1-Tap-Bestätigung ("Alles korrekt")
- Bei Fehler: Inline-Editing der extrahierten Felder (Symptomname, Region, Seite, Art, Intensität)
- Bei niedriger Konfidenz (<70%): Gezielte Nachfrage mit Auswahloptionen ("Oberer oder unterer Rücken?")
- Lerneffekt sichtbar machen: "Beim letzten Mal hast du 'Rügge' korrigiert zu 'Rücken links' — dieses Mal habe ich es direkt erkannt."

### Critical Success Moments

**Moment 1: Erste Erfassung (Onboarding)**
- Trigger: Apple ID Login → App öffnet sich
- Erwartung: Innerhalb 15 Sekunden erstes Symptom erfasst
- UX-Design: Grosser Mikrofon-Button, Hinweis "Sprich oder tippe dein erstes Symptom." Sonst nichts.
- Erfolg: Celia denkt "Das war's? So einfach?"

**Moment 2: Erste korrekte KI-Extraktion**
- Trigger: Push-Benachrichtigung nach erster Erfassung
- Erwartung: Die extrahierten Daten stimmen — "Die App versteht Schweizerdeutsch!"
- UX-Design: Klare Darstellung der extrahierten Struktur, grosser "Bestätigen"-Button
- Erfolg: Vertrauen in das System aufgebaut

**Moment 3: Aha-Moment (nach 3 Monaten)**
- Trigger: Patient öffnet Auswertungsmodus / Timeline
- Erwartung: Muster sichtbar, die der Patient nicht kannte
- UX-Design: Symptom-Ranking mit Trendlinien, Häufigkeits-Visualisierung, zeitliche Muster
- Erfolg: "Rückenschmerzen 12x, 8x abends, Trend steigend — das wusste ich gar nicht."

**Moment 4: Arzt-Konsultation**
- Trigger: Arzt klickt Sharing-Link
- Erwartung: In 60 Sekunden vollständiger Überblick
- UX-Design: KI-Zusammenfassung als Einstieg, dann Timeline und Ranking, Drill-Down bei Bedarf
- Erfolg: Arzt sagt "Die Daten waren hilfreich für meine Beurteilung."

### Experience Principles

1. **Speed Over Features:** Jede Millisekunde zählt bei der Erfassung. Kein Feature darf den Erfassungsmodus verlangsamen. Lieber ein Feature weglassen als 1 Sekunde hinzufügen.

2. **Stille ist ein Feature:** Keine Eingabe = guter Tag. Kein leerer Zustand als Problem. Keine Reminder. Keine Streaks. Keine Gamification. Die App wartet geduldig.

3. **KI unsichtbar, Kontrolle sichtbar:** Die KI arbeitet im Hintergrund — der Patient sieht nur das Ergebnis und hat volle Kontrolle über Bestätigung und Korrektur. Konfidenz-Score zeigt Transparenz, nicht Unsicherheit.

4. **Null-Einarbeitung, überall:** Weder Patient noch Arzt brauchen Erklärungen. Jeder Screen muss ohne Kontext verständlich sein. Der Mikrofon-Button erklärt den Erfassungsmodus. Die KI-Zusammenfassung erklärt das Arzt-Dashboard.

5. **Zwei Modi, ein Produkt:** Erfassung und Auswertung sind zwei verschiedene Erfahrungen in einer App. Sie teilen Daten, nicht UI-Patterns. Erfassung = Minimalismus. Auswertung = Informationstiefe.

## Desired Emotional Response

### Primary Emotional Goals

**Für die Patientin (Celia):**

| Emotion | Beschreibung | Wann |
|---------|-------------|------|
| **Beiläufigkeit** | "Ist ja nur kurz" — Erfassung fühlt sich an wie eine Sprachnachricht, nicht wie medizinische Dokumentation | Bei jeder Erfassung |
| **Kontrolle** | "Ich habe das im Griff" — Die App versteht mich, ich entscheide was erfasst wird und wer es sieht | Nach Bestätigung, bei Korrektur, bei Sharing |
| **Empowerment** | "Ich kenne meinen Körper" — Muster entdecken, die mir nicht bewusst waren | Beim Aha-Moment, bei der Auswertung |
| **Stolz** | "Ich komme vorbereitet zum Arzt" — Faktenbasiert statt aus bruchstückhafter Erinnerung | Bei der Konsultation |
| **Stille** | Gar nichts — die App ist nicht präsent an guten Tagen | An symptomfreien Tagen |

**Für den Arzt:**

| Emotion | Beschreibung | Wann |
|---------|-------------|------|
| **Professionelles Vertrauen** | "Das sieht seriös und medizinisch brauchbar aus" | Beim ersten Öffnen des Sharing-Links |
| **Effizienz** | "In 60 Sekunden habe ich das vollständige Bild" | Bei der KI-Zusammenfassung |
| **Neugier** | "Das will ich genauer verstehen" | Beim Drill-Down in auffällige Muster |

### Emotional Journey Mapping

**Celia — Emotionale Reise über Monate:**

```
Onboarding     → "So einfach?" (Überraschung, Erleichterung)
Erste Woche    → "Die versteht Schweizerdeutsch!" (Staunen, Vertrauen)
Erste Korrektur → "Okay, nächstes Mal weiss sie es" (Geduld, Partnerschaft)
Stille Woche   → [Nichts — App ist nicht da] (Ruhe, kein Schuldgefühl)
Nach 3 Monaten → "Das wusste ich gar nicht!" (Aha, Empowerment)
Vor Arzttermin → "Ich bin vorbereitet" (Stolz, Selbstwirksamkeit)
Beim Arzt      → "Der Arzt nimmt meine Daten ernst" (Bestätigung, Wert)
```

**Arzt — Emotionale Reise in 5 Minuten:**

```
Link klicken   → "Kein Login? Gut." (Erleichterung)
Zusammenfassung → "Kompakt, klar, nützlich" (Effizienz, Vertrauen)
Timeline       → "Interessant, da ist ein Muster" (Neugier)
Drill-Down     → "Original-Audio, Fotos — fundiert" (Tiefe, Respekt)
Sprechstunde   → "Das ist ein echtes Puzzlestück" (Bestätigung)
```

### Micro-Emotions

**Kritische Micro-Emotions und ihre UX-Implikationen:**

| Micro-Emotion | Gewünscht | Zu vermeiden | UX-Antwort |
|---------------|-----------|-------------|------------|
| **Vertrauen vs. Skepsis** | "Die KI hat es richtig erkannt" | "Kann ich den Daten trauen?" | Konfidenz-Score sichtbar, Korrektur jederzeit möglich, Lerneffekt kommunizieren |
| **Leichtigkeit vs. Last** | "Ist schnell erledigt" | "Schon wieder eintragen..." | Erfassung <10s, kein Formular, keine Pflichtfelder |
| **Selbstwirksamkeit vs. Hilflosigkeit** | "Ich tue aktiv etwas für meine Gesundheit" | "Meine Krankheit kontrolliert mich" | Patient kontrolliert alle Daten, Muster zeigen Handlungsfähigkeit |
| **Partnerschaft vs. Überwachung** | "Die App arbeitet mit mir" | "Die App beobachtet mich" | Patient initiiert alles, keine proaktiven Analysen, kein Tracking im Hintergrund |
| **Gelassenheit vs. Angst** | "Ich habe meine Geschichte dokumentiert" | "Meine Symptome werden schlimmer!" | Keine Warnungen, keine Diagnosen, neutrale Darstellung von Trends |

### Design Implications

**Emotion → UX-Entscheidung:**

1. **Beiläufigkeit → Messenger-Ästhetik:** Die Erfassungs-UI orientiert sich an Messaging-Apps (grosser runder Button, minimale UI-Elemente), nicht an medizinischen Formularen. Warme Farben, keine klinischen Blau-/Weisstöne.

2. **Kontrolle → Bestätigung statt Automatismus:** Jede KI-Extraktion wird dem Patienten zur Bestätigung vorgelegt. Nichts wird ohne explizites "Okay" gespeichert. Der Patient ist der Boss, die KI ist die Assistentin.

3. **Stille → Leere als Design:** Empty States zeigen keine traurigen Illustrationen oder "Noch keine Einträge!"-Messages. Stattdessen: Ruhige, zurückhaltende UI, die einfach den Mikrofon-Button zeigt. Stille = der beste Zustand.

4. **Professionelles Vertrauen → Klinische Klarheit im Dashboard:** Die Arzt-Ansicht nutzt klare Typografie, nüchterne Farben, datengetriebene Visualisierungen. Kein verspieltes Design. Der Arzt muss sofort denken: "Das ist ein seriöses Tool."

5. **Kein Angst-Design → Neutrale Trend-Darstellung:** Steigende Symptomhäufigkeit wird als Fakt dargestellt ("12x, Trend steigend"), nicht als Warnung ("Achtung, Verschlechterung!"). Die Interpretation bleibt beim Arzt.

### Emotional Design Principles

1. **Warm, nicht klinisch:** Die Patienten-UI fühlt sich persönlich und einladend an — wie eine vertraute App, nicht wie ein medizinisches Tool. Schweizerdeutsch in Beispielen und Hinweisen verstärkt das Heimatgefühl.

2. **Fakten, nicht Urteile:** Die App zeigt Daten, keine Bewertungen. "12x Rückenschmerzen, Trend steigend" — nicht "Ihre Rückenschmerzen verschlechtern sich." Die medizinische Interpretation ist Sache des Arztes.

3. **Partnerschaft mit der KI:** Fehler der KI werden als normaler Lernprozess kommuniziert. "Ich lerne noch dein Vokabular" statt "Fehler bei der Erkennung." Jede Korrektur ist ein Beitrag zur Verbesserung, kein Beweis für Versagen.

4. **Zwei Tonalitäten, ein Produkt:** Patienten-UI: warm, persönlich, jugendlich, Schweizerdeutsch-freundlich. Arzt-UI: professionell, nüchtern, datengetrieben, klinisch klar. Gleiche Daten, andere emotionale Sprache.

5. **Abwesenheit als höchste Form:** Die beste Interaktion ist keine Interaktion. An guten Tagen existiert die App nicht im Bewusstsein der Patientin. Kein Badge, kein Reminder, kein "Du hast heute noch nichts erfasst."

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**ChatGPT — Conversational AI Interface**

Vom User als primäre UX-Inspiration benannt: "Wenn sich das Erfassen so natürlich anfühlt wie ich mit ChatGPT kommuniziere, wäre das super."

| Aspekt | Was ChatGPT richtig macht | Übertragung auf LDS Symptom Tracker |
|--------|--------------------------|-------------------------------------|
| **Eingabe-Pattern** | Ein Textfeld + Mikrofon. Keine Menüs, keine Kategorien. Freie Sprache als primäre Interaktion. | Erfassungs-Screen: Ein grosser Mikrofon-Button, ein Textfeld. Sonst nichts. |
| **Natürliche Sprache** | Man tippt/spricht wie man denkt — kein Umdenken in App-Logik. Das System versteht Kontext. | Celia spricht Schweizerdeutsch, wie sie denkt. KI macht die Strukturierung. |
| **Sofortiges Feedback** | Antwort erscheint direkt — man sieht, dass das System verstanden hat. | "Wird verarbeitet..." → Extrahierte Symptome erscheinen als Bestätigung. |
| **Konversationelle Korrektur** | Fehler korrigiert man durch Sprechen, nicht durch Formular-Editing. | Nachfrage bei niedriger Konfidenz als Chat-artige Interaktion ("Oberer oder unterer Rücken?") |
| **Minimale UI-Chrome** | Fast kein Interface. Der Content ist das Interface. | Erfassungsmodus: Mikrofon-Button dominiert, alles andere tritt zurück. |

**WhatsApp — Messaging UX-Metapher**

Im PRD als Erklärungsmetapher etabliert: "Die ist wie WhatsApp — du sprichst einfach rein wenn was ist."

| Aspekt | Was WhatsApp richtig macht | Übertragung |
|--------|---------------------------|-------------|
| **Sprachnachricht** | 1 Button gedrückt halten → sprechen → loslassen. Fertig. | Gleiche Geste für Symptom-Erfassung — vertrautes Interaktionsmuster |
| **Chronologischer Feed** | Nachrichten fliessen von oben nach unten, zeitlich sortiert | Symptom-Feed als Chat-artiger Stream — vertrautes Mental Model |
| **Push-Benachrichtigung** | Kurze Vorschau, 1 Tap öffnet die Nachricht | KI-Ergebnis als Push: "Erfasst: Rückenschmerzen links. Überprüfen?" |
| **Beiläufigkeit** | Nachricht schicken ist kein Event, sondern Alltag | Symptom erfassen soll sich genauso beiläufig anfühlen |

### Transferable UX Patterns

**Navigation Patterns:**
- **Chat-First-Screen:** Erfassungsmodus als Default. Wie bei ChatGPT: App öffnen → Eingabe sofort bereit. Kein Dashboard dazwischen.
- **Tab-basierter Modus-Wechsel:** Erfassung ↔ Auswertung über Bottom-Tab-Bar. Zwei Modi, klare Trennung, schneller Wechsel.

**Interaction Patterns:**
- **Conversational Capture:** Symptom-Erfassung als Chat-artige Interaktion. Celia "schreibt" der App, die App "antwortet" mit der Extraktion. Bei Nachfragen entsteht ein Mini-Dialog.
- **Hold-to-Record:** WhatsApp-Sprachnachrichten-Geste (Button halten → sprechen → loslassen) als vertrautes Pattern für Sprach-Erfassung.
- **Inline-Bestätigung:** KI-Extraktion erscheint als "Antwort" im Chat-Flow. Bestätigen = 1 Tap. Korrektur = auf das zu ändernde Feld tippen.

**Visual Patterns:**
- **Bubble-UI für Erfassung:** Symptom-Events als Chat-Bubbles im Feed — vertrautes Mental Model für Teenager.
- **Card-UI für Auswertung:** Dashboard mit Karten (KI-Zusammenfassung, Timeline, Ranking) — vertrautes Pattern für datenreiche Ansichten.
- **Minimale Farbpalette:** Erfassung in warmen, einladenden Tönen. Arzt-Dashboard in neutralen, professionellen Tönen.

### Anti-Patterns to Avoid

| Anti-Pattern | Warum vermeiden | Alternative |
|-------------|----------------|-------------|
| **Formular-basierte Erfassung** (Migraine Buddy, PainScale) | 15+ Felder, Dropdowns, Pflicht-Kategorien → Erfassung dauert 2-3 Minuten statt 10 Sekunden | Freie Sprache/Text, KI strukturiert automatisch |
| **Tägliche Reminder** ("Du hast heute noch nicht...") | Erzeugt Schuldgefühl, widerspricht Anti-Tagebuch → App-Fatigue | Keine Reminder. Stille = guter Tag. |
| **Gamification** (Streaks, Badges, Punkte) | Trivialisiert ernste Gesundheitsdaten → unangemessen bei seltener Erkrankung | Intrinsische Motivation durch Aha-Moment und Arzt-Nutzen |
| **Klinisches UI-Design** (Spital-Blau, Krankenwagen-Icons) | Erzeugt Angst-Assoziation → Teenager-unfreundlich | Warme, persönliche Ästhetik — mehr Messenger als Medizin |
| **Onboarding-Wizard** (5 Schritte, Diagnose-Auswahl, Medikamenten-Liste) | Verzögert den Aha-Moment → Abbruch vor erster Nutzung | Zero-Formular: Apple ID → sofort erstes Symptom |
| **Symptom-Checklisten** (vordefinierte Symptome zum Ankreuzen) | Schränkt ein, ignoriert individuelle Beschreibung → nicht für seltene Erkrankungen geeignet | Freitext/Freisprache — jedes Symptom in eigenen Worten |

### Design Inspiration Strategy

**Übernehmen (Adopt):**
- ChatGPT: Single-Input-Interface für Erfassung — ein Feld, freie Sprache, System versteht
- WhatsApp: Hold-to-Record-Geste, chronologischer Feed, Push-Benachrichtigungen
- WhatsApp: Beiläufigkeit der Interaktion — Nachricht schicken ist kein Event

**Anpassen (Adapt):**
- ChatGPT Konversations-Flow → für Korrektur/Nachfrage bei niedriger Konfidenz. Aber: kürzer, 1-2 Runden max, keine lange Konversation
- Chat-Bubbles → für den Symptom-Feed. Aber: mit strukturierten Daten angereichert (Symptomname, Region, Intensität als Tags)
- Card-UI → für Arzt-Dashboard. Aber: klinisch-professionell statt bunt-verspielt

**Vermeiden (Avoid):**
- Alles von Migraine Buddy/PainScale: Formulare, Reminder, Gamification, Checklisten
- Klinische Ästhetik: Spital-Blau, medizinische Iconografie, Warnfarben
- Onboarding-Friction: Wizard, Pflichtfelder, "Bevor du loslegst..."

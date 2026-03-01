---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-02-28.md']
date: 2026-02-28
author: Andy
workflow_completed: true
---

# Product Brief: lds-symptome-tracker

## Executive Summary

Der **LDS Symptom Tracker** ist eine sprach- und textbasierte App zur ereignisbasierten Erfassung von Symptomen für Patienten mit chronischen und seltenen Erkrankungen. Patienten beschreiben Symptome in 10 Sekunden per Sprachnachricht — die KI extrahiert automatisch strukturierte medizinische Daten. Über Monate entsteht eine objektive Symptomgeschichte mit Mustern, Trends und Korrelationen, die bei der Spezialisten-Konsultation faktenbasierte Gespräche ermöglicht. Statt subjektiver Erinnerung an die letzten Tage bekommt der Arzt ein vollständiges Bild — ein wichtiges Puzzlestück für die Beurteilung des weiteren Vorgehens, ob im interdisziplinären Board oder bei der Anordnung weiterer Analysen.

---

## Core Vision

### Problem Statement

Patienten mit seltenen Erkrankungen wie dem Loeys-Dietz-Syndrom (LDS) haben typischerweise eine enge medizinische Betreuung mit jährlicher Spezialisten-Sprechstunde. Ärzte beurteilen den Zustand des Patienten anhand von Bildgebung, Spezialisten-Berichten und dem Gespräch mit dem Patienten. Bei Bedarf besprechen sie das weitere Vorgehen in einem interdisziplinären Board — ob weitere Analysen nötig sind oder präventive Massnahmen eingeleitet werden sollen. Die subjektive Symptomgeschichte des Patienten ist dabei ein wichtiges Puzzlestück — aber genau dieses Stück fehlt heute in objektiver Form. Stattdessen basiert es auf der Erinnerung des Patienten, die vom Befinden der letzten Tage oder einzelnen Ereignissen geprägt ist.

Subtile Muster — zunehmende Rückenverspannungen, schleichende Atemnot, häufigere Schmerzmittel-Einnahme — gehen verloren, obwohl sie entscheidende Frühwarnzeichen sein können. Bei seltenen Erkrankungen gibt es keine brauchbaren statistischen Normen — die eigene Symptomgeschichte ist die wertvollste Ressource für die medizinische Betreuung.

### Problem Impact

- **Ein wichtiges Puzzlestück fehlt:** Das interdisziplinäre Board und die Spezialisten entscheiden auf Basis von Bildgebung und Berichten — aber die objektive Symptomhistorie des Patienten über Monate fehlt als Entscheidungsgrundlage
- **Präventive Massnahmen** (z.B. Aorten-Eingriff) können nicht optimal beurteilt werden — die subjektive Verschlechterung des Patienten ist nur als Erinnerungsfragment verfügbar
- **Weitere Analysen** werden möglicherweise nicht angeordnet, weil das schleichende Muster in der Sprechstunde nicht sichtbar wird
- **Medikamenten-Anpassungen** erfolgen ohne Wissen über den tatsächlichen Symptomverlauf und die Medikamenten-Compliance im Alltag
- **Schleichende Verschlechterung** bleibt unbemerkt, weil Patienten sich an langsame Veränderungen gewöhnen
- **Bestehende Lösungen** (Schmerztagebücher, Symptom-Apps) scheitern an zu aufwendiger Eingabe oder Beschränkung auf spezifische Symptomtypen — Patienten hören nach 2 Wochen auf

### Why Existing Solutions Fall Short

- **Schmerztagebücher und Apps (Migraine Buddy, PainScale):** Zu aufwendige Eingabe, oft formularbasiert, auf spezifische Symptome beschränkt. Tägliches Ausfüllen fühlt sich an wie Hausaufgaben — Langzeit-Nutzung scheitert
- **Apple Health / Fitness-Tracker:** Sammeln objektive Vitaldaten, aber keine subjektiven Symptombeschreibungen. Kein Kontext, keine Patientenstimme
- **Papier-Tagebücher:** Keine Auswertung, keine Mustererkennung, gehen verloren, werden vergessen
- **Kein bestehendes Tool** kombiniert Freisprache-Erfassung mit KI-Extraktion, Uhrdaten-Integration und arztgerechter Auswertung für seltene Erkrankungen

### Proposed Solution

Eine ereignisbasierte Symptom-Tracking-App, die auf drei Prinzipien aufbaut:

1. **10-Sekunden-Erfassung:** Patient spricht ein Symptom per Sprach- oder Textnachricht ein — so beiläufig wie eine WhatsApp-Nachricht. KI extrahiert automatisch Symptombezeichnung, Körperregion, Art und Intensität. Kein Formular, kein tägliches Protokoll.

2. **Intelligente Langzeit-Auswertung:** Über Monate entsteht eine strukturierte Symptomgeschichte mit Häufigkeits-Trends, Symptom-Korrelationen, Aktivitäts-Kontext und optional integrierten Gesundheitsdaten der Smartwatch. Das System erkennt Muster, die der Patient selbst nicht bemerkt.

3. **Arzt-Konsultations-Export:** Vor der Sprechstunde generiert der Patient einen Sharing-Link — der Arzt sieht ein Dashboard mit 60-Sekunden-Zusammenfassung, Timeline, Symptom-Ranking und Drill-Down-Möglichkeit. Alternativ als PDF zum Ausdrucken oder gemeinsam auf dem iPad während der Sprechstunde. Kein Account, kein System nötig.

### Key Differentiators

- **Anti-Tagebuch-Prinzip:** Event-basiert statt pflichtbasiert. Keine Eingabe = guter Tag. Radikal anders als alle Symptom-Tracker
- **Sprache als Hauptkanal mit KI-Extraktion:** Patient spricht frei, KI strukturiert — auch in Schweizerdeutsch. Respektiert die Körperkompetenz von Patienten mit seltenen Erkrankungen
- **Lernendes System:** Jede Korrektur verbessert die Erkennung. Nach Monaten kennt die App das persönliche Vokabular des Patienten
- **Null Hürde für Ärzte:** Sharing-Link statt Arzt-Portal. Funktioniert in jeder Praxis, mit jeder IT
- **Gebaut von Betroffenen:** Direkte Erfahrung als Begleitperson einer LDS-Patientin — nicht theoretisch, sondern aus jahrelanger gelebter Realität
- **Timing:** Zuverlässige KI-Spracherkennung (auch Dialekte) und Symptom-Extraktion sind erst seit kurzem technisch möglich
- **Nicht krankheitsspezifisch:** Ereignisbasierte Symptomerfassung funktioniert für alle chronischen Beschwerden — aber optimiert für seltene Erkrankungen, wo die eigene Geschichte die einzige Norm ist

## Target Users

### Primary Users

**Persona 1: Celia (17) — LDS-Patientin**

Celia hat seit der Kindheit die Diagnose Loeys-Dietz-Syndrom. Sie kennt ihren Körper gut und kann Symptome präzise beschreiben — "Ziehen links neben dem Schulterblatt, stärker als letzte Woche." Sie hat eine jährliche Spezialisten-Sprechstunde und wird von mehreren Fachärzten betreut (Kardiologie, Pneumologie, Orthopädie). Zwischen den Konsultationen erlebt sie regelmässig Symptome — manche beunruhigend (nachts, allein), manche alltäglich (Atemnot beim Treppensteigen). Sie dokumentiert aktuell nichts, weil es kein Tool gibt das einfach genug ist.

- **Motivation:** Kontrolle über ihre eigene Gesundheitsgeschichte. Dem Arzt faktenbasiert berichten statt aus bruchstückhafter Erinnerung.
- **Kontext:** Schülerin, Handy immer dabei, Apple Watch am Handgelenk. Kann im Unterricht nicht sprechen — braucht auch Text-Eingabe und Web-Zugang.
- **Frustration:** Bestehende Symptom-Apps sind zu aufwendig oder auf spezifische Symptome beschränkt. Tägliches Ausfüllen wird nach 2 Wochen aufgegeben.
- **Erfolgsmoment:** Beim nächsten Arzttermin öffnet sie den Sharing-Link und der Spezialist sagt: "Das ist genau das Bild das ich brauche."

**Persona 2: Andy (Vater) — Angehöriger und Begleitperson**

Andy begleitet seine Tochter bei allen medizinischen Events und hat dadurch jahrelange Erfahrung mit LDS. Er beobachtet Symptome, die seine Tochter vielleicht nicht erwähnt oder als normal abtut. Er war bei jeder Sprechstunde dabei und weiss, welche Informationen dem Arzt fehlen. Er möchte seine Tochter unterstützen, ohne sich aufzudrängen.

- **Motivation:** Seiner Tochter das bestmögliche Werkzeug geben. Eigene Beobachtungen beisteuern, die das Bild vervollständigen.
- **Kontext:** Berechtigt von der Patientin, erfasst sowohl Symptome im Auftrag ("Celia sagt, sie hat Kopfschmerzen") als auch eigene Beobachtungen ("Sie war nach dem Treppensteigen auffällig kurzatmig"). Beobachtungen von Angehörigen werden separat ausgewiesen.
- **Frustration:** In der Sprechstunde fehlt die Langzeitsicht. Subtile Veränderungen, die er über Monate beobachtet, lassen sich mündlich schwer vermitteln.
- **Erfolgsmoment:** Seine Beobachtung "zunehmende Kurzatmigkeit beim Treppensteigen seit Oktober" wird als Trend sichtbar und führt zu einer frühzeitigen Abklärung.

### Berechtigungsmodell für Angehörige

- Ein Patient kann mehrere Angehörige berechtigen (z.B. beide Elternteile)
- Ein Angehöriger kann mehrere Patienten betreuen
- Angehörige können Symptome im Auftrag des Patienten erfassen — markiert als "von Angehörigem erfasst"
- Angehörige können eigene Beobachtungen erfassen — separat ausgewiesen als Fremdbeobachtung
- Berechtigung wird vom Patienten erteilt und kann jederzeit widerrufen werden

### Secondary Users

**Arzt / Spezialist — Konsument (kein aktiver Nutzer)**

Der Spezialist erhält vor oder während der Konsultation einen Sharing-Link vom Patienten. Er klickt, sieht ein Dashboard mit KI-Zusammenfassung, Timeline, Symptom-Ranking und Drill-Down-Möglichkeit. Kein Account, kein Login, keine Installation. Er konsumiert die aufbereiteten Daten als ein Puzzlestück neben Bildgebung und Fachberichten — für seine eigene Beurteilung und als Input für das interdisziplinäre Board.

- **Bedarf:** 60-Sekunden-Überblick, dann bei Bedarf tiefer eintauchen. Original-Audio anhören können. Fakten statt Erinnerungsfragmente.
- **Kontext:** 30 Minuten pro Patient, bereitet sich evtl. 5 Minuten vor. Braucht null Einarbeitung.
- **Konsultations-Modi:** Während der Sprechstunde gemeinsam mit dem Patienten auf dem iPad anschauen, oder vorab als ausgedruckten PDF-Report in die Patientenakte legen. Beides muss funktionieren.

### User Journey

**Celia's Journey:**

1. **Entdeckung:** Ihr Vater zeigt ihr die App. "Die ist wie WhatsApp — du sprichst einfach rein wenn was ist."
2. **Onboarding (60 Sekunden):** Name, Diagnose LDS, Medikamente per Sprache. Fertig.
3. **Erster Event:** Abends Rückenschmerzen. Handy öffnen, Mikrofon-Button, "Habe gerade Ziehen im Rücken, links neben dem Schulterblatt." 8 Sekunden. App zeigt: "Erfasst: Rückenschmerzen, links, Schulterblatt, ziehend ✓"
4. **Alltag:** Nur wenn etwas ist. Keine Reminder, keine Pflicht. Stille Wochen = gute Wochen. Manchmal Text im Unterricht. Manchmal Sprache abends.
5. **Aha-Moment:** Nach 3 Monaten zeigt die App: "Rückenschmerzen 12x, davon 8x abends, Intensität leicht steigend." Celia denkt: "Das wusste ich gar nicht."
6. **Konsultation:** Celia schickt vorab den Sharing-Link per Mail. Der Spezialist druckt den PDF-Report aus und legt ihn zur Patientenakte. Während der Sprechstunde öffnen Celia und der Arzt den interaktiven Report gemeinsam auf dem iPad — der Arzt kann bei auffälligen Events tiefer eintauchen, Original-Audio anhören. Die Kombination aus Papier-Übersicht und interaktivem Drill-Down passt sich an den Workflow jeder Praxis an.
7. **Langzeit:** Die App wird selbstverständlich — wie eine Gesundheits-Notiz an sich selbst. Nach 6 Monaten kennt die KI Celias Vokabular und fragt fast nie mehr nach.

**Andy's Journey (Angehöriger):**

1. **Berechtigung:** Celia teilt den Zugang mit ihrem Vater über die App.
2. **Eigene Beobachtungen:** Andy erfasst: "Celia war heute nach 1 Stockwerk sichtbar ausser Atem — vor 3 Monaten waren es noch 3 Stockwerke." Wird als Angehörigen-Beobachtung markiert.
3. **Erfassung im Auftrag:** Wenn Celia gerade nicht kann, erfasst Andy für sie — wird als "von Angehörigem erfasst" ausgewiesen.
4. **Konsultation:** In der Sprechstunde ergänzt Andys Beobachtungs-Perspektive Celias Selbsteinschätzung.

## Success Metrics

### Nutzer-Erfolg (User Success)

**Patienten-Perspektive:**
- **Erfassungsrate:** Patient nutzt die App bei auftretenden Symptomen konsistent über Monate (kein Abbruch nach 2 Wochen wie bei Tagebuch-Apps)
- **Erfassungsgeschwindigkeit:** Durchschnittliche Symptom-Erfassung unter 15 Sekunden
- **KI-Genauigkeit:** Symptom-Extraktion wird über Zeit besser — sinkende Korrekturrate pro Patient
- **Konsultations-Nutzung:** App wird bei der Spezialisten-Sprechstunde als Grundlage eingesetzt
- **Aha-Moment:** Patient entdeckt Muster in seinen eigenen Daten, die ihm vorher nicht bewusst waren

**Angehörigen-Perspektive:**
- Angehörige nutzen die Berechtigung aktiv, um eigene Beobachtungen beizusteuern
- Beobachtungen von Angehörigen ergänzen die Patienten-Daten sichtbar bei der Konsultation

### Business Objectives

**Phase: Pilot (0-6 Monate)**
- Erfolgreicher Pilot mit Celias realer LDS-Betreuung
- App wird bei mindestens einer Spezialisten-Konsultation als Grundlage genutzt
- Arzt-Feedback: "Die Daten waren hilfreich für meine Beurteilung"
- Technische Validierung: KI-Symptom-Extraktion funktioniert zuverlässig für Schweizerdeutsch und Hochdeutsch

**Phase: Erste Nutzer (6-12 Monate)**
- Ausweitung auf weitere LDS-Patienten (z.B. über LDS-Selbsthilfegruppen, Patientenorganisationen)
- Validierung des Freemium-Modells: Konversion von kostenloser Erfassung zu Abo bei Arzt-Sharing
- Erste Rückmeldungen von mehreren Spezialisten

**Phase: Wachstum (12+ Monate)**
- Ausweitung auf andere seltene Erkrankungen (Marfan, Ehlers-Danlos)
- Gespräche mit Krankenkassen über Finanzierungsmodelle
- Community-Wachstum durch Patientenorganisationen

### Key Performance Indicators

| KPI | Ziel | Messmethode |
|-----|------|-------------|
| Langzeit-Retention | >80% nach 3 Monaten | Aktive Nutzer mit mind. 1 Event/Monat |
| Erfassungszeit | <15 Sekunden | Durchschnitt Aufnahme-Start bis Abschluss |
| KI-Korrekturrate | Sinkend über Zeit | % korrigierte Extraktionen pro Patient |
| Konsultations-Conversion | >70% der aktiven Nutzer | Sharing-Link generiert vor Arzttermin |
| Freemium → Abo | >30% Konversion | Nutzer die Sharing-Feature aktivieren |
| Arzt-Zufriedenheit | Qualitativ positiv | Feedback nach Konsultation |

### Geschäftsmodell

**Freemium mit Sharing-Trigger:**
- **Kostenlos:** Patient erfasst Symptome per Sprache/Text, sieht eigene Historie und Muster, KI-Extraktion und Lernen inklusive
- **Abo (kostenpflichtig):** Arzt-Sharing-Link generieren, Konsultations-Dashboard, PDF-Export, granulare Zugriffsrechte, zeitbegrenzter Zugang
- **Perspektive:** Krankenkassen-Finanzierung wenn Wirksamkeit nachgewiesen

## MVP Scope

### Core Features

**1. Symptom-Erfassung (Kern)**
- Web-App, mobilfähig (kein native App, kein Apple Watch)
- Sprach-Eingabe mit Schweizerdeutsch-Unterstützung
- Text-Eingabe als Alternative (stiller Modus)
- Symptom-Ende markieren ("Es ist wieder gut" → Dauer)
- Event-basiert: keine Reminder, keine tägliche Pflicht

**2. KI-Verarbeitung**
- Transkription Sprache → Text (Schweizerdeutsch + Hochdeutsch)
- Automatische Symptom-Extraktion (Bezeichnung, Körperregion, Seite, Art, Intensität)
- Sofort-Feedback nach Erfassung ("Erfasst: Rückenschmerzen links ✓")
- Nachfrage bei niedriger Konfidenz ("Meinst du oberer oder unterer Rücken?")
- Patienten-Korrektur → System lernt persönliches Vokabular

**3. Patienten-Ansicht**
- Chronologischer Feed der eigenen Symptom-Events
- Symptom-Häufigkeits-Ranking mit Trendlinien
- Timeline-Ansicht über Monate

**4. Arzt-Konsultations-Export**
- Sharing-Link mit granularen Zugriffsrechten (ansehen ✅, download ❌)
- Zeitlich begrenzter Zugang
- KI-generierte Zusammenfassung
- Timeline, Symptom-Ranking, Drill-Down in einzelne Events
- Original-Audio anhörbar (Stream, kein Download)
- PDF-Export zum Ausdrucken
- Arzt braucht keinen Account — Link klicken, sofort sehen
- Auf iPad und Desktop nutzbar (gemeinsam in der Sprechstunde)

**5. Onboarding**
- Sprach-basiert: Diagnose, Medikamente per Sprache oder Text
- Sofort nutzbar in 60 Sekunden
- Nächster Arzttermin als Ziel-Anker

**6. Daten-Souveränität**
- Server-basiert mit voller Patienten-Kontrolle
- Audit-Log: wer hat was wann angesehen

### Out of Scope for MVP

| Feature | Begründung | Phase |
|---------|------------|-------|
| Native iOS/Android App | Web-App reicht für Pilot | 2 |
| Apple Watch Komplikation | Abhängig von Native App | 2 |
| Angehörigen-Berechtigung | Pilot nur mit Patientin selbst | 2 |
| Uhrdaten-Integration (Apple Health) | Abhängig von Native App | 2 |
| Medikamenten-Tracking | Kein Kernwert für Pilot | 2 |
| Stimmanalyse / Sentiment | Zusätzliche KI-Komplexität | 3 |
| Proaktive Insights | Braucht grössere Datenbasis | 3 |
| Notfall-Eskalation (3-Stufen) | Regulatorische Komplexität | 3 |
| Proaktive Anomalie-Erkennung | Braucht Uhrdaten + Baseline | 3 |
| Eltern-Modus für Kinder | Nach Angehörigen-Feature | 3 |
| Krankenkassen-Integration | Nach Wirksamkeitsnachweis | 3+ |

### MVP Success Criteria

**Der Pilot ist erfolgreich wenn:**
1. Celia erfasst ihre Symptome konsistent über mindestens 3 Monate (kein Abbruch)
2. Die KI-Symptom-Extraktion funktioniert zuverlässig für Schweizerdeutsch — Korrekturrate sinkt über Zeit
3. Bei der nächsten Spezialisten-Sprechstunde wird der Sharing-Link / PDF-Report als Gesprächsgrundlage genutzt
4. Der Arzt bestätigt: "Die Daten waren hilfreich für meine Beurteilung"
5. Die durchschnittliche Erfassungszeit bleibt unter 15 Sekunden

**Go/No-Go für Phase 2:**
- Wenn alle 5 Kriterien erfüllt → Ausweitung auf weitere LDS-Patienten, Angehörigen-Feature, native App
- Wenn KI-Erkennung unzureichend → Fokus auf Verbesserung der Extraktion vor Erweiterung
- Wenn Langzeit-Nutzung scheitert → Grundlegendes UX-Redesign vor Feature-Erweiterung

### Future Vision

**Phase 2 — Intelligent (nach erfolgreichem Pilot):**
- Native iOS/Android App mit Apple Watch
- Angehörigen-Berechtigung (Erfassung im Auftrag + eigene Beobachtungen)
- Uhrdaten-Integration (passive Baseline, 12h-Snapshots, Aktivitätserkennung)
- Medikamenten-Tracking (vergessene Einnahmen, Bedarfsmedikation)
- Erweiterte Analyse (Tageszeit-Muster, Aktivitäts-Symptom-Matrix, Belastungstoleranz)
- Patienten-Feed als "Meine Geschichte"

**Phase 3 — Lebensretter (nach Nutzer-Wachstum):**
- Intelligente Insights mit Handlungsvorschlägen
- Stimmanalyse als Biomarker
- Proaktive Anomalie-Erkennung
- Eskalationsmuster-Erkennung (Frühwarnung vor kritischen Ereignissen)
- Notfall-System (3-Stufen-Eskalation, Notruf mit Kontext)
- Eltern-Modus für Kinder mit LDS

**Phase 4 — Plattform:**
- Ausweitung auf andere seltene Erkrankungen (Marfan, Ehlers-Danlos)
- Krankenkassen-Finanzierung
- Community-Features für Patientenorganisationen

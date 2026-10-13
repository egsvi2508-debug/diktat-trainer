# Satzlehre Übungen

Gehörbildung für den Satzlehre-Unterricht – ohne Klavier und ohne jemanden, der diktiert.
Ear training for Satzlehre class – no piano and no one dictating needed.

**App:** https://egsvi2508-debug.github.io/diktat-trainer/

Works in any browser, on phones too. Add it to your home screen and it also works offline.
No sign-in, nothing is sent anywhere, nothing is tracked.
Unofficial practice tool for Satzlehre class.

## Exercises

### Einheit 1
1. **Intervalle** – one note is given, notate the second (alternating up/down, often beyond the octave).
2. **Rhythmus-Lexikon 6/8** – all 30 ways to fill a group of three eighths; choose which ones the dictation uses, with a listening quiz.
   **Melodiediktat** – one-line 6/8 melody (4/8/12 bars) built only from those groups; notate rhythm and pitches on screen.
3. **Diktat im Flug: Sekunden** and **Terzen** – heard only 3 times; enharmonic spellings count as correct.
   Random but varied: never A-B-A-B, no figure repeated straight away, half and whole steps (minor and major thirds) in balance.
4. **Harmoniefolge** – random four-part progressions with a louder bass; notate the bass, then see Funktionen, Stufen and Generalbass.

### Einheit 2
1. **Modi singen** – four notes of a mode (all seven modes, white keys or transposed) in ever new orders, one 4/4 bar each;
   range D–G, D–A, D–H, octave or plagal; "all combinations" or your own four-note motif (all 24 orders exist).
   A singing check listens through the microphone and marks every note while you sing: right, out of tune, wrong note, not heard.
2. **Modi-Diktat** – the same motifs played; write them with the note buttons of the range.
3. **Modale Muster** – a four-note pattern sequenced through a mode; write it down.
4. **Blattsingen: Ganz- und Halbtöne** – only whole and half steps within a fifth, with the singing check.
5. **Zweistimmiges Diktat** – two voices on the white keys in 4/4; per half bar note against note or 2 against 1;
   both first notes given; rhythm and notes are checked separately.
6. **Ton / Zweiklang / Dreiklang im Kontext** – the tonic triad of a random key (5/3, 6 or 6/4), then one note, two notes at once,
   or a triad from another key; answer on a keyboard. Chord tones come up rarely. A quiet stopwatch, no statistics.

The microphone is analysed only in the browser (pitch tracking with YIN); nothing is recorded to a server.

## Editing

The source is `index.html` plus `js/`. After changing anything, rebuild the site:

```bash
python3 build_webapp.py
```

This writes `docs/` (the website GitHub Pages serves) and `Satzlehre-Uebungen.html` (a single offline file).
Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (CC BY 3.0).
Notation by [VexFlow](https://www.vexflow.com) (MIT); fonts Wix Madefor Display and Text (SIL OFL).

## Feedback & anonymous usage counts (optional)
Off until `projectId` and `apiKey` are filled in at the top of `js/backend.js`.
1. Create a Firebase project (Google Analytics not needed) → Firestore Database → production mode, EU location.
2. Firestore → Rules: paste `firestore.rules` → Publish.
3. Project settings → add a Web app → copy `projectId` and `apiKey` into `js/backend.js`, run `python3 build_webapp.py`, push.
4. Read results in the Firebase console: `days/<YYYY-MM-DD>` (devices, opens, ex_*) and `feedback`.

## Licence
© 2026 Emmanuel Sebaali. All rights reserved. See LICENSE. Viewing this code does not grant permission to copy or reuse it.

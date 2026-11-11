# Satzlehre Übungen

Gehörbildung für den Satzlehre-Unterricht – ohne Klavier und ohne jemanden, der diktiert.
Ear training for Satzlehre class – no piano and no one dictating needed.

**App:** https://egsvi2508-debug.github.io/diktat-trainer/

Works in any browser, on phones too. Add it to your home screen and it also works offline.
No sign-in, nothing is sent anywhere, nothing is tracked.
Unofficial practice tool for Satzlehre class.

## Exercises

Sorted by what you do. The bottom bar has Start · Diktate · Singen · Kontext · Harmonik.

### Diktate
- **Intervalle** – one note is given, notate the second (alternating up/down, often beyond the octave).
- **Rhythmus-Lexikon 6/8** – all 30 ways to fill a group of three eighths; choose which ones the dictation uses, with a listening quiz.
- **Melodiediktat** – one-line 6/8 melody (4/8/12 bars) built only from those groups; notate rhythm and pitches on screen.
- **Diktat im Flug: Sekunden** and **Terzen** – heard only 3 times; enharmonic spellings count as correct.
  Random but varied: never A-B-A-B, no figure repeated straight away, half and whole steps (minor and major thirds) in balance.
- **Diktat im Flug: Sekunden (schwer)** – the note names still move by a second, but about half of the notes jump an octave
  (heard as a seventh or a ninth), so the octave has to be written too. Never three jumps in a row; the result says which notes
  were only in the wrong octave.
- **Modi-Diktat** – four-note motifs of a mode played; write them with the note buttons of the range.
- **Zweistimmiges Diktat** – two voices on the white keys in 4/4; per half bar note against note or 2 against 1;
  both first notes given; rhythm and notes are checked separately.

### Singen
- **Modi singen** – four notes of a mode (all seven modes, white keys or transposed) in ever new orders, one 4/4 bar each;
  a singing check listens through the microphone and marks every note: right, out of tune, wrong note, not heard.
- **Blattsingen: Ganz- und Halbtöne** – only whole and half steps within a fifth, with the singing check.
- **Ton singen im Kontext** – a chord, then sing the asked note.
- **Audiation** – hear a note, imagine the next ones, sing the last.

### Hören im Kontext
- **Ton / Intervall / Dreiklang im Kontext** – the tonic triad of a random key (5/3, 6 or 6/4), then one note, two notes at once,
  or a triad from another key; answer on a keyboard. A quiet stopwatch, no statistics.

### Harmonik
- **Harmoniefolge** – random four-part progressions with a louder bass; notate the bass, then see Funktionen, Stufen and Generalbass.
- **Lagen** – a chord in a key; write all four voices.
- **Basston: Dreiklänge / Septakkorde** – which note is in the bass?

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

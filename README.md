# Satzlehre Übungen

Gehörbildung für den Satzlehre-Unterricht – ohne Klavier und ohne jemanden, der diktiert.
Ear training for Satzlehre class – no piano and no one dictating needed.

**App:** https://egsvi2508-debug.github.io/diktat-trainer/

Works in any browser, on phones too. Add it to your home screen and it also works offline.
No sign-in, nothing is sent anywhere, nothing is tracked.
Unofficial practice tool for Satzlehre class.

## Exercises

1. **Intervalle** – one note is given, notate the second (alternating up/down, often beyond the octave).
2. **Rhythmus-Lexikon 6/8** – all 30 ways to fill a group of three eighths; choose which ones the dictation uses, with a listening quiz.
   **Melodiediktat** – one-line 6/8 melody (4/8/12 bars) built only from those groups; notate rhythm and pitches on screen.
3. **Diktat im Flug: Sekunden** and 4. **Terzen** – heard only 3 times; enharmonic spellings count as correct.
5. **Harmoniefolge** – random four-part progressions with a louder bass; notate the bass, then see Funktionen, Stufen and Generalbass.

## Editing

The source is `index.html` plus `js/`. After changing anything, rebuild the site:

```bash
python3 build_webapp.py
```

This writes `docs/` (the website GitHub Pages serves) and `Satzlehre-Uebungen.html` (a single offline file).
Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (CC BY 3.0).
Notation by [VexFlow](https://www.vexflow.com) (MIT); fonts Wix Madefor Display and Text (SIL OFL).

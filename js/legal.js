'use strict';
/* ============================================================
   Datenschutz (German and English), opened from the footer and from ⚙. Never shown by itself.
   The app collects nothing: no counting, no cookies, no IDs. The only thing that is ever sent is
   feedback that someone writes and sends on purpose.
   OWNER is optional: if it is filled in, a "Responsible / Offenlegung" block is added.
   ============================================================ */
const OWNER = {
  name: '',     // optional: your name
  place: '',    // optional: where you live (city)
  email: ''     // optional: contact
};
const LEGAL_DATE = '2. 11. 2026';

function legalHtml() {
  const de = LANG === 'de';
  const has = !!(OWNER.name && OWNER.place);
  const who = has ? `${esc(OWNER.name)}, ${esc(OWNER.place)}` : '';
  const mail = OWNER.email ? `, <a href="mailto:${esc(OWNER.email)}">${esc(OWNER.email)}</a>` : '';
  const fb = Backend.on();
  if (de) return `
<h4>Datenschutz</h4>
<p class="hint">Stand: ${LEGAL_DATE}</p>
<h5>Kurz gesagt</h5>
<p>Die App sammelt nichts über dich: keine Anmeldung, keine Cookies, keine Zählung, keine Werbung, kein Tracking.</p>
<h5>Bereitstellung</h5>
<p>Die Seite wird über GitHub Pages (GitHub, Inc.) ausgeliefert. Wie bei jeder Website verarbeitet der Anbieter dabei technisch die IP-Adresse, um die Seite zu senden und abzusichern (<a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">Datenschutz bei GitHub</a>).</p>
<h5>Einstellungen</h5>
<p>Sprache, Lautstärke, Instrument und Übungsoptionen werden nur in deinem Browser gespeichert, damit sie beim nächsten Mal da sind. Sie verlassen dein Gerät nie.</p>
<h5>Mikrofon</h5>
<p>Nur in Übungen mit Singen und erst nach deiner Freigabe. Die Tonhöhe wird auf deinem Gerät berechnet; nichts wird gesendet oder gespeichert.</p>
${fb ? `<h5>Feedback</h5>
<p>Nur wenn du selbst Feedback schreibst und sendest: Dann werden dein Text, die offene Übung, die Sprache und der Zeitpunkt ohne Namen in Google Firebase gespeichert. Bitte schreib keine persönlichen Daten hinein.</p>` : ''}
${has ? `<h5>Verantwortlich und Offenlegung (§ 25 MedienG)</h5>
<p>${who}${mail}. Nichtkommerzielles, inoffizielles Übungstool für den Satzlehre-Unterricht.</p>` : ''}
<h5>Quellen</h5>
<p>Klavier: Salamander Grand Piano von Alexander Holm (CC BY 3.0). Cello, Trompete, Klarinette: Aufnahmen aus tonejs-instruments von Nicholaus Brosowsky (CC BY 3.0), gekürzt und in der Lautstärke angeglichen. <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. Notensatz: VexFlow © Mohit Muthanna Cheppudira (MIT). Schrift: Wix Madefor (SIL OFL).</p>`;
  return `
<h4>Privacy</h4>
<p class="hint">As of ${LEGAL_DATE}</p>
<h5>In short</h5>
<p>The app collects nothing about you: no sign-in, no cookies, no counting, no ads, no tracking.</p>
<h5>Hosting</h5>
<p>The site is served by GitHub Pages (GitHub, Inc.). As with any website, the host technically processes your IP address to deliver and protect the site (<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub privacy statement</a>).</p>
<h5>Settings</h5>
<p>Language, volume, instrument and exercise options are kept in your browser only, so they are there next time. They never leave your device.</p>
<h5>Microphone</h5>
<p>Only in singing exercises and only after you allow it. The pitch is worked out on your device; nothing is sent or stored.</p>
${fb ? `<h5>Feedback</h5>
<p>Only if you write and send feedback yourself: your text, the open exercise, the language and the time are stored without a name in Google Firebase. Please do not include personal data.</p>` : ''}
${has ? `<h5>Responsible and publisher (§ 25 Austrian MedienG)</h5>
<p>${who}${mail}. Non-commercial, unofficial practice tool for Satzlehre class.</p>` : ''}
<h5>Sources</h5>
<p>Piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0). Cello, trumpet, clarinet: recordings from tonejs-instruments by Nicholaus Brosowsky (CC BY 3.0), shortened and level-matched. <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. Notation: VexFlow © Mohit Muthanna Cheppudira (MIT). Font: Wix Madefor (SIL OFL).</p>`;
}

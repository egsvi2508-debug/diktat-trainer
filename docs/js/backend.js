'use strict';
/* ============================================================
   Feedback + anonymous usage counts (Firebase Firestore, REST API)
   - No user IDs, no cookies, no names: a phone only sends "+1" to a counter of the day:
       devices  – once per day per phone (a stored date, not an ID, prevents counting twice)
       opens    – each time the app is opened
       ex_<id>  – each finished exercise (checked or solution shown), per exercise type
   - Feedback messages go to the "feedback" collection.
   - The database rules (firestore.rules) only allow adding feedback and adding +1 to a counter;
     nobody can read anything except the owner in the Firebase console.
   - Stays switched off until BACKEND.projectId and BACKEND.apiKey are filled in.
   ============================================================ */
const BACKEND = {
  projectId: '',   // ← Firebase project ID
  apiKey: ''       // ← Firebase web API key (public by design; security comes from the rules)
};

const Backend = (() => {
  const on = () => !!(BACKEND.projectId && BACKEND.apiKey) && location.protocol === 'https:';
  const allowed = () => on() && store.get('shareStats', true);
  const base = () => `https://firestore.googleapis.com/v1/projects/${BACKEND.projectId}/databases/(default)/documents`;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // add +1 to one counter of today's document (created on first use)
  function count(field) {
    if (!allowed()) return;
    const name = `projects/${BACKEND.projectId}/databases/(default)/documents/days/${today()}`;
    fetch(`${base()}:commit?key=${BACKEND.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ writes: [{ transform: { document: name, fieldTransforms: [{ fieldPath: field, increment: { integerValue: '1' } }] } }] })
    }).catch(() => {});
  }
  // once per app start: "opened", and once per calendar day: "active device"
  function appStarted() {
    if (!allowed()) return;
    count('opens');
    if (store.get('lastActive', '') !== today()) { store.set('lastActive', today()); count('devices'); }
  }
  function exerciseDone(id) { count('ex_' + id); }

  async function sendFeedback({ type, text, exercise }) {
    if (!on()) throw new Error('off');
    const res = await fetch(`${base()}/feedback?key=${BACKEND.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        type: { stringValue: type }, text: { stringValue: text.slice(0, 2000) },
        exercise: { stringValue: exercise || '' }, lang: { stringValue: LANG },
        created: { timestampValue: new Date().toISOString() }
      } })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }
  return { on, appStarted, exerciseDone, sendFeedback };
})();

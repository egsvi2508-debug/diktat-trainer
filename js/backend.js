'use strict';
/* ============================================================
   Feedback (Firebase Firestore, REST API) – sent only when someone writes and sends it.
   - No usage counting, no IDs, no cookies, nothing stored on the phone.
   - The database rules (firestore.rules) only allow adding feedback;
     nobody can read anything except the owner in the Firebase console.
   - Stays switched off until BACKEND.projectId and BACKEND.apiKey are filled in.
   ============================================================ */
const BACKEND = {
  projectId: 'satzlehre',   // ← Firebase project ID
  apiKey: 'AIzaSyCjQWx6bv4_fI99ONTX_4OU__35Sz07Jy8'       // ← Firebase web API key (public by design; security comes from the rules)
};

const Backend = (() => {
  const on = () => !!(BACKEND.projectId && BACKEND.apiKey) && location.protocol === 'https:';
  const base = () => `https://firestore.googleapis.com/v1/projects/${BACKEND.projectId}/databases/(default)/documents`;
  // what older versions kept for counting
  try { ['sdt:shareStats', 'sdt:lastActive'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
  // usage counting was removed: these stay so the exercises need no changes
  function appStarted() {}
  function exerciseDone() {}

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

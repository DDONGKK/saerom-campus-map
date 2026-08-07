import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const config = window.SAEROM_FIREBASE_CONFIG || {};
if (config.apiKey && config.projectId) {
  const app = initializeApp(config);
  const db = getFirestore(app);
  const D = window.SAEROM_DATA;
  window.SAEROM_EVENTS = [];
  window.SAEROM_BILLBOARDS = [];
  window.SAEROM_DDAYS = [];
  window.SAEROM_NOTICES = [];
  window.SAEROM_QUEST_BADGES = {};
  window.SAEROM_SUBMIT_REPORT = data => addDoc(collection(db, "reports"), Object.assign({}, data, { status: "new", createdAt: serverTimestamp() }));
  const original = new Map((D.places || []).map(place => [place.id, structuredClone(place)]));
  let siteLoaded = false;
  let placesLoaded = false;

  function refresh() {
    if (siteLoaded && placesLoaded && window.SAEROM_APP_REFRESH) window.SAEROM_APP_REFRESH();
  }

  onSnapshot(doc(db, "content", "site"), snapshot => {
    if (snapshot.exists()) {
      const value = snapshot.data();
      if (value.mapImages) D.floors.forEach(floor => { if (value.mapImages[floor.id]) floor.image = value.mapImages[floor.id]; });
      if (value.questProfiles) D.questProfiles = Object.assign({}, D.questProfiles, structuredClone(value.questProfiles));
      window.SAEROM_QUEST_BADGES = value.questBadges || {};
      window.SAEROM_BILLBOARDS = Array.isArray(value.billboards) ? value.billboards : (value.billboard?.ko ? [Object.assign({ id: "legacy" }, value.billboard)] : []);
      window.SAEROM_DDAYS = Array.isArray(value.ddays) ? value.ddays : (value.dday?.date ? [Object.assign({ id: "legacy" }, value.dday)] : []);
      window.SAEROM_NOTICES = Array.isArray(value.notices) ? value.notices : [];
    }
    siteLoaded = true;
    refresh();
  }, () => { siteLoaded = true; refresh(); });

  onSnapshot(collection(db, "places"), snapshot => {
    const changes = new Map(snapshot.docs.map(item => [item.id, item.data()]));
    D.places.forEach(place => {
      const base = original.get(place.id);
      if (base) Object.assign(place, structuredClone(base), changes.get(place.id) || {});
    });
    placesLoaded = true;
    refresh();
  }, () => { placesLoaded = true; refresh(); });

  onSnapshot(collection(db, "events"), snapshot => {
    window.SAEROM_EVENTS = snapshot.docs.map(item => Object.assign({ id: item.id }, item.data()));
    refresh();
  }, () => { window.SAEROM_EVENTS = []; refresh(); });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const config = window.SAEROM_FIREBASE_CONFIG || {};
if (config.apiKey && config.projectId) {
  const app = initializeApp(config);
  const db = getFirestore(app);
  const D = window.SAEROM_DATA;
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
}

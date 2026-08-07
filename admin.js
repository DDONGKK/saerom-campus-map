import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const $ = selector => document.querySelector(selector);
const config = window.SAEROM_FIREBASE_CONFIG || {};
const ready = Boolean(config.apiKey && config.projectId);
const ADMIN_EXCLUDED_PLACES = new Set(["room-1-119"]);
const basePlaces = new Map((window.SAEROM_DATA.places || []).filter(place => !ADMIN_EXCLUDED_PLACES.has(place.id)).map(place => [place.id, structuredClone(place)]));
let app, auth, db, storage, selectedId = "", overrides = new Map();

function message(target, text, kind="") { target.textContent=text; target.className=`admin-message ${kind}`; }
function effectivePlace(id) { return Object.assign({}, structuredClone(basePlaces.get(id)), structuredClone(overrides.get(id) || {})); }
function visiblePlaces() {
  const query=$("#placeSearch").value.trim().toLocaleLowerCase("ko"), floor=$("#floorFilter").value;
  return [...basePlaces.values()].filter(place => (floor==="all"||String(place.floor)===floor) && (!query||`${place.room} ${effectivePlace(place.id).name}`.toLocaleLowerCase("ko").includes(query))).sort((a,b)=>a.floor-b.floor||String(a.room).localeCompare(String(b.room),"ko",{numeric:true}));
}
function renderList(){const box=$("#placeList");box.replaceChildren();visiblePlaces().forEach(base=>{const place=effectivePlace(base.id),button=document.createElement("button");button.type="button";button.className=`admin-place${base.id===selectedId?" selected":""}`;button.innerHTML=`<strong>${place.floor}층 ${place.room}호</strong><small></small>`;button.querySelector("small").textContent=place.name;button.onclick=()=>selectPlace(base.id);box.append(button);});}
function selectPlace(id){selectedId=id;const place=effectivePlace(id);$("#placeId").value=id;$("#room").value=place.room;$("#floor").value=place.floor;$("#name").value=place.name;$("#nameEn").value=place.nameEn||"";$("#category").value=place.category;$("#categoryEn").value=place.categoryEn||"";$("#description").value=place.description||"";$("#descriptionEn").value=place.descriptionEn||"";$("#usageInfo").value=place.usageInfo||"";$("#usageInfoEn").value=place.usageInfoEn||"";$("#active").checked=place.active!==false;$("#searchable").checked=place.searchable!==false;$("#editorTitle").textContent=`${place.room}호 ${place.name}`;renderList();message($("#saveMessage"),"");}
async function loadOverrides(){overrides=new Map();const snapshot=await getDocs(collection(db,"places"));snapshot.forEach(item=>overrides.set(item.id,item.data()));renderList();if(selectedId)selectPlace(selectedId);}

if(!ready){message($("#loginMessage"),"Firebase 프로젝트 연결 정보가 아직 설정되지 않았습니다.","error");$("#signIn").disabled=true;}else{
  app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);storage=getStorage(app);window.SAEROM_ADMIN_CONTEXT={auth,db};window.dispatchEvent(new CustomEvent("saerom-admin-ready",{detail:window.SAEROM_ADMIN_CONTEXT}));
  $("#signIn").onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(error){message($("#loginMessage"),`로그인 실패: ${error.message}`,"error");}};
  $("#signOut").onclick=()=>signOut(auth);
  onAuthStateChanged(auth,async user=>{$("#loginPanel").hidden=Boolean(user);$("#adminPanel").hidden=!user;$("#signOut").hidden=!user;if(!user)return;try{await loadOverrides();selectPlace([...basePlaces.keys()][0]);}catch(error){message($("#saveMessage"),`데이터를 읽을 수 없습니다: ${error.message}`,"error");}});
}

$("#placeSearch").oninput=renderList;$("#floorFilter").onchange=renderList;
$("#placeForm").onsubmit=async event=>{event.preventDefault();if(!selectedId)return;const value={name:$("#name").value.trim(),nameEn:$("#nameEn").value.trim(),category:$("#category").value.trim(),categoryEn:$("#categoryEn").value.trim(),description:$("#description").value.trim(),descriptionEn:$("#descriptionEn").value.trim(),usageInfo:$("#usageInfo").value.trim(),usageInfoEn:$("#usageInfoEn").value.trim(),active:$("#active").checked,searchable:$("#searchable").checked,updatedAt:serverTimestamp()};try{await setDoc(doc(db,"places",selectedId),value,{merge:true});overrides.set(selectedId,Object.assign({},overrides.get(selectedId)||{},value,{updatedAt:new Date()}));selectPlace(selectedId);message($("#saveMessage"),"저장했습니다. 공개 웹에 바로 반영됩니다.","success");}catch(error){message($("#saveMessage"),`저장 실패: ${error.message}`,"error");}};
$("#resetPlace").onclick=async()=>{if(!selectedId||!confirm("이 장소의 관리자 수정 내용을 모두 지울까요?"))return;try{await deleteDoc(doc(db,"places",selectedId));overrides.delete(selectedId);selectPlace(selectedId);message($("#saveMessage"),"기본값으로 되돌렸습니다.","success");}catch(error){message($("#saveMessage"),`초기화 실패: ${error.message}`,"error");}};
$("#uploadMap").onclick=async()=>{const file=$("#mapFile").files[0],floor=$("#mapFloor").value;if(!file)return message($("#uploadMessage"),"이미지 파일을 먼저 선택하세요.","error");const progress=$("#uploadProgress");progress.hidden=false;progress.value=0;const extension=(file.name.split(".").pop()||"png").toLowerCase();const task=uploadBytesResumable(ref(storage,`maps/map-${floor}.${extension}`),file,{contentType:file.type});task.on("state_changed",snapshot=>{progress.value=Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100);},error=>message($("#uploadMessage"),`업로드 실패: ${error.message}`,"error"),async()=>{try{const url=await getDownloadURL(task.snapshot.ref),siteRef=doc(db,"content","site"),current=(await getDoc(siteRef)).data()||{},mapImages=Object.assign({},current.mapImages||{}, {[floor]:url});await setDoc(siteRef,{mapImages,updatedAt:serverTimestamp()},{merge:true});message($("#uploadMessage"),"새 지도를 적용했습니다.","success");}catch(error){message($("#uploadMessage"),`적용 실패: ${error.message}`,"error");}});};
renderList();

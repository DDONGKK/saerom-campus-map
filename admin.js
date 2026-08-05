import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const $ = selector => document.querySelector(selector);
const config = window.SAEROM_FIREBASE_CONFIG || {};
const ready = Boolean(config.apiKey && config.projectId);
const basePlaces = new Map((window.SAEROM_DATA.places || []).map(place => [place.id, structuredClone(place)]));
let app, auth, db, storage, selectedId = "", overrides = new Map();

function message(target, text, kind="") { target.textContent=text; target.className=`admin-message ${kind}`; }
function effectivePlace(id) { return Object.assign({}, structuredClone(basePlaces.get(id)), structuredClone(overrides.get(id) || {})); }
function visiblePlaces() {
  const query=$("#placeSearch").value.trim().toLocaleLowerCase("ko"), floor=$("#floorFilter").value;
  return [...basePlaces.values()].filter(place => (floor==="all"||String(place.floor)===floor) && (!query||`${place.room} ${effectivePlace(place.id).name}`.toLocaleLowerCase("ko").includes(query))).sort((a,b)=>a.floor-b.floor||String(a.room).localeCompare(String(b.room),"ko",{numeric:true}));
}
function renderList(){const box=$("#placeList");box.replaceChildren();visiblePlaces().forEach(base=>{const place=effectivePlace(base.id),button=document.createElement("button");button.type="button";button.className=`admin-place${base.id===selectedId?" selected":""}`;button.innerHTML=`<strong>${place.floor}층 ${place.room}호</strong><small></small>`;button.querySelector("small").textContent=place.name;button.onclick=()=>selectPlace(base.id);box.append(button);});}
function currentMissions(){return structuredClone((overrides.get(selectedId)||{}).missions||{});}
function loadMission(){const mission=currentMissions()[$("#missionRole").value]||{};$("#taskKo").value=mission.taskKo||"";$("#taskEn").value=mission.taskEn||"";$("#questionKo").value=mission.questionKo||"";$("#questionEn").value=mission.questionEn||"";for(let i=1;i<=3;i++){$("#option"+i).value=(mission.optionsKo||[])[i-1]||"";$("#optionEn"+i).value=(mission.optionsEn||[])[i-1]||"";}$("#correctIndex").value=String(mission.correctIndex||0);}
function collectMission(missions){const role=$("#missionRole").value,optionsKo=[1,2,3].map(i=>$("#option"+i).value.trim()),optionsEn=[1,2,3].map(i=>$("#optionEn"+i).value.trim()),questionKo=$("#questionKo").value.trim();if(questionKo&&optionsKo.filter(Boolean).length>=2){missions[role]={taskKo:$("#taskKo").value.trim(),taskEn:$("#taskEn").value.trim(),questionKo,questionEn:$("#questionEn").value.trim(),optionsKo:optionsKo.filter(Boolean),optionsEn:optionsEn.filter(Boolean),correctIndex:Number($("#correctIndex").value)};}return missions;}
function selectPlace(id){selectedId=id;const place=effectivePlace(id);$("#placeId").value=id;$("#room").value=place.room;$("#floor").value=place.floor;$("#name").value=place.name;$("#category").value=place.category;$("#description").value=place.description||"";$("#usageInfo").value=place.usageInfo||"";$("#active").checked=place.active!==false;$("#searchable").checked=place.searchable!==false;$("#editorTitle").textContent=`${place.room}호 ${place.name}`;loadMission();renderList();message($("#saveMessage"),"");}
async function loadOverrides(){overrides=new Map();const snapshot=await getDocs(collection(db,"places"));snapshot.forEach(item=>overrides.set(item.id,item.data()));renderList();if(selectedId)selectPlace(selectedId);}

if(!ready){message($("#loginMessage"),"Firebase 프로젝트 연결 정보가 아직 설정되지 않았습니다.","error");$("#signIn").disabled=true;}else{
  app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);storage=getStorage(app);window.SAEROM_ADMIN_CONTEXT={auth,db};window.dispatchEvent(new CustomEvent("saerom-admin-ready",{detail:window.SAEROM_ADMIN_CONTEXT}));
  $("#signIn").onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(error){message($("#loginMessage"),`로그인 실패: ${error.message}`,"error");}};
  $("#signOut").onclick=()=>signOut(auth);
  onAuthStateChanged(auth,async user=>{$("#loginPanel").hidden=Boolean(user);$("#adminPanel").hidden=!user;$("#signOut").hidden=!user;if(!user)return;$("#userEmail").textContent=user.email||"Google 계정";try{await loadOverrides();selectPlace([...basePlaces.keys()][0]);}catch(error){message($("#saveMessage"),`데이터를 읽을 수 없습니다: ${error.message}`,"error");}});
}

$("#placeSearch").oninput=renderList;$("#floorFilter").onchange=renderList;$("#missionRole").onchange=loadMission;
$("#placeForm").onsubmit=async event=>{event.preventDefault();if(!selectedId)return;const missions=collectMission(currentMissions());const value={name:$("#name").value.trim(),category:$("#category").value.trim(),description:$("#description").value.trim(),usageInfo:$("#usageInfo").value.trim(),active:$("#active").checked,searchable:$("#searchable").checked,missions,updatedAt:serverTimestamp()};try{await setDoc(doc(db,"places",selectedId),value,{merge:true});overrides.set(selectedId,Object.assign({},overrides.get(selectedId)||{},value,{updatedAt:new Date()}));selectPlace(selectedId);message($("#saveMessage"),"저장했습니다. 공개 웹에 바로 반영됩니다.","success");}catch(error){message($("#saveMessage"),`저장 실패: ${error.message}`,"error");}};
$("#clearMission").onclick=async()=>{if(!selectedId)return;const missions=currentMissions();delete missions[$("#missionRole").value];overrides.set(selectedId,Object.assign({},overrides.get(selectedId)||{},{missions}));loadMission();message($("#saveMessage"),"맞춤 미션을 지웠습니다. 장소 저장 버튼을 눌러 확정하세요.");};
$("#resetPlace").onclick=async()=>{if(!selectedId||!confirm("이 장소의 관리자 수정 내용을 모두 지울까요?"))return;try{await deleteDoc(doc(db,"places",selectedId));overrides.delete(selectedId);selectPlace(selectedId);message($("#saveMessage"),"기본값으로 되돌렸습니다.","success");}catch(error){message($("#saveMessage"),`초기화 실패: ${error.message}`,"error");}};
$("#uploadMap").onclick=async()=>{const file=$("#mapFile").files[0],floor=$("#mapFloor").value;if(!file)return message($("#uploadMessage"),"이미지 파일을 먼저 선택하세요.","error");const progress=$("#uploadProgress");progress.hidden=false;progress.value=0;const extension=(file.name.split(".").pop()||"png").toLowerCase();const task=uploadBytesResumable(ref(storage,`maps/map-${floor}.${extension}`),file,{contentType:file.type});task.on("state_changed",snapshot=>{progress.value=Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100);},error=>message($("#uploadMessage"),`업로드 실패: ${error.message}`,"error"),async()=>{try{const url=await getDownloadURL(task.snapshot.ref),siteRef=doc(db,"content","site"),current=(await getDoc(siteRef)).data()||{},mapImages=Object.assign({},current.mapImages||{}, {[floor]:url});await setDoc(siteRef,{mapImages,updatedAt:serverTimestamp()},{merge:true});message($("#uploadMessage"),"새 지도를 적용했습니다.","success");}catch(error){message($("#uploadMessage"),`적용 실패: ${error.message}`,"error");}});};
renderList();

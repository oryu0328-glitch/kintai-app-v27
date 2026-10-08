/* KINTAI_APP_VERSION = "26.0.0" */
const KEY="kintai_mobile_v5";
var salaryReady=false;
const jpHolidayCache=new Map();
const $=id=>document.getElementById(id);
const nowDate=()=>new Date().toLocaleDateString("sv-SE");
const monthNow=()=>nowDate().slice(0,7);
const isoNow=()=>new Date().toISOString();

let data={
  staff:[{id:"staff1",name:"使用者1"}],
  records:{},
  selectedStaff:"staff1",regularMinutes:465
};
let recordEditDate=null;

function load(){
  const keys=["kintai_mobile_v5","kintai_mobile_v2"];
  for(const k of keys){
    try{
      const saved=JSON.parse(localStorage.getItem(k)||"null");
      if(saved && saved.staff && saved.records){
        data=saved;
        if(!Number.isFinite(data.regularMinutes))data.regularMinutes=465;
        if(!data.selectedStaff || !data.staff.some(s=>s.id===data.selectedStaff)){
          data.selectedStaff=data.staff[0]?.id||"";
        }
        return;
      }
    }catch(e){}
  }
}
const SNAP_KEY="kintai_auto_snapshots_v14";
function getSnapshots(){try{return JSON.parse(localStorage.getItem(SNAP_KEY)||"[]")}catch(e){return []}}
function backupSnapshot(){
 try{
  const list=getSnapshots();
  const snapshot={at:new Date().toISOString(),data:JSON.parse(JSON.stringify(data))};
  if(list[0]&&JSON.stringify(list[0].data)===JSON.stringify(snapshot.data))return;
  list.unshift(snapshot);
  localStorage.setItem(SNAP_KEY,JSON.stringify(list.slice(0,7)));
  if($("autoBackupStatus"))$("autoBackupStatus").textContent=`端末内の自動保存：${new Date(snapshot.at).toLocaleString("ja-JP")}（最大7件）`;
 }catch(e){if($("autoBackupStatus"))$("autoBackupStatus").textContent="自動保存できません。JSONファイルでバックアップしてください。";}
}
function save(){
  // 保存失敗時には画面に知らせる。自動保存は本データ保存の後に行う。
  try{localStorage.setItem(KEY,JSON.stringify(data))}
  catch(e){alert("保存できませんでした。端末の空き容量・ブラウザ設定を確認し、JSONバックアップを取ってください。");return false}
  backupSnapshot();return true;
}
function key(date){return `${data.selectedStaff}_${date}`}
function record(date){return data.records[key(date)]}
function activeRecord(){
 // 前日以前から続く勤務を優先。日付変更後の打刻漏れも確認できる。
 const unfinished=Object.values(data.records).filter(r=>r.staffId===data.selectedStaff&&r.clockIn&&!r.clockOut)
   .sort((a,b)=>b.clockIn.localeCompare(a.clockIn));
 return unfinished[0]||record(nowDate());
}
function ensureRecord(date){
  if(!record(date)){
    data.records[key(date)]={date,staffId:data.selectedStaff,clockIn:null,clockOut:null,breaks:[],note:""};
  }
  return record(date);
}
function parseIso(v){return v?new Date(v):null}
function minutesBetween(a,b){
  if(!a||!b)return 0;
  return Math.max(0,Math.round((parseIso(b)-parseIso(a))/60000));
}
function breakMinutes(r){
 if(!r?.clockIn)return 0;
 const start=new Date(r.clockIn).getTime(),end=r.clockOut?new Date(r.clockOut).getTime():Date.now();
 const spans=(r.breaks||[]).filter(b=>b.start).map(b=>[Math.max(start,new Date(b.start).getTime()),Math.min(end,b.end?new Date(b.end).getTime():end)])
   .filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);
 let total=0,last=start;
 for(const [a,b] of spans){total+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b)}
 return Math.round(total/60000);
}
function workMinutes(r){
  if(!r?.clockIn||!r?.clockOut)return 0;
  return Math.max(0,minutesBetween(r.clockIn,r.clockOut)-breakMinutes(r));
}
function hm(m){
  m=Math.max(0,Math.round(m||0));
  return `${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`;
}
function fmtTime(iso){
  if(!iso)return "--:--";
  return new Date(iso).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
}
function addDays(date,n){
 const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dayOfIso(iso){if(!iso)return "";const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function timeToIso(date,time){
  if(!date||!time)return null;
  return new Date(`${date}T${time}:00`).toISOString();
}
function isoToTime(iso){
  if(!iso)return "";
  const d=new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function setToast(msg){
  $("toast").textContent=msg;
  $("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"),1800);
}
function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}

function renderStaff(){
  if(!data.staff.length){
    data.staff=[{id:"staff1",name:"使用者1"}];
    data.selectedStaff="staff1";
  }
  $("staffSelect").innerHTML=data.staff.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  $("staffSelect").value=data.selectedStaff;
}
function renderToday(){
  const date=nowDate(),r=activeRecord();
  $("todayDate").textContent=new Date(`${r?.date||date}T00:00:00`).toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  $("todayClockIn").textContent=fmtTime(r?.clockIn);
  $("todayClockOut").textContent=fmtTime(r?.clockOut);
  $("todayBreak").textContent=hm(breakMinutes(r));
  $("todayWork").textContent=hm(workMinutes(r));
  const active=(r?.breaks||[]).some(b=>b.start&&!b.end);
  $("todayStatus").textContent=!r?.clockIn?"未出勤":r.clockOut?"退勤済み":active?"休憩中":"勤務中";
}
function renderHistory(){
  const month=$("historyMonth").value||monthNow();
  const rows=Object.values(data.records)
    .filter(r=>r.staffId===data.selectedStaff && r.date && r.date.startsWith(month))
    .sort((a,b)=>b.date.localeCompare(a.date));

  if(!rows.length){
    $("historyList").innerHTML=`
      <div class="history-empty">
        <p>この月の勤怠記録はありません。</p>
        <button class="primary-btn" type="button" data-action="new">＋ 勤怠を新規追加</button>
      </div>`;
    return;
  }

  $("historyList").innerHTML=rows.map(r=>{
    const weekday=new Date(`${r.date}T00:00:00`).toLocaleDateString("ja-JP",{weekday:"short"});
    return `
      <div class="history-item">
        <div class="history-date">
          <strong>${escapeHtml(r.date)}</strong><span>（${weekday}）</span>
        </div>
        <div class="history-times">
          <div><span>出勤</span><strong>${fmtTime(r.clockIn)}</strong></div>
          <div><span>休憩</span><strong>${hm(breakMinutes(r))}</strong></div>
          <div><span>退勤</span><strong>${fmtTime(r.clockOut)}</strong></div>
          <div><span>実働</span><strong>${hm(workMinutes(r))}</strong></div>
        </div>
        ${r.note?`<div class="history-note">備考：${escapeHtml(r.note)}</div>`:""}
        <div class="history-item-actions">
          <button type="button" class="history-edit-btn" data-action="edit" data-date="${r.date}">✏️ 編集</button>
          <button type="button" class="history-delete-btn" data-action="delete" data-date="${r.date}">🗑️ 削除</button>
        </div>
      </div>`;
  }).join("");
}
function renderSummary(){
  const month=$("summaryMonth").value||monthNow();
  const rows=Object.values(data.records).filter(r=>r.staffId===data.selectedStaff&&r.date?.startsWith(month));
  $("summaryDays").textContent=`${rows.filter(r=>r.clockIn).length}日`;
  $("summaryBreak").textContent=hm(rows.reduce((a,r)=>a+breakMinutes(r),0));
  $("summaryWork").textContent=hm(rows.reduce((a,r)=>a+workMinutes(r),0));
}
const TYPE_NAMES={normal:"通常勤務",holidayWork:"休日出勤",paid:"有給",holiday:"休日",absence:"欠勤",trip:"出張"};
function warningFor(r){
  if(["paid","holiday","absence"].includes(r.type))return "";
  if(!r.clockIn)return "出勤時刻なし";
  if(!r.clockOut)return "退勤時刻なし";
  if((r.breaks||[]).some(b=>b.start&&!b.end))return "休憩終了なし";
  return "";
}
function monthRows(){
  const month=$("historyMonth").value||monthNow();
  return Object.values(data.records).filter(r=>r.staffId===data.selectedStaff&&r.date?.startsWith(month));
}
function renderDashboard(){
  const rows=monthRows(),completed=rows.filter(r=>r.clockIn&&r.clockOut);
  const warnings=rows.filter(r=>warningFor(r));
  $("dashDays").textContent=`${rows.filter(r=>r.clockIn).length}日`;
  $("dashWork").textContent=hm(completed.reduce((s,r)=>s+workMinutes(r),0));
  $("dashOvertime").textContent=hm(completed.reduce((s,r)=>s+Math.max(0,workMinutes(r)-data.regularMinutes),0));
  $("dashWarnings").textContent=`${warnings.length}件`;
  $("warningList").innerHTML=warnings.length?warnings.map(r=>`<button type="button" class="warning-item" data-date="${r.date}">${r.date}：${warningFor(r)}（編集）</button>`).join(""):'<p class="hint">打刻漏れはありません。</p>';
}
function monthShift(month,delta){
 const [y,m]=month.split("-").map(Number),d=new Date(y,m-1+delta,1);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

// 祝日法に基づく日本の祝日計算。将来の法改正や臨時祝日には更新が必要。

function nthMonday(y,m,n){return 1+(8-new Date(y,m-1,1).getDay())%7+7*(n-1)}
function equinox(y,spring){
 if(y<1980||y>2099)return null;
 return Math.floor((spring?20.8431:23.2488)+0.242194*(y-1980)-Math.floor((y-1980)/4));
}
function jpHolidays(year){
 if(jpHolidayCache.has(year))return jpHolidayCache.get(year);
 const base=new Set();
 const add=(m,d)=>{if(d)base.add(`${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`)};
 if(year<1980||year>2099){jpHolidayCache.set(year,base);return base}
 add(1,1);add(1,year>=2000?nthMonday(year,1,2):15);
 if(year>=1967)add(2,11);
 if(year>=2020)add(2,23);
 add(3,equinox(year,true));
 add(4,29);add(5,3);add(5,5);if(year>=2007)add(5,4);
 if(year>=1996){
  if(year===2020)add(7,23);
  else if(year===2021)add(7,22);
  else add(7,year>=2003?nthMonday(year,7,3):20);
 }
 if(year>=2016)add(8,year===2020?10:year===2021?8:11);
 if(year>=1966)add(9,year>=2003?nthMonday(year,9,3):15);
 add(9,equinox(year,false));
 if(year===2020)add(7,24);
 else if(year===2021)add(7,23);
 else add(10,year>=2000?nthMonday(year,10,2):10);
 add(11,3);add(11,23);
 if(year>=1989&&year<=2018)add(12,23);
 if(year===2019){add(5,1);add(10,22)}
 const result=new Set(base);
 // 国民の休日：祝日に挟まれた平日
 if(year>=1986){
  for(let i=1;i<=366;i++){
   const d=new Date(year,0,i,12);if(d.getFullYear()!==year)break;
   const key=`${year}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   if(!base.has(key)&&base.has(addDays(key,-1))&&base.has(addDays(key,1)))result.add(key);
  }
 }
 // 振替休日。2007年以降は祝日連続後の最初の非祝日
 if(year>=1973){
  for(const key of [...result].sort()){
   if(new Date(key+"T12:00:00").getDay()!==0)continue;
   let next=addDays(key,1);
   if(year>=2007){while(result.has(next))next=addDays(next,1);result.add(next)}
   else if(!result.has(next))result.add(next);
  }
 }
 jpHolidayCache.set(year,result);return result;
}
function isJapaneseHoliday(date){return jpHolidays(Number(String(date).slice(0,4))).has(date)}

function paydayForMonth(month,settings=salaryConfig()){
 if(!/^\d{4}-\d{2}$/.test(month))return null;
 const offset=Number(settings.paydayOffset)===1?1:0;
 const dueMonth=monthShift(month,offset);
 const [year,mon]=dueMonth.split("-").map(Number);
 const max=new Date(year,mon,0).getDate();
 const n=Number(settings.paydayDay);
 const day=n===0?max:Math.min(Math.max(1,n||25),max);
 const nominal=`${dueMonth}-${String(day).padStart(2,"0")}`;
 const mode=["previous","next","fixed"].includes(settings.paydayAdjustment)?settings.paydayAdjustment:"fixed";
 const holidays=new Set(String(settings.paydayHolidays||"").split(/[\s,，、;；]+/).filter(Boolean));
 let date=nominal;
 if(mode!=="fixed"){
  const delta=mode==="previous"?-1:1;
  for(let i=0;i<40;i++){
   const d=new Date(`${date}T12:00:00`),w=d.getDay();
   if(w!==0&&w!==6&&!isJapaneseHoliday(date)&&!holidays.has(date))break;
   date=addDays(date,delta);
  }
 }
 return {date,nominal,offset,period:month,mode};
}
function initPaydayControls(s){
 $("paydayOffset").value=String(Number(s.paydayOffset)===1?1:0);
 $("paydayDay").value=String(s.paydayDay??25);
 $("paydayAdjustment").value=s.paydayAdjustment||"fixed";
 $("paydayHolidays").value=s.paydayHolidays||"";
 $("paydaySavedMessage").textContent="";
 renderPaydayPreview();
}
function previewPaydayConfig(){
 return {...salaryConfig(),paydayOffset:Number($("paydayOffset").value),
 paydayDay:Number($("paydayDay").value),
 paydayAdjustment:$("paydayAdjustment").value,paydayHolidays:$("paydayHolidays").value.trim()};
}
function renderPaydayPreview(){
 const month=$("calendarMonth").value||monthNow();
 const p=paydayForMonth(month,previewPaydayConfig());
 if(!p)return;
 const labels={previous:"前倒し",next:"後ろ倒し",fixed:"固定"};
 $("paydayPreview").textContent=`${p.period}勤務分：基準日 ${p.nominal} → 実際の給料日 ${p.date}（${labels[p.mode]}）。保存するとカレンダーに反映されます。`;
}
function renderCalendar(){
  const month=$("calendarMonth").value||monthNow();
  const [year,mon]=month.split("-").map(Number);
  const first=new Date(year,mon-1,1).getDay();
  const days=new Date(year,mon,0).getDate();
  const names=["日","月","火","水","木","金","土"];
  let html=names.map((n,i)=>`<div class="calendar-week ${i===0?'calendar-sunday':i===6?'calendar-saturday':''}">${n}</div>`).join("");
  for(let i=0;i<first;i++)html+='<div class="calendar-blank"></div>';
  const config=salaryReady?salaryConfig():null;
  const paydays=config?[monthShift(month,-2),monthShift(month,-1),month,monthShift(month,1)].map(m=>paydayForMonth(m,config)).filter(p=>p&&p.date.slice(0,7)===month):[];
  for(let d=1;d<=days;d++){
    const date=`${month}-${String(d).padStart(2,"0")}`,r=record(date);
    const warn=r&&warningFor(r);
    const category=r?.type||"normal";
    const weekday=new Date(year,mon-1,d).getDay();
    const japaneseHoliday=isJapaneseHoliday(date);
    const todaysPaydays=paydays.filter(p=>p.date===date);
    const payday=todaysPaydays[0];
    const isPayday=!!payday;
    const payBadge=todaysPaydays.map(p=>`<span class="payday-tag ${p.offset===0?'payday-current':'payday-next'}">💴 ${p.offset===0?'当月':'翌月'}給料日</span>`).join("");
    html+=`<button type="button" class="calendar-day ${r?'has-record':''} ${warn?'has-warning':''} type-${category} ${weekday===6?'calendar-saturday':''} ${weekday===0||japaneseHoliday?'calendar-sunday':''} ${japaneseHoliday?'is-jp-holiday':''} ${isPayday?(payday.offset===0?'is-payday-current':'is-payday-next'):''}" data-date="${date}"><b>${d}${japaneseHoliday?'<span class="holiday-mark" title="日本の祝休日">祝</span>':''}</b><small>${r?(warn?'要確認':(['paid','holiday','absence','trip'].includes(category)?TYPE_NAMES[category]:hm(workMinutes(r)))):'—'}</small>${payBadge}</button>`;
  }
  $("calendarGrid").innerHTML=html;
  if(salaryReady&&$("paydayPreview"))renderPaydayPreview();
}
function renderAll(){renderStaff();renderToday();renderHistory();renderSummary();renderDashboard();renderCalendar();renderLiveWork();if(salaryReady)renderSalary()}


function clockIn(){
  if(activeRecord()?.clockIn&&!activeRecord()?.clockOut)return alert("勤務中の記録があります。先に退勤してください。");
  const r=ensureRecord(nowDate());
  if(r.clockIn)return alert("すでに出勤済みです。");
  r.clockIn=isoNow();save();renderAll();setToast("出勤しました");
}
function breakStart(){
  const r=activeRecord();
  if(!r?.clockIn)return alert("先に出勤してください。");
  if(r.clockOut)return alert("退勤済みです。");
  if(r.breaks.some(b=>b.start&&!b.end))return alert("すでに休憩中です。");
  r.breaks.push({id:crypto.randomUUID?.()||String(Date.now()),start:isoNow(),end:null});
  save();renderAll();setToast("休憩を開始しました");
}
function breakEnd(){
  const r=activeRecord();
  const b=r?.breaks?.find(x=>x.start&&!x.end);
  if(!b)return alert("開始中の休憩がありません。");
  b.end=isoNow();save();renderAll();setToast("休憩を終了しました");
}
function clockOut(){
  const r=activeRecord();
  if(!r?.clockIn)return alert("出勤記録がありません。");
  if(r.clockOut)return alert("すでに退勤済みです。");
  const b=r.breaks.find(x=>x.start&&!x.end);
  if(b)b.end=isoNow();
  r.clockOut=isoNow();save();renderAll();setToast("退勤しました");
}

function openNewRecord(){
  recordEditDate=null;
  $("recordModalTitle").textContent="勤怠を新規作成";
  $("recordDate").value=nowDate();
  $("recordClockIn").value="";
  $("recordClockOut").value="";
  $("recordOutNextDay").checked=false;
  $("recordNote").value="";
  $("recordType").value="normal";
  $("recordDeleteBtn").style.display="none";
  renderRecordBreakRows([]);
  updateRecordPreview();
  openModal("recordModal");
}
function openRecordEditor(date){
  const r=record(date);
  if(!r)return alert("勤怠記録が見つかりません。");
  recordEditDate=date;
  $("recordModalTitle").textContent="勤怠を編集";
  $("recordDate").value=r.date;
  $("recordClockIn").value=isoToTime(r.clockIn);
  $("recordClockOut").value=isoToTime(r.clockOut);
  $("recordOutNextDay").checked=!!r.clockOut&&dayOfIso(r.clockOut)!==r.date;
  $("recordNote").value=r.note||"";
  $("recordType").value=r.type||"normal";
  $("recordDeleteBtn").style.display="";
  renderRecordBreakRows(r.breaks||[]);
  updateRecordPreview();
  openModal("recordModal");
}
function renderRecordBreakRows(breaks){
  $("recordBreakRows").innerHTML=(breaks||[]).map(b=>`
    <div class="break-row">
      <label>開始<input class="break-start" type="time" value="${isoToTime(b.start)}"></label><label class="inline-check"><input class="break-start-nextday" type="checkbox" ${b.start&&dayOfIso(b.start)!==$("recordDate").value?"checked":""}>翌日開始</label>
      <label>終了<input class="break-end" type="time" value="${isoToTime(b.end)}"></label><label class="inline-check"><input class="break-nextday" type="checkbox" ${b.end&&dayOfIso(b.end)!==dayOfIso(b.start)?"checked":""}>翌日終了</label>
      <button type="button" class="remove-break">×</button>
    </div>`).join("");
}
function addRecordBreakRow(){
  $("recordBreakRows").insertAdjacentHTML("beforeend",`
    <div class="break-row">
      <label>開始<input class="break-start" type="time"></label><label class="inline-check"><input class="break-start-nextday" type="checkbox">翌日開始</label>
      <label>終了<input class="break-end" type="time"></label><label class="inline-check"><input class="break-nextday" type="checkbox">翌日終了</label>
      <button type="button" class="remove-break">×</button>
    </div>`);
}
function collectRecord(){
 const date=$("recordDate").value;
 const clockIn=timeToIso(date,$("recordClockIn").value);
 const clockOut=timeToIso($("recordOutNextDay").checked?addDays(date,1):date,$("recordClockOut").value);
 const breaks=[...$("recordBreakRows").querySelectorAll(".break-row")].map((row,i)=>{
   const startDay=row.querySelector(".break-start-nextday").checked?addDays(date,1):date;
   const endDay=row.querySelector(".break-nextday").checked?addDays(date,1):date;
   return {id:String(Date.now()+i),start:timeToIso(startDay,row.querySelector(".break-start").value),
     end:timeToIso(endDay,row.querySelector(".break-end").value)};
 }).filter(b=>b.start||b.end);
 return {date,staffId:data.selectedStaff,clockIn,clockOut,breaks,type:$("recordType").value,note:$("recordNote").value.trim()};
}
function validateRecord(r){
 if(!r.date)return "日付を入力してください。";
 const dayOff=["paid","holiday","absence"].includes(r.type);
 if(dayOff){
   if(r.clockIn||r.clockOut||r.breaks.length)return "有給・休日・欠勤は出退勤・休憩時刻を空欄にしてください。";
   return "";
 }
 if(!r.clockIn)return "出勤時間を入力してください。";
 if(r.clockOut&&new Date(r.clockOut)<=new Date(r.clockIn))return "退勤時間は出勤時間より後にしてください。";
 if(r.clockOut&&minutesBetween(r.clockIn,r.clockOut)>24*60)return "24時間を超える勤務は記録を分けてください。";
 const ordered=[...r.breaks].sort((a,b)=>String(a.start).localeCompare(String(b.start)));
 let last=new Date(r.clockIn).getTime();
 for(const b of ordered){
   if(!b.start||!b.end)return "休憩は開始・終了の両方を入力してください。";
   const bs=new Date(b.start).getTime(),be=new Date(b.end).getTime();
   if(be<=bs)return "休憩終了は開始より後にしてください。翌日終了も確認してください。";
   if(bs<last)return "休憩時間が重複しているか、出勤前に設定されています。";
   if(r.clockOut&&be>new Date(r.clockOut).getTime())return "休憩終了は退勤時間より前にしてください。";
   last=be;
 }
 return "";
}
function saveRecordFromModal(){
  const r=collectRecord(),err=validateRecord(r);
  if(err)return alert(err);

  const newKey=`${data.selectedStaff}_${r.date}`;
  const oldKey=recordEditDate?`${data.selectedStaff}_${recordEditDate}`:null;

  if(newKey!==oldKey && data.records[newKey]){
    if(!confirm(`${r.date} の勤怠はすでにあります。上書きしますか？`))return;
  }
  if(oldKey && oldKey!==newKey)delete data.records[oldKey];
  const overlaps=Object.entries(data.records).some(([k,other])=>
    k!==oldKey&&k!==newKey&&other.staffId===r.staffId&&other.clockIn&&other.clockOut&&r.clockIn&&r.clockOut&&
    new Date(other.clockIn)<new Date(r.clockOut)&&new Date(r.clockIn)<new Date(other.clockOut));
  if(overlaps)return alert("別の日の勤務記録と時間が重複しています。");
  data.records[newKey]=r;
  save();closeModal("recordModal");renderAll();setToast(recordEditDate?"勤怠を更新しました":"勤怠を追加しました");
}
function deleteHistoryRecord(date){
  const k=`${data.selectedStaff}_${date}`;
  if(!data.records[k])return alert("削除する勤怠記録が見つかりません。");
  const name=data.staff.find(s=>s.id===data.selectedStaff)?.name||"使用者";
  if(!confirm(`${name}さんの ${date} の勤怠記録を削除しますか？`))return;
  delete data.records[k];save();renderAll();setToast("勤怠履歴を削除しました");
}
function deleteRecordFromModal(){
  if(!recordEditDate)return;
  if(!confirm(`${recordEditDate} の勤怠記録を削除しますか？`))return;
  delete data.records[`${data.selectedStaff}_${recordEditDate}`];
  save();closeModal("recordModal");renderAll();setToast("勤怠履歴を削除しました");
}
function updateRecordPreview(){
  try{
    const r=collectRecord();
    $("recordBreakPreview").textContent=hm(breakMinutes(r));
    $("recordWorkPreview").textContent=hm(workMinutes(r));
  }catch(e){}
}

function renderStaffList(){
  const counts={};
  data.staff.forEach(s=>counts[s.name]=(counts[s.name]||0)+1);
  $("staffList").innerHTML=data.staff.map(s=>`
    <div class="staff-row" data-id="${s.id}">
      <input class="staff-name-input" value="${escapeHtml(s.name)}">
      <button class="small-btn save-staff" type="button">保存${counts[s.name]>1?"（同名あり）":""}</button>
      <button class="danger-outline delete-staff" type="button">削除</button>
    </div>`).join("");
}
function addStaff(){
  const name=$("newStaffName").value.trim();
  if(!name)return alert("使用者名を入力してください。");
  const id="staff_"+Date.now();
  data.staff.push({id,name});data.selectedStaff=id;$("newStaffName").value="";
  save();renderAll();initSalary();renderStaffList();setToast("使用者を追加しました");
}
function saveStaffRow(row){
  const id=row.dataset.id,name=row.querySelector(".staff-name-input").value.trim();
  if(!name)return alert("名前を入力してください。");
  const s=data.staff.find(x=>x.id===id);if(s)s.name=name;
  save();renderAll();renderStaffList();setToast("名前を変更しました");
}
function deleteStaffRow(row){
  const id=row.dataset.id;
  if(data.staff.length<=1)return alert("使用者は1人以上必要です。");
  if(!confirm("この使用者を削除しますか？勤怠記録も削除されます。"))return;
  data.staff=data.staff.filter(s=>s.id!==id);
  if(data.salaryByStaff)delete data.salaryByStaff[id];
  Object.keys(data.records).forEach(k=>{if(data.records[k].staffId===id)delete data.records[k]});
  if(data.selectedStaff===id)data.selectedStaff=data.staff[0].id;
  save();renderAll();initSalary();renderStaffList();setToast("使用者を削除しました");
}
function exportCsv(){
  const month=$("summaryMonth").value||monthNow();
  const rows=Object.values(data.records).filter(r=>r.staffId===data.selectedStaff&&r.date?.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  const staff=data.staff.find(s=>s.id===data.selectedStaff)?.name||"";
  const csv=[["使用者","日付","出勤","退勤","休憩(分)","実働(分)","備考"],...rows.map(r=>[staff,r.date,fmtTime(r.clockIn),fmtTime(r.clockOut),breakMinutes(r),workMinutes(r),r.note||""])]
    .map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`勤怠_${staff}_${month}.csv`;a.click();URL.revokeObjectURL(a.href);
}

load();
$("historyMonth").value=monthNow();
$("summaryMonth").value=monthNow();
renderAll();

$("staffSelect").addEventListener("change",e=>{data.selectedStaff=e.target.value;save();renderAll();initSalary();renderCalendar()});
$("clockInBtn").onclick=clockIn;
$("breakStartBtn").onclick=breakStart;
$("breakEndBtn").onclick=breakEnd;
$("clockOutBtn").onclick=clockOut;
$("todayEditBtn").onclick=()=>{const r=activeRecord();r?openRecordEditor(r.date):openNewRecord()};
$("newRecordBtn").onclick=openNewRecord;
$("historyMonth").onchange=()=>{renderHistory();renderDashboard();renderCalendar()};
$("summaryMonth").onchange=renderSummary;
$("csvBtn").onclick=exportCsv;
$("recordAddBreakBtn").onclick=addRecordBreakRow;
$("recordSaveBtn").onclick=saveRecordFromModal;
$("recordDeleteBtn").onclick=deleteRecordFromModal;

$("historyList").addEventListener("click",e=>{
  const btn=e.target.closest("button");
  if(!btn)return;
  if(btn.dataset.action==="new")openNewRecord();
  if(btn.dataset.action==="edit")openRecordEditor(btn.dataset.date);
  if(btn.dataset.action==="delete")deleteHistoryRecord(btn.dataset.date);
});
$("recordBreakRows").addEventListener("click",e=>{
  const btn=e.target.closest(".remove-break");
  if(btn){btn.closest(".break-row").remove();updateRecordPreview()}
});
$("recordModal").addEventListener("input",updateRecordPreview);
$("recordModal").addEventListener("change",updateRecordPreview);

$("staffManageBtn").onclick=()=>{renderStaffList();openModal("staffModal")};
$("addStaffBtn").onclick=addStaff;
$("staffList").addEventListener("click",e=>{
  const row=e.target.closest(".staff-row");if(!row)return;
  if(e.target.closest(".save-staff"))saveStaffRow(row);
  if(e.target.closest(".delete-staff"))deleteStaffRow(row);
});
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));

$("regularMinutes").value=hm(data.regularMinutes).padStart(5,"0");
$("regularMinutes").addEventListener("change",e=>{
  const m=/^(\d{1,2}):(\d{2})$/.exec(e.target.value);
  if(!m)return;
  data.regularMinutes=Number(m[1])*60+Number(m[2]);save();renderAll();
});
$("calendarGrid").addEventListener("click",e=>{
  const b=e.target.closest("button[data-date]");if(!b)return;
  if(record(b.dataset.date))openRecordEditor(b.dataset.date);
  else{openNewRecord();$("recordDate").value=b.dataset.date;}
});
$("warningList").addEventListener("click",e=>{
  const b=e.target.closest("button[data-date]");if(b)openRecordEditor(b.dataset.date);
});
function downloadJson(){
  const blob=new Blob([JSON.stringify({format:"kintai-backup",version:6,exportedAt:new Date().toISOString(),data},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`勤怠バックアップ_${nowDate()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$("backupBtn").onclick=downloadJson;
$("restoreBtn").onclick=()=>$("restoreFile").click();
$("restoreFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>5*1024*1024)throw Error("ファイルが大きすぎます。");
    const obj=JSON.parse(await file.text()),next=obj?.format==="kintai-backup"?obj.data:obj;
    if(!next||!Array.isArray(next.staff)||!next.staff.length||typeof next.records!=="object"||!next.records||Array.isArray(next.records))throw Error("バックアップの形式が正しくありません。");
    if(!next.staff.every(s=>typeof s.id==="string"&&typeof s.name==="string"))throw Error("使用者データが不正です。");
    if(!Object.values(next.records).every(r=>r&&typeof r.staffId==="string"&&typeof r.date==="string"&&Array.isArray(r.breaks)))throw Error("勤怠データが不正です。");
    if(!confirm("現在の勤怠データをバックアップ内容で置き換えます。よろしいですか？"))return;
    data=next;
    if(!Number.isFinite(data.regularMinutes))data.regularMinutes=465;
    if(!data.staff.some(s=>s.id===data.selectedStaff))data.selectedStaff=data.staff[0].id;
    save();$("regularMinutes").value=hm(data.regularMinutes).padStart(5,"0");
    if(salaryReady)initSalary();
    renderAll();setToast("バックアップを復元しました");
  }catch(err){alert("復元できませんでした："+err.message)}
  finally{e.target.value=""}
});


// v8 カレンダー専用の月移動。勤怠履歴の表示月は変更しません。
$("calendarMonth").value=monthNow();
function moveCalendarMonth(offset){
  const [year,month]=$("calendarMonth").value.split("-").map(Number);
  const target=new Date(year,month-1+offset,1);
  $("calendarMonth").value=`${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,"0")}`;
  renderCalendar();
}
$("calendarPrev").addEventListener("click",()=>moveCalendarMonth(-1));
$("calendarNext").addEventListener("click",()=>moveCalendarMonth(1));
$("calendarMonth").addEventListener("change",renderCalendar);
$("calendarToday").addEventListener("click",()=>{
  $("calendarMonth").value=monthNow();
  renderCalendar();
});

function renderLiveWork(){
 const r=activeRecord(), active=(r?.breaks||[]).some(b=>b.start&&!b.end);
 if(!r?.clockIn){$("liveWorkTime").textContent="0:00:00";$("liveWorkState").textContent="未出勤";return;}
 const end=r.clockOut?new Date(r.clockOut):new Date();
 const elapsed=Math.max(0,Math.floor((end-new Date(r.clockIn))/1000));
 const rest=(r.breaks||[]).reduce((sum,b)=>sum+(!b.start?0:Math.max(0,Math.floor(((b.end?new Date(b.end):end)-new Date(b.start))/1000))),0);
 const sec=Math.max(0,elapsed-rest);
 $("liveWorkTime").textContent=`${Math.floor(sec/3600)}:${String(Math.floor(sec%3600/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
 $("liveWorkState").textContent=r.clockOut?"退勤済み":active?"休憩中":"勤務中";
}
setInterval(renderLiveWork,1000);
// v12: 個人別給与設定（既存の勤怠データを維持）
const salaryDefaults={specialPeriods:[],paydayOffset:0,paydayDay:25,paydayAdjustment:"fixed",paydayHolidays:"",closingDay:0,mode:"hourly",baseHourly:1100,friRate:1,satRate:1,sunRate:1,holidayRate:1,preHolidayRate:1,salaryHolidayDates:"",nightStart:"22:00",nightEnd:"05:00",nightExtra:0,monthlyBase:220000,monthlyAllowance:0,overtimeHourly:1500,overtimeRate:1};
const salaryFields=Object.keys(salaryDefaults).filter(k=>k!=="mode"&&k!=="closingDay"&&k!=="paydayOffset"&&k!=="paydayDay"&&k!=="paydayAdjustment"&&k!=="paydayHolidays"&&k!=="specialPeriods");
function salaryConfig(){
  const id=data.selectedStaff;
  return {...salaryDefaults,...(data.salary||{}),...(data.salaryByStaff?.[id]||{})};
}
function initSalary(){
  const s=salaryConfig();
  $("salaryMode").value=s.mode;
  $("salaryClosingDay").value=String(s.closingDay||0);
  initPaydayControls(s);
  salaryFields.forEach(k=>{$(k).value=s[k]});
  renderSpecialPeriodRows(s.specialPeriods||[]);
  $("salarySavedMessage").textContent="";
  loadMonthlyPayroll();
}

// v26: 月別の時給・月給明細はスタッフごとに独立して保存
function monthPayrollMap(){
 data.monthPayrollByStaff??={};
 return data.monthPayrollByStaff[data.selectedStaff]??(data.monthPayrollByStaff[data.selectedStaff]={});
}
function monthPayroll(month){return monthPayrollMap()[month]||{}}
function payrollMonth(){return $("salaryTargetMonth").value||monthNow()}
function money(v){return "¥"+Math.round(v).toLocaleString("ja-JP")}
function addPayRow(kind,item={}){
 const box=$(kind==="allowance"?"allowanceRows":"deductionRows");
 const row=document.createElement("div");row.className="payroll-line";
 const name=document.createElement("input");name.type="text";name.placeholder=kind==="allowance"?"例：住居手当・通勤手当・教職調整額":"例：共済掛金・所得税・住民税";name.className="payroll-name";name.maxLength=60;name.value=item.name||"";
 const amount=document.createElement("input");amount.type="number";amount.min="0";amount.step="1";amount.inputMode="numeric";amount.className="payroll-amount";amount.placeholder="金額（円）";amount.value=item.amount??0;
 const remove=document.createElement("button");remove.type="button";remove.className="secondary-btn";remove.textContent="削除";
 remove.addEventListener("click",()=>{row.remove();renderSalary()});
 name.addEventListener("input",renderSalary);amount.addEventListener("input",renderSalary);
 row.append(name,amount,remove);box.append(row);
}
function readPayRows(kind){
 return [...$(kind==="allowance"?"allowanceRows":"deductionRows").querySelectorAll(".payroll-line")].map(row=>({name:row.querySelector(".payroll-name").value.trim(),amount:Number(row.querySelector(".payroll-amount").value)}));
}
function validPayRows(items){return items.every(x=>x.name&&Number.isFinite(x.amount)&&x.amount>=0)}
function loadMonthlyPayroll(){
 const month=payrollMonth(),p=monthPayroll(month),s=salaryConfig();
 $("monthlyHourlyOverride").value=p.hourly??s.baseHourly;
 $("monthlyBaseOverride").value=p.monthlyBase??s.monthlyBase;
 for(const kind of ["allowance","deduction"]){
  $(kind==="allowance"?"allowanceRows":"deductionRows").replaceChildren();
  for(const item of (p[kind+"s"]||[]))addPayRow(kind,item);
 }
 $("monthlyHourlyMessage").textContent=p.hourly===undefined?"この月は共通の基本時給を使用しています。":"この月の時給を保存済みです。";
 $("monthlyPayslipMessage").textContent=p.monthlyBase===undefined&&!p.allowances&&!p.deductions?"この月の明細は未登録です。":"この月の給与明細を保存済みです。";
 renderSalary();
}
function persistMonthPayroll(p){
 monthPayrollMap()[payrollMonth()]=p;
 if(save()===false)return false;
 renderSalary();return true;
}
$("addAllowanceBtn").addEventListener("click",()=>addPayRow("allowance"));
$("addDeductionBtn").addEventListener("click",()=>addPayRow("deduction"));
$("saveMonthlyHourlyBtn").addEventListener("click",()=>{
 const v=Number($("monthlyHourlyOverride").value);
 if($("monthlyHourlyOverride").value===""||!Number.isFinite(v)||v<0){alert("この月の時給は0以上の金額を入力してください。");return}
 if(persistMonthPayroll({...monthPayroll(payrollMonth()),hourly:v}))$("monthlyHourlyMessage").textContent=`${payrollMonth()}の時給 ${money(v)} を保存しました。`;
});
$("removeMonthlyHourlyBtn").addEventListener("click",()=>{
 const p={...monthPayroll(payrollMonth())};delete p.hourly;
 if(persistMonthPayroll(p))loadMonthlyPayroll();
});
$("saveMonthlyPayslipBtn").addEventListener("click",()=>{
 const base=Number($("monthlyBaseOverride").value),allowances=readPayRows("allowance"),deductions=readPayRows("deduction");
 if($("monthlyBaseOverride").value===""||!Number.isFinite(base)||base<0||!validPayRows(allowances)||!validPayRows(deductions)){
  alert("基本月給、項目名、金額を確認してください。金額は0以上で入力してください。");return;
 }
 if(persistMonthPayroll({...monthPayroll(payrollMonth()),monthlyBase:base,allowances,deductions}))$("monthlyPayslipMessage").textContent=`${payrollMonth()}の給与明細を保存しました。`;
});
$("removeMonthlyPayslipBtn").addEventListener("click",()=>{
 const p={...monthPayroll(payrollMonth())};delete p.monthlyBase;delete p.allowances;delete p.deductions;
 if(persistMonthPayroll(p))loadMonthlyPayroll();
});
$("monthlyHourlyOverride").addEventListener("input",renderSalary);
$("monthlyBaseOverride").addEventListener("input",renderSalary);

function salaryMinute(t){const [h,m]=String(t||"00:00").split(":").map(Number);return h*60+m}
function inNight(min,start,end){return start!==end&&(start<end?(min>=start&&min<end):(min>=start||min<end))}
function salaryHolidaySet(raw){
 return new Set(String(raw||"").split(/[\s,，、;；]+/).filter(Boolean));
}
function specialPeriodRows(){
 return [...$("specialPeriodRows").querySelectorAll(".special-period-row")].map(row=>({
  start:row.querySelector(".special-start").value,
  end:row.querySelector(".special-end").value,
  hourly:Number(row.querySelector(".special-hourly").value)
 }));
}
function renderSpecialPeriodRows(periods){
 const host=$("specialPeriodRows");
 host.textContent="";
 (Array.isArray(periods)?periods:[]).forEach(p=>{
  const row=document.createElement("div");
  row.className="special-period-row";
  row.innerHTML=`<label>開始日<input class="special-start" type="date"></label><label>終了日<input class="special-end" type="date"></label><label>特別時給（円）<input class="special-hourly" type="number" min="0" step="1"></label><button type="button" class="special-remove" aria-label="この特別期間を削除">削除</button>`;
  row.querySelector(".special-start").value=p.start||"";
  row.querySelector(".special-end").value=p.end||"";
  row.querySelector(".special-hourly").value=p.hourly??2000;
  row.querySelector(".special-remove").addEventListener("click",()=>{row.remove();renderSalary()});
  host.appendChild(row);
 });
}
function validSpecialPeriods(periods){
 for(const p of periods){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.start)||!/^\d{4}-\d{2}-\d{2}$/.test(p.end)||
    dayOfIso(p.start+"T12:00:00")!==p.start||dayOfIso(p.end+"T12:00:00")!==p.end||p.end<p.start||
    !Number.isFinite(p.hourly)||p.hourly<0)return false;
 }
 const sorted=[...periods].sort((a,b)=>a.start.localeCompare(b.start));
 return sorted.every((p,i)=>i===0||sorted[i-1].end<p.start);
}
function specialHourlyForDate(date,periods){
 const p=(Array.isArray(periods)?periods:[]).find(p=>p.start<=date&&date<=p.end);
 return p?Number(p.hourly):null;
}
function salaryDayRate(seg,s,holidays){
 const date=seg.date;
 // 祝日、祝日前日、曜日の順に適用。倍率を重複乗算しない。
 if(isJapaneseHoliday(date)||holidays.has(date))return Number(s.holidayRate);
 if(isJapaneseHoliday(addDays(date,1))||holidays.has(addDays(date,1)))return Number(s.preHolidayRate);
 return seg.weekday===0?Number(s.sunRate):seg.weekday===6?Number(s.satRate):seg.weekday===5?Number(s.friRate):1;
}
function salaryWorkSegments(r){
  if(!r.clockIn||!r.clockOut)return [];
  const start=new Date(r.clockIn).getTime(),end=new Date(r.clockOut).getTime();
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
  const breaks=(r.breaks||[]).filter(b=>b.start&&b.end).map(b=>[new Date(b.start).getTime(),new Date(b.end).getTime()]);
  const segments=[];
  for(let t=start;t<end;){
    const next=Math.min(end,(Math.floor(t/60000)+1)*60000),middle=(t+next)/2;
    const d=new Date(middle);
    const intervals=breaks.map(([a,b])=>[Math.max(t,a),Math.min(next,b)]).filter(([a,b])=>b>a).sort((x,y)=>x[0]-y[0]);
    let excluded=0,last=t;
    for(const [a,b] of intervals){excluded+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b)}
    const active=Math.max(0,next-t-excluded);
    if(active>0)segments.push({hours:active/3600000,weekday:d.getDay(),date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,minute:d.getHours()*60+d.getMinutes()});
    t=next;
  }
  return segments;
}
function renderSalary(){
  const s={...salaryConfig(),mode:$("salaryMode").value,closingDay:Number($("salaryClosingDay").value)||0};
  for(const k of salaryFields){const el=$(k);s[k]=el.type==="number"?Number(el.value):el.value}
  s.specialPeriods=specialPeriodRows().filter(p=>p.start&&p.end&&p.end>=p.start&&Number.isFinite(p.hourly)&&p.hourly>=0);
  const mode=s.mode;
  $("hourlySalarySettings").classList.toggle("hidden",mode!=="hourly");
  $("monthlySalarySettings").classList.toggle("hidden",mode!=="monthly");
  const month=$("salaryTargetMonth").value||monthNow();
  const closing=s.closingDay;
  const savedMonth=monthPayroll(month);
  const [yy,mm]=month.split("-").map(Number);
  const lastDay=new Date(yy,mm,0).getDate();
  const end=closing===0?`${month}-${String(lastDay).padStart(2,"0")}`:`${month}-${String(Math.min(closing,lastDay)).padStart(2,"0")}`;
  const prev=new Date(yy,mm-2,1),prevMonth=`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,"0")}`;
  const prevLast=new Date(yy,mm-1,0).getDate();
  const start=closing===0?`${month}-01`:addDays(`${prevMonth}-${String(Math.min(closing,prevLast)).padStart(2,"0")}`,1);
  const rows=Object.values(data.records).filter(r=>r.staffId===data.selectedStaff&&r.date>=start&&r.date<=end);
  $("salaryPeriodRange").textContent=`集計期間：${start} ～ ${end}（出勤日を基準）`;
  const complete=rows.filter(r=>r.clockIn&&r.clockOut);
  const minutes=complete.reduce((sum,r)=>sum+workMinutes(r),0);
  let total=0,details="";
  if(mode==="hourly"){
    let base=0,night=0;
    const holidays=salaryHolidaySet(s.salaryHolidayDates);
    for(const r of complete){
      for(const seg of salaryWorkSegments(r)){
        const dayRate=salaryDayRate(seg,s,holidays);
        const special=specialHourlyForDate(seg.date,s.specialPeriods);
        const appliedHourly=special===null?Number(savedMonth.hourly??s.baseHourly)*dayRate:special;
        base+=seg.hours*appliedHourly;
        if(inNight(seg.minute,salaryMinute(s.nightStart),salaryMinute(s.nightEnd)))night+=seg.hours*appliedHourly*Number(s.nightExtra);
      }
    }
    total=base+night;
    details=`通常・特別期間の給与 ¥${Math.round(base).toLocaleString("ja-JP")} ＋ 夜間加算 ¥${Math.round(night).toLocaleString("ja-JP")}`;
  }else{
    const overtime=complete.reduce((sum,r)=>sum+Math.max(0,workMinutes(r)-data.regularMinutes),0);
    const extra=overtime/60*Number(s.overtimeHourly)*Number(s.overtimeRate);
    const monthBase=Number(savedMonth.monthlyBase??s.monthlyBase);
    const allowances=(savedMonth.allowances||[]).reduce((a,x)=>a+Number(x.amount||0),0);
    const deductions=(savedMonth.deductions||[]).reduce((a,x)=>a+Number(x.amount||0),0);
    total=monthBase+Number(s.monthlyAllowance)+extra+allowances;
    $("salaryNet").textContent=money(total-deductions);
    details=`基本給 ${money(monthBase)} ＋ 固定手当 ${money(Number(s.monthlyAllowance))} ＋ 追加支給 ${money(allowances)} ＋ 時間外目安 ${money(extra)}（${hm(overtime)}） － 控除 ${money(deductions)} ＝ 差引支給 ${money(total-deductions)}`;
  }
  $("salaryNetCard").classList.toggle("hidden",mode!=="monthly");
  $("salaryStaffName").textContent=data.staff.find(x=>x.id===data.selectedStaff)?.name||"—";
  $("salaryPeriod").textContent=`${start}〜${end}`;
  $("salaryHours").textContent=hm(minutes);
  $("salaryTotal").textContent="¥"+Math.round(total).toLocaleString("ja-JP");
  $("salaryDetails").textContent=details;
}
function saveSalarySettings(){
  const cfg={...salaryConfig(),mode:$("salaryMode").value,closingDay:Number($("salaryClosingDay").value)||0};
  for(const k of salaryFields){
    const el=$(k);
    const value=el.type==="number"?Number(el.value):el.value;
    if(el.type==="number"&&(!Number.isFinite(value)||value<0)){alert("給与設定には0以上の数字を入力してください。");el.focus();return;}
    cfg[k]=value;
  }
  cfg.specialPeriods=specialPeriodRows();
  if(!validSpecialPeriods(cfg.specialPeriods)){
    alert("特別期間の日付・時給を確認してください。期間の重複も登録できません。");return;
  }
  const holidayDates=String(cfg.salaryHolidayDates||"").split(/[\s,，、;；]+/).filter(Boolean);
  if(holidayDates.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x)||dayOfIso(x+"T12:00:00")!==x)){
    alert("祝日の日付は YYYY-MM-DD 形式で入力してください。");$("salaryHolidayDates").focus();return;
  }
  data.salaryByStaff??={};
  data.salaryByStaff[data.selectedStaff]=cfg;
  if(save()===false)return;
  loadMonthlyPayroll();renderCalendar();
  $("salarySavedMessage").textContent="この使用者の給与設定を保存しました。";
  setToast("給与設定を保存しました");
}
$("specialPeriodAddBtn").addEventListener("click",()=>{
 const periods=specialPeriodRows();
 periods.push({start:"",end:"",hourly:2000});
 renderSpecialPeriodRows(periods);
 renderSalary();
});
$("specialPeriodRows").addEventListener("input",renderSalary);
$("salaryMode").addEventListener("change",renderSalary);
$("salaryClosingDay").addEventListener("change",renderSalary);
salaryFields.forEach(k=>$(k).addEventListener("input",renderSalary));
$("salaryTargetMonth").value=monthNow();
$("salaryTargetMonth").addEventListener("change",loadMonthlyPayroll);
$("salarySaveBtn").addEventListener("click",saveSalarySettings);
$("salaryJumpSettings").addEventListener("click",()=>$("salarySettings").scrollIntoView({behavior:"smooth",block:"start"}));
$("summaryMonth").addEventListener("change",renderSalary);

salaryReady=true;
initSalary();
renderCalendar();


// v14 自動バックアップから復元
$("autoBackupStatus").textContent=getSnapshots().length?`端末内に${getSnapshots().length}件の自動保存があります。`:"自動保存はまだありません。";
$("restoreAutoBtn").addEventListener("click",()=>{
 const snapshots=getSnapshots();
 if(!snapshots.length)return alert("自動バックアップがありません。");
 const lines=snapshots.map((s,i)=>`${i+1}. ${new Date(s.at).toLocaleString("ja-JP")}`).join("\n");
 const answer=prompt(`復元する番号を入力してください（1〜${snapshots.length}）\n${lines}`,"1");
 if(answer===null)return;
 const idx=Number(answer)-1;
 if(!Number.isInteger(idx)||idx<0||idx>=snapshots.length)return alert("番号が正しくありません。");
 if(!confirm("現在の勤怠・給与設定を選択した自動保存に置き換えますか？"))return;
 data=JSON.parse(JSON.stringify(snapshots[idx].data));
 if(!data.staff?.some(s=>s.id===data.selectedStaff))data.selectedStaff=data.staff[0]?.id;
 save();$("regularMinutes").value=hm(data.regularMinutes).padStart(5,"0");initSalary();renderAll();setToast("自動保存を復元しました");
});
$("downloadAutoBtn").addEventListener("click",()=>{
 const latest=getSnapshots()[0];if(!latest)return alert("自動バックアップがありません。");
 const blob=new Blob([JSON.stringify({format:"kintai-backup",version:14,exportedAt:latest.at,data:latest.data},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`勤怠_自動保存_${nowDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});


// v16：個人別の給料日・支払タイミング
for(let d=1;d<=31;d++){
 const o=document.createElement("option");o.value=String(d);o.textContent=`毎月${d}日`;
 $("paydayDay").appendChild(o);
}
$("paydayOffset").addEventListener("change",renderPaydayPreview);
$("paydayDay").addEventListener("change",renderPaydayPreview);
$("paydayAdjustment").addEventListener("change",renderPaydayPreview);
$("paydayHolidays").addEventListener("input",renderPaydayPreview);
$("paydaySaveBtn").addEventListener("click",()=>{
 const offset=Number($("paydayOffset").value),day=Number($("paydayDay").value);
 const adjustment=$("paydayAdjustment").value,holidays=$("paydayHolidays").value.trim();
 if(!["previous","next","fixed"].includes(adjustment))return alert("調整方法が正しくありません。");
 if(holidays.split(/[\s,，、;；]+/).filter(Boolean).some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(new Date(x+"T12:00:00").getTime())||dayOfIso(x+"T12:00:00")!==x))return alert("休業日は YYYY-MM-DD 形式で入力してください。");
 if(![0,1].includes(offset)||!Number.isInteger(day)||day<0||day>31)return alert("給料日の設定が正しくありません。");
 data.salaryByStaff??={};
 data.salaryByStaff[data.selectedStaff]={...salaryConfig(),paydayOffset:offset,paydayDay:day,paydayAdjustment:adjustment,paydayHolidays:holidays};
 if(save()===false)return;
 renderCalendar();renderSalary();
 const p=paydayForMonth($("calendarMonth").value||monthNow(),salaryConfig());
 $("paydaySavedMessage").textContent=p?`保存しました。${p.period}勤務分 → 給料日 ${p.date}。`:"給料日設定を保存しました。";

 setToast("給料日の設定を保存しました");
});
initPaydayControls(salaryConfig());
renderCalendar();


// 画面を開いた際はカレンダーと勤務時間グラフを今月に初期化する。
function resetVisualMonthsToCurrent(){
 const month=monthNow();
 if($("calendarMonth").value!==month){$("calendarMonth").value=month;renderCalendar()}
}
window.addEventListener("pageshow",resetVisualMonthsToCurrent);
resetVisualMonthsToCurrent();

/* 勤怠管理表 v27.0.0: UI navigation, themes, tasks. No changes to payroll logic. */
(()=>{'use strict';
 const tabs=['home','calendar','staff','salary','more','tasks'];
 function go(tab){if(!tabs.includes(tab))return;
 document.querySelectorAll('[data-panel]').forEach(el=>el.classList.toggle('tab-hidden',el.dataset.panel!==tab));
 document.querySelectorAll('.bottom-nav button').forEach(el=>el.classList.toggle('active',el.dataset.tab===(tab==='tasks'?'more':tab)));
 window.scrollTo({top:0,behavior:'instant'});
 }
 document.querySelectorAll('.bottom-nav button').forEach(el=>el.addEventListener('click',()=>go(el.dataset.tab)));
 const themes=['pink','blue','green','beige','dark'];
 function setTheme(theme){if(!themes.includes(theme))theme='pink';document.body.dataset.theme=theme;
 document.querySelectorAll('[data-theme-choice]').forEach(b=>{b.classList.toggle('selected',b.dataset.themeChoice===theme);b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme));});
 try{localStorage.setItem('kintai-ui-theme-v27',theme)}catch(e){}
 document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#f34c83';
 }
 document.querySelectorAll('[data-theme-choice]').forEach(el=>el.addEventListener('click',()=>setTheme(el.dataset.themeChoice)));
 try{setTheme(localStorage.getItem('kintai-ui-theme-v27')||'pink')}catch(e){setTheme('pink')}
 document.querySelector('[data-jump="tasks"]').addEventListener('click',()=>go('tasks'));
 document.querySelector('#tasksBack').addEventListener('click',()=>go('more'));
 document.querySelector('[data-jump="history"]').addEventListener('click',()=>{go('more');document.querySelector('.history-card').scrollIntoView({behavior:'smooth'})});
 document.querySelector('[data-jump="backup"]').addEventListener('click',()=>{go('salary');document.querySelector('.backup-settings').scrollIntoView({behavior:'smooth'})});
 const key='kintai-tasks-v27';let tasks=[];
 try{const a=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(a))tasks=a.filter(t=>t&&typeof t.text==='string').slice(0,300)}catch(e){}
 const list=document.querySelector('#taskList');
 function save(){try{localStorage.setItem(key,JSON.stringify(tasks))}catch(e){alert('タスクを保存できませんでした。端末の保存領域を確認してください。')}}
 function render(){list.replaceChildren();if(!tasks.length){const p=document.createElement('p');p.className='hint';p.textContent='タスクはまだありません。';list.appendChild(p);return;}
 tasks.forEach(t=>{const row=document.createElement('div');row.className='task-item'+(t.done?' done':'');
 const check=document.createElement('input');check.type='checkbox';check.checked=!!t.done;check.setAttribute('aria-label','完了切替');check.addEventListener('change',()=>{t.done=check.checked;save();render()});
 const label=document.createElement('label');label.textContent=t.text;
 const del=document.createElement('button');del.type='button';del.textContent='削除';del.addEventListener('click',()=>{tasks=tasks.filter(x=>x.id!==t.id);save();render()});row.append(check,label,del);list.appendChild(row)})}
 document.querySelector('#taskForm').addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#taskInput');const value=input.value.trim();if(!value)return;tasks.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2),text:value,done:false});input.value='';save();render()});
 render();go('home');
})();
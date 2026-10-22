/* BRB — Supabase-backed test build. */
'use strict';
const PROJECT_URL = 'https://upfukfioedmxazrdjbek.supabase.co';
// Publishable key is safe to use in browser code. NEVER put a secret/service_role key here.
const PUBLISHABLE_KEY = 'sb_publishable__dlT-pOy59gUUMj4QB499Q_CdOtYKp8';
const db = window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY);
const ROOMS={Life:'The everyday stuff. The big stuff. Everything in between.',Music:'What are you listening to? Share the songs that stick.',Books:'One more chapter. Then maybe another.',Movies:'A good movie deserves a good conversation.'};
const $=id=>document.getElementById(id);
let user=null,profile=null,activeRoom='Life',channel=null, soundEnabled=false, roomVersion=0, isAdmin=false;
const clock=s=>new Date(s).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
function status(id,msg){$(id).textContent=msg;}
function showView(which){for(const name of ['welcome','chat','settings','contact','archive','admin'])$(name+'View').hidden=name!==which; const nav=which==='archive'?'chat':which;for(const key of ['chat','settings','contact','admin'])$(key+'Nav').classList.toggle('selected',nav===key);if(which==='settings')renderProfile();if(which==='admin'&&isAdmin)renderAdmin();}
function go(which){if(!user||!profile){showView('welcome');return;}if(which==='admin'&&!isAdmin)return;showView(which);if(which==='chat')loadRoom();}
for(const [id,view] of [['homeButton','chat'],['chatNav','chat'],['settingsNav','settings'],['contactNav','contact'],['accountButton','settings'],['adminNav','admin']])$(id).addEventListener('click',()=>go(view));
$('signOutButton').addEventListener('click',async()=>{await leaveRoom();await db.auth.signOut();user=null;profile=null;isAdmin=false;$('adminNav').hidden=true;startLogin();});
function startLogin(){ $('loginForm').hidden=false;$('usernameForm').hidden=true;$('signOutButton').hidden=true; $('headerUsername').textContent='Guest';showView('welcome');}
async function setupMember(sessionUser){user=sessionUser;const {data,error}=await db.from('member_profiles').select('user_id,username,avatar_url').eq('user_id',user.id).maybeSingle();if(error){status('loginStatus',error.message);startLogin();return;}profile=data;isAdmin=sessionUser.app_metadata?.brb_role==='admin';$('adminNav').hidden=!isAdmin;if(!profile){$('loginForm').hidden=true;$('usernameForm').hidden=false;$('signOutButton').hidden=false;showView('welcome');return;}$('headerUsername').textContent=profile.username;$('signOutButton').hidden=false;go('chat');}
$('loginForm').addEventListener('submit',async ev=>{ev.preventDefault();status('loginStatus','Signing in...');const {data,error}=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){status('loginStatus',error.message);return;}status('loginStatus','');await setupMember(data.user);});
$('signupButton').addEventListener('click',async()=>{const email=$('loginEmail').value.trim(),password=$('loginPassword').value;if(!email||password.length<6){status('loginStatus','Enter an email and password (at least 6 characters) first.');return;}const {error}=await db.auth.signUp({email,password});status('loginStatus',error?error.message:'Check your email for a verification link, then sign in.');});
$('resetPasswordButton').addEventListener('click',async()=>{const email=$('loginEmail').value.trim();if(!email){status('loginStatus','Enter your email first.');return;}const {error}=await db.auth.resetPasswordForEmail(email);status('loginStatus',error?error.message:'If that address has an account, password recovery instructions have been sent.');});
$('usernameForm').addEventListener('submit',async ev=>{ev.preventDefault();const username=$('welcomeName').value.trim();if(!/^[A-Za-z0-9_]{3,30}$/.test(username)){status('usernameStatus','Use 3–30 letters, numbers, or underscores.');return;}const {error}=await db.from('member_profiles').insert({user_id:user.id,username});if(error){status('usernameStatus',error.code==='23505'?'That username is taken. Please try another.':error.message);return;}await setupMember(user);});
function clearChat(){const box=$('messages');box.replaceChildren();return box;}
function addText(parent,text,cls){const el=document.createElement('div');el.className=cls;el.textContent=text;parent.append(el);}
function drawMessage(m,names){const row=document.createElement('article');row.className='message';const who=names[m.author_id]||'Former member';const av=document.createElement('div');av.className='message-avatar';av.textContent=who[0].toUpperCase();const body=document.createElement('div');body.className='message-body';const meta=document.createElement('div');meta.className='message-meta';const label=document.createElement('span');label.className='message-name';label.textContent=who;const time=document.createElement('time');time.className='message-time';time.dateTime=m.created_at;time.textContent=clock(m.created_at);meta.append(label,time);const text=document.createElement('div');text.className='message-text';text.textContent=m.body;body.append(meta,text);
if(isAdmin && m.author_id!==user.id){const remove=document.createElement('button');remove.type='button';remove.className='minor-button message-moderate';remove.textContent='Remove comment';remove.setAttribute('aria-label','Remove message by '+who);remove.addEventListener('click',()=>removeMessage(m));body.append(remove);}
row.dataset.messageId=m.id;row.append(av,body);$('messages').append(row);}
async function leaveRoom(){if(channel){const old=channel;channel=null;await db.removeChannel(old);}}
async function loadRoom(){if(!user||!profile)return;const serial=++roomVersion;await leaveRoom();if(serial!==roomVersion)return;const room=activeRoom.toLowerCase();$('roomTitle').textContent=activeRoom;$('roomDescription').textContent=ROOMS[activeRoom];$('roomPanel').setAttribute('aria-labelledby','tab-'+activeRoom);$('booksBanner').hidden=activeRoom!=='Books';document.querySelectorAll('.room-tab').forEach(tab=>{const active=tab.dataset.room===activeRoom;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});clearChat();addText($('messages'),'Welcome to '+activeRoom+'. Pull up a chair.','system-message');const cutoff=new Date(Date.now()-(room==='life'?24:168)*3600000).toISOString();const {data:messages,error}=await db.from('chat_messages').select('id,room_id,author_id,body,created_at').eq('room_id',room).gte('created_at',cutoff).order('created_at',{ascending:true}).limit(200);if(serial!==roomVersion)return;if(error){addText($('messages'),error.message,'system-message');return;}const ids=[...new Set(messages.map(m=>m.author_id))];let names={};if(ids.length){const result=await db.from('member_profiles').select('user_id,username').in('user_id',ids);for(const p of result.data||[])names[p.user_id]=p.username;}if(serial!==roomVersion)return;for(const m of messages)drawMessage(m,names);$('messages').scrollTop=$('messages').scrollHeight;channel=db.channel('brb-room-'+room,{config:{presence:{key:user.id}}});channel.on('presence',{event:'sync'},()=>renderMembers()).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:'room_id=eq.'+room},async payload=>{if(serial!==roomVersion)return;const m=payload.new;let username=profile.username;if(m.author_id!==user.id){const r=await db.from('member_profiles').select('username').eq('user_id',m.author_id).maybeSingle();username=r.data?.username||'Member';}drawMessage(m,{[m.author_id]:username});$('messages').scrollTop=$('messages').scrollHeight;}).subscribe(async state=>{if(state==='SUBSCRIBED'&&serial===roomVersion)await channel.track({username:profile.username});});renderMembers();}
async function removeMessage(message){
 if(!isAdmin)return;
 const reason=prompt('Why are you removing this comment? The member will lose one star.');
 if(reason===null)return;
 if(reason.trim().length<5){alert('Please give a reason of at least five characters.');return;}
 if(!confirm('Remove this comment and deduct one star?'))return;
 const {error}=await db.rpc('brb_remove_message',{p_message_id:message.id,p_reason:reason.trim()});
 if(error){alert('Unable to remove comment: '+error.message);return;}
 await loadRoom();
}
function makeElement(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
async function renderAdmin(){
 if(!isAdmin||!user)return;
 status('adminStatus','');
 const [profiles,standings,cases,appeals]=await Promise.all([
   db.from('member_profiles').select('user_id,username').order('username'),
   db.from('member_standing').select('user_id,stars'),
   db.from('moderation_cases').select('id,member_id,room_id,removed_excerpt,reason,created_at,reversed_at').order('created_at',{ascending:false}).limit(60),
   db.from('moderation_appeals').select('id,case_id,member_id,explanation,status,submitted_at,admin_response').order('submitted_at',{ascending:false}).limit(60)
 ]);
 for(const result of [profiles,standings,cases,appeals])if(result.error){status('adminStatus','Could not load dashboard: '+result.error.message);return;}
 const usernames=Object.fromEntries(profiles.data.map(p=>[p.user_id,p.username]));
 const starMap=Object.fromEntries(standings.data.map(s=>[s.user_id,s.stars]));
 const members=$('adminMembers');members.replaceChildren();
 for(const p of profiles.data){const div=makeElement('div',p.username+' — '+(starMap[p.user_id]??'?')+' / 5 stars','admin-entry');members.append(div);}
 const history=$('adminCases');history.replaceChildren();
 if(!cases.data.length)history.append(makeElement('p','No moderation actions yet.','field-help'));
 for(const c of cases.data){const box=makeElement('div','','admin-entry');box.append(makeElement('strong',usernames[c.member_id]||'Former member'));box.append(makeElement('p',c.reason));box.append(makeElement('small',new Date(c.created_at).toLocaleString()+(c.reversed_at?' · Reversed':' · Star deducted')));history.append(box);}
 const pending=$('adminAppeals');pending.replaceChildren();
 const open=appeals.data.filter(a=>a.status==='pending');
 if(!open.length)pending.append(makeElement('p','No pending appeals.','field-help'));
 for(const appeal of open){const box=makeElement('div','','admin-entry');box.append(makeElement('strong',usernames[appeal.member_id]||'Member'));box.append(makeElement('p',appeal.explanation));
  for(const [label,reverse] of [['Restore star',true],['Uphold decision',false]]){const button=makeElement('button',label,'minor-button');button.type='button';button.addEventListener('click',async()=>{
    const response=prompt('Write your explanation for this decision (at least 5 characters):');if(response===null)return;
    if(response.trim().length<5){alert('Please write a longer explanation.');return;}
    if(!confirm(label+' for this appeal?'))return;
    const {error}=await db.rpc('brb_resolve_appeal',{p_appeal_id:appeal.id,p_reverse:reverse,p_response:response.trim()});
    if(error){alert(error.message);return;}await renderAdmin();
   });box.append(button);}
  pending.append(box);
 }
}
async function renderOwnCases(){
 const container=$('ownModerationReport');container.replaceChildren();
 const [cases,appeals]=await Promise.all([db.from('moderation_cases').select('id,reason,created_at,appeal_deadline,reversed_at,stars_deducted').eq('member_id',user.id).order('created_at',{ascending:false}),db.from('moderation_appeals').select('case_id,status,admin_response').eq('member_id',user.id)]);
 if(cases.error||appeals.error){container.append(makeElement('p','Unable to load moderation history.','field-help'));return;}
 if(!cases.data.length){container.append(makeElement('p','Nothing to report!','field-help'));return;}
 for(const c of cases.data){const item=makeElement('div','','admin-entry');item.append(makeElement('strong',c.reason));item.append(makeElement('p',new Date(c.created_at).toLocaleString()));
  const appeal=appeals.data.find(a=>a.case_id===c.id);
  if(c.reversed_at)item.append(makeElement('small','Star restored.'));
  else if(appeal){item.append(makeElement('small','Appeal: '+appeal.status));if(appeal.admin_response)item.append(makeElement('p',appeal.admin_response));}
  else if(c.stars_deducted && new Date(c.appeal_deadline)>new Date()){
   const button=makeElement('button','Appeal this deduction','minor-button');button.type='button';button.addEventListener('click',async()=>{
    const explanation=prompt('Explain why you are appealing (10–2000 characters):');if(explanation===null)return;
    if(explanation.trim().length<10||explanation.trim().length>2000){alert('Please use 10–2000 characters.');return;}
    const {error}=await db.from('moderation_appeals').insert({case_id:c.id,member_id:user.id,explanation:explanation.trim()});
    if(error)alert(error.message);else renderOwnCases();
   });item.append(button);
  }else item.append(makeElement('small','Appeal period closed.'));
  container.append(item);
 }
}
function renderMembers(){const listed=new Map();if(channel){for(const [id,states] of Object.entries(channel.presenceState())){if(states.length)listed.set(id,states[0].username||'Member');}}const list=$('memberList');list.replaceChildren();for(const [id,name] of [...listed].sort((a,b)=>a[1].localeCompare(b[1]))){const li=document.createElement('li');li.textContent=name+(id===user?.id?' (you)':'');if(id===user?.id)li.className='self';list.append(li);}$('memberCount').textContent=String(listed.size);$('mobileOnlineCount').textContent='Online ('+listed.size+')';}
function changeRoom(room){if(!ROOMS[room])return;activeRoom=room;loadRoom();}
for(const tab of document.querySelectorAll('.room-tab')){tab.addEventListener('click',()=>changeRoom(tab.dataset.room));tab.addEventListener('keydown',ev=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;ev.preventDefault();const rooms=Object.keys(ROOMS);const i=rooms.indexOf(activeRoom);const next=ev.key==='Home'?0:ev.key==='End'?rooms.length-1:(i+(ev.key==='ArrowLeft'?-1:1)+rooms.length)%rooms.length;changeRoom(rooms[next]);$('tab-'+rooms[next]).focus();});}
$('messageInput').addEventListener('input',()=>{$('messageCount').textContent=$('messageInput').value.length+' / 500';});
$('messageForm').addEventListener('submit',async ev=>{ev.preventDefault();if(!user||!profile)return;const body=$('messageInput').value.trim();if(!body)return;const {error}=await db.from('chat_messages').insert({room_id:activeRoom.toLowerCase(),author_id:user.id,body});if(error){alert('Message not sent: '+error.message);return;}$('messageInput').value='';$('messageCount').textContent='0 / 500';});
$('membersToggle').addEventListener('click',()=>{const visible=$('memberSidebar').classList.toggle('open');$('membersToggle').setAttribute('aria-expanded',String(visible));});
$('archiveButton').addEventListener('click',()=>go('archive'));
$('backToBooks').addEventListener('click',()=>{activeRoom='Books';go('chat');});
async function renderProfile(){if(!user||!profile)return;$('profileName').value=profile.username;$('profileEmail').value=user.email||'';$('profilePhoto').disabled=true;$('removePhoto').disabled=true;const avatar=$('avatarPreview');avatar.textContent=profile.username[0].toUpperCase();avatar.style.backgroundImage='';status('profileStatus','');const {data}=await db.from('member_standing').select('stars').eq('user_id',user.id).maybeSingle();renderOwnCases();if(data){$('starGlyphs').textContent='★'.repeat(data.stars)+'☆'.repeat(5-data.stars);$('starSummary').textContent='You have '+data.stars+' out of 5 stars.';}}
$('profileForm').addEventListener('submit',async ev=>{ev.preventDefault();if(!user)return;const username=$('profileName').value.trim(),email=$('profileEmail').value.trim();if(!/^[A-Za-z0-9_]{3,30}$/.test(username)){status('profileStatus','Use 3–30 letters, numbers, or underscores.');return;}const update=await db.from('member_profiles').update({username}).eq('user_id',user.id);if(update.error){status('profileStatus',update.error.message);return;}profile.username=username;$('headerUsername').textContent=username;let message='Username updated.';if(email!==user.email){const result=await db.auth.updateUser({email});message+=result.error?' Email update failed: '+result.error.message:' Check your email to confirm the address change.';}status('profileStatus',message);});
$('deleteAccountButton').addEventListener('click',()=>{});
$('cancelDelete').addEventListener('click',()=>$('deleteDialog').close());
$('soundToggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('soundToggle').setAttribute('aria-pressed',String(soundEnabled));$('soundToggle').title=soundEnabled?'Audio effects coming later':'Sound effects off';$('soundToggle').querySelector('.mute-slash').hidden=soundEnabled;});
$('year').textContent=new Date().getFullYear();
(async()=>{const {data}=await db.auth.getUser();if(data.user)await setupMember(data.user);else startLogin();})();

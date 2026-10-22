/* BRB — Supabase-backed test build. */
'use strict';
const PROJECT_URL = 'https://upfukfioedmxazrdjbek.supabase.co';
// Publishable key is safe to use in browser code. NEVER put a secret/service_role key here.
const PUBLISHABLE_KEY = 'sb_publishable__dlT-pOy59gUUMj4QB499Q_CdOtYKp8';
const db = window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY);
// Turnstile SITE key is public. Add it only after creating a Cloudflare widget.
const BRB_TURNSTILE_SITE_KEY = '';
let rulesRequired=false, rulesAccepted=false, rulesCaptchaId=null;
const ROOMS={Life:'The everyday stuff. The big stuff. Everything in between.',Music:'What are you listening to? Share the songs that stick.',Books:'One more chapter. Then maybe another.',Movies:'A good movie deserves a good conversation.'};
const $=id=>document.getElementById(id);
let user=null,profile=null,activeRoom='Life',channel=null, soundEnabled=false, roomVersion=0, isAdmin=false;
const clock=s=>new Date(s).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
function status(id,msg){$(id).textContent=msg;}
function showView(which){for(const name of ['welcome','chat','settings','contact','archive','admin','rules'])$(name+'View').hidden=name!==which; const nav=which==='archive'?'chat':which;for(const key of ['chat','settings','contact','admin'])$(key+'Nav').classList.toggle('selected',nav===key);if(which==='settings')renderProfile();if(which==='admin'&&isAdmin)renderAdmin();}
function go(which){if(!user||!profile){showView('welcome');return;}if(which==='admin'&&!isAdmin)return;if(which==='chat'&&rulesRequired&&!rulesAccepted){showView('rules');renderRulesCaptcha();return;}showView(which);if(which==='chat')loadRoom();}
for(const [id,view] of [['homeButton','chat'],['chatNav','chat'],['settingsNav','settings'],['contactNav','contact'],['accountButton','settings'],['adminNav','admin']])$(id).addEventListener('click',()=>go(view));
$('signOutButton').addEventListener('click',async()=>{await leaveRoom();await db.auth.signOut();user=null;profile=null;isAdmin=false;$('adminNav').hidden=true;startLogin();});
function startLogin(){ $('loginForm').hidden=false;$('usernameForm').hidden=true;$('signOutButton').hidden=true; $('headerUsername').textContent='Guest';showView('welcome');}
// --- Welcome email: server verifies the member and sends at most once ---
async function requestWelcomeEmail(){
 try {
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token || !session.user?.email_confirmed_at)return;
  const res=await fetch(PROJECT_URL+'/functions/v1/brb-send-welcome',{
   method:'POST',headers:{'Authorization':'Bearer '+session.access_token,'apikey':PUBLISHABLE_KEY,'Content-Type':'application/json'},body:'{}'
  });
  if(!res.ok)console.warn('BRB welcome email could not be sent yet. It will retry on your next sign-in.');
 } catch(err){console.warn('BRB welcome email will retry on next sign-in.',err);}
}

// Rules acknowledgment and server-validated Turnstile challenge
async function refreshRulesStatus(){
 rulesRequired=false;rulesAccepted=false;
 const {data,error}=await db.rpc('brb_my_rules_status');
 if(error){console.warn('Unable to load rules agreement:',error.message);return;}
 rulesRequired=Boolean(data?.enforced);
 rulesAccepted=Number(data?.accepted_version||0)>=Number(data?.required_version||1);
}
function renderRulesCaptcha(){
 if(!BRB_TURNSTILE_SITE_KEY){status('rulesStatus','CAPTCHA setup is pending. The administrator must configure Cloudflare Turnstile.');return;}
 if(rulesCaptchaId!==null)return;
 if(!window.turnstile){status('rulesStatus','CAPTCHA is loading. Try again in a moment.');return;}
 rulesCaptchaId=window.turnstile.render('#rulesCaptcha',{sitekey:BRB_TURNSTILE_SITE_KEY,theme:'auto'});
}
$('acceptRulesButton').addEventListener('click',async()=>{
 if(!$('rulesAgree').checked){status('rulesStatus','Please read and accept the rules first.');return;}
 if(rulesCaptchaId===null){renderRulesCaptcha();return;}
 const captchaToken=window.turnstile?.getResponse(rulesCaptchaId);
 if(!captchaToken){status('rulesStatus','Please complete CAPTCHA.');return;}
 status('rulesStatus','Recording your agreement…');
 const {data:{session}}=await db.auth.getSession();
 if(!session){status('rulesStatus','Sign in again to continue.');return;}
 try{
  const res=await fetch(PROJECT_URL+'/functions/v1/brb-accept-rules',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({agreed:true,captchaToken,version:1})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Agreement could not be saved');
  rulesAccepted=true;status('rulesStatus','Agreement saved. Welcome in!');go('chat');
 }catch(e){status('rulesStatus',e.message);window.turnstile?.reset(rulesCaptchaId);}
});

async function setupMember(sessionUser){user=sessionUser;void requestWelcomeEmail();await refreshRulesStatus();const {data,error}=await db.from('member_profiles').select('user_id,username,avatar_url').eq('user_id',user.id).maybeSingle();if(error){status('loginStatus',error.message);startLogin();return;}profile=data;isAdmin=sessionUser.app_metadata?.brb_role==='admin';$('adminNav').hidden=!isAdmin;if(!profile){$('loginForm').hidden=true;$('usernameForm').hidden=false;$('signOutButton').hidden=false;showView('welcome');return;}$('headerUsername').textContent=profile.username;$('signOutButton').hidden=false;go('chat');}
$('loginForm').addEventListener('submit',async ev=>{ev.preventDefault();status('loginStatus','Signing in...');const {data,error}=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){status('loginStatus',error.message);return;}status('loginStatus','');await setupMember(data.user);});
$('signupButton').addEventListener('click',async()=>{const email=$('loginEmail').value.trim(),password=$('loginPassword').value;if(!email||password.length<6){status('loginStatus','Enter an email and password (at least 6 characters) first.');return;}const {error}=await db.auth.signUp({email,password});status('loginStatus',error?error.message:'Check your email for a verification link, then sign in.');});
$('resetPasswordButton').addEventListener('click',async()=>{const email=$('loginEmail').value.trim();if(!email){status('loginStatus','Enter your email first.');return;}const {error}=await db.auth.resetPasswordForEmail(email);status('loginStatus',error?error.message:'If that address has an account, password recovery instructions have been sent.');});
$('usernameForm').addEventListener('submit',async ev=>{ev.preventDefault();const username=$('welcomeName').value.trim();if(!/^[A-Za-z0-9_]{3,30}$/.test(username)){status('usernameStatus','Use 3–30 letters, numbers, or underscores.');return;}const {error}=await db.from('member_profiles').insert({user_id:user.id,username});if(error){status('usernameStatus',error.code==='23505'?'That username is taken. Please try another.':error.message);return;}await setupMember(user);});
function clearChat(){const box=$('messages');box.replaceChildren();return box;}
function addText(parent,text,cls){const el=document.createElement('div');el.className=cls;el.textContent=text;parent.append(el);}
// --- Per-member message hiding (local to this browser, never moderates a message) ---
function hiddenMessagesKey(){return 'brb-hidden-messages:'+(user?.id||'guest');}
function getHiddenMessageIds(){try{return new Set(JSON.parse(localStorage.getItem(hiddenMessagesKey())||'[]').map(String));}catch{return new Set();}}
function hideMessage(id){const ids=getHiddenMessageIds();ids.add(String(id));localStorage.setItem(hiddenMessagesKey(),JSON.stringify([...ids]));document.querySelectorAll('.message').forEach(row=>{if(row.dataset.messageId===String(id))row.remove();});}
function drawMessage(m,names){
 if(getHiddenMessageIds().has(String(m.id)))return;
 const row=document.createElement('article');row.className='message';row.dataset.messageId=m.id;
 const who=names[m.author_id]||'Former member';
 const av=document.createElement('div');av.className='message-avatar';av.textContent=who[0].toUpperCase();
 const body=document.createElement('div');body.className='message-body';
 const meta=document.createElement('div');meta.className='message-meta';
 const label=document.createElement('span');label.className='message-name';label.textContent=who;
 const time=document.createElement('time');time.className='message-time';time.dateTime=m.created_at;time.textContent=clock(m.created_at);
 meta.append(label,time);
 const msgText=document.createElement('div');msgText.className='message-text';msgText.textContent=m.body;
 body.append(meta,msgText);
 if(m.author_id!==user.id){
  const menu=document.createElement('details');menu.className='message-action-menu';
  const trigger=document.createElement('summary');trigger.className='message-menu-trigger';trigger.textContent='⋯';trigger.setAttribute('aria-label','Options for comment by '+who);trigger.title='Comment options';
  const options=document.createElement('div');options.className='message-menu-options';
  const hide=document.createElement('button');hide.type='button';hide.textContent='Hide comment';hide.addEventListener('click',()=>hideMessage(m.id));options.append(hide);
  const report=document.createElement('button');report.type='button';report.textContent='Report comment';report.addEventListener('click',()=>{menu.open=false;reportMessage(m);});options.append(report);
  if(isAdmin){const remove=document.createElement('button');remove.type='button';remove.textContent='Remove comment (admin)';remove.addEventListener('click',()=>{menu.open=false;removeMessage(m);});options.append(remove);}
  menu.append(trigger,options);meta.append(menu);
 }
 row.append(av,body);$('messages').append(row);
}
// --- Member comment reports ---
async function reportMessage(m){
 const choices={1:'harassment',2:'hate',3:'threats',4:'privacy',5:'spam',6:'other'};
 const response=prompt('Why report this message?\n1. Bullying or harassment\n2. Hate speech\n3. Threats or intimidation\n4. Sharing private information\n5. Spam or scams\n6. Other\n\nEnter a number (1–6):');
 if(response===null)return;
 const category=choices[response.trim()];if(!category){alert('Please enter a number from 1 to 6.');return;}
 const details=prompt('Additional details (optional; up to 1,000 characters):','');if(details===null)return;
 if(details.length>1000){alert('Please keep the explanation under 1,000 characters.');return;}
 const {error}=await db.from('message_reports').insert({message_id:m.id,original_message_id:m.id,reporter_id:user.id,reported_member_id:m.author_id,room_id:m.room_id,message_excerpt:m.body,category,details:details.trim()});
 if(error){alert(error.code==='23505'?'You have already reported this comment.':'Unable to submit report: '+error.message);return;}
 alert('Report submitted privately. Thank you. The administrator will review it. No stars were deducted automatically.');
}
async function leaveRoom(){if(channel){const old=channel;channel=null;await db.removeChannel(old);}}
async function loadRoom(){if(!user||!profile)return;const serial=++roomVersion;await leaveRoom();if(serial!==roomVersion)return;const room=activeRoom.toLowerCase();$('roomTitle').textContent=activeRoom;$('roomDescription').textContent=ROOMS[activeRoom];$('roomPanel').setAttribute('aria-labelledby','tab-'+activeRoom);$('booksBanner').hidden=activeRoom!=='Books';document.querySelectorAll('.room-tab').forEach(tab=>{const active=tab.dataset.room===activeRoom;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});clearChat();addText($('messages'),'Welcome to '+activeRoom+'. Pull up a chair.','system-message');const cutoff=new Date(Date.now()-(room==='life'?24:168)*3600000).toISOString();const {data:messages,error}=await db.from('chat_messages').select('id,room_id,author_id,body,created_at').eq('room_id',room).gte('created_at',cutoff).order('created_at',{ascending:true}).limit(200);if(serial!==roomVersion)return;if(error){addText($('messages'),error.message,'system-message');return;}const ids=[...new Set(messages.map(m=>m.author_id))];let names={};if(ids.length){const result=await db.from('member_profiles').select('user_id,username').in('user_id',ids);for(const p of result.data||[])names[p.user_id]=p.username;}if(serial!==roomVersion)return;for(const m of messages)drawMessage(m,names);$('messages').scrollTop=$('messages').scrollHeight;channel=db.channel('brb-room-'+room,{config:{presence:{key:user.id}}});channel.on('presence',{event:'sync'},()=>renderMembers()).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:'room_id=eq.'+room},async payload=>{if(serial!==roomVersion)return;const m=payload.new;let username=profile.username;if(m.author_id!==user.id){const r=await db.from('member_profiles').select('username').eq('user_id',m.author_id).maybeSingle();username=r.data?.username||'Member';}drawMessage(m,{[m.author_id]:username});$('messages').scrollTop=$('messages').scrollHeight;}).subscribe(async state=>{if(state==='SUBSCRIBED'&&serial===roomVersion)await channel.track({username:profile.username});});renderMembers();}
// Email dispatch is admin-authenticated server-side; the Resend key never enters this browser.
async function dispatchModerationEmails(){
 if(!isAdmin)return;
 try {
  const {data,error}=await db.functions.invoke('brb-send-moderation-emails',{body:{}});
  if(error){console.warn('Moderation email dispatch pending:',error.message);return;}
  if(data?.failed)console.warn('Some moderation emails could not be delivered:',data);
 } catch(error){console.warn('Moderation emails remain queued:',error);}
}
// Manually retry previously queued emails. Supabase validates admin privileges server-side.
$('retryEmailsButton').addEventListener('click',async()=>{
 const button=$('retryEmailsButton');
 if(!isAdmin||!user)return;
 button.disabled=true;
 status('emailRetryStatus','Checking the pending email queue…');
 try {
  const {data,error}=await db.functions.invoke('brb-send-moderation-emails',{body:{}});
  if(error)throw error;
  const processed=Number(data?.processed||0),sent=Number(data?.sent||0),failed=Number(data?.failed||0);
  status('emailRetryStatus',processed===0?'No pending emails to send.':
   `Processed ${processed} notification${processed===1?'':'s'}: ${sent} accepted by Resend, ${failed} failed.${failed?' Check Edge Function logs for details.':''}`);
 } catch(error){
  console.error('BRB email retry failed:',error);
  status('emailRetryStatus','Could not retry emails: '+(error?.message||String(error))+'. See the browser Console for details.');
 } finally {button.disabled=false;}
});
async function removeMessage(message){
 if(!isAdmin)return;
 const reason=prompt('Why are you removing this comment? The member will lose one star.');
 if(reason===null)return;
 if(reason.trim().length<5){alert('Please give a reason of at least five characters.');return;}
 if(!confirm('Remove this comment and deduct one star?'))return;
 const {error}=await db.rpc('brb_remove_message',{p_message_id:message.id,p_reason:reason.trim()});
 if(error){alert('Unable to remove comment: '+error.message);return;}
 await loadRoom();
 await dispatchModerationEmails();
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
 await renderReports(usernames);
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
    if(error){alert(error.message);return;}await renderAdmin();await dispatchModerationEmails();
   });box.append(button);}
  pending.append(box);
 }
}
// --- Private admin report queue and reporter history ---
async function renderReports(usernames){
 const target=$('adminReports');if(!target)return;
 const {data,error}=await db.from('message_reports').select('id,message_id,original_message_id,reporter_id,reported_member_id,room_id,message_excerpt,category,details,status,admin_notes,created_at,reviewed_at').order('created_at',{ascending:false}).limit(150);
 target.replaceChildren();if(error){target.append(makeElement('p','Could not load reports: '+error.message,'field-help'));return;}
 const rows=data||[];const pending=rows.filter(r=>r.status==='pending');
 $('adminReportCount').textContent=pending.length+' pending · '+rows.length+' recently submitted';
 if(!rows.length){target.append(makeElement('p','No member reports yet.','field-help'));return;}
 const counts={};for(const r of rows){const k=r.reporter_id;counts[k]??={submitted:0,dismissed:0,actioned:0};counts[k].submitted++;if(r.status==='dismissed')counts[k].dismissed++;if(r.status==='actioned')counts[k].actioned++;}
 const history=$('adminReporterHistory');history.replaceChildren();
 for(const [id,c] of Object.entries(counts)){history.append(makeElement('div',`${usernames[id]||'Former member'}: ${c.submitted} reports · ${c.dismissed} dismissed · ${c.actioned} actioned`,'admin-entry'));}
 for(const report of rows){const box=makeElement('div','','admin-entry');box.append(makeElement('strong',`${report.category.toUpperCase()} · ${report.status}`));
 box.append(makeElement('p',`Reported: ${usernames[report.reported_member_id]||'Former member'} · By: ${usernames[report.reporter_id]||'Former member'} · ${report.room_id}`));
 box.append(makeElement('p','“'+report.message_excerpt+'”'));
 if(report.details)box.append(makeElement('small','Reporter details: '+report.details));
 if(report.admin_notes)box.append(makeElement('p','Admin notes: '+report.admin_notes));
 if(report.status==='pending'){
  const notes=makeElement('button','Add private note','minor-button');notes.type='button';notes.addEventListener('click',async()=>{const value=prompt('Private admin note:',report.admin_notes||'');if(value===null)return;const {error}=await db.from('message_reports').update({admin_notes:value.slice(0,1500)}).eq('id',report.id);if(error)alert(error.message);else renderAdmin();});box.append(notes);
  const dismiss=makeElement('button','Dismiss report','minor-button');dismiss.type='button';dismiss.addEventListener('click',async()=>{if(!confirm('Dismiss this report without deducting a star?'))return;const {error}=await db.from('message_reports').update({status:'dismissed',reviewed_at:new Date().toISOString()}).eq('id',report.id);if(error)alert(error.message);else renderAdmin();});box.append(dismiss);
  const remove=makeElement('button','Remove comment & deduct star','minor-button');remove.type='button';remove.addEventListener('click',async()=>{
   if(!report.message_id){alert('This comment has already been removed. You can dismiss this report.');return;}
   const reason=prompt('Reason for removal (at least five characters):',report.category);if(reason===null)return;
   if(reason.trim().length<5){alert('Please enter at least five characters.');return;}
   if(!confirm('Remove this comment and deduct one star?'))return;
   const {error}=await db.rpc('brb_remove_message',{p_message_id:report.message_id,p_reason:reason.trim()});
   if(error){alert(error.message);return;}
   await db.from('message_reports').update({status:'actioned',reviewed_at:new Date().toISOString()}).eq('id',report.id);
   await renderAdmin();await dispatchModerationEmails();
  });box.append(remove);
 }
 target.append(box);
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
$('messageForm').addEventListener('submit',async ev=>{ev.preventDefault();if(!user||!profile)return;if(rulesRequired&&!rulesAccepted){go('chat');return;}const body=$('messageInput').value.trim();if(!body)return;const {error}=await db.from('chat_messages').insert({room_id:activeRoom.toLowerCase(),author_id:user.id,body});if(error){alert('Message not sent: '+error.message);return;}$('messageInput').value='';$('messageCount').textContent='0 / 500';});
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

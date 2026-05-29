// ─── AppShell ─────────────────────────────────────────────────────────────────
function AppShell({user,onSignOut}){
  var [activeTab,setActiveTab]=useState("dashboard");
  var [jobs,setJobsRaw]=useState([]);
  var [profiles,setProfilesRaw]=useState([]);
  var [cv,setCvRaw]=useState({text:"",roles:"",industries:"",locations:"",salary:"",workType:"Any",tools:[],skills:[],achievements:[],recipients:[],uploaded:false,fileName:""});
  var [afKey,setAfKeyRaw]=useState("");
  var [jsKey,setJsKeyRaw]=useState("");
  var [anthropicKey,setAnthropicKeyRaw]=useState("");
  var [schedule,setScheduleRaw]=useState(DEFAULT_SCHEDULE);
  var [log,setLogRaw]=useState([]);
  var [sort,setSortRaw]=useState("added_desc");
  var [assistantConv,setAssistantConvRaw]=useState([]);
  var [dismissedIds,setDismissedIdsRaw]=useState([]);
  var [sidebarCollapsed,setSidebarCollapsedRaw]=useState(false);
  var [cloudReady,setCloudReady]=useState(false);
  var [cloudReadyRef]=useState({current:false});
  var [suppressWriteUntilRef]=useState({current:Date.now()+2000});
  var [mobileOpen,setMobileOpen]=useState(false);
  var [scoringStatus,setScoringStatus]=useState({active:false,done:0,total:0});
  var [scoringError,setScoringError]=useState("");
  var [dismissToast,setDismissToast]=useState(null);
  var [dismissUndoTimer,setDismissUndoTimer]=useState(null);
  var [pendingJobsView,setPendingJobsView]=useState(null);
  var [pendingProfileRun,setPendingProfileRun]=useState(null);
  var [pendingCoverLetterJob,setPendingCoverLetterJob]=useState(null);
  var [theme,setThemeRaw]=useState(getSavedTheme);
  var [isMobile,setIsMobile]=useState(typeof window!=="undefined"&&window.innerWidth<=767);

  useEffect(function(){
    function onResize(){ setIsMobile(window.innerWidth<=767); }
    window.addEventListener("resize",onResize);
    return function(){ window.removeEventListener("resize",onResize); };
  },[]);

  function setTheme(t){
    setThemeRaw(t);
    applyTheme(t);
  }

  // ── setters that also trigger cloud save ─────────────────────────────────
  var pendingSave=useRef(null);
  var latestState=useRef({});

  function doCloudSave(state){
    if(!cloudReadyRef.current) return;
    if(Date.now()<suppressWriteUntilRef.current) return;
    cloudSave(user.uid,state);
  }

  function scheduleSave(patch){
    latestState.current=Object.assign({},latestState.current,patch);
    if(pendingSave.current) clearTimeout(pendingSave.current);
    pendingSave.current=setTimeout(function(){ doCloudSave(latestState.current); pendingSave.current=null; },600);
  }

  function setJobs(v){ var val=typeof v==="function"?v(jobs):v; setJobsRaw(val); scheduleSave({jobs:val}); }
  function setProfiles(v){ var val=typeof v==="function"?v(profiles):v; setProfilesRaw(val); scheduleSave({profiles:val}); }
  function setCv(v){ var val=typeof v==="function"?v(cv):v; setCvRaw(val); scheduleSave({cv:val}); }
  function setAfKey(v){ setAfKeyRaw(v); scheduleSave({afKey:v}); }
  function setJsKey(v){ setJsKeyRaw(v); scheduleSave({jsKey:v}); }
  function setAnthropicKey(v){ setAnthropicKeyRaw(v); scheduleSave({anthropicKey:v}); }
  function setSchedule(v){ var val=typeof v==="function"?v(schedule):v; setScheduleRaw(val); scheduleSave({schedule:val}); }
  function setLog(v){ var val=typeof v==="function"?v(log):v; setLogRaw(val); scheduleSave({log:val}); }
  function setSort(v){ setSortRaw(v); scheduleSave({sort:v}); }
  function setAssistantConv(v){ var val=typeof v==="function"?v(assistantConv):v; setAssistantConvRaw(val); scheduleSave({assistantConv:val}); }
  function setDismissedIds(v){ var val=typeof v==="function"?v(dismissedIds):v; setDismissedIdsRaw(val); scheduleSave({dismissedIds:val}); }
  function setSidebarCollapsed(v){ var val=typeof v==="function"?v(sidebarCollapsed):v; setSidebarCollapsedRaw(val); scheduleSave({sidebarCollapsed:val}); }

  // ── Cloud hydration ──────────────────────────────────────────────────────
  useEffect(function(){
    if(!user) return;
    var unsub=cloudSubscribe(user.uid,function(data){
      if(data){
        if(Array.isArray(data.jobs)) setJobsRaw(data.jobs);
        if(Array.isArray(data.profiles)) setProfilesRaw(data.profiles);
        if(data.cv&&typeof data.cv==="object") setCvRaw(data.cv);
        if(typeof data.afKey==="string") setAfKeyRaw(data.afKey);
        if(typeof data.jsKey==="string") setJsKeyRaw(data.jsKey);
        if(typeof data.anthropicKey==="string") setAnthropicKeyRaw(data.anthropicKey);
        if(data.schedule&&typeof data.schedule==="object") setScheduleRaw(data.schedule);
        if(Array.isArray(data.log)) setLogRaw(data.log);
        if(typeof data.sort==="string") setSortRaw(data.sort);
        if(Array.isArray(data.assistantConv)) setAssistantConvRaw(data.assistantConv);
        if(Array.isArray(data.dismissedIds)) setDismissedIdsRaw(data.dismissedIds);
        if(typeof data.sidebarCollapsed==="boolean") setSidebarCollapsedRaw(data.sidebarCollapsed);
        latestState.current=data;
      }
      suppressWriteUntilRef.current=Date.now()+2000;
      cloudReadyRef.current=true;
      setCloudReady(true);
    });
    return function(){ if(unsub) unsub(); };
  },[user]);

  // ── Scoring ──────────────────────────────────────────────────────────────
  function addLog(msg,type){
    var entry={time:new Date().toLocaleString("sv-SE"),msg:msg,type:type||"info"};
    setLog(function(prev){
      var cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
      var kept=prev.filter(function(e){return new Date(e.time)>=cutoff;});
      return kept.concat([entry]).slice(-200);
    });
  }

  var applyScores=useCallback(function(scored){
    setJobs(function(prev){
      return prev.map(function(j){
        var s=scored.find(function(x){return x.id===j.id;});
        return s?Object.assign({},j,{score:s.score,rationale:s.rationale,scored:true}):j;
      });
    });
  },[]);

  var rescoreAll=useCallback(async function(){
    var unscored=jobs.filter(function(j){return !j.archived;});
    if(!unscored.length||!hasCv(cv)) return;
    setScoringStatus({active:true,done:0,total:unscored.length});
    setScoringError("");
    try{
      await scoreJobs({
        jobs:unscored,cv:cv,apiKey:anthropicKey,
        onBatch:function(results,doneCount){
          applyScores(results);
          setScoringStatus({active:true,done:doneCount,total:unscored.length});
        },
      });
      setScoringStatus({active:false,done:unscored.length,total:unscored.length});
    }catch(e){
      setScoringError(e.message||"Scoring failed.");
      setScoringStatus({active:false,done:0,total:0});
    }
  },[jobs,cv,anthropicKey,applyScores]);

  // ── Schedule runner ──────────────────────────────────────────────────────
  var runAllProfiles=useCallback(async function(trigger){
    var active=profiles.filter(function(p){return p.active;});
    if(!active.length) return;
    var totalAdded=0;
    var tombstones=new Set((dismissedIds||[]).map(String));
    for(var i=0;i<active.length;i++){
      var p=active[i];
      var srcs=p.sources||["af"];
      for(var si=0;si<srcs.length;si++){
        try{
          var src=srcs[si];
          var url=src==="af"
            ?"https://jobsearch.api.jobtechdev.se/search?q="+encodeURIComponent(p.query)+"&limit="+p.limit+"&resdet=full"
            :"https://jsearch.p.rapidapi.com/search?query="+encodeURIComponent(p.query)+"&num_pages=1&page=1";
          var headers=src==="af"
            ?(afKey?{"accept":"application/json","api-key":afKey}:{"accept":"application/json"})
            :{"x-rapidapi-key":jsKey,"x-rapidapi-host":"jsearch.p.rapidapi.com"};
          if(src==="jsearch"&&!jsKey) continue;
          var out=await smartFetch(url,{headers:headers});
          if(!out.response.ok) continue;
          var data=await out.response.json();
          var ads=src==="af"?(data.hits||[]):(data.data||[]).slice(0,p.limit);
          var added=0;
          setJobs(function(prev){
            var ex=new Set(prev.map(function(j){return j.id?j.id.toString():""; }));
            var nj=ads.filter(function(a){
              var aid=src==="af"?(a.id?a.id.toString():""):(a.job_id?String(a.job_id):"");
              if(!aid||ex.has(aid)||tombstones.has(aid)) return false;
              return true;
            }).map(function(a){return src==="af"?mapAfJob(a,p.name):mapJsJob(a,p.name);});
            nj=filterByLocation(nj,p.locations||[]);
            added=nj.length;
            return nj.concat(prev);
          });
          totalAdded+=added;
        }catch(e){ console.error("Profile fetch error:",e); }
      }
    }
    addLog((trigger==="manual"?"Manual run":"Scheduled run")+": "+active.length+" profile"+(active.length!==1?"s":"")+", "+totalAdded+" new job"+(totalAdded!==1?"s":"")+" added.",trigger==="manual"?"manual":"info");
  },[profiles,afKey,jsKey,dismissedIds]);

  useEffect(function(){
    if(!schedule.enabled||!schedule.days.length) return;
    var timer=setInterval(function(){
      var now=new Date();
      var day=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][now.getDay()];
      var hm=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
      if(!schedule.days.includes(day)) return;
      if(hm<schedule.startTime||hm>schedule.stopTime) return;
      runAllProfiles("schedule");
    },schedule.intervalMinutes*60*1000);
    return function(){ clearInterval(timer); };
  },[schedule,runAllProfiles]);

  // ── Dismiss / tombstone ──────────────────────────────────────────────────
  function tombstoneIds(ids){
    setDismissedIds(function(prev){
      var set=new Set(prev.map(String));
      ids.forEach(function(id){ set.add(String(id)); });
      return Array.from(set);
    });
  }

  function dismissJob(jobId){
    var job=jobs.find(function(j){return j.id===jobId;});
    if(!job) return;
    tombstoneIds([jobId]);
    setJobs(function(prev){return prev.filter(function(j){return j.id!==jobId;});});
    if(dismissUndoTimer) clearTimeout(dismissUndoTimer);
    setDismissToast({job:job,jobId:jobId});
    var t=setTimeout(function(){ setDismissToast(null); },6000);
    setDismissUndoTimer(t);
  }

  function undoDismiss(){
    if(!dismissToast) return;
    var job=dismissToast.job;
    setDismissedIds(function(prev){ return prev.filter(function(id){return String(id)!==String(dismissToast.jobId);}); });
    setJobs(function(prev){ return [job].concat(prev); });
    if(dismissUndoTimer) clearTimeout(dismissUndoTimer);
    setDismissToast(null);
  }

  function clearDismissedIds(){
    setDismissedIds([]);
  }

  // ── navigate to jobs ─────────────────────────────────────────────────────
  function navigateToJobs(opts){
    setPendingJobsView(opts||{});
    setActiveTab("jobs");
  }

  function startCoverLetter(jobId){
    setPendingCoverLetterJob(jobId);
    setActiveTab("covers");
  }

  // ── data export / import / reset ──────────────────────────────────────────
  function exportData(excludeKeys){
    var payload={jobs:jobs,profiles:profiles,cv:cv,schedule:schedule,log:log,sort:sort,assistantConv:assistantConv,dismissedIds:dismissedIds};
    if(!excludeKeys){ payload.afKey=afKey; payload.jsKey=jsKey; payload.anthropicKey=anthropicKey; }
    var out={version:2,exportedAt:new Date().toISOString(),data:payload};
    var b=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(b);
    a.download="job-tracker-backup-"+new Date().toISOString().slice(0,10)+".json";
    a.click();
  }

  function validateImport(obj){
    if(!obj||typeof obj!=="object") return "File is not valid JSON.";
    if(!obj.data||typeof obj.data!=="object") return "Missing data key — this doesn't look like a Job Tracker backup.";
    return null;
  }

  function importData(obj){
    var d=obj.data||{};
    if(Array.isArray(d.jobs)) setJobs(d.jobs);
    if(Array.isArray(d.profiles)) setProfiles(d.profiles);
    if(d.cv&&typeof d.cv==="object") setCv(d.cv);
    if(typeof d.afKey==="string") setAfKey(d.afKey);
    if(typeof d.jsKey==="string") setJsKey(d.jsKey);
    if(typeof d.anthropicKey==="string") setAnthropicKey(d.anthropicKey);
    if(d.schedule&&typeof d.schedule==="object") setSchedule(d.schedule);
    if(Array.isArray(d.log)) setLog(d.log);
    if(typeof d.sort==="string") setSort(d.sort);
    if(Array.isArray(d.assistantConv)) setAssistantConv(d.assistantConv);
    if(Array.isArray(d.dismissedIds)) setDismissedIds(d.dismissedIds);
  }

  function resetAllData(){
    if(!confirm("Reset ALL data? This will permanently delete all your jobs, profiles, CV, keys and settings from the cloud. This cannot be undone.")) return;
    if(!confirm("Are you absolutely sure? This cannot be undone.")) return;
    var uid=user.uid;
    cloudDelete(uid);
    setJobsRaw([]); setProfilesRaw([]); setCvRaw({text:"",roles:"",industries:"",locations:"",salary:"",workType:"Any",tools:[],skills:[],achievements:[],recipients:[],uploaded:false,fileName:""});
    setAfKeyRaw(""); setJsKeyRaw(""); setAnthropicKeyRaw("");
    setScheduleRaw(DEFAULT_SCHEDULE); setLogRaw([]); setSortRaw("added_desc");
    setAssistantConvRaw([]); setDismissedIdsRaw([]); setSidebarCollapsedRaw(false);
    latestState.current={};
    cloudReadyRef.current=false;
    suppressWriteUntilRef.current=Date.now()+5000;
    setTimeout(function(){ cloudReadyRef.current=true; },5000);
  }

  // ── tab content ───────────────────────────────────────────────────────────
  var MAIL_SAFE_LEN=2000;

  function renderTab(){
    var key=activeTab;
    return <TabErrorBoundary tabKey={key}>
      {key==="dashboard"&&<Dashboard jobs={jobs} schedule={schedule} setActiveTab={setActiveTab} navigateToJobs={navigateToJobs} rescoreAll={rescoreAll} scoringStatus={scoringStatus} onRunAllProfiles={runAllProfiles} profiles={profiles} cv={cv} anthropicKey={anthropicKey} />}
      {key==="jobs"&&<Jobs jobs={jobs} setJobs={setJobs} rescoreAll={rescoreAll} scoringStatus={scoringStatus} scoringError={scoringError} cv={cv} sort={sort} setSort={setSort} dismissJob={dismissJob} tombstoneIds={tombstoneIds} startCoverLetter={startCoverLetter} pendingJobsView={pendingJobsView} setPendingJobsView={setPendingJobsView} />}
      {key==="profiles"&&<SearchProfiles profiles={profiles} setProfiles={setProfiles} setJobs={setJobs} afKey={afKey} setAfKey={setAfKey} jsKey={jsKey} setJsKey={setJsKey} anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey} pendingProfileRun={pendingProfileRun} setPendingProfileRun={setPendingProfileRun} dismissedIds={dismissedIds} />}
      {key==="assistant"&&<ProfileAssistant cv={cv} profiles={profiles} setProfiles={setProfiles} anthropicKey={anthropicKey} conversation={assistantConv} setConversation={setAssistantConv} setActiveTab={setActiveTab} setPendingProfileRun={setPendingProfileRun} jobs={jobs} />}
      {key==="cv"&&<CVProfile cv={cv} setCv={setCv} />}
      {key==="scheduler"&&<Scheduler schedule={schedule} setSchedule={setSchedule} profiles={profiles} log={log} resetAllData={resetAllData} exportData={exportData} importData={importData} validateImport={validateImport} dismissedIds={dismissedIds} clearDismissedIds={clearDismissedIds} />}
      {key==="covers"&&<CoverLetters jobs={jobs} setJobs={setJobs} cv={cv} anthropicKey={anthropicKey} setActiveTab={setActiveTab} pendingCoverLetterJob={pendingCoverLetterJob} setPendingCoverLetterJob={setPendingCoverLetterJob} />}
      {key==="reports"&&<Reports jobs={jobs} cv={cv} anthropicKey={anthropicKey} />}
    </TabErrorBoundary>;
  }

  var currentTab=TABS.find(function(t){return t.id===activeTab;})||TABS[0];

  if(!cloudReady){
    return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.background}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:16}}>🌿</div>
        <div style={{fontSize:18,fontWeight:700,color:C.textPrimary,marginBottom:8}}>Loading your data…</div>
        <div style={{fontSize:14,color:C.textHint}}>Syncing with the cloud</div>
      </div>
    </div>;
  }

  return <div style={{display:"flex",minHeight:"100vh",background:C.background}}>
    {!isMobile&&<Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} onSignOut={onSignOut} theme={theme} setTheme={setTheme} />}

    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",paddingBottom:isMobile?"calc(80px + env(safe-area-inset-bottom, 0px))":0}}>
      {isMobile&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.surface,borderBottom:"1px solid "+C.border,position:"sticky",top:0,zIndex:100}}>
        <div style={{width:30,height:30,borderRadius:8,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🌿</div>
        <div style={{fontSize:16,fontWeight:700,color:C.textPrimary}}>{currentTab.label}</div>
        {scoringStatus.active&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textHint}}>
          <span style={{display:"inline-block",width:10,height:10,border:"2px solid "+C.primary,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />
          Scoring…
        </div>}
      </div>}

      <main style={{flex:1,padding:isMobile?"16px 12px":"28px 32px",maxWidth:1100,width:"100%",boxSizing:"border-box",margin:"0 auto"}}>
        {!isMobile&&<div style={{marginBottom:24}}>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.textPrimary}}>{currentTab.label}</h1>
          {currentTab.desc&&<div style={{fontSize:14,color:C.textHint,marginTop:4}}>{currentTab.desc}</div>}
        </div>}
        {renderTab()}
      </main>
    </div>

    {isMobile&&<MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} onSignOut={onSignOut} theme={theme} setTheme={setTheme} />}

    {dismissToast&&<DismissToast job={dismissToast.job} onUndo={undoDismiss} />}
  </div>;
}

// ─── DismissToast ─────────────────────────────────────────────────────────────
function DismissToast({job,onUndo}){
  return <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:999,background:C.textPrimary,color:C.surface,borderRadius:12,padding:"12px 20px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",maxWidth:"90vw",fontSize:14}}>
    <span>Dismissed <b>{job.title}</b></span>
    <button onClick={onUndo} style={{background:"none",border:"1.5px solid rgba(255,255,255,0.5)",borderRadius:8,padding:"5px 14px",color:"inherit",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap"}}>Undo</button>
  </div>;
}

// ─── AuthSplash ───────────────────────────────────────────────────────────────
function AuthSplash(){
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.background}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:16}}>🌿</div>
      <div style={{fontSize:18,fontWeight:700,color:C.textPrimary,marginBottom:8}}>Signing you in…</div>
      <div style={{fontSize:14,color:C.textHint}}>One moment</div>
    </div>
  </div>;
}

// ─── SignInScreen ─────────────────────────────────────────────────────────────
function SignInScreen({onSignIn}){
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");

  async function handleSignIn(){
    setLoading(true);setError("");
    try{ await onSignIn(); }
    catch(e){ setError(e.message||"Sign-in failed. Please try again."); setLoading(false); }
  }

  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.background,padding:24}}>
    <div style={{width:"100%",maxWidth:420,textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:20,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 24px",boxShadow:"0 8px 24px rgba(74,141,103,0.3)"}}>🌿</div>
      <h1 style={{fontSize:26,fontWeight:800,color:C.textPrimary,marginBottom:8}}>Job Tracker</h1>
      <p style={{fontSize:15,color:C.textSecondary,lineHeight:1.6,marginBottom:32}}>Your AI-powered job search assistant. Track applications, match with AI, and generate cover letters — all synced to the cloud.</p>
      <button onClick={handleSignIn} disabled={loading} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"14px 24px",borderRadius:14,border:"2px solid "+C.border,background:C.surface,color:C.textPrimary,fontSize:15,fontWeight:600,cursor:loading?"wait":"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",fontFamily:"inherit"}}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {loading?"Signing in…":"Sign in with Google"}
      </button>
      {error&&<div style={{marginTop:16,fontSize:13,color:C.error,background:C.errorBg,borderRadius:10,padding:"10px 14px"}}>{error}</div>}
      <p style={{fontSize:12,color:C.textHint,marginTop:24,lineHeight:1.6}}>Your data is stored privately in the cloud, accessible only to you. API keys are encrypted and never shared.</p>
    </div>
  </div>;
}

// ─── App root ─────────────────────────────────────────────────────────────────
function App(){
  var [user,setUser]=useState(undefined);
  var [authChecked,setAuthChecked]=useState(false);

  useEffect(function(){
    function init(){
      var sdk=window.firebaseSdk;
      if(!sdk){ setUser(null); setAuthChecked(true); return; }
      var unsub=sdk.onAuthStateChanged(sdk.auth,function(u){ setUser(u||null); setAuthChecked(true); });
      return unsub;
    }
    if(window.__firebaseReady){ var unsub=init(); return function(){ if(unsub) unsub(); }; }
    function onReady(){ var unsub=init(); if(unsub) window.__fbUnsub=unsub; }
    window.addEventListener("firebase-ready",onReady,{once:true});
    return function(){ window.removeEventListener("firebase-ready",onReady); };
  },[]);

  async function signIn(){
    var sdk=window.firebaseSdk;
    var provider=new sdk.GoogleAuthProvider();
    await sdk.signInWithPopup(sdk.auth,provider);
  }

  async function signOut(){
    var sdk=window.firebaseSdk;
    await sdk.signOut(sdk.auth);
  }

  if(!authChecked) return <AuthSplash />;
  if(!user) return <SignInScreen onSignIn={signIn} />;
  return <AppShell key={user.uid} user={user} onSignOut={signOut} />;
}

// ─── Mount ────────────────────────────────────────────────────────────────────
applyTheme(getSavedTheme());
var root=ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

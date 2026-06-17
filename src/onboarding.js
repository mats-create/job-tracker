// onboarding.js
// Rev: 2026-06-17 — Admin-only "Preview onboarding" toggle added. Uses sessionStorage
//   (key: jt.forceOnboarding) so admin can force both cards to render regardless of
//   actual progress, without touching Firestore or app.js state. Tab-local, resets on
//   close. Toggle button only renders when user.email === ADMIN_EMAIL.
// Rev: 2026-06-17 — New file. Two self-contained onboarding cards shown on Dashboard:
//   1. OnboardingCoreCard — CV → search profile → first job imported
//   2. OnboardingGabbiCard — Anthropic account → API key → paste into app
// Design principle: status is fully derived from existing props (cv, profiles, jobs,
// anthropicKey) — no new Firestore field, no new app.js state, no side effects.
// A card simply stops rendering once its underlying condition is true, and reappears
// automatically if that condition later becomes false (e.g. CV cleared, key removed).
// To remove this feature entirely: delete this file and the one render line in
// dashboard.js that calls <OnboardingCards />. Nothing else references it.

var ONBOARDING_ADMIN_EMAIL="mats@hultgrensaksi.com";
var ONBOARDING_FORCE_KEY="jt.forceOnboarding";

function getForcedOnboarding(){
  try{ return sessionStorage.getItem(ONBOARDING_FORCE_KEY)==="1"; }catch(e){ return false; }
}

function OnboardingCards({cv,profiles,jobs,anthropicKey,setActiveTab,user}){
  var [forced,setForced]=useState(getForcedOnboarding);
  var isAdmin=!!(user&&user.email===ONBOARDING_ADMIN_EMAIL);

  var step1Done=forced?false:hasCv(cv);
  var step2Done=forced?false:(profiles||[]).some(function(p){return p.active;});
  var step3Done=forced?false:(jobs||[]).filter(function(j){return !j.archived;}).length>0;
  var coreDone=step1Done&&step2Done&&step3Done;
  var gabbiDone=forced?false:!!(anthropicKey&&anthropicKey.trim());

  function toggleForced(){
    var next=!forced;
    try{ sessionStorage.setItem(ONBOARDING_FORCE_KEY,next?"1":"0"); }catch(e){}
    setForced(next);
  }

  if(coreDone&&gabbiDone&&!isAdmin) return null;
  if(coreDone&&gabbiDone&&isAdmin&&!forced){
    // Everything genuinely done — still let admin re-trigger a preview.
    return <div style={{display:"flex",justifyContent:"flex-end"}}>
      <button onClick={toggleForced} style={{fontSize:11,color:C.textHint,background:"none",border:"1px dashed "+C.border,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}}>👁 Preview onboarding (admin)</button>
    </div>;
  }

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {!coreDone&&<OnboardingCoreCard step1Done={step1Done} step2Done={step2Done} step3Done={step3Done} setActiveTab={setActiveTab} />}
    {!gabbiDone&&<OnboardingGabbiCard setActiveTab={setActiveTab} />}
    {isAdmin&&<div style={{display:"flex",justifyContent:"flex-end"}}>
      <button onClick={toggleForced} style={{fontSize:11,color:C.textHint,background:"none",border:"1px dashed "+C.border,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}}>
        {forced?"✓ Showing forced preview — click to show real status":"👁 Force preview (admin) — ignores your real progress"}
      </button>
    </div>}
  </div>;
}

function OnboardingStepRow({done,label,sub,actionLabel,onAction,stepNum}){
  return <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,background:C.surface,border:"1px solid "+(done?C.border:C.border)}}>
    {done
      ?<div style={{width:18,height:18,borderRadius:"50%",background:C.success,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>
      </div>
      :(stepNum!=null
        ?<div style={{width:18,height:18,borderRadius:"50%",background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.textHint,flexShrink:0}}>{stepNum}</div>
        :<div style={{width:18,height:18,borderRadius:"50%",border:"1.5px solid "+C.border,flexShrink:0}} />)}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,color:done?C.textHint:C.textPrimary,textDecoration:done?"line-through":"none"}}>{label}</div>
      {sub&&!done&&<div style={{fontSize:11,color:C.textHint,marginTop:1}}>{sub}</div>}
    </div>
    {!done&&actionLabel&&<button onClick={onAction} style={{fontSize:12,fontWeight:600,padding:"5px 10px",borderRadius:8,border:"1px solid "+C.border,background:"transparent",color:C.primary,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>{actionLabel}</button>}
  </div>;
}

function OnboardingCoreCard({step1Done,step2Done,step3Done,setActiveTab}){
  var doneCount=(step1Done?1:0)+(step2Done?1:0)+(step3Done?1:0);
  return <Card>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <div style={{fontSize:15,fontWeight:700,color:C.textPrimary}}>Get started with Job Tracker</div>
      <span style={{fontSize:13,color:C.textHint}}>{doneCount} of 3</span>
    </div>
    <div style={{fontSize:13,color:C.textSecondary,marginBottom:14}}>Finish these to start tracking matches automatically.</div>
    <div style={{height:6,background:C.surfaceAlt,borderRadius:3,marginBottom:14,overflow:"hidden"}}>
      <div style={{height:"100%",width:(doneCount/3*100)+"%",background:C.success,borderRadius:3,transition:"width 0.3s ease"}} />
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <OnboardingStepRow done={step1Done} label="Add your CV" sub="Paste or upload so Gabbi and scoring can use it" actionLabel="Go →" onAction={function(){setActiveTab("cv");}} />
      <OnboardingStepRow done={step2Done} label="Create a search profile" sub="Tell Job Tracker what roles to look for" actionLabel="Go →" onAction={function(){setActiveTab("profiles");}} />
      <OnboardingStepRow done={step3Done} label="Import your first jobs" sub="Run your search profile to fetch matches" actionLabel="Go →" onAction={function(){setActiveTab("profiles");}} />
    </div>
  </Card>;
}

function OnboardingGabbiCard({setActiveTab}){
  var [showHelp,setShowHelp]=useState(false);
  return <Card>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
      <span style={{fontSize:16}}>🫶</span>
      <div style={{fontSize:15,fontWeight:700,color:C.textPrimary}}>Activate Gabbi, your AI assistant</div>
    </div>
    <div style={{fontSize:13,color:C.textSecondary,marginBottom:14}}>Gabbi scores matches, writes cover letters, and coaches interviews — powered by your own Anthropic account.</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <OnboardingStepRow stepNum={1} done={false} label="Create a free Anthropic account" actionLabel="Open ↗" onAction={function(){window.open("https://console.anthropic.com/","_blank");}} />
      <div>
        <OnboardingStepRow stepNum={2} done={false} label="Generate an API key" actionLabel={showHelp?"Hide":"Show me"} onAction={function(){setShowHelp(function(v){return !v;});}} />
        {showHelp&&<div style={{marginTop:6,padding:"10px 12px",background:C.surfaceAlt,borderRadius:8,fontSize:12,color:C.textSecondary,lineHeight:1.7}}>
          In the Anthropic Console, open <b>Settings → API Keys</b> in the left sidebar, click <b>Create Key</b>, give it a name like "Job Tracker", then copy the key that starts with <code style={{fontFamily:"monospace",background:C.surface,padding:"1px 4px",borderRadius:4}}>sk-ant-</code>. You won't be able to see it again, so paste it somewhere safe.
        </div>}
      </div>
      <OnboardingStepRow stepNum={3} done={false} label="Paste it into Job Tracker" sub="Search Profiles → API keys" actionLabel="Go →" onAction={function(){setActiveTab("profiles");}} />
    </div>
  </Card>;
}

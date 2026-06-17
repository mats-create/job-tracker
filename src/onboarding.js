// onboarding.js
// Rev: 2026-06-17 — Visual + UX refinements based on direct feedback:
//   1. Cards are collapsible (per-card, sessionStorage-backed) so a user who wants
//      to explore the app first isn't forced to confront onboarding every time.
//   2. Distinct visual identity: 2px accent border in the app's own primary colour
//      (not a generic info-blue), a leading icon, and an inviting headline — so the
//      cards read as "go here first", not just another card among many.
//   3. Each not-yet-done step gets a one-sentence "what happens / what to expect"
//      description, shown inline (no separate overlay/explainer step to interfere
//      with flow).
//   4. Navigation uses goToSection(tabId, sectionId) instead of bare setActiveTab —
//      this switches tab AND scrolls+highlights the actual target section, so e.g.
//      "Add your API key" lands the user directly on the API keys card, already
//      pulsing, rather than just the top of a page they then have to hunt through.
// Rev: 2026-06-17 — Admin-only "Preview onboarding" toggle. Uses sessionStorage
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
var ONBOARDING_COLLAPSE_KEY="jt.onboardingCollapsed"; // JSON: {core:bool, gabbi:bool}

function getForcedOnboarding(){
  try{ return sessionStorage.getItem(ONBOARDING_FORCE_KEY)==="1"; }catch(e){ return false; }
}

function getCollapsedMap(){
  try{
    var raw=sessionStorage.getItem(ONBOARDING_COLLAPSE_KEY);
    return raw?JSON.parse(raw):{};
  }catch(e){ return {}; }
}

function setCollapsedMap(map){
  try{ sessionStorage.setItem(ONBOARDING_COLLAPSE_KEY,JSON.stringify(map)); }catch(e){}
}

function OnboardingCards({cv,profiles,jobs,anthropicKey,setActiveTab,goToSection,user}){
  var [forced,setForced]=useState(getForcedOnboarding);
  var isAdmin=!!(user&&user.email===ONBOARDING_ADMIN_EMAIL);
  var nav=goToSection||function(tabId){ if(setActiveTab) setActiveTab(tabId); };

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
    {!coreDone&&<OnboardingCoreCard step1Done={step1Done} step2Done={step2Done} step3Done={step3Done} nav={nav} />}
    {!gabbiDone&&<OnboardingGabbiCard nav={nav} />}
    {isAdmin&&<div style={{display:"flex",justifyContent:"flex-end"}}>
      <button onClick={toggleForced} style={{fontSize:11,color:C.textHint,background:"none",border:"1px dashed "+C.border,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit"}}>
        {forced?"✓ Showing forced preview — click to show real status":"👁 Force preview (admin) — ignores your real progress"}
      </button>
    </div>}
  </div>;
}

// ─── Shared collapsible card shell ────────────────────────────────────────────
// Gives onboarding cards their distinct "go here first" identity: accent border in
// the app's own primary colour, leading icon, inviting headline — plus a collapse
// toggle so a user who wants to explore the app first isn't blocked by it.
function OnboardingCardShell({storageKey,icon,title,progressPct,children}){
  var [collapsed,setCollapsed]=useState(function(){ return !!getCollapsedMap()[storageKey]; });

  function toggle(){
    var next=!collapsed;
    setCollapsed(next);
    var map=getCollapsedMap();
    map[storageKey]=next;
    setCollapsedMap(map);
  }

  return <Card style={{border:"2px solid "+C.primary}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:collapsed?0:4}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:17}}>{icon}</span>
        <span style={{fontSize:15,fontWeight:700,color:C.textPrimary}}>{title}</span>
      </div>
      <button onClick={toggle} aria-label={collapsed?"Expand":"Collapse"}
        style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",padding:4,color:C.textHint,fontFamily:"inherit"}}>
        {progressPct!=null&&<span style={{fontSize:12,color:C.textHint}}>{progressPct}</span>}
        <span style={{fontSize:13}}>{collapsed?"▾":"▴"}</span>
      </button>
    </div>
    {!collapsed&&children}
  </Card>;
}

function OnboardingStepRow({done,label,description,actionLabel,onAction,stepNum}){
  return <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderRadius:10,background:C.surface,border:"1px solid "+C.border}}>
    {done
      ?<div style={{width:18,height:18,borderRadius:"50%",background:C.success,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
        <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>
      </div>
      :(stepNum!=null
        ?<div style={{width:18,height:18,borderRadius:"50%",background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.textHint,flexShrink:0,marginTop:1}}>{stepNum}</div>
        :<div style={{width:18,height:18,borderRadius:"50%",border:"1.5px solid "+C.border,flexShrink:0,marginTop:1}} />)}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,color:done?C.textHint:C.textPrimary,textDecoration:done?"line-through":"none"}}>{label}</div>
      {description&&!done&&<div style={{fontSize:12,color:C.textSecondary,marginTop:3,lineHeight:1.5}}>{description}</div>}
    </div>
    {!done&&actionLabel&&<button onClick={onAction} style={{fontSize:12,fontWeight:600,padding:"5px 10px",borderRadius:8,border:"1px solid "+C.border,background:"transparent",color:C.primary,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap",marginTop:1}}>{actionLabel}</button>}
  </div>;
}

function OnboardingCoreCard({step1Done,step2Done,step3Done,nav}){
  var doneCount=(step1Done?1:0)+(step2Done?1:0)+(step3Done?1:0);
  return <OnboardingCardShell storageKey="core" icon="🚀" title="Start here — get your first match in 3 steps" progressPct={doneCount+" of 3"}>
    <div style={{fontSize:13,color:C.textSecondary,margin:"4px 0 14px"}}>Finish these and Job Tracker starts working for you automatically.</div>
    <div style={{height:6,background:C.surfaceAlt,borderRadius:3,marginBottom:14,overflow:"hidden"}}>
      <div style={{height:"100%",width:(doneCount/3*100)+"%",background:C.success,borderRadius:3,transition:"width 0.3s ease"}} />
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <OnboardingStepRow done={step1Done} label="Add your CV"
        description="Paste your CV text or upload a file in the My CV tab. This is what Gabbi and the matching score use to judge fit — nothing is sent anywhere until you do this."
        actionLabel="Go →" onAction={function(){nav("cv");}} />
      <OnboardingStepRow done={step2Done} label="Create a search profile"
        description="Tells Job Tracker which roles, locations and sources to search. Takes you to Search Profiles, where you'll fill in a short form."
        actionLabel="Go →" onAction={function(){nav("profiles");}} />
      <OnboardingStepRow done={step3Done} label="Import your first jobs"
        description="Run your new search profile to fetch real listings. You'll land back on Search Profiles with a 'Fetch' button ready to press."
        actionLabel="Go →" onAction={function(){nav("profiles");}} />
    </div>
  </OnboardingCardShell>;
}

function OnboardingGabbiCard({nav}){
  var [showHelp,setShowHelp]=useState(false);
  return <OnboardingCardShell storageKey="gabbi" icon="🫶" title="Activate Gabbi, your AI assistant">
    <div style={{fontSize:13,color:C.textSecondary,margin:"4px 0 14px"}}>Gabbi scores matches, writes cover letters, and coaches interviews — powered by your own Anthropic account, so usage and cost stay entirely yours.</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <OnboardingStepRow stepNum={1} done={false} label="Create a free Anthropic account"
        description="Opens console.anthropic.com in a new tab — sign up takes about a minute, no card required to get started."
        actionLabel="Open ↗" onAction={function(){window.open("https://console.anthropic.com/","_blank");}} />
      <div>
        <OnboardingStepRow stepNum={2} done={false} label="Generate an API key"
          description="A short code that lets Job Tracker talk to Claude on your behalf. Tap 'Show me' for exact steps."
          actionLabel={showHelp?"Hide":"Show me"} onAction={function(){setShowHelp(function(v){return !v;});}} />
        {showHelp&&<div style={{marginTop:6,padding:"10px 12px",background:C.surfaceAlt,borderRadius:8,fontSize:12,color:C.textSecondary,lineHeight:1.7}}>
          In the Anthropic Console, open <b>Settings → API Keys</b> in the left sidebar, click <b>Create Key</b>, give it a name like "Job Tracker", then copy the key that starts with <code style={{fontFamily:"monospace",background:C.surface,padding:"1px 4px",borderRadius:4}}>sk-ant-</code>. You won't be able to see it again, so paste it somewhere safe.
        </div>}
      </div>
      <OnboardingStepRow stepNum={3} done={false} label="Paste it into Job Tracker"
        description="Takes you straight to the API keys field on Search Profiles — it'll be highlighted so you know exactly where to paste."
        actionLabel="Go →" onAction={function(){nav("profiles","section-api-keys");}} />
    </div>
  </OnboardingCardShell>;
}

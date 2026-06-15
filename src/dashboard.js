// dashboard.js
// Rev: 2026-06-10 — BUG4: 'Applications sent' tile counts only active in-progress.
// Rev: 2026-06-11 — Silent jobs link now navigates with filter:"silent" for auto-filter.
// Rev: 2026-06-12 — Import summary card: persistent dismissable card after each run.
// Rev: 2026-06-12 — Import summary moved to overlay triggered by button; auto-card removed.
// Rev: 2026-06-15 — Per-profile rows now show fetched/new/skipped counts; source removed.


// ─── ImportSummaryOverlay ─────────────────────────────────────────────────────
function ImportSummaryOverlay({summary,onClose,onClear}){
  if(!summary) return null;
  var m=mob();

  var ts=new Date(summary.timestamp);
  var dateStr=ts.toLocaleDateString("sv-SE",{weekday:"short",month:"short",day:"numeric"});
  var timeStr=ts.toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"});
  var triggerLabel=summary.trigger==="manual"?"Manual run":"Scheduled run";
  var hasAnyNew=summary.totalAdded>0;
  var hasAnyFailed=(summary.profiles||[]).some(function(p){return p.failed;});

  var sheetStyle=m
    ?{position:"fixed",bottom:0,left:0,right:0,zIndex:610,
      background:C.surface,borderRadius:"20px 20px 0 0",
      boxShadow:"0 -8px 32px rgba(0,0,0,0.18)",
      maxHeight:"80vh",overflowY:"auto",
      paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 8px)"}
    :{position:"fixed",top:"50%",left:"50%",
      transform:"translate(-50%,-50%)",
      zIndex:610,width:"min(540px,92vw)",
      background:C.surface,borderRadius:20,
      boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
      maxHeight:"85vh",overflowY:"auto"};

  return <React.Fragment>
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:609,
        background:"rgba(0,0,0,0.45)",
        backdropFilter:"blur(2px)",WebkitBackdropFilter:"blur(2px)"}} />
    <div style={sheetStyle}>
      {m&&<div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"10px auto 0"}} />}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,
        padding:m?"14px 16px":"18px 24px",
        background:hasAnyFailed?C.warningBg:hasAnyNew?C.primaryLight:C.surfaceAlt,
        borderBottom:"1px solid "+(hasAnyFailed?C.warning:hasAnyNew?C.primary:C.border)}}>
        <span style={{fontSize:m?20:22}}>{hasAnyFailed?"⚠️":hasAnyNew?"✅":"🔄"}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:m?15:16,fontWeight:700,color:C.textPrimary}}>
            {triggerLabel} · {dateStr} at {timeStr}
          </div>
          <div style={{fontSize:m?13:14,color:C.textSecondary,marginTop:3}}>
            {hasAnyNew
              ?summary.totalAdded+" new job"+(summary.totalAdded!==1?"s":"")+" imported"
                +(summary.scored>0?" · "+summary.scored+" scored":"")
              :"No new jobs found — pipeline is up to date"}
          </div>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",cursor:"pointer",
            color:C.textHint,fontSize:24,lineHeight:1,padding:"4px 8px",
            flexShrink:0,minHeight:40,minWidth:40,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"inherit"}}>×</button>
      </div>

      {/* Per-profile breakdown */}
      {(summary.profiles||[]).length>0&&<div style={{padding:m?"12px 16px":"16px 24px"}}>
        <div style={{fontSize:11,fontWeight:700,color:C.textHint,
          letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:10}}>Per profile</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {summary.profiles.map(function(p,i){
            var isNew=p.added>0;
            var isFailed=p.failed;
            var rowBg=isFailed?C.errorBg:isNew?C.successBg:C.surfaceAlt;

            // Build the numbers string
            var nums=[];
            if(isFailed){
              nums.push("API error");
            } else {
              if(p.fetched!=null) nums.push(p.fetched+" fetched");
              if(isNew) nums.push(p.added+" new");
              else nums.push("0 new");
              if(p.skipped>0) nums.push(p.skipped+" dismissed");
            }

            return <div key={i} style={{display:"flex",alignItems:"center",gap:10,
              padding:"9px 14px",borderRadius:10,background:rowBg}}>
              <span style={{fontSize:m?13:14,fontWeight:600,color:C.textPrimary,
                flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {p.name}
              </span>
              <span style={{fontSize:m?12:13,fontWeight:isFailed||isNew?700:400,
                whiteSpace:"nowrap",flexShrink:0,
                color:isFailed?C.error:isNew?C.success:C.textHint}}>
                {nums.join(" · ")}
              </span>
            </div>;
          })}
        </div>
      </div>}

      {/* Footer */}
      <div style={{padding:m?"12px 16px":"14px 24px",borderTop:"1px solid "+C.border,
        display:"flex",alignItems:"center",gap:10,background:C.surfaceAlt,flexWrap:"wrap"}}>
        {summary.scoringFailed>0&&<span style={{fontSize:13,color:C.warning,flex:1}}>
          ⚠ {summary.scoringFailed} scoring batch{summary.scoringFailed!==1?"es":""} failed — try Rescore all.
        </span>}
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          <button onClick={onClear}
            style={{fontSize:m?14:13,fontWeight:600,padding:m?"10px 18px":"8px 16px",
              borderRadius:10,border:"1.5px solid "+C.border,background:"transparent",
              color:C.textSecondary,cursor:"pointer",fontFamily:"inherit",minHeight:m?44:36}}>
            Clear
          </button>
          <button onClick={onClose}
            style={{fontSize:m?15:14,fontWeight:700,padding:m?"10px 24px":"8px 20px",
              borderRadius:10,border:"none",background:C.primary,color:"#fff",
              cursor:"pointer",fontFamily:"inherit",minHeight:m?44:36}}>
            Close
          </button>
        </div>
      </div>
    </div>
  </React.Fragment>;
}


// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({jobs,schedule,setActiveTab,navigateToJobs,rescoreAll,scoringStatus,onRunAllProfiles,profiles,cv,anthropicKey,importSummary,onDismissImportSummary}){
  var [fetchStatus,setFetchStatus]=useState(null);
  var [fetchMsg,setFetchMsg]=useState("");
  var [showSummaryOverlay,setShowSummaryOverlay]=useState(false);
  var canFetch=(profiles||[]).filter(function(p){return p.active;}).length>0;
  var canRescore=hasCv(cv)&&jobs.filter(function(j){return !j.archived;}).length>0;

  async function handleRunAll(){
    if(!canFetch) return;
    setFetchStatus("running");
    setFetchMsg("Fetch started — running all active profiles…");
    try{
      await onRunAllProfiles("manual");
      setFetchStatus("done");
      setFetchMsg("Fetch complete — dashboard updated.");
    }catch(e){
      setFetchStatus("error");
      setFetchMsg("Fetch failed: "+(e.message||"unknown error"));
    }
    setTimeout(function(){setFetchStatus(null);setFetchMsg("");},5000);
  }

  function handleRescore(){
    if(!canRescore) return;
    rescoreAll();
  }

  var active=jobs.filter(function(j){return !j.archived;});
  var total=active.length;
  var avgScore=total?Math.round(active.reduce(function(a,j){return a+j.score;},0)/total):0;
  // Count only genuinely in-progress applications (exclude Rejected, No response)
  var IN_PROGRESS_STATUSES=["Applied","Interview","Offer"];
  var applied=active.filter(function(j){return IN_PROGRESS_STATUSES.includes(j.status);}).length;
  var topMatch=active.reduce(function(a,j){return j.score>(a?a.score:0)?j:a;},null);
  var newCount=active.filter(function(j){return j.status==="New";}).length;
  var rejectedCount=active.filter(function(j){return j.status==="Rejected";}).length;
  var noResponseCount=active.filter(function(j){return j.status==="No response";}).length;
  var adRemovedCount=active.filter(function(j){return j.status==="Ad removed";}).length;
  var notRelevantCount=active.filter(function(j){return j.status==="Not relevant";}).length;
  var closedTotal=rejectedCount+noResponseCount+adRemovedCount+notRelevantCount;

  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    {showSummaryOverlay&&<ImportSummaryOverlay summary={importSummary} onClose={function(){setShowSummaryOverlay(false);}} onClear={function(){setShowSummaryOverlay(false);if(onDismissImportSummary)onDismissImportSummary();}} />}
    <div style={{background:"linear-gradient(135deg,"+C.primary+" 0%,"+C.primaryDark+" 100%)",borderRadius:20,padding:"28px",color:"#fff",boxShadow:C.shadowMd}}>
      <div style={{fontSize:22,fontWeight:700,marginBottom:6}}>Good to see you! 👋</div>
      <div style={{fontSize:14,opacity:0.85,marginBottom:20}}>Here's your job search summary for today.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
        {[
          {label:"Jobs tracked",value:total,sub:"total in pipeline",nav:total>0?{}:null},
          {label:"New to review",value:newCount,sub:"waiting for you",nav:newCount>0?{status:"New"}:null},
          {label:"Applications sent",value:applied,sub:"active applications",nav:applied>0?{statusGroup:"applied"}:null},
          {label:"Best match",value:topMatch?topMatch.score+"%":"—",sub:topMatch?topMatch.company:"no jobs yet",nav:topMatch?{expandId:topMatch.id}:null},
        ].map(function(s){
          var clickable=!!(s.nav&&navigateToJobs);
          var content=<React.Fragment>
            <div style={{fontSize:24,fontWeight:700,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:12,fontWeight:600,opacity:0.9}}>{s.label}</div>
            <div style={{fontSize:11,opacity:0.65,marginTop:2}}>{s.sub}</div>
          </React.Fragment>;
          if(!clickable){
            return <div key={s.label} style={{background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"14px 16px"}}>{content}</div>;
          }
          return <button key={s.label} onClick={function(){navigateToJobs(s.nav);}} style={{background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"14px 16px",border:"none",color:"inherit",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"background 0.15s ease, transform 0.1s ease"}} onMouseEnter={function(e){e.currentTarget.style.background="rgba(255,255,255,0.25)";}} onMouseLeave={function(e){e.currentTarget.style.background="rgba(255,255,255,0.15)";}}>{content}</button>;
        })}
      </div>
    </div>
    <Card style={{display:"flex",flexDirection:"column",gap:12,padding:"16px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:schedule.enabled?"#4CAF50":C.border,flexShrink:0,boxShadow:schedule.enabled?"0 0 0 3px rgba(76,175,80,0.2)":"none"}} />
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:C.textPrimary}}>{schedule.enabled?"Auto-fetch is running":"Auto-fetch is off"}</div>
          <div style={{fontSize:12,color:C.textHint,marginTop:2}}>{schedule.enabled?"Fetching on "+schedule.days.join(", ")+" · "+schedule.startTime+"–"+schedule.stopTime+" · every "+schedule.intervalMinutes+" min":"Turn on the Scheduler to automatically fetch new jobs throughout the day."}</div>
        </div>
        <Btn onClick={function(){setActiveTab("scheduler");}} style={{fontSize:13,padding:"8px 16px",whiteSpace:"nowrap"}}>{schedule.enabled?"View schedule":"Set up schedule"}</Btn>
      </div>
      <div style={{borderTop:"1px solid "+C.border,paddingTop:12,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <Btn
          onClick={handleRunAll}
          disabled={!canFetch||fetchStatus==="running"}
          style={{fontSize:13,padding:"8px 16px",display:"inline-flex",alignItems:"center",gap:6}}
        >
          {fetchStatus==="running"
            ?<React.Fragment><span style={{display:"inline-block",width:12,height:12,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}} />Fetching…</React.Fragment>
            :"▶ Run all active"}
        </Btn>
        <Btn
          onClick={handleRescore}
          disabled={!canRescore||scoringStatus.active}
          style={{fontSize:13,padding:"8px 16px",display:"inline-flex",alignItems:"center",gap:6}}
        >
          {scoringStatus.active
            ?<React.Fragment><span style={{display:"inline-block",width:12,height:12,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}} />Scoring {scoringStatus.done}/{scoringStatus.total}…</React.Fragment>
            :"⟳ Rescore all"}
        </Btn>
        {importSummary&&<button onClick={function(){setShowSummaryOverlay(true);}}
          style={{fontSize:13,fontWeight:600,padding:"8px 14px",borderRadius:10,
            border:"1.5px solid "+C.primary,background:C.primaryLight,
            color:C.primary,cursor:"pointer",fontFamily:"inherit",
            display:"inline-flex",alignItems:"center",gap:6,minHeight:36}}>
          📋 Last import
          {importSummary.totalAdded>0&&<span style={{fontSize:11,fontWeight:700,
            background:C.primary,color:"#fff",borderRadius:10,
            padding:"1px 6px",lineHeight:1.6}}>{importSummary.totalAdded}</span>}
        </button>}
        {!canFetch&&<span style={{fontSize:12,color:C.textHint}}>No active search profiles.</span>}
        {!canRescore&&!scoringStatus.active&&!hasCv(cv)&&<span style={{fontSize:12,color:C.textHint}}>Add your CV to enable rescoring.</span>}
      </div>
      {(fetchStatus||scoringStatus.active||(!scoringStatus.active&&scoringStatus.total>0))&&
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {fetchMsg&&<Alert type={fetchStatus==="error"?"error":fetchStatus==="done"?"success":"info"}>{fetchMsg}</Alert>}
          {scoringStatus.active&&<Alert type="info">Rescoring started — scoring {scoringStatus.done} of {scoringStatus.total} jobs…</Alert>}
          {!scoringStatus.active&&scoringStatus.total>0&&<Alert type="success">Rescoring complete — {scoringStatus.total} jobs updated.</Alert>}
        </div>}
    </Card>
    <Card>
      <SectionTitle>Application pipeline</SectionTitle>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {ACTIVE_STATUSES.map(function(s){
          var count=active.filter(function(j){return j.status===s;}).length;
          var clickable=count>0&&navigateToJobs;
          var inner=<React.Fragment>
            <div style={{fontSize:22,fontWeight:700,color:STATUS[s].color}}>{count}</div>
            <div style={{fontSize:11,fontWeight:600,color:STATUS[s].color,marginTop:4,opacity:0.8}}>{s}</div>
          </React.Fragment>;
          if(!clickable){
            return <div key={s} style={{flex:"1 1 100px",minWidth:90,background:STATUS[s].bg,borderRadius:12,padding:"14px 10px",textAlign:"center"}}>{inner}</div>;
          }
          return <button key={s} onClick={function(){navigateToJobs({status:s});}} style={{flex:"1 1 100px",minWidth:90,background:STATUS[s].bg,borderRadius:12,padding:"14px 10px",textAlign:"center",border:"none",cursor:"pointer",fontFamily:"inherit",transition:"transform 0.1s ease, box-shadow 0.15s ease"}} onMouseEnter={function(e){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)";}} onMouseLeave={function(e){e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>{inner}</button>;
        })}
      </div>
      {closedTotal>0&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid "+C.border,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",fontSize:12,color:C.textSecondary}}>
        <span style={{fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:C.textHint,fontSize:11}}>Closed</span>
        {rejectedCount>0&&(navigateToJobs
          ?<button onClick={function(){navigateToJobs({status:"Rejected"});}} style={{background:"none",border:"none",cursor:"pointer",color:C.textSecondary,fontFamily:"inherit",fontSize:12,padding:0,textDecoration:"underline",textDecorationColor:"transparent",textUnderlineOffset:3,transition:"text-decoration-color 0.15s"}} onMouseEnter={function(e){e.currentTarget.style.textDecorationColor=STATUS.Rejected.color;}} onMouseLeave={function(e){e.currentTarget.style.textDecorationColor="transparent";}}><b style={{color:STATUS.Rejected.color}}>{rejectedCount}</b> rejected</button>
          :<span><b style={{color:STATUS.Rejected.color}}>{rejectedCount}</b> rejected</span>)}
        {noResponseCount>0&&(navigateToJobs
          ?<button onClick={function(){navigateToJobs({status:"No response"});}} style={{background:"none",border:"none",cursor:"pointer",color:C.textSecondary,fontFamily:"inherit",fontSize:12,padding:0,textDecoration:"underline",textDecorationColor:"transparent",textUnderlineOffset:3,transition:"text-decoration-color 0.15s"}} onMouseEnter={function(e){e.currentTarget.style.textDecorationColor=STATUS["No response"].color;}} onMouseLeave={function(e){e.currentTarget.style.textDecorationColor="transparent";}}><b style={{color:STATUS["No response"].color}}>{noResponseCount}</b> no response</button>
          :<span><b style={{color:STATUS["No response"].color}}>{noResponseCount}</b> no response</span>)}
        {adRemovedCount>0&&(navigateToJobs
          ?<button onClick={function(){navigateToJobs({status:"Ad removed"});}} style={{background:"none",border:"none",cursor:"pointer",color:C.textSecondary,fontFamily:"inherit",fontSize:12,padding:0,textDecoration:"underline",textDecorationColor:"transparent",textUnderlineOffset:3,transition:"text-decoration-color 0.15s"}} onMouseEnter={function(e){e.currentTarget.style.textDecorationColor=STATUS["Ad removed"].color;}} onMouseLeave={function(e){e.currentTarget.style.textDecorationColor="transparent";}}><b style={{color:STATUS["Ad removed"].color}}>{adRemovedCount}</b> ad removed</button>
          :<span><b style={{color:STATUS["Ad removed"].color}}>{adRemovedCount}</b> ad removed</span>)}
        {notRelevantCount>0&&(navigateToJobs
          ?<button onClick={function(){navigateToJobs({status:"Not relevant"});}} style={{background:"none",border:"none",cursor:"pointer",color:C.textSecondary,fontFamily:"inherit",fontSize:12,padding:0,textDecoration:"underline",textDecorationColor:"transparent",textUnderlineOffset:3,transition:"text-decoration-color 0.15s"}} onMouseEnter={function(e){e.currentTarget.style.textDecorationColor=STATUS["Not relevant"].color;}} onMouseLeave={function(e){e.currentTarget.style.textDecorationColor="transparent";}}><b style={{color:STATUS["Not relevant"].color}}>{notRelevantCount}</b> not relevant</button>
          :<span><b style={{color:STATUS["Not relevant"].color}}>{notRelevantCount}</b> not relevant</span>)}
        <span style={{color:C.textHint,marginLeft:"auto"}}>Total closed: {closedTotal}</span>
      </div>}
      {(function(){
        var now=Date.now();
        var thirtyDaysMs=30*24*60*60*1000;
        var stale=active.filter(function(j){
          if(j.status!=="Applied") return false;
          var ref=j.appliedAt||j.date;
          if(!ref) return false;
          return (now-new Date(ref).getTime())>thirtyDaysMs;
        });
        if(!stale.length) return null;
        return <Alert type="info">
          <span>{stale.length} applied job{stale.length!==1?"s have":" has"} been silent for 30+ days. <span style={{fontWeight:600,textDecoration:"underline",cursor:"pointer"}} onClick={function(){if(navigateToJobs) navigateToJobs({filter:"silent"}); else setActiveTab("jobs");}}>Review in My Jobs</span> and mark as <i>No response</i> if appropriate to close the loop.</span>
        </Alert>;
      })()}
    </Card>
    <Card>
      <SectionTitle action={<Btn onClick={function(){setActiveTab("jobs");}} style={{fontSize:12,padding:"6px 14px"}}>View all</Btn>}>Recently added jobs</SectionTitle>
      {active.length===0
        ?<EmptyState icon="🔍" title="No jobs yet" body="Go to Search Profiles to fetch jobs automatically." />
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {active.slice(0,5).map(function(j){
            var inner=<React.Fragment>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.textPrimary,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.title}</div>
                <div style={{fontSize:12,color:C.textSecondary}}>{j.company} · {j.location}</div>
              </div>
              <ScorePill score={j.score} rationale={j.rationale} scored={j.scored!==false} />
              <Chip label={j.status} bg={STATUS[j.status].bg} color={STATUS[j.status].color} />
            </React.Fragment>;
            if(!navigateToJobs){
              return <div key={j.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.surfaceAlt,borderRadius:12}}>{inner}</div>;
            }
            return <button key={j.id} onClick={function(){navigateToJobs({expandId:j.id});}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.surfaceAlt,borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"100%",transition:"background 0.15s ease"}} onMouseEnter={function(e){e.currentTarget.style.background=C.primaryLight;}} onMouseLeave={function(e){e.currentTarget.style.background=C.surfaceAlt;}}>{inner}</button>;
          })}
        </div>}
    </Card>
  </div>;
}

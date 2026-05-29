// ─── Scheduler ────────────────────────────────────────────────────────────────
function Scheduler({schedule,setSchedule,profiles,log,resetAllData,exportData,importData,validateImport,dismissedIds,clearDismissedIds}){
  var [draft,setDraft]=useState(schedule);
  var [dirty,setDirty]=useState(false);
  var [excludeKeys,setExcludeKeys]=useState(false);
  var [importPreview,setImportPreview]=useState(null);
  var [showAllLog,setShowAllLog]=useState(false);
  var [importError,setImportError]=useState("");
  var fileInputRef=useRef(null);
  function update(patch){setDraft(function(d){return Object.assign({},d,patch);});setDirty(true);}
  function toggleDay(day){update({days:draft.days.includes(day)?draft.days.filter(function(d){return d!==day;}):draft.days.concat([day])});}
  function save(){setSchedule(draft);setDirty(false);}
  function revert(){setDraft(schedule);setDirty(false);}

  function startImport(){
    setImportError("");
    setImportPreview(null);
    if(fileInputRef.current) fileInputRef.current.click();
  }
  function onFileChosen(e){
    var file=e.target.files&&e.target.files[0];
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(evt){
      try{
        var obj=JSON.parse(evt.target.result);
        var err=validateImport(obj);
        if(err){ setImportError(err); e.target.value=""; return; }
        var d=obj.data||{};
        var stats={
          jobs:(d.jobs||[]).length,
          profiles:(d.profiles||[]).length,
          hasCv:!!(d.cv&&d.cv.text),
          hasKeys:!!(d.afKey||d.jsKey||d.anthropicKey),
          exportedAt:obj.exportedAt||"unknown",
        };
        setImportPreview({payload:obj,stats:stats});
      }catch(err){
        setImportError("Couldn't parse file: "+(err.message||err));
      }
      e.target.value="";
    };
    reader.onerror=function(){ setImportError("Couldn't read the file."); e.target.value=""; };
    reader.readAsText(file);
  }
  function confirmImport(){
    if(!importPreview) return;
    if(!confirm("This will REPLACE all your current jobs, profiles, CV, schedule, and log with the contents of the backup. Continue?")) return;
    importData(importPreview.payload);
    setImportPreview(null);
  }

  var activeCount=profiles.filter(function(p){return p.active;}).length;
  var timeInvalid=draft.startTime>=draft.stopTime;

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <SectionTitle>Scheduler status <InfoTip>Scheduled fetches only run while the app is open in an active browser tab. Closing or minimising pauses it. For always-on fetching, keep the app open in a pinned tab.</InfoTip></SectionTitle>
      <Toggle value={draft.enabled} onChange={function(){update({enabled:!draft.enabled});}} label={draft.enabled?"Scheduler is ON — jobs will be fetched automatically":"Scheduler is OFF — turn on to fetch jobs automatically"} hint={draft.enabled?"Active profiles will be fetched on the days and times set below.":"Enable this to have the app check for new jobs in the background."} />
      {schedule.enabled&&<Alert type="success">Currently running · {activeCount} active profile{activeCount!==1?"s":""} · {schedule.days.join(", ")} · {schedule.startTime}–{schedule.stopTime} · every {schedule.intervalMinutes} min</Alert>}
    </Card>
    <Card>
      <SectionTitle>Which days should it run?</SectionTitle>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {DAYS.map(function(d){var on=draft.days.includes(d);return <button key={d} onClick={function(){toggleDay(d);}} style={{flex:1,padding:"10px 4px",borderRadius:10,border:"2px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,fontSize:13,fontWeight:on?700:500,cursor:"pointer"}}>{d}</button>;})}
      </div>
      <div style={{display:"flex",gap:8}}>
        {[["Weekdays only",["Mon","Tue","Wed","Thu","Fri"]],["Every day",DAYS.slice()],["Clear all",[]]].map(function(item){return <Btn key={item[0]} onClick={function(){update({days:item[1]});}} style={{fontSize:12,padding:"6px 14px"}}>{item[0]}</Btn>;})}
      </div>
    </Card>
    <Card>
      <SectionTitle>Active time window <InfoTip>The scheduler only runs between these hours — so it won't disturb you outside working hours.</InfoTip></SectionTitle>
      <div className="jt-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
        {[["Start fetching at","startTime"],["Stop fetching at","stopTime"]].map(function(item){return <div key={item[1]}><Label>{item[0]}</Label><Inp type="time" value={draft[item[1]]} onChange={function(e){var v=e.target.value;var patch={};patch[item[1]]=v;update(patch);}} /></div>;})}
      </div>
      {timeInvalid&&<Alert type="error">The stop time must be later than the start time.</Alert>}
    </Card>
    <Card>
      <SectionTitle>How often should it fetch? <InfoTip>How frequently the app checks for new jobs within your active time window.</InfoTip></SectionTitle>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[15,30,60,120,240,480].map(function(m){var on=draft.intervalMinutes===m;var label=m<60?m+" minutes":(m/60)+" hour"+(m>60?"s":"");return <button key={m} onClick={function(){update({intervalMinutes:m});}} style={{flex:1,minWidth:80,padding:"12px 8px",borderRadius:12,border:"2px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,fontSize:13,fontWeight:on?700:500,cursor:"pointer",textAlign:"center"}}>{label}</button>;})}
      </div>
    </Card>
    <div style={{display:"flex",gap:10,alignItems:"center"}}>
      <Btn variant="primary" onClick={save} disabled={!dirty||timeInvalid} style={{padding:"12px 28px"}}>Save schedule</Btn>
      {dirty&&<Btn onClick={revert}>Revert changes</Btn>}
      <span style={{fontSize:13,color:C.textHint}}>{activeCount} active profile{activeCount!==1?"s":""} will run on this schedule.</span>
    </div>
    <Card>
      <SectionTitle action={log.length>10?<Btn onClick={function(){setShowAllLog(function(v){return !v;});}} style={{fontSize:12,padding:"6px 12px"}}>{showAllLog?"Show last 10":"Show all ("+log.length+")"}</Btn>:null}>Run log</SectionTitle>
      <div style={{fontSize:13,color:C.textHint,marginBottom:12}}>A record of every time the scheduler ran and what it found. Entries older than 30 days are removed automatically.</div>
      {log.length===0
        ?<EmptyState icon="📋" title="No runs logged yet" body="Enable the scheduler and save your settings to start." />
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(function(){
            var ordered=log.slice().reverse();
            var visible=showAllLog?ordered:ordered.slice(0,10);
            return visible.map(function(e,i){return <div key={i} style={{display:"flex",gap:12,padding:"10px 14px",background:C.surfaceAlt,borderRadius:10,fontSize:13}}><span style={{color:C.textHint,whiteSpace:"nowrap",fontFamily:"monospace",fontSize:12}}>{e.time}</span><span style={{color:e.type==="error"?C.error:e.type==="manual"?C.info:C.success}}>{e.msg}</span></div>;});
          })()}
          {!showAllLog&&log.length>10&&<div style={{fontSize:12,color:C.textHint,textAlign:"center",padding:"4px"}}>… {log.length-10} more entr{log.length-10===1?"y":"ies"} hidden</div>}
        </div>}
    </Card>
    <Card>
      <SectionTitle>Backup & restore <InfoTip>Download a JSON file with all your jobs, profiles, CV, schedule and settings. Keep it as a manual backup — Firestore cloud sync is your primary backup, this is the "leave the cloud" escape hatch.</InfoTip></SectionTitle>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.textSecondary,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" checked={excludeKeys} onChange={function(){setExcludeKeys(function(v){return !v;});}} style={{width:16,height:16,cursor:"pointer",accentColor:C.primary}} />
          <span>Exclude API keys from export <span style={{color:C.textHint}}>(recommended if you'll share the file)</span></span>
        </label>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Btn variant="primary" onClick={function(){exportData(excludeKeys);}}>⬇ Export backup ({excludeKeys?"without keys":"with keys"})</Btn>
        </div>
      </div>
      <div style={{borderTop:"1px solid "+C.border,paddingTop:16}}>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFileChosen} style={{display:"none"}} />
        <Btn onClick={startImport}>⬆ Import backup…</Btn>
        {importError&&<Alert type="error">{importError}</Alert>}
        {importPreview&&<div style={{marginTop:14,padding:"14px 16px",background:C.primaryLight,borderRadius:12,border:"2px solid "+C.primary}}>
          <div style={{fontSize:13,fontWeight:700,color:C.primary,marginBottom:8,letterSpacing:"0.5px"}}>BACKUP READY TO RESTORE</div>
          <div style={{fontSize:13,color:C.textPrimary,lineHeight:1.7,marginBottom:12}}>
            • {importPreview.stats.jobs} job{importPreview.stats.jobs!==1?"s":""}<br/>
            • {importPreview.stats.profiles} search profile{importPreview.stats.profiles!==1?"s":""}<br/>
            • CV: {importPreview.stats.hasCv?"included":"not included"}<br/>
            • API keys: {importPreview.stats.hasKeys?"included":"not included"}<br/>
            • Exported: {importPreview.stats.exportedAt!=="unknown"?new Date(importPreview.stats.exportedAt).toLocaleString():"unknown"}
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn variant="primary" onClick={confirmImport}>Replace all data with this backup</Btn>
            <Btn onClick={function(){setImportPreview(null);}}>Cancel</Btn>
          </div>
        </div>}
      </div>
    </Card>
    <Card>
      <SectionTitle>Dismissed jobs <InfoTip>When you dismiss or delete a job, its ID is remembered so future fetches won't re-add it. Clear the list if you want previously dismissed jobs to reappear on the next fetch.</InfoTip></SectionTitle>
      <div style={{fontSize:13,color:C.textHint,marginBottom:14}}>
        {(dismissedIds&&dismissedIds.length)?"Blocking "+dismissedIds.length+" job ID"+(dismissedIds.length!==1?"s":"")+" from re-ingestion.":"No dismissed jobs — list is empty."}
      </div>
      <Btn onClick={function(){
        if(!dismissedIds||!dismissedIds.length) return;
        if(!confirm("Clear the dismissed-jobs list? Previously dismissed jobs will become eligible for re-ingestion on the next fetch.")) return;
        if(clearDismissedIds) clearDismissedIds();
      }} disabled={!dismissedIds||!dismissedIds.length}>Clear dismissed list</Btn>
    </Card>
    <Card>
      <SectionTitle>Reset <InfoTip>Permanently deletes all your data — jobs, profiles, CV, API keys and schedule — from both this device and the cloud. Cannot be undone.</InfoTip></SectionTitle>
      <Btn variant="danger" onClick={resetAllData}>Reset all data</Btn>
    </Card>
  </div>;
}

// ─── ActivityListings ─────────────────────────────────────────────────────────
function ActivityListings({jobs}){
  var now=new Date();
  var thisMonth=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  var [startMonth,setStartMonth]=useState(thisMonth);
  var [endMonth,setEndMonth]=useState(thisMonth);
  var [groupBy,setGroupBy]=useState("status");
  var [copied,setCopied]=useState("");

  function refDate(j){
    return APPLIED_STATUSES.includes(j.status)&&j.appliedAt?j.appliedAt.slice(0,10):j.date||"";
  }

  var filtered=jobs.filter(function(j){
    var d=refDate(j);
    if(!d) return false;
    var month=d.slice(0,7);
    return month>=startMonth&&month<=endMonth;
  }).sort(function(a,b){
    return (refDate(a)||"").localeCompare(refDate(b)||"");
  });

  function shortId(j){ return String(j.id).slice(-4); }

  function rowData(j){
    return {
      id:shortId(j),
      title:j.title||"",
      company:j.company||"",
      employmentType:j.employmentType||"—",
      location:j.location||"—",
      appliedAt:fmtDate(j.appliedAt),
      refDate:refDate(j),
      status:j.status+(j.archived?" (archived)":""),
    };
  }

  function buildStatusGroups(){
    var groups={};
    var allStatuses=STATUSES.slice();
    filtered.forEach(function(j){
      var key=j.status+(j.archived?" (archived)":"");
      if(!groups[key]) groups[key]=[];
      groups[key].push(rowData(j));
    });
    var order=STATUSES.map(function(s,i){return {s:s,i:i};});
    return Object.keys(groups).sort(function(a,b){
      var ai=order.findIndex(function(x){return a.startsWith(x.s);});
      var bi=order.findIndex(function(x){return b.startsWith(x.s);});
      return (ai===-1?99:ai)-(bi===-1?99:bi);
    }).map(function(key){return {label:key,rows:groups[key]};});
  }

  function buildWeekGroups(){
    var groups={};
    filtered.forEach(function(j){
      var d=refDate(j);
      if(!d) return;
      var ws=weekStart(d);
      if(!groups[ws]) groups[ws]=[];
      groups[ws].push(rowData(j));
    });
    return Object.keys(groups).sort().map(function(ws){
      var we=weekEnd(ws);
      var wn=isoWeek(ws);
      var label="Week "+wn+" ("+ws+" – "+we+")";
      return {label:label,rows:groups[ws],weekStart:ws};
    });
  }

  var groups=groupBy==="status"?buildStatusGroups():buildWeekGroups();
  var totalRows=filtered.length;

  function buildPlainText(){
    var lines=["Job Activity Listing","Period: "+startMonth+" to "+endMonth,"Grouped by: "+(groupBy==="status"?"Status":"Week"),"Generated: "+new Date().toISOString().slice(0,10),"Total jobs: "+totalRows,""];
    groups.forEach(function(g){
      lines.push("── "+g.label+" ("+g.rows.length+") ──");
      g.rows.forEach(function(r){
        lines.push([
          "#"+r.id,
          r.title.padEnd(30).slice(0,30),
          r.company.padEnd(20).slice(0,20),
          r.employmentType.padEnd(14).slice(0,14),
          r.location.padEnd(16).slice(0,16),
          "Applied: "+r.appliedAt,
          "Ref: "+r.refDate,
          r.status.padEnd(16).slice(0,16),
        ].filter(Boolean).join("  "));
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function buildCsv(){
    var rows=[["ID","Title","Company","Employment Type","Location","Applied","Ref Date","Status","Period","Week"]];
    groups.forEach(function(g){
      g.rows.forEach(function(r){
        rows.push([
          "#"+r.id,r.title,r.company,r.employmentType,r.location,r.appliedAt,r.refDate,r.status,
          startMonth+(startMonth!==endMonth?" to "+endMonth:""),
          g.weekStart||"",
        ].map(function(v){ return "\""+String(v).replace(/"/g,"\"\"")+"\""; }).join(","));
      });
    });
    return rows.join("\n");
  }

  function copyText(){ navigator.clipboard.writeText(buildPlainText()); setCopied("text"); setTimeout(function(){setCopied("");},2000); }
  function downloadCsv(){
    var csv=buildCsv();
    var bom="\uFEFF";
    var b=new Blob([bom+csv],{type:"text/csv;charset=utf-8"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(b);
    a.download="job-activity-"+startMonth+"-to-"+endMonth+".csv";
    a.click();
  }

  var thStyle={fontSize:11,fontWeight:700,color:C.textHint,textTransform:"uppercase",letterSpacing:"0.5px",padding:"6px 10px",textAlign:"left",borderBottom:"2px solid "+C.border,whiteSpace:"nowrap"};
  var tdStyle={fontSize:13,color:C.textPrimary,padding:"7px 10px",verticalAlign:"top"};
  var tdHint={fontSize:13,color:C.textHint,padding:"7px 10px",verticalAlign:"top",whiteSpace:"nowrap"};

  return <Card>
    <SectionTitle>Activity listing <InfoTip>Tabular listing of jobs by period — all statuses including archived. Reference date is the application date for applied jobs, ingestion date otherwise. Export as CSV opens in Excel.</InfoTip></SectionTitle>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:16}}>
      <div>
        <Label>From month</Label>
        <input type="month" value={startMonth} onChange={function(e){setStartMonth(e.target.value);}} style={{fontSize:13,padding:"8px 10px",borderRadius:8,border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,fontFamily:"inherit"}} />
      </div>
      <div>
        <Label>To month</Label>
        <input type="month" value={endMonth} onChange={function(e){var v=e.target.value;setEndMonth(v<startMonth?startMonth:v);}} style={{fontSize:13,padding:"8px 10px",borderRadius:8,border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,fontFamily:"inherit"}} />
      </div>
      <div>
        <Label>Group by</Label>
        <div style={{display:"flex",gap:6}}>
          {["status","week"].map(function(g){
            return <button key={g} onClick={function(){setGroupBy(g);}} style={{fontSize:13,padding:"8px 14px",borderRadius:8,border:"1.5px solid "+(groupBy===g?C.primary:C.border),background:groupBy===g?C.primaryLight:"transparent",color:groupBy===g?C.primary:C.textSecondary,cursor:"pointer",fontWeight:groupBy===g?700:400,textTransform:"capitalize"}}>
              {g==="status"?"By status":"By week"}
            </button>;
          })}
        </div>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn onClick={copyText} disabled={totalRows===0}>{copied==="text"?"Copied!":"Copy as text"}</Btn>
        <Btn variant="primary" onClick={downloadCsv} disabled={totalRows===0}>⬇ Download CSV</Btn>
      </div>
    </div>
    {totalRows===0
      ?<Alert type="info">No jobs found for the selected period. Try adjusting the date range.</Alert>
      :<div>
        <div style={{fontSize:12,color:C.textHint,marginBottom:10}}>{totalRows} job{totalRows!==1?"s":""} in period</div>
        {groups.map(function(g){
          return <div key={g.label} style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:C.primary,marginBottom:6,padding:"4px 0",borderBottom:"1px solid "+C.border}}>
              {g.label} <span style={{fontWeight:400,color:C.textHint}}>({g.rows.length})</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Company</th>
                    <th style={thStyle}>Employment type</th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Applied</th>
                    <th style={thStyle}>Ref date</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(function(r,i){
                    var bg=i%2===0?C.surfaceAlt:C.surface;
                    var rawStatus=r.status.replace(" (archived)","");
                    return <tr key={r.id+i} style={{background:bg}}>
                      <td style={Object.assign({},tdHint,{fontFamily:"monospace"})}>{r.id}</td>
                      <td style={Object.assign({},tdStyle,{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"})}>{r.title}</td>
                      <td style={tdStyle}>{r.company}</td>
                      <td style={tdHint}>{r.employmentType}</td>
                      <td style={tdHint}>{r.location}</td>
                      <td style={tdHint}>{r.appliedAt}</td>
                      <td style={tdHint}>{r.refDate}</td>
                      <td style={tdStyle}><span style={{background:STATUS[rawStatus]?STATUS[rawStatus].bg:C.surfaceAlt,color:STATUS[rawStatus]?STATUS[rawStatus].color:C.textSecondary,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{r.status}</span></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>;
        })}
      </div>
    }
  </Card>;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports({jobs,cv,anthropicKey}){
  var [type,setType]=useState("Weekly digest");
  var [report,setReport]=useState("");
  var [error,setError]=useState("");
  var [loading,setLoading]=useState(false);
  var [showEmail,setShowEmail]=useState(false);

  async function generate(){
    setLoading(true);setReport("");setError("");setShowEmail(false);
    var active=jobs.filter(function(j){return !j.archived;});
    var byStatus={};
    STATUSES.forEach(function(s){byStatus[s]=0;});
    active.forEach(function(j){if(byStatus[j.status]!==undefined) byStatus[j.status]++;});
    var appliedTotal=APPLIED_STATUSES.reduce(function(a,s){return a+(byStatus[s]||0);},0);
    var rejected=byStatus.Rejected||0;
    var noResponse=byStatus["No response"]||0;
    var interviewed=byStatus.Interview||0;
    var offered=byStatus.Offer||0;
    var stillApplied=byStatus.Applied||0;
    var responded=appliedTotal-noResponse;
    var responseRate=appliedTotal>0?Math.round((responded/appliedTotal)*100):0;
    var rejectedWithDates=active.filter(function(j){return j.status==="Rejected"&&j.appliedAt&&j.rejectedAt;});
    var avgDaysToRejection=null;
    if(rejectedWithDates.length>0){
      var totalDays=rejectedWithDates.reduce(function(sum,j){
        return sum+(new Date(j.rejectedAt)-new Date(j.appliedAt))/(1000*60*60*24);
      },0);
      avgDaysToRejection=Math.round(totalDays/rejectedWithDates.length);
    }
    var funnel=
      "FUNNEL STATS (computed from current data, use these verbatim if you cite numbers):\n"+
      "• Total active in pipeline: "+active.length+"\n"+
      "• Applications sent (all-time, including closed): "+appliedTotal+"\n"+
      "• Still awaiting response (Applied status): "+stillApplied+"\n"+
      "• Progressed to Interview stage: "+(interviewed+offered+rejected)+" (currently Interview: "+interviewed+", Offer: "+offered+", Rejected after applying: "+rejected+")\n"+
      "• Closed - No response (ghosted): "+noResponse+"\n"+
      "• Closed - Ad removed (employer took down listing): "+(byStatus["Ad removed"]||0)+"\n"+
      "• Closed - Not relevant (reviewed and ruled out as mismatch): "+(byStatus["Not relevant"]||0)+"\n"+
      "• Response rate (any reply, positive or negative): "+responseRate+"%\n"+
      (avgDaysToRejection!==null?"• Average days from application to rejection: "+avgDaysToRejection+" days (based on "+rejectedWithDates.length+" rejections with timestamps)\n":"")+
      "• Breakdown by status: "+STATUSES.map(function(s){return s+"="+(byStatus[s]||0);}).join(", ");
    var summary=active.map(function(j){return j.title+" at "+j.company+" ("+j.status+", match: "+j.score+"%, source: "+j.source+")";}).join("\n");
    try{
      var cvContext=cv&&hasCv(cv)?"CANDIDATE PROFILE:\n"+cvSummaryText(cv)+"\n\n":"";
      var prompt="Generate a \""+type+"\" report for a job seeker.\n\n"+
        cvContext+funnel+"\n\n"+
        "JOBS LIST:\n"+summary+"\n\n"+
        "Write a clear, friendly report with key insights and practical recommendations. "+
        "Where relevant to the report type, use the funnel stats above — especially response rate and the breakdown between closed outcomes (Rejected vs No response). "+
        "Where the candidate profile is provided, use it to comment on skill/tool alignment patterns across the pipeline and whether the types of jobs being tracked match the candidate's background. "+
        "For status reports, explicitly comment on how many applications are closed vs still active, and whether the user should follow up on silent applications. "+
        "Use plain text, no markdown.";
      var text=await callClaude({apiKey:anthropicKey,prompt:prompt,maxTokens:1500});
      setReport(text);
    }catch(e){setError(e.message||"Error connecting to Claude. Please try again.");}
    setLoading(false);
  }

  var emailSubject=type+" — "+new Date().toISOString().slice(0,10);
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <SectionTitle>Generate a report <InfoTip>Claude analyses your pipeline and writes a summary with insights and recommendations. Uses your CV if available.</InfoTip></SectionTitle>
      <div style={{marginBottom:16}}>
        <Label hint="Choose what kind of report you'd like.">Report type</Label>
        <Sel className="jt-report-select" value={type} onChange={function(e){setType(e.target.value);}}>
          {["Weekly digest","Top 10 matches","Application status report","Monthly summary"].map(function(t){return <option key={t}>{t}</option>;})}
        </Sel>
      </div>
      <button onClick={generate} disabled={loading||jobs.length===0||!anthropicKey}
        style={{fontSize:15,fontWeight:700,padding:"14px",borderRadius:14,border:"none",
          background:loading||jobs.length===0||!anthropicKey?C.border:C.primary,
          color:loading||jobs.length===0||!anthropicKey?C.textHint:"#fff",
          cursor:loading||jobs.length===0||!anthropicKey?"not-allowed":"pointer",
          fontFamily:"inherit",width:"100%",minHeight:52,
          display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        {loading
          ?<React.Fragment><span style={{display:"inline-block",width:18,height:18,border:"2.5px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />Writing report…</React.Fragment>
          :"Generate report ↗"}
      </button>
      {!anthropicKey&&<Alert type="warning">Add your Anthropic API key in Search Profiles → API keys.</Alert>}
      {jobs.length===0&&<Alert type="warning">No jobs yet — add some first.</Alert>}
      {error&&<Alert type="error">{error}</Alert>}
    </Card>
    {report&&<Card>
      <SectionTitle>Your report</SectionTitle>
      <div className="jt-report-body" style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap",color:C.textPrimary,background:C.surfaceAlt,borderRadius:12,padding:"16px",marginBottom:14}}>{report}</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <button onClick={function(){setShowEmail(true);}}
          style={{fontSize:15,fontWeight:700,padding:"13px",borderRadius:12,border:"none",
            background:C.primary,color:"#fff",cursor:"pointer",fontFamily:"inherit",
            width:"100%",minHeight:50,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          ✉ Send via email
        </button>
        <Btn onClick={function(){navigator.clipboard.writeText(report);}} style={{fontSize:14,minHeight:46,width:"100%"}}>Copy to clipboard</Btn>
      </div>
      {showEmail&&<EmailDialog recipients={(cv&&cv.recipients)||[]} subject={emailSubject} body={report} onClose={function(){setShowEmail(false);}} />}
    </Card>}
    <ActivityListings jobs={jobs} />
  </div>;
}

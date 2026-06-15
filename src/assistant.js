// assistant.js
// Rev: 2026-06-04 — Gabbi rename; CV write-back; <<<ACTION>>> protocol; CV edit starter.
// Rev: 2026-06-15 — Job status + notes write access (job_update action type);
//                   CV preferences write access (cv_pref action type);
//                   Profile edit/toggle/delete (profile_update action type);
//                   jobsSummaryText adds appliedAt/rejectedAt dates;
//                   smarter context-aware starter prompts;
//                   updated intro description and scope;
//                   softer off-topic redirect tone.

// ─── Job summary for system prompt ───────────────────────────────────────────
function jobsSummaryText(jobs){
  if(!jobs||!jobs.length) return "(No jobs in the pipeline yet.)";
  var groups={};
  var order=["New","Reviewing","Applied","Interview","Offer","Rejected","No response","Ad removed","Not relevant"];
  jobs.forEach(function(j){
    var key=j.archived?"Archived":(j.status||"Unknown");
    if(!groups[key]) groups[key]=[];
    groups[key].push(j);
  });
  var lines=[];
  var allKeys=order.concat(Object.keys(groups).filter(function(k){return !order.includes(k);}));
  allKeys.forEach(function(status){
    var group=groups[status];
    if(!group||!group.length) return;
    lines.push("\n── "+status.toUpperCase()+" ("+group.length+") ──");
    group.forEach(function(j){
      var score=j.scored===false?"unscored":((j.score||0)+"%");
      var tags=j.tags&&j.tags.length?" ["+j.tags.slice(0,4).join(", ")+"]":"";
      var emp=j.employmentType?" · "+j.employmentType:"";
      var loc=j.location?" · "+j.location:"";
      var desc=j.description?(" | desc: "+j.description.replace(/\s+/g," ").slice(0,300)):"";
      var rat=j.rationale?" | AI: "+j.rationale:"";
      // Include key dates for pipeline analysis
      var dates=[];
      if(j.appliedAt) dates.push("applied:"+j.appliedAt.slice(0,10));
      if(j.rejectedAt) dates.push("rejected:"+j.rejectedAt.slice(0,10));
      if(j.date) dates.push("added:"+j.date.slice(0,10));
      var dateStr=dates.length?" | "+dates.join(", "):"";
      var notes=j.notes?" | notes: "+j.notes.slice(0,100):"";
      lines.push("• id:"+j.id+" "+score+" — "+j.title+" @ "+j.company+loc+emp+tags+rat+dateStr+notes+desc);
    });
  });
  return "Total jobs: "+jobs.length+" ("+Object.keys(groups).map(function(k){return k+": "+groups[k].length;}).join(", ")+")\n"+lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildAssistantSystem(cv,profiles,jobs){
  var cvBlock=hasCv(cv)?cvSummaryText(cv):"(No CV loaded yet — ask the user to add their CV in the My CV tab.)";
  var existing=(profiles||[]).length
    ? profiles.map(function(p){
        return "- id:"+p.id+" \""+p.name+"\" · query: "+p.query+" · sources: "+(p.sources||[]).join("+")+
               " · max "+p.limit+" · "+(p.active?"active":"inactive");
      }).join("\n")
    : "(No profiles saved yet.)";
  var pipelineBlock=jobsSummaryText(jobs||[]);

  return [
    "You are Gabbi, an AI assistant embedded in a personal job-tracking app.",
    "Your personality: warm, direct, practically helpful. You use the user's first name if you know it.",
    "",
    "You help with these topics:",
    "  (a) How this app's features work.",
    "  (b) Designing and editing search profiles.",
    "  (c) What the connected APIs (Arbetsförmedlingen, JSearch) can do.",
    "  (d) Analysing the user's job pipeline — patterns, matches, strategic advice.",
    "  (e) Analysing and improving CV sections (tools, skills, achievements, preferences).",
    "  (f) Applying edits to CV and job data when the user asks.",
    "",
    "For anything outside job search and this app, just say so briefly and offer to help with what you can.",
    "",
    "TONE: friendly, concise, practical. One clarifying question at a time max.",
    "",
    "═══ WHAT GABBI CAN WRITE ═══",
    "You can make changes to: CV sections, job status/notes, search profiles.",
    "Always describe what you plan to change and ask for confirmation BEFORE emitting action blocks.",
    "Never emit action blocks unless the user has explicitly confirmed.",
    "You may emit multiple action blocks in one reply.",
    "Do NOT use markdown code fences around action blocks.",
    "",
    "═══ ACTION PROTOCOL ═══",
    "",
    "── 1. CV EDITS (tools, skills, achievements) ──",
    "<<<ACTION>>>",
    "{\"type\":\"cv_edit\",\"section\":\"tools\",\"op\":\"add\",\"item\":{\"name\":\"Notion\",\"years\":2,\"level\":\"Intermediate\",\"employers\":\"\"}}",
    "<<</ACTION>>>",
    "Sections: \"tools\", \"skills\", \"achievements\"",
    "Ops: add | edit (match by name for tools/skills, description substring for achievements) | delete",
    "Tool/Skill fields: name (string), years (number), level (Beginner|Intermediate|Advanced|Expert), employers (string)",
    "Achievement fields: description (string), employer (string), year (string)",
    "",
    "── 2. CV PREFERENCES ──",
    "<<<ACTION>>>",
    "{\"type\":\"cv_pref\",\"field\":\"roles\",\"value\":\"Product Manager, CPO, Product Owner\"}",
    "<<</ACTION>>>",
    "Fields: roles | industries | locations | salary | workType (Any|Remote|Hybrid|On-site)",
    "",
    "── 3. JOB UPDATES ──",
    "<<<ACTION>>>",
    "{\"type\":\"job_update\",\"jobId\":12345,\"op\":\"setStatus\",\"value\":\"Applied\"}",
    "<<</ACTION>>>",
    "Ops:",
    "  setStatus — value must be one of: New, Reviewing, Applied, Interview, Offer, Rejected, No response, Ad removed, Not relevant",
    "  setNotes  — value is a string (replaces existing notes)",
    "  appendNote — value is appended to existing notes with a newline separator",
    "jobId must exactly match the id shown in the pipeline list below.",
    "When setting status to Applied, also set appliedAt to today's date (ISO format).",
    "For job updates: if the user says a company or title name rather than an id, find the matching job in the pipeline and use its id.",
    "",
    "── 4. PROFILE UPDATES ──",
    "<<<ACTION>>>",
    "{\"type\":\"profile_update\",\"profileId\":12345,\"op\":\"setActive\",\"value\":false}",
    "<<</ACTION>>>",
    "Ops:",
    "  setActive — value: true or false",
    "  setQuery  — value: new query string",
    "  setLimit  — value: integer 5–50",
    "  delete    — no value needed (removes the profile)",
    "profileId must exactly match the id shown in the profiles list below.",
    "Do NOT delete profiles unless the user explicitly asks to delete (not just deactivate).",
    "",
    "═══ SEARCH PROFILE SUGGESTIONS ═══",
    "When proposing a NEW profile emit:",
    "<<<PROFILE>>>",
    "{\"name\":\"Short name\",\"query\":\"free-text terms\",\"sources\":[\"af\"],\"limit\":15,\"reasoning\":\"One sentence\"}",
    "<<</PROFILE>>>",
    "",
    "═══ API CAPABILITIES ═══",
    "• Arbetsförmedlingen (af) — free Swedish API, single free-text q param, no AND/OR.",
    "• JSearch (jsearch) — RapidAPI, Indeed/LinkedIn/Glassdoor, needs user's RapidAPI key.",
    "",
    "═══ CV ANALYSIS GUIDANCE ═══",
    "When asked to analyse the CV:",
    "• Identify gaps — skills or tools common in the user's target roles that are missing.",
    "• Spot weak entries — vague descriptions, missing years/level/employers.",
    "• Suggest improvements — better wording, missing achievements, underrepresented strengths.",
    "• Cross-reference with the job pipeline — highlight skills that appear in job descriptions but are absent from the CV.",
    "• Process the raw CV text and suggest new tools/skills/achievements not yet in the structured sections.",
    "",
    "═══ PIPELINE ANALYSIS GUIDANCE ═══",
    "Use the pipeline to identify patterns, mismatches, response rates, and strategic advice.",
    "The pipeline includes applied/rejected dates — use these for response rate and time-to-rejection analysis.",
    "Ground all observations in actual data. Be cautious with <10 jobs.",
    "For silent jobs (Applied 30+ days, no response), proactively suggest marking them as No response.",
    "",
    "═══ USER'S CV & PREFERENCES ═══",
    cvBlock,
    "",
    "═══ USER'S SEARCH PROFILES ═══",
    existing,
    "",
    "═══ USER'S JOB PIPELINE ═══",
    pipelineBlock,
  ].join("\n");
}

// ─── Extract <<<PROFILE>>> blocks ─────────────────────────────────────────────
function extractProfiles(reply){
  var re=/<<<PROFILE>>>([\s\S]*?)<<<\/PROFILE>>>/g;
  var profiles=[];
  var m;
  while((m=re.exec(reply))!==null){
    try{
      var raw=m[1].trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
      var obj=JSON.parse(raw);
      if(obj&&typeof obj.name==="string"&&typeof obj.query==="string"){
        profiles.push({
          name:obj.name.slice(0,80),
          query:obj.query.slice(0,300),
          sources:Array.isArray(obj.sources)&&obj.sources.length?obj.sources.filter(function(s){return s==="af"||s==="jsearch";}):[  "af"],
          limit:Math.max(1,Math.min(50,parseInt(obj.limit,10)||15)),
          reasoning:typeof obj.reasoning==="string"?obj.reasoning.slice(0,300):"",
        });
      }
    }catch(e){}
  }
  return profiles;
}

// ─── Parse reply into ordered segments ───────────────────────────────────────
function parseReplySegments(reply){
  var profileRe=/<<<PROFILE>>>([\s\S]*?)<<<\/PROFILE>>>/g;
  var actionRe=/<<<ACTION>>>([\s\S]*?)<<<\/ACTION>>>/g;
  var blocks=[];
  var r;
  profileRe.lastIndex=0;
  while((r=profileRe.exec(reply))!==null) blocks.push({index:r.index,end:profileRe.lastIndex,type:"profile",raw:r[1]});
  actionRe.lastIndex=0;
  while((r=actionRe.exec(reply))!==null) blocks.push({index:r.index,end:actionRe.lastIndex,type:"action",raw:r[1]});
  blocks.sort(function(a,b){return a.index-b.index;});

  var segments=[];
  var lastIndex=0;
  blocks.forEach(function(b){
    var before=reply.slice(lastIndex,b.index).trim();
    if(before) segments.push({type:"text",value:before});
    try{
      var raw=b.raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
      var obj=JSON.parse(raw);
      if(b.type==="profile"&&obj.name&&obj.query){
        segments.push({type:"profile",value:{
          name:obj.name.slice(0,80),query:obj.query.slice(0,300),
          sources:Array.isArray(obj.sources)&&obj.sources.length?obj.sources.filter(function(s){return s==="af"||s==="jsearch";}):[  "af"],
          limit:Math.max(1,Math.min(50,parseInt(obj.limit,10)||15)),
          reasoning:typeof obj.reasoning==="string"?obj.reasoning.slice(0,300):"",
        }});
      } else if(b.type==="action"&&obj.type){
        segments.push({type:"action",value:obj});
      }
    }catch(e){
      segments.push({type:"text",value:"[Could not parse a suggestion — try asking again]"});
    }
    lastIndex=b.end;
  });

  var tail=reply.slice(lastIndex).trim();
  if(tail) segments.push({type:"text",value:tail});
  if(!segments.length) segments.push({type:"text",value:reply.trim()});
  return segments;
}

// ─── Starter prompts ──────────────────────────────────────────────────────────
function getStarterPrompts(cv,jobs){
  var activeJobs=(jobs||[]).filter(function(j){return !j.archived;});
  var scoredCount=activeJobs.filter(function(j){return j.scored!==false&&typeof j.score==="number";}).length;
  var interviewCount=activeJobs.filter(function(j){return j.status==="Interview"||j.status==="Offer";}).length;
  var rejectedCount=activeJobs.filter(function(j){return j.status==="Rejected";}).length;
  var now=Date.now();
  var silentCount=activeJobs.filter(function(j){
    if(j.status!=="Applied") return false;
    var ref=j.appliedAt||j.date;
    return ref&&(now-new Date(ref).getTime())>30*24*60*60*1000;
  }).length;
  var lowestScored=scoredCount>=5?activeJobs.filter(function(j){return j.scored!==false&&typeof j.score==="number";}).sort(function(a,b){return a.score-b.score;})[0]:null;
  var hasStructured=!!(cv&&((cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length)));

  if(!hasCv(cv)){
    return [
      "I'd like help building my first search profile.",
      "What kinds of job searches can this app do?",
      "How should I structure my CV to get better match scores?",
      "What can you help me with?",
    ];
  }
  var prompts=[];
  // Context-aware: most urgent/actionable first
  if(silentCount>0) prompts.push("I have "+silentCount+" application"+(silentCount>1?"s":"")+" with no response for 30+ days — what should I do?");
  if(hasStructured) prompts.push("Review my CV sections and add anything important that's missing.");
  if(scoredCount>=10) prompts.push("Suggest a new profile based on my highest-scoring jobs.");
  if(lowestScored) prompts.push("Why is my match score low for "+lowestScored.title+" at "+lowestScored.company+"?");
  if(interviewCount>=2) prompts.push("What do my Interview-stage jobs have in common?");
  else if(interviewCount===1) prompts.push("What stands out about the job I reached Interview for?");
  if(rejectedCount>=3) prompts.push("Are there patterns in the jobs I've been rejected from?");
  if(activeJobs.length>0) prompts.push("Update a job status or add a note for me.");
  if(hasStructured) prompts.push("What skills or tools am I missing for my target roles?");
  prompts.push("Help me build a search profile from my CV.");
  return prompts.slice(0,4);
}

// ─── ActionCard ───────────────────────────────────────────────────────────────
function ActionCard({action,onAccept,onReject,accepted,rejected}){
  var a=action;

  // Determine label and colours based on action type
  var typeLabel="";
  var opLabel=a.op==="add"?"Add":a.op==="edit"?"Edit":a.op==="delete"?"Delete":
    a.op==="setStatus"?"Set status":a.op==="setNotes"?"Set notes":
    a.op==="appendNote"?"Add note":a.op==="setActive"?"Toggle":
    a.op==="setQuery"?"Edit query":a.op==="setLimit"?"Edit limit":"Update";
  var opColor=C.success;
  var opBg=C.successBg;

  if(a.type==="cv_edit"){
    typeLabel=a.section==="tools"?"CV Tool":a.section==="skills"?"CV Skill":"CV Achievement";
    opColor=a.op==="delete"?C.error:a.op==="edit"?C.warning:C.success;
    opBg=a.op==="delete"?C.errorBg:a.op==="edit"?C.warningBg:C.successBg;
  } else if(a.type==="cv_pref"){
    typeLabel="CV Preference";
    opColor=C.info; opBg=C.infoBg;
  } else if(a.type==="job_update"){
    typeLabel="Job";
    opColor=a.op==="setStatus"?C.primary:C.info;
    opBg=a.op==="setStatus"?C.primaryLight:C.infoBg;
  } else if(a.type==="profile_update"){
    typeLabel="Search Profile";
    opColor=a.op==="delete"?C.error:C.warning;
    opBg=a.op==="delete"?C.errorBg:C.warningBg;
  }

  // Build summary text
  var summary="";
  if(a.type==="cv_edit"){
    if(a.section==="achievements"){
      summary=(a.item.description||"").slice(0,120)+(a.item.employer?" — "+a.item.employer:"")+(a.item.year?" ("+a.item.year+")":"");
    } else {
      summary=(a.item.name||"")+(a.item.years?" · "+a.item.years+" yr":"")+(a.item.level?" · "+a.item.level:"")+(a.item.employers?" · "+a.item.employers:"");
    }
  } else if(a.type==="cv_pref"){
    summary=(a.field||"")+" → "+(typeof a.value==="string"?a.value.slice(0,100):String(a.value));
  } else if(a.type==="job_update"){
    summary="Job #"+a.jobId+" → "+(typeof a.value==="string"?a.value.slice(0,120):String(a.value||""));
  } else if(a.type==="profile_update"){
    summary="Profile #"+a.profileId+" → "+(a.op==="delete"?"DELETE":typeof a.value!=="undefined"?String(a.value).slice(0,80):"");
  }

  if(accepted){
    return <div style={{border:"1.5px solid "+C.success,borderRadius:12,padding:"12px 14px",background:C.successBg,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>✓</span>
      <span style={{fontSize:13,color:C.success,fontWeight:600}}>{opLabel} {typeLabel}: {summary.slice(0,80)} — applied</span>
    </div>;
  }
  if(rejected){
    return <div style={{border:"1.5px solid "+C.border,borderRadius:12,padding:"12px 14px",background:C.surfaceAlt,display:"flex",alignItems:"center",gap:10,opacity:0.5}}>
      <span style={{fontSize:13,color:C.textHint}}>Skipped: {opLabel} {typeLabel}</span>
    </div>;
  }

  return <div style={{border:"2px solid "+opColor,borderRadius:12,padding:"14px 16px",background:opBg}}>
    <div style={{fontSize:11,fontWeight:700,color:opColor,letterSpacing:"0.5px",marginBottom:8}}>
      {opLabel.toUpperCase()} {typeLabel.toUpperCase()}
    </div>
    <div style={{fontSize:14,fontWeight:600,color:C.textPrimary,marginBottom:10,lineHeight:1.45}}>{summary||"(no details)"}</div>
    <div style={{display:"flex",gap:8}}>
      <Btn variant="primary" onClick={onAccept} style={{fontSize:13,padding:"7px 16px"}}>✓ Apply</Btn>
      <Btn onClick={onReject} style={{fontSize:13,padding:"7px 14px"}}>Skip</Btn>
    </div>
  </div>;
}

// ─── ProfileCard ──────────────────────────────────────────────────────────────
function ProfileCard({profile,alreadySaved,justSaved,onSave,onRun}){
  var p=profile;
  var srcLabels=p.sources.map(function(s){return s==="af"?"Arbetsförmedlingen":"JSearch";}).join(" + ");
  return <div style={{border:"2px solid "+C.primary,borderRadius:12,padding:"14px 16px",background:C.primaryLight}}>
    <div style={{fontSize:11,fontWeight:700,color:C.primary,letterSpacing:"0.5px",marginBottom:6}}>SUGGESTED PROFILE</div>
    <div style={{fontSize:15,fontWeight:700,color:C.textPrimary,marginBottom:4}}>{p.name}</div>
    <div style={{fontSize:13,color:C.textSecondary,marginBottom:8}}>Query: <span style={{fontFamily:"monospace",background:"#fff",padding:"1px 6px",borderRadius:4}}>{p.query}</span></div>
    <div style={{fontSize:12,color:C.textSecondary,marginBottom:p.reasoning?8:12}}>{srcLabels} · max {p.limit} results</div>
    {p.reasoning&&<div style={{fontSize:12,color:C.textHint,fontStyle:"italic",marginBottom:12}}>💡 {p.reasoning}</div>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {!alreadySaved&&!justSaved&&<Btn variant="primary" onClick={onSave} style={{fontSize:13,padding:"7px 14px"}}>+ Save this profile</Btn>}
      {(alreadySaved||justSaved)&&<div style={{fontSize:13,color:C.success,fontWeight:600,padding:"7px 0"}}>✓ Saved</div>}
      {justSaved&&<Btn onClick={onRun} style={{fontSize:13,padding:"7px 14px"}}>▶ Run now</Btn>}
    </div>
  </div>;
}

// ─── Gabbi (ProfileAssistant) ─────────────────────────────────────────────────
function ProfileAssistant({cv,setCv,jobs,setJobs,profiles,setProfiles,anthropicKey,conversation,setConversation,setActiveTab,setPendingProfileRun}){
  var [input,setInput]=useState("");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [justSavedId,setJustSavedId]=useState(null);
  var [actionStates,setActionStates]=useState({});
  var scrollRef=useRef(null);

  useEffect(function(){
    if(scrollRef.current){ scrollRef.current.scrollTop=scrollRef.current.scrollHeight; }
  },[conversation,loading]);

  var starters=getStarterPrompts(cv,jobs);

  async function send(userText){
    var text=(userText||input).trim();
    if(!text||loading) return;
    if(!anthropicKey){ setError("Add your Anthropic API key in Search Profiles → API keys first."); return; }
    setError("");
    setInput("");
    var newMsgs=conversation.concat([{role:"user",content:text}]);
    setConversation(newMsgs);
    setLoading(true);
    try{
      var reply=await callClaudeChat({
        apiKey:anthropicKey,
        system:buildAssistantSystem(cv,profiles,jobs),
        messages:newMsgs,
        maxTokens:1600,
      });
      setConversation(newMsgs.concat([{role:"assistant",content:reply}]));
    }catch(e){
      setError(e.message||"Failed to reach Claude.");
      setConversation(conversation);
      setInput(text);
    }
    setLoading(false);
  }

  function clearConversation(){
    if(!confirm("Clear this conversation? This cannot be undone.")) return;
    setConversation([]);
    setError("");
    setInput("");
    setActionStates({});
  }

  // ── Profile save/run ─────────────────────────────────────────────────────
  function saveProfile(prof){
    var newProfile={id:Date.now(),name:prof.name,query:prof.query,limit:prof.limit,sources:prof.sources,active:true};
    setProfiles(function(prev){return prev.concat([newProfile]);});
    setJustSavedId(newProfile.id);
  }
  function runNow(profileId){
    setPendingProfileRun(profileId);
    setActiveTab("profiles");
  }

  // ── Apply an action block ─────────────────────────────────────────────────
  function applyAction(action){
    // ── cv_edit ──────────────────────────────────────────────────────────────
    if(action.type==="cv_edit"){
      var sec=action.section;
      var op=action.op;
      var item=action.item;
      setCv(function(prev){
        var list=(prev[sec]||[]).slice();
        if(sec==="achievements"){
          if(op==="add"){
            list=list.concat([Object.assign({id:Date.now()},item)]);
          } else if(op==="edit"){
            var md=(item.description||"").toLowerCase().slice(0,60);
            list=list.map(function(x){return x.description&&x.description.toLowerCase().includes(md)?Object.assign({},x,item):x;});
          } else if(op==="delete"){
            var md2=(item.description||"").toLowerCase().slice(0,60);
            list=list.filter(function(x){return !(x.description&&x.description.toLowerCase().includes(md2));});
          }
        } else {
          if(op==="add"){
            var exists=list.some(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase();});
            if(!exists) list=list.concat([Object.assign({id:Date.now()},item)]);
          } else if(op==="edit"){
            list=list.map(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase()?Object.assign({},x,item):x;});
          } else if(op==="delete"){
            list=list.filter(function(x){return !(x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase());});
          }
        }
        return Object.assign({},prev,{[sec]:list});
      });
    }

    // ── cv_pref ──────────────────────────────────────────────────────────────
    else if(action.type==="cv_pref"){
      var allowed=["roles","industries","locations","salary","workType"];
      if(allowed.indexOf(action.field)===-1) return;
      setCv(function(prev){
        var patch={};
        patch[action.field]=action.value;
        return Object.assign({},prev,patch);
      });
    }

    // ── job_update ───────────────────────────────────────────────────────────
    else if(action.type==="job_update"&&setJobs){
      var jid=String(action.jobId);
      setJobs(function(prev){
        return prev.map(function(j){
          if(String(j.id)!==jid) return j;
          var patch={};
          if(action.op==="setStatus"){
            patch.status=action.value;
            if(action.value==="Applied"&&!j.appliedAt) patch.appliedAt=new Date().toISOString();
            if(action.value==="Rejected"&&!j.rejectedAt) patch.rejectedAt=new Date().toISOString();
          } else if(action.op==="setNotes"){
            patch.notes=String(action.value||"");
          } else if(action.op==="appendNote"){
            patch.notes=((j.notes||"").trim()+(j.notes?"\n":"")+String(action.value||"")).trim();
          }
          return Object.assign({},j,patch);
        });
      });
    }

    // ── profile_update ───────────────────────────────────────────────────────
    else if(action.type==="profile_update"&&setProfiles){
      var pid=action.profileId;
      if(action.op==="delete"){
        setProfiles(function(prev){return prev.filter(function(p){return p.id!==pid;});});
      } else {
        setProfiles(function(prev){
          return prev.map(function(p){
            if(p.id!==pid) return p;
            var patch={};
            if(action.op==="setActive") patch.active=!!action.value;
            else if(action.op==="setQuery") patch.query=String(action.value||"").slice(0,300);
            else if(action.op==="setLimit") patch.limit=Math.max(1,Math.min(50,parseInt(action.value,10)||15));
            return Object.assign({},p,patch);
          });
        });
      }
    }
  }

  function handleAccept(msgIdx,actionIdx,action){
    applyAction(action);
    setActionStates(function(prev){return Object.assign({},prev,{[msgIdx+":"+actionIdx]:"accepted"});});
  }
  function handleReject(msgIdx,actionIdx){
    setActionStates(function(prev){return Object.assign({},prev,{[msgIdx+":"+actionIdx]:"rejected"});});
  }

  // ── Markdown renderer ────────────────────────────────────────────────────
  function renderMarkdown(text){
    if(!text) return null;
    var paragraphs=text.split(/\n{2,}/);
    return paragraphs.map(function(para,pi){
      var lines=para.split("\n");
      var isList=lines.every(function(l){return !l.trim()||/^[-•*]\s/.test(l.trim());});
      if(isList){
        var items=lines.filter(function(l){return l.trim();}).map(function(l){return l.trim().replace(/^[-•*]\s+/,"");});
        return <ul key={pi} style={{margin:"4px 0 4px 18px",padding:0,listStyleType:"disc"}}>
          {items.map(function(item,ii){
            return <li key={ii} style={{fontSize:14,lineHeight:1.6,color:C.textPrimary,marginBottom:2}}>{inlineFormat(item)}</li>;
          })}
        </ul>;
      }
      return <p key={pi} style={{margin:"0 0 6px 0",fontSize:14,lineHeight:1.6,color:C.textPrimary}}>{inlineFormat(para)}</p>;
    });
  }

  function inlineFormat(str){
    var result=[];
    var re=/\*\*(.+?)\*\*|\*(.+?)\*|\x60([^\x60]+)\x60/g;
    var last=0;
    var m;
    while((m=re.exec(str))!==null){
      if(m.index>last) result.push(str.slice(last,m.index));
      if(m[1]!==undefined) result.push(<strong key={m.index} style={{fontWeight:700}}>{m[1]}</strong>);
      else if(m[2]!==undefined) result.push(<em key={m.index} style={{fontStyle:"italic"}}>{m[2]}</em>);
      else if(m[3]!==undefined) result.push(<code key={m.index} style={{fontFamily:"monospace",fontSize:13,background:C.surfaceAlt,padding:"1px 5px",borderRadius:4,color:C.textPrimary}}>{m[3]}</code>);
      last=m.index+m[0].length;
    }
    if(last<str.length) result.push(str.slice(last));
    return result;
  }

  // ── Render one assistant message ─────────────────────────────────────────
  function renderAssistantMessage(reply,msgIdx){
    var segments=parseReplySegments(reply);
    var actionCounter=0;
    return segments.map(function(seg,i){
      if(seg.type==="text"){
        return <div key={i} style={{lineHeight:1.55,fontSize:14,color:C.textPrimary}}>{renderMarkdown(seg.value)}</div>;
      }
      if(seg.type==="profile"){
        var p=seg.value;
        var alreadySaved=profiles.some(function(sp){return sp.name===p.name&&sp.query===p.query;});
        var savedObj=justSavedId?profiles.find(function(sp){return sp.id===justSavedId;}):null;
        return <ProfileCard key={i} profile={p}
          alreadySaved={alreadySaved}
          justSaved={savedObj&&savedObj.name===p.name}
          onSave={function(){saveProfile(p);}}
          onRun={function(){if(justSavedId) runNow(justSavedId);}} />;
      }
      if(seg.type==="action"){
        var ai=actionCounter++;
        var key=msgIdx+":"+ai;
        var state=actionStates[key];
        return <ActionCard key={i} action={seg.value}
          accepted={state==="accepted"}
          rejected={state==="rejected"}
          onAccept={function(){handleAccept(msgIdx,ai,seg.value);}}
          onReject={function(){handleReject(msgIdx,ai);}} />;
      }
      return null;
    });
  }

  var hasStructured=!!(cv&&((cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length)));

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <SectionTitle action={conversation.length>0?<Btn onClick={clearConversation} style={{fontSize:12,padding:"6px 12px"}}>Clear</Btn>:null}>Gabbi — AI Assistant</SectionTitle>
      <div style={{fontSize:13,color:C.textHint,marginBottom:14,lineHeight:1.6}}>
        Gabbi can analyse your CV, discuss your pipeline, manage your search profiles, and update job statuses or notes — all after you confirm.
      </div>
      {!anthropicKey&&<Alert type="warning">Add your Anthropic API key in Search Profiles → API keys to use Gabbi.</Alert>}
      {!hasCv(cv)&&anthropicKey&&<Alert type="info">Tip: add your CV in My CV so Gabbi can tailor suggestions to your background.</Alert>}
      {hasCv(cv)&&!hasStructured&&anthropicKey&&<Alert type="info">Tip: populate the Tools, Skills and Achievements sections in My CV for richer analysis.</Alert>}
    </Card>

    <Card>
      <div ref={scrollRef} style={{maxHeight:"60vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingRight:4}}>
        {conversation.length===0&&<div>
          <div style={{fontSize:14,color:C.textSecondary,marginBottom:12,lineHeight:1.6}}>
            Hi! I'm Gabbi. I can analyse your CV, suggest improvements, help you build search profiles, discuss your pipeline, or update job statuses and notes. What would you like to work on?
          </div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>TRY ONE OF THESE:</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {starters.map(function(s,i){
              var isSmart=s.indexOf("30+ days")>=0||s.indexOf("Review my CV")>=0||s.indexOf("highest-scoring")>=0||s.indexOf("missing")>=0;
              return <button key={i} onClick={function(){send(s);}} disabled={loading||!anthropicKey}
                style={{textAlign:"left",padding:"12px 14px",borderRadius:10,
                  border:"1.5px solid "+(isSmart?C.primary:C.border),
                  background:isSmart?C.primaryLight:C.surfaceAlt,
                  color:C.textPrimary,fontSize:13,cursor:loading||!anthropicKey?"not-allowed":"pointer",
                  opacity:loading||!anthropicKey?0.5:1,fontWeight:isSmart?600:400}}>
                {isSmart?"✨":"💬"} {s}
              </button>;
            })}
          </div>
        </div>}

        {conversation.map(function(msg,i){
          if(msg.role==="user"){
            return <div key={i} style={{alignSelf:"flex-end",maxWidth:"85%",background:C.primary,color:"#fff",padding:"10px 14px",borderRadius:"14px 14px 2px 14px",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{msg.content}</div>;
          }
          return <div key={i} style={{alignSelf:"flex-start",maxWidth:"95%",width:"95%"}}>
            <div style={{fontSize:11,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:4}}>GABBI</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>{renderAssistantMessage(msg.content,i)}</div>
          </div>;
        })}
        {loading&&<div style={{alignSelf:"flex-start",fontSize:13,color:C.textHint,fontStyle:"italic"}}>Gabbi is thinking…</div>}
      </div>

      {error&&<Alert type="error">{error}</Alert>}

      <div style={{display:"flex",gap:8,marginTop:14}}>
        <Inp value={input} onChange={function(e){setInput(e.target.value);}}
          onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey&&input.trim()&&!loading&&anthropicKey){e.preventDefault();send();}}}
          enterKeyHint="send"
          placeholder="Ask Gabbi anything about your search, CV or pipeline…"
          style={{flex:1}} />
        <Btn variant="primary" onClick={function(){send();}} disabled={loading||!input.trim()||!anthropicKey} style={{padding:"10px 20px"}}>Send</Btn>
      </div>
    </Card>
  </div>;
}

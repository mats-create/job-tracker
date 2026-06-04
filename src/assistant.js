// assistant.js
// Rev: 2026-06-04 — Gabbi rename; CV write-back (tools/skills/achievements);
//                   <<<ACTION>>> protocol with confirmation cards;
//                   CV edit starter prompt added.

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
      lines.push("• "+score+" — "+j.title+" @ "+j.company+loc+emp+tags+rat+desc);
    });
  });
  return "Total jobs: "+jobs.length+" ("+Object.keys(groups).map(function(k){return k+": "+groups[k].length;}).join(", ")+")\n"+lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildAssistantSystem(cv,profiles,jobs){
  var cvBlock=hasCv(cv)?cvSummaryText(cv):"(No CV loaded yet — ask the user to add their CV in the My CV tab.)";
  var existing=(profiles||[]).length
    ? profiles.map(function(p){return "- \""+p.name+"\" · query: "+p.query+" · sources: "+(p.sources||[]).join("+")+" · max "+p.limit;}).join("\n")
    : "(No profiles saved yet.)";
  var pipelineBlock=jobsSummaryText(jobs||[]);

  return [
    "You are Gabbi, an AI assistant embedded in a personal job-tracking app.",
    "Your personality: warm, direct, practically helpful. You use the user's first name if you know it.",
    "",
    "STRICT SCOPE — you ONLY discuss:",
    "  (a) How this app's features work.",
    "  (b) Helping the user design high-quality search profiles.",
    "  (c) What the connected APIs (Arbetsförmedlingen, JSearch) can do.",
    "  (d) Analysing the user's job pipeline — patterns, matches, strategic advice.",
    "  (e) Analysing and improving the user's CV sections (tools, skills, achievements, preferences).",
    "  (f) Proposing and applying edits to CV tools, skills and achievements when asked.",
    "",
    "Off-topic requests: decline in one sentence, redirect to job-search topics.",
    "",
    "TONE: friendly, concise, practical. One clarifying question at a time max.",
    "",
    "═══ CV ANALYSIS & EDITING ═══",
    "You have full access to the user's CV text, tools, skills and achievements below.",
    "When asked to analyse the CV you can:",
    "• Identify gaps — skills or tools common in the user's target roles that are missing.",
    "• Spot weak entries — vague descriptions, missing years/level/employers.",
    "• Suggest improvements — better wording, missing achievements, underrepresented strengths.",
    "• Cross-reference with the job pipeline — highlight skills that appear in job descriptions but are absent from the CV.",
    "• Process the raw CV text and suggest new tools/skills/achievements not yet in the structured sections.",
    "",
    "WHEN THE USER CONFIRMS they want changes applied, emit them as <<<ACTION>>> blocks (see below).",
    "Always show a brief summary of what you'll change and ask for confirmation BEFORE emitting action blocks.",
    "Never emit action blocks unless the user has explicitly confirmed.",
    "",
    "═══ ACTION PROTOCOL ═══",
    "To add or edit CV entries emit one block per change, exactly like this:",
    "<<<ACTION>>>",
    "{\"type\":\"cv_edit\",\"section\":\"tools\",\"op\":\"add\",\"item\":{\"name\":\"Notion\",\"years\":2,\"level\":\"Intermediate\",\"employers\":\"\"}}",
    "<<</ACTION>>>",
    "",
    "Supported sections: \"tools\", \"skills\", \"achievements\"",
    "Supported ops:",
    "  add    — adds a new entry (item must have all required fields)",
    "  edit   — edits an existing entry matched by name (for tools/skills) or description substring (for achievements). Include only fields to change plus the match key.",
    "  delete — deletes by name (tools/skills) or description substring (achievements). Item needs only the match key.",
    "",
    "Tool/Skill item fields: name (string), years (number), level (one of: "+["Beginner","Intermediate","Advanced","Expert"].join("|")+"), employers (string)",
    "Achievement item fields: description (string), employer (string), year (string)",
    "",
    "You may emit multiple action blocks in one reply.",
    "Do NOT use markdown code fences around action blocks.",
    "Do NOT invent fields beyond those listed above.",
    "",
    "═══ SEARCH PROFILE PROTOCOL ═══",
    "When proposing a search profile emit:",
    "<<<PROFILE>>>",
    "{\"name\":\"Short name\",\"query\":\"free-text terms\",\"sources\":[\"af\"],\"limit\":15,\"reasoning\":\"One sentence\"}",
    "<<</PROFILE>>>",
    "",
    "═══ API CAPABILITIES ═══",
    "• Arbetsförmedlingen (af) — free Swedish API, single free-text q param, no AND/OR.",
    "• JSearch (jsearch) — RapidAPI, Indeed/LinkedIn/Glassdoor, needs user's RapidAPI key.",
    "",
    "═══ PIPELINE ANALYSIS GUIDANCE ═══",
    "Use the pipeline to identify patterns, mismatches, response rates, and strategic advice.",
    "Ground all observations in actual data. Be cautious with <10 jobs.",
    "",
    "═══ USER'S CV & PREFERENCES ═══",
    cvBlock,
    "",
    "═══ USER'S SEARCH PROFILES ═══",
    existing,
    "",
    "═══ USER'S JOB PIPELINE (read-only) ═══",
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

// ─── Extract <<<ACTION>>> blocks ──────────────────────────────────────────────
function extractActions(reply){
  var re=/<<<ACTION>>>([\s\S]*?)<<<\/ACTION>>>/g;
  var actions=[];
  var m;
  while((m=re.exec(reply))!==null){
    try{
      var raw=m[1].trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
      var obj=JSON.parse(raw);
      if(obj&&obj.type==="cv_edit"&&obj.section&&obj.op&&obj.item){
        actions.push(obj);
      }
    }catch(e){}
  }
  return actions;
}

// ─── Parse reply into ordered segments ───────────────────────────────────────
function parseReplySegments(reply){
  var allBlockRe=/<<<(?:PROFILE|ACTION)>>>[\s\S]*?<<<\/(?:PROFILE|ACTION)>>>/g;
  var segments=[];
  var lastIndex=0;
  var m;
  var profileRe=/<<<PROFILE>>>([\s\S]*?)<<<\/PROFILE>>>/g;
  var actionRe=/<<<ACTION>>>([\s\S]*?)<<<\/ACTION>>>/g;

  // Collect all block positions with type
  var blocks=[];
  var r;
  profileRe.lastIndex=0;
  while((r=profileRe.exec(reply))!==null) blocks.push({index:r.index,end:profileRe.lastIndex,type:"profile",raw:r[1]});
  actionRe.lastIndex=0;
  while((r=actionRe.exec(reply))!==null) blocks.push({index:r.index,end:actionRe.lastIndex,type:"action",raw:r[1]});
  blocks.sort(function(a,b){return a.index-b.index;});

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
      } else if(b.type==="action"&&obj.type==="cv_edit"&&obj.section&&obj.op&&obj.item){
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
  var scoredCount=(jobs||[]).filter(function(j){return j.scored!==false&&!j.archived&&typeof j.score==="number";}).length;
  var interviewCount=(jobs||[]).filter(function(j){return j.status==="Interview"||j.status==="Offer";}).length;
  var rejectedCount=(jobs||[]).filter(function(j){return j.status==="Rejected";}).length;
  var hasStructured=!!(cv&&((cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length)));

  if(!hasCv(cv)){
    return [
      "I'd like help building my first search profile.",
      "What kinds of job searches can this app do?",
      "How should I structure my CV to get better match scores?",
    ];
  }
  var prompts=[];
  if(hasStructured) prompts.push("Review my CV sections and add anything important that's missing.");
  if(scoredCount>=10) prompts.push("Suggest a new profile based on my highest-scoring jobs.");
  if(hasStructured) prompts.push("What skills or tools am I missing for my target roles?");
  if(interviewCount>=2) prompts.push("What do my Interview-stage jobs have in common?");
  else if(interviewCount===1) prompts.push("What stands out about the job I reached Interview for?");
  if(rejectedCount>=3) prompts.push("Are there patterns in the jobs I've been rejected from?");
  prompts.push("Help me build a search profile from my CV.");
  return prompts.slice(0,4);
}

// ─── ActionCard — confirmation UI for cv_edit actions ────────────────────────
function ActionCard({action,onAccept,onReject,accepted,rejected}){
  var a=action;
  var sectionLabel=a.section==="tools"?"Tool":a.section==="skills"?"Skill":"Achievement";
  var opLabel=a.op==="add"?"Add":a.op==="edit"?"Edit":"Delete";
  var opColor=a.op==="delete"?C.error:a.op==="edit"?C.warning:C.success;
  var opBg=a.op==="delete"?C.errorBg:a.op==="edit"?C.warningBg:C.successBg;

  var itemSummary="";
  if(a.section==="achievements"){
    itemSummary=(a.item.description||"").slice(0,120)+(a.item.employer?" — "+a.item.employer:"")+(a.item.year?" ("+a.item.year+")":"");
  } else {
    itemSummary=(a.item.name||"")+(a.item.years?" · "+a.item.years+" yr":"")+(a.item.level?" · "+a.item.level:"")+(a.item.employers?" · "+a.item.employers:"");
  }

  if(accepted){
    return <div style={{border:"1.5px solid "+C.success,borderRadius:12,padding:"12px 14px",background:C.successBg,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>✓</span>
      <span style={{fontSize:13,color:C.success,fontWeight:600}}>{opLabel} {sectionLabel}: {(a.item.name||a.item.description||"").slice(0,60)} — applied</span>
    </div>;
  }
  if(rejected){
    return <div style={{border:"1.5px solid "+C.border,borderRadius:12,padding:"12px 14px",background:C.surfaceAlt,display:"flex",alignItems:"center",gap:10,opacity:0.5}}>
      <span style={{fontSize:13,color:C.textHint}}>Skipped: {opLabel} {sectionLabel}</span>
    </div>;
  }

  return <div style={{border:"2px solid "+opColor,borderRadius:12,padding:"14px 16px",background:opBg}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <span style={{fontSize:11,fontWeight:700,color:opColor,letterSpacing:"0.5px"}}>{opLabel.toUpperCase()} {sectionLabel.toUpperCase()}</span>
    </div>
    <div style={{fontSize:14,fontWeight:600,color:C.textPrimary,marginBottom:10,lineHeight:1.45}}>{itemSummary||"(no details)"}</div>
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
function ProfileAssistant({cv,setCv,profiles,setProfiles,anthropicKey,conversation,setConversation,setActiveTab,setPendingProfileRun,jobs}){
  var [input,setInput]=useState("");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [justSavedId,setJustSavedId]=useState(null);
  // Track accept/reject state per action: key = msgIdx+":"+actionIdx
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

  // ── Profile save/run ──────────────────────────────────────────────────────
  function saveProfile(prof){
    var newProfile={id:Date.now(),name:prof.name,query:prof.query,limit:prof.limit,sources:prof.sources,active:true};
    setProfiles(function(prev){return prev.concat([newProfile]);});
    setJustSavedId(newProfile.id);
  }
  function runNow(profileId){
    setPendingProfileRun(profileId);
    setActiveTab("profiles");
  }

  // ── CV action apply ───────────────────────────────────────────────────────
  function applyAction(action){
    var sec=action.section; // "tools"|"skills"|"achievements"
    var op=action.op;
    var item=action.item;

    setCv(function(prev){
      var list=(prev[sec]||[]).slice();

      if(sec==="achievements"){
        if(op==="add"){
          list=list.concat([Object.assign({id:Date.now()},item)]);
        } else if(op==="edit"){
          var matchDesc=(item.description||"").toLowerCase().slice(0,60);
          list=list.map(function(x){
            if(x.description&&x.description.toLowerCase().includes(matchDesc)){
              return Object.assign({},x,item);
            }
            return x;
          });
        } else if(op==="delete"){
          var matchDesc2=(item.description||"").toLowerCase().slice(0,60);
          list=list.filter(function(x){
            return !(x.description&&x.description.toLowerCase().includes(matchDesc2));
          });
        }
      } else {
        // tools or skills — match by name
        if(op==="add"){
          // avoid exact duplicates
          var exists=list.some(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase();});
          if(!exists) list=list.concat([Object.assign({id:Date.now()},item)]);
        } else if(op==="edit"){
          list=list.map(function(x){
            if(x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase()){
              return Object.assign({},x,item);
            }
            return x;
          });
        } else if(op==="delete"){
          list=list.filter(function(x){
            return !(x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase());
          });
        }
      }

      return Object.assign({},prev,{[sec]:list});
    });
  }

  function handleAccept(msgIdx,actionIdx,action){
    var key=msgIdx+":"+actionIdx;
    applyAction(action);
    setActionStates(function(prev){return Object.assign({},prev,{[key]:"accepted"});});
  }
  function handleReject(msgIdx,actionIdx){
    var key=msgIdx+":"+actionIdx;
    setActionStates(function(prev){return Object.assign({},prev,{[key]:"rejected"});});
  }

  // ── Markdown renderer ─────────────────────────────────────────────────────
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

  // ── Render one assistant message ──────────────────────────────────────────
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
      <div style={{fontSize:13,color:C.textHint,marginBottom:14,lineHeight:1.6}}>Gabbi helps you design search profiles, analyse your pipeline, and improve your CV sections. She can add, edit or delete tools, skills and achievements after you confirm.</div>
      {!anthropicKey&&<Alert type="warning">Add your Anthropic API key in Search Profiles → API keys to use Gabbi.</Alert>}
      {!hasCv(cv)&&anthropicKey&&<Alert type="info">Tip: add your CV in My CV so Gabbi can tailor suggestions to your background.</Alert>}
      {hasCv(cv)&&!hasStructured&&anthropicKey&&<Alert type="info">Tip: populate the Tools, Skills and Achievements sections in My CV for richer analysis.</Alert>}
    </Card>

    <Card>
      <div ref={scrollRef} style={{maxHeight:"60vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingRight:4}}>
        {conversation.length===0&&<div>
          <div style={{fontSize:14,color:C.textSecondary,marginBottom:12,lineHeight:1.6}}>
            Hi! I'm Gabbi. I can analyse your CV, suggest improvements, help you build search profiles, or discuss your job pipeline. What would you like to work on?
          </div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>TRY ONE OF THESE:</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {starters.map(function(s,i){
              var isSmart=s.indexOf("highest-scoring")>=0||s.indexOf("Analyse")>=0||s.indexOf("missing")>=0;
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
          placeholder="Ask Gabbi anything about your search or CV…"
          style={{flex:1}} />
        <Btn variant="primary" onClick={function(){send();}} disabled={loading||!input.trim()||!anthropicKey} style={{padding:"10px 20px"}}>Send</Btn>
      </div>
    </Card>
  </div>;
}

// ─── Profile Assistant helpers ────────────────────────────────────────────────
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

function buildAssistantSystem(cv,profiles,jobs){
  var cvBlock=hasCv(cv)?cvSummaryText(cv):"(No CV loaded yet. Ask the user to add their CV in the My CV tab before proposing profiles.)";
  var existing=(profiles||[]).length
    ? profiles.map(function(p){return "- \""+p.name+"\" · query: "+p.query+" · sources: "+(p.sources||[]).join("+")+" · max "+p.limit;}).join("\n")
    : "(No profiles saved yet.)";
  var pipelineBlock=jobsSummaryText(jobs||[]);

  return [
    "You are the Profile Assistant embedded in a personal job-tracking app.",
    "",
    "STRICT SCOPE — you ONLY discuss these topics:",
    "  (a) How this app's features work (Dashboard, My Jobs, Search Profiles, Scheduler, My CV, Cover Letters, Reports).",
    "  (b) Helping the user design high-quality search profiles based on their CV and preferences.",
    "  (c) What the connected job-search APIs (Arbetsförmedlingen, JSearch) can and cannot do.",
    "  (d) Analysing and discussing the user's job pipeline — patterns across statuses, commonalities in roles they reached Interview for, reasons for rejections, quality of matches, strategic advice based on their actual job data.",
    "",
    "If the user asks about ANYTHING else (general knowledge, coding, personal advice, other products, news, math, trivia, etc.),",
    "politely decline in one sentence and redirect: \"I'm only able to help with building search profiles and using this job tracker. What kind of role are you looking for?\"",
    "Do not answer off-topic questions even partially.",
    "",
    "TONE: friendly, concise, practical. Ask at most one clarifying question at a time. Never dump long explanations.",
    "",
    "API CAPABILITIES (what you can and can't suggest):",
    "• Arbetsförmedlingen (code: 'af') — Free Swedish Public Employment Service API. Good for Swedish jobs including Swedish-language roles. Accepts a single free-text query 'q' parameter. Does NOT support boolean AND/OR operators or nested expressions. Results are filtered only by the 'q' free-text and a 'limit'. The user query should read naturally, e.g. 'UX designer Stockholm' or 'produktdesigner remote'.",
    "• JSearch (code: 'jsearch') — RapidAPI aggregator of Indeed/LinkedIn/Glassdoor/ZipRecruiter listings. Requires user's RapidAPI key. Good for English-language and international/remote roles. Accepts a single free-text 'query' parameter. Does NOT support boolean AND/OR. Can be combined in the same query string (e.g. 'senior product designer remote fintech').",
    "• No other boards are connected. Do not promise LinkedIn-direct, Monster, etc.",
    "",
    "PROFILE DESIGN GUIDANCE:",
    "• A profile has: name, query (free-text), sources (array of 'af' and/or 'jsearch'), limit (integer 5–50).",
    "• Split into multiple focused profiles rather than one broad catch-all — narrower profiles produce higher-signal matches.",
    "• Use the user's CV skills, years of experience, industries, and locations to inform the query terms.",
    "• For Swedish roles, pick 'af' and include Swedish synonyms (e.g. 'produktdesigner' alongside 'product designer').",
    "• For remote/international roles, pick 'jsearch' and use English terms.",
    "• If the user wants both, suggest two separate profiles or one profile with both sources — explain the tradeoff.",
    "",
    "PIPELINE ANALYSIS GUIDANCE:",
    "The user's full job pipeline is provided below. Use it to:",
    "• Identify patterns within any status group — e.g. what Interview-stage jobs have in common (industry, seniority, employer type, skills in description).",
    "• Spot mismatches — e.g. if Rejected jobs cluster around a specific role type or company size the user's CV doesn't fit well.",
    "• Surface patterns across statuses — e.g. compare what Interview jobs vs Rejected jobs have in common to identify where the user's profile lands well vs poorly.",
    "• Recognise 'Not relevant' patterns — if the user keeps marking certain job types as not relevant, that's signal to refine search profiles.",
    "• Flag 'Ad removed' clusters — if many ads are removed early, that may indicate timing issues (applying too late).",
    "• Use AI match scores as a calibration signal — high scores that led to Rejection vs low scores that led to Interview are worth flagging.",
    "• Always ground observations in the actual data. Don't speculate beyond what the pipeline shows.",
    "• When the pipeline is small (<10 jobs), acknowledge limited signal and be appropriately cautious about generalisations.",
    "",
    "WHEN TO PROPOSE A CONCRETE PROFILE:",
    "Only after you have enough detail about role, seniority, and location/remoteness. Ask for clarification first if needed.",
    "When you propose a profile, emit it inside a special block exactly like this (including the markers):",
    "<<<PROFILE>>>",
    "{\"name\":\"Short descriptive name\",\"query\":\"free-text search terms\",\"sources\":[\"af\"],\"limit\":15,\"reasoning\":\"One sentence on why this query\"}",
    "<<</PROFILE>>>",
    "You may propose multiple profiles in one reply — emit a separate block per profile. Keep conversational text around each block short (one or two lines of intro per profile).",
    "Do NOT use markdown code fences around the PROFILE block. Do NOT invent fields beyond name/query/sources/limit/reasoning.",
    "",
    "THE USER'S CV AND PREFERENCES:",
    cvBlock,
    "",
    "THE USER'S EXISTING SEARCH PROFILES:",
    existing,
    "",
    "THE USER'S FULL JOB PIPELINE (read-only — for analysis and discussion only, never modify):",
    pipelineBlock,
  ].join("\n");
}

function extractProfiles(reply){
  var re=/<<<PROFILE>>>([\s\S]*?)<<<\/PROFILE>>>/g;
  var textParts=[];
  var profiles=[];
  var lastIndex=0;
  var m;
  while((m=re.exec(reply))!==null){
    var before=reply.slice(lastIndex,m.index).trim();
    if(before) textParts.push(before);
    try{
      var raw=m[1].trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
      var obj=JSON.parse(raw);
      if(obj&&typeof obj.name==="string"&&typeof obj.query==="string"){
        profiles.push({
          name:obj.name.slice(0,80),
          query:obj.query.slice(0,300),
          sources:Array.isArray(obj.sources)&&obj.sources.length?obj.sources.filter(function(s){return s==="af"||s==="jsearch";}):["af"],
          limit:Math.max(1,Math.min(50,parseInt(obj.limit,10)||15)),
          reasoning:typeof obj.reasoning==="string"?obj.reasoning.slice(0,300):"",
        });
      }
    }catch(e){
      textParts.push("[Could not parse a suggested profile — you can re-ask for it]");
    }
    lastIndex=re.lastIndex;
  }
  var tail=reply.slice(lastIndex).trim();
  if(tail) textParts.push(tail);
  if(!textParts.length&&!profiles.length) textParts.push(reply.trim());
  return{textParts:textParts,profiles:profiles};
}

function getStarterPrompts(cv,jobs){
  var scoredCount=(jobs||[]).filter(function(j){return j.scored!==false&&!j.archived&&typeof j.score==="number";}).length;
  var interviewCount=(jobs||[]).filter(function(j){return j.status==="Interview"||j.status==="Offer";}).length;
  var rejectedCount=(jobs||[]).filter(function(j){return j.status==="Rejected";}).length;
  var smartPrompt=scoredCount>=10?"Suggest a new profile based on my highest-scoring jobs.":null;

  if(!hasCv(cv)){
    var base=[
      "I'd like help building my first search profile.",
      "What kinds of job searches can this app do?",
      "How should I structure my CV to get better match scores?",
    ];
    return smartPrompt?[smartPrompt].concat(base).slice(0,4):base;
  }
  var prompts=[];
  if(smartPrompt) prompts.push(smartPrompt);
  if(interviewCount>=2) prompts.push("What do my Interview-stage jobs have in common?");
  else if(interviewCount===1) prompts.push("What stands out about the job I reached Interview for?");
  if(rejectedCount>=3) prompts.push("Are there patterns in the jobs I've been rejected from?");
  prompts.push("Help me build a search profile from my CV.");
  if(cv.locations) prompts.push("Find roles in "+cv.locations.split(",")[0].trim()+" that fit my background.");
  if(cv.roles) prompts.push("I want to search for "+cv.roles.split(",")[0].trim()+" positions — where should I start?");
  if(cv.workType&&cv.workType!=="Any") prompts.push("Help me find "+cv.workType.toLowerCase()+" roles.");
  else prompts.push("Split my search into a local profile and a remote profile.");
  return prompts.slice(0,4);
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

// ─── ProfileAssistant ─────────────────────────────────────────────────────────
function ProfileAssistant({cv,profiles,setProfiles,anthropicKey,conversation,setConversation,setActiveTab,setPendingProfileRun,jobs}){
  var [input,setInput]=useState("");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [justSavedId,setJustSavedId]=useState(null);
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
        maxTokens:1200,
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
  }

  function saveProfile(prof){
    var newProfile={id:Date.now(),name:prof.name,query:prof.query,limit:prof.limit,sources:prof.sources,active:true};
    setProfiles(function(prev){return prev.concat([newProfile]);});
    setJustSavedId(newProfile.id);
  }
  function runNow(profileId){
    setPendingProfileRun(profileId);
    setActiveTab("profiles");
  }

  function renderMarkdown(text){
    if(!text) return null;
    var paragraphs=text.split(/\n{2,}/);
    return paragraphs.map(function(para,pi){
      var lines=para.split("\n");
      var isList=lines.every(function(l){return !l.trim()||/^[-•*]\s/.test(l.trim());});
      if(isList){
        var items=lines.filter(function(l){return l.trim();}).map(function(l){
          return l.trim().replace(/^[-•*]\s+/,"");
        });
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

  function renderAssistantMessage(reply,msgIdx){
    var parsed=extractProfiles(reply);
    var order=[];
    var re=/<<<PROFILE>>>[\s\S]*?<<<\/PROFILE>>>/g;
    var lastIndex=0;
    var m;
    var pIdx=0;
    while((m=re.exec(reply))!==null){
      var before=reply.slice(lastIndex,m.index).trim();
      if(before) order.push({type:"text",value:before});
      if(parsed.profiles[pIdx]) order.push({type:"profile",value:parsed.profiles[pIdx]});
      pIdx++;
      lastIndex=re.lastIndex;
    }
    var tail=reply.slice(lastIndex).trim();
    if(tail) order.push({type:"text",value:tail});
    if(!order.length) order.push({type:"text",value:reply.trim()});

    return order.map(function(item,i){
      if(item.type==="text"){
        return <div key={i} style={{lineHeight:1.55,fontSize:14,color:C.textPrimary}}>{renderMarkdown(item.value)}</div>;
      }
      var p=item.value;
      var alreadySaved=profiles.some(function(sp){return sp.name===p.name&&sp.query===p.query;});
      return <ProfileCard key={i} profile={p} alreadySaved={alreadySaved} justSaved={justSavedId&&profiles.find(function(sp){return sp.id===justSavedId;})&&profiles.find(function(sp){return sp.id===justSavedId;}).name===p.name} onSave={function(){saveProfile(p);}} onRun={function(){if(justSavedId) runNow(justSavedId);}} />;
    });
  }

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <SectionTitle action={conversation.length>0?<Btn onClick={clearConversation} style={{fontSize:12,padding:"6px 12px"}}>Clear conversation</Btn>:null}>Profile Assistant</SectionTitle>
      <div style={{fontSize:13,color:C.textHint,marginBottom:14}}>A focused chatbot that helps you design high-quality search profiles from your CV. It only discusses this app and search-profile design — not general topics.</div>
      {!anthropicKey&&<Alert type="warning">Add your Anthropic API key in Search Profiles → API keys to use the assistant.</Alert>}
      {!hasCv(cv)&&anthropicKey&&<Alert type="info">Tip: Upload or paste your CV in the My CV tab first, so the assistant can tailor suggestions to your background.</Alert>}
    </Card>

    <Card>
      <div ref={scrollRef} style={{maxHeight:"60vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingRight:4}}>
        {conversation.length===0&&<div>
          <div style={{fontSize:14,color:C.textSecondary,marginBottom:12,lineHeight:1.55}}>
            Hi! I can help you turn your CV into focused search profiles, explain what the connected APIs can do, and walk you through any feature in the app.
            {starters[0]&&starters[0].indexOf("highest-scoring")>=0&&<span> <span style={{color:C.primary,fontWeight:600}}>You now have enough scored jobs for smart suggestions — try the first starter below.</span></span>}
          </div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>TRY ONE OF THESE:</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {starters.map(function(s,i){
              var isSmart=s.indexOf("highest-scoring")>=0;
              return <button key={i} onClick={function(){send(s);}} disabled={loading||!anthropicKey} style={{textAlign:"left",padding:"12px 14px",borderRadius:10,border:"1.5px solid "+(isSmart?C.primary:C.border),background:isSmart?C.primaryLight:C.surfaceAlt,color:C.textPrimary,fontSize:13,cursor:loading||!anthropicKey?"not-allowed":"pointer",opacity:loading||!anthropicKey?0.5:1,fontWeight:isSmart?600:400}}>{isSmart?"✨":"💬"} {s}</button>;
            })}
          </div>
        </div>}
        {conversation.map(function(msg,i){
          if(msg.role==="user"){
            return <div key={i} style={{alignSelf:"flex-end",maxWidth:"85%",background:C.primary,color:"#fff",padding:"10px 14px",borderRadius:"14px 14px 2px 14px",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{msg.content}</div>;
          }
          return <div key={i} style={{alignSelf:"flex-start",maxWidth:"95%",width:"95%"}}>
            <div style={{fontSize:11,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:4}}>ASSISTANT</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>{renderAssistantMessage(msg.content,i)}</div>
          </div>;
        })}
        {loading&&<div style={{alignSelf:"flex-start",fontSize:13,color:C.textHint,fontStyle:"italic"}}>Thinking…</div>}
      </div>
      {error&&<Alert type="error">{error}</Alert>}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <Inp value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey&&input.trim()&&!loading&&anthropicKey){e.preventDefault();send();}}} enterKeyHint="send" placeholder="Ask about profiles, APIs, or features…" style={{flex:1}} />
        <Btn variant="primary" onClick={function(){send();}} disabled={loading||!input.trim()||!anthropicKey} style={{padding:"10px 20px"}}>Send</Btn>
      </div>
    </Card>
  </div>;
}

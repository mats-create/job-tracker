// profiles.js
// Rev: 2026-06-10 — BUG2+3: fix added/skipped counters in fetchAF and fetchJS.
// Rev: 2026-06-11 — BUG11: addedCount now reflects truly_new.length (post-dedup)
//   not preFiltered.length, so re-running a profile correctly reports 0 new jobs.

// profiles.js
// Rev: 2026-06-16 — Portrait moved to My CV tab (cv.js). PortraitUploader removed from here.
// Rev: 2026-06-10 — BUG2+3: fix added/skipped counters in fetchAF and fetchJS.
// Rev: 2026-06-11 — BUG11: addedCount now reflects truly_new.length (post-dedup)
//   not preFiltered.length, so re-running a profile correctly reports 0 new jobs.

// ─── Search Profiles ──────────────────────────────────────────────────────────
function SearchProfiles({profiles,setProfiles,setJobs,afKey,setAfKey,jsKey,setJsKey,anthropicKey,setAnthropicKey,pendingProfileRun,setPendingProfileRun,dismissedIds}){
  var [showAfKey,setShowAfKey]=useState(false);
  var [showJsKey,setShowJsKey]=useState(false);
  var [showAnthropicKey,setShowAnthropicKey]=useState(false);
  var [editId,setEditId]=useState(null);
  var [showForm,setShowForm]=useState(false);
  var [form,setForm]=useState({name:"",query:"",limit:10,sources:["af"],locations:[]});
  var [runStatus,setRunStatus]=useState({});
  var formRef=useRef(null);

  function toggleSource(src){setForm(function(f){var srcs=f.sources.includes(src)?f.sources.filter(function(s){return s!==src;}):f.sources.concat([src]);return Object.assign({},f,{sources:srcs});});}
  function toggleLocation(loc){setForm(function(f){var locs=(f.locations||[]);var next=locs.includes(loc)?locs.filter(function(l){return l!==loc;}):locs.concat([loc]);return Object.assign({},f,{locations:next});});}

  function saveProfile(){
    if(!form.name||!form.query||form.sources.length===0) return;
    if(editId){setProfiles(function(prev){return prev.map(function(p){return p.id===editId?Object.assign({},p,form,{limit:Number(form.limit)}):p;});});setEditId(null);}
    else{setProfiles(function(prev){return prev.concat([Object.assign({id:Date.now()},form,{limit:Number(form.limit),active:true})]);});}
    setForm({name:"",query:"",limit:10,sources:["af"],locations:[]});setShowForm(false);
  }

  function startEdit(p){
    setForm({name:p.name,query:p.query,limit:p.limit,sources:p.sources||["af"],locations:p.locations||[]});
    setEditId(p.id);
    setShowForm(true);
    setTimeout(function(){
      if(formRef.current){ formRef.current.scrollIntoView({behavior:"smooth",block:"center"}); }
    },50);
  }

  async function fetchAF(p){
    try{
      var url="https://jobsearch.api.jobtechdev.se/search?q="+encodeURIComponent(p.query)+"&limit="+p.limit+"&resdet=full";
      var headers={"accept":"application/json"};
      if(afKey) headers["api-key"]=afKey;
      var out=await smartFetch(url,{headers:headers});
      var res=out.response;
      if(!res.ok){
        if(res.status===403){ throw new Error("403 Forbidden"+(out.viaProxy?" (the CORS proxy rejected the request — try again in a moment)":" (the API rejected the request — check your API key if you added one)")); }
        if(res.status===429) throw new Error("429 Rate limited — slow down and try again in a minute");
        throw new Error("Error "+res.status);
      }
      var data=await res.json();
      var ads=data.hits||[];
      var tombstones=new Set((dismissedIds||[]).map(String));
      // Pre-filter before setJobs so counts are synchronously available.
      // Tombstone and location checks don't need 'prev'; dedup is done inside setJobs.
      var skipped=0;
      var preFiltered=ads.filter(function(a){
        var aid=a.id?a.id.toString():"";
        if(!aid) return false;
        if(tombstones.has(aid)){ skipped++; return false; }
        return true;
      }).map(function(a){return mapAfJob(a,p.name);});
      preFiltered=filterByLocation(preFiltered,p.locations||[]);
      // Use a ref-array so truly_new.length set inside updater is readable outside.
      var countRef=[0];
      setJobs(function(prev){
        var ex=new Set(prev.map(function(j){return j.id?j.id.toString():""; }));
        var truly_new=preFiltered.filter(function(j){return !ex.has(j.id?j.id.toString():"");});
        countRef[0]=truly_new.length;
        return truly_new.concat(prev);
      });
      return{added:countRef[0],skipped:skipped};
    }catch(e){return{added:0,error:e.message};}
  }

  async function fetchJS(p){
    if(!jsKey) return{added:0,error:"No JSearch API key entered. Go to Search Profiles and add your RapidAPI key."};
    try{
      var url="https://jsearch.p.rapidapi.com/search?query="+encodeURIComponent(p.query)+"&num_pages=1&page=1";
      var out=await smartFetch(url,{headers:{"x-rapidapi-key":jsKey,"x-rapidapi-host":"jsearch.p.rapidapi.com"}});
      var res=out.response;
      if(!res.ok){
        if(res.status===401||res.status===403) throw new Error(res.status+" — check your RapidAPI key and that you're subscribed to JSearch");
        if(res.status===429) throw new Error("429 Rate limited — JSearch free tier is limited, try again later");
        throw new Error("Error "+res.status);
      }
      var data=await res.json();
      var ads=(data.data||[]).slice(0,p.limit);
      var tombstones=new Set((dismissedIds||[]).map(String));
      var skipped=0;
      var preFiltered=ads.filter(function(a){
        var aid=a.job_id?String(a.job_id):"";
        if(!aid) return false;
        if(tombstones.has(aid)){ skipped++; return false; }
        return true;
      }).map(function(a){return mapJsJob(a,p.name);});
      preFiltered=filterByLocation(preFiltered,p.locations||[]);
      var countRef=[0];
      setJobs(function(prev){
        var ex=new Set(prev.map(function(j){return j.id?j.id.toString():""; }));
        var truly_new=preFiltered.filter(function(j){return !ex.has(j.id?j.id.toString():"");});
        countRef[0]=truly_new.length;
        return truly_new.concat(prev);
      });
      return{added:countRef[0],skipped:skipped};
    }catch(e){return{added:0,error:e.message};}
  }

  async function runProfile(p){
    setRunStatus(function(s){var u=Object.assign({},s);u[p.id]={type:"loading",msg:"Fetching jobs..."};return u;});
    var srcs=p.sources||["af"];
    var results=[];
    for(var i=0;i<srcs.length;i++){var r=srcs[i]==="af"?await fetchAF(p):await fetchJS(p);results.push({src:srcs[i],added:r.added,skipped:r.skipped||0,error:r.error});}
    var totalAdded=results.reduce(function(a,r){return a+(r.added||0);},0);
    var parts=results.map(function(r){
      if(r.error) return (r.src==="af"?"Arbetsförmedlingen":"JSearch")+": "+r.error;
      var msg=(r.src==="af"?"Arbetsförmedlingen":"JSearch")+": "+r.added+" new jobs added";
      if(r.skipped>0) msg+=" ("+r.skipped+" previously dismissed, skipped)";
      return msg;
    });
    var hasError=results.some(function(r){return r.error;});
    setRunStatus(function(s){var u=Object.assign({},s);u[p.id]={type:hasError&&!totalAdded?"error":"success",msg:parts.join(" · ")};return u;});
  }

  async function runAll(){var active=profiles.filter(function(p){return p.active;});for(var i=0;i<active.length;i++) await runProfile(active[i]);}

  useEffect(function(){
    if(!pendingProfileRun) return;
    var p=profiles.find(function(x){return x.id===pendingProfileRun;});
    if(p){ runProfile(p); }
    setPendingProfileRun(null);
  },[pendingProfileRun]);

  var profileFormFields = function(isEdit){
    return <React.Fragment>
      <div className="jt-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14,marginBottom:14}}>
        <div><Label hint="A name to help you identify this search">Profile name</Label><Inp value={form.name} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{name:v});});}} placeholder="e.g. Product Manager Stockholm" /></div>
        <div><Label hint="Maximum jobs to fetch each time this profile runs">Max results</Label><Inp type="number" value={form.limit} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{limit:v});});}} placeholder="10" style={{width:100}} /></div>
      </div>
      <div style={{marginBottom:14}}><Label hint="One role or one location per profile. Create separate profiles for variations — no AND/OR operators supported.">Search query</Label><Txta value={form.query} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{query:v});});}} placeholder='e.g. "product manager SaaS Stockholm"' rows={2} /></div>
      <div style={{marginBottom:16}}>
        <Label hint="Choose which job boards to search">Search in</Label>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          {[["af","Arbetsförmedlingen (Swedish jobs)","#EAF2EF","#3D6B5C"],["jsearch","JSearch — Indeed, LinkedIn, Glassdoor","#E3EFF8","#1A5A8A"]].map(function(item){
            var on=form.sources.includes(item[0]);
            return <button key={item[0]} onClick={function(){toggleSource(item[0]);}} style={{flex:1,padding:"12px 16px",borderRadius:12,border:"2px solid "+(on?item[3]:C.border),background:on?item[2]:"transparent",color:on?item[3]:C.textSecondary,cursor:"pointer",fontSize:13,fontWeight:on?700:500,textAlign:"left"}}>{on?"✓ ":""}{item[1]}</button>;
          })}
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <Label hint="Filter results to specific cities or remote. Leave empty to get jobs from all of Sweden/anywhere.">Locations <span style={{fontWeight:400,color:C.textHint}}>(optional — empty = no filter)</span></Label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
          {LOCATION_OPTIONS.map(function(opt){
            var on=(form.locations||[]).includes(opt.value);
            return <button key={opt.value} onClick={function(){toggleLocation(opt.value);}} style={{fontSize:12,fontWeight:on?700:500,padding:"5px 13px",borderRadius:20,border:"1.5px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,cursor:"pointer"}}>{opt.value}</button>;
          })}
        </div>
        {(form.locations||[]).length>0&&<div style={{fontSize:11,color:C.textHint,marginTop:6}}>Jobs not matching these locations will be filtered out after fetching.</div>}
      </div>
      <div style={{display:"flex",gap:10}}><Btn variant="primary" onClick={saveProfile}>{isEdit?"Update profile":"Save profile"}</Btn><Btn onClick={function(){setShowForm(false);setEditId(null);}}>Cancel</Btn></div>
    </React.Fragment>;
  };

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <SectionTitle action={<div style={{display:"flex",gap:8,alignItems:"center"}}><InfoTip label="How it works">A search profile is a saved query that runs against job boards automatically. Each active profile searches its sources on schedule or when you click Fetch, adding new matching jobs to your list. Queries use simple keyword matching — no AND/OR operators. To search for multiple roles or locations, create separate profiles (e.g. "Product Manager Stockholm", "Product Owner Stockholm").</InfoTip><Btn onClick={runAll} style={{fontSize:13,padding:"8px 14px"}}>▶ Run all active</Btn><Btn variant="primary" onClick={function(){setEditId(null);setForm({name:"",query:"",limit:10,sources:["af"],locations:[]});setShowForm(function(v){return !v;});}} style={{fontSize:13,padding:"8px 14px"}}>+ New profile</Btn></div>}>Search profiles</SectionTitle>
      {showForm&&!editId&&<div ref={formRef} style={{background:C.surfaceAlt,borderRadius:14,padding:"20px",margin:"16px 0",border:"1.5px solid "+C.border}}>
        <div style={{fontSize:15,fontWeight:700,color:C.textPrimary,marginBottom:16}}>New search profile</div>
        {profileFormFields(false)}
      </div>}
      {profiles.length===0
        ?<EmptyState icon="🔎" title="No search profiles yet" body="Create a profile with a search query to start fetching jobs." />
        :<div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
          {profiles.map(function(p){
            var st=runStatus[p.id];
            var isEditingThis=editId===p.id;
            var afUrl="https://jobsearch.api.jobtechdev.se/search?q="+encodeURIComponent(p.query)+"&limit="+p.limit;
            var jsUrl="https://jsearch.p.rapidapi.com/search?query="+encodeURIComponent(p.query)+"&num_pages=1";

            if(isEditingThis){
              return <div key={p.id} ref={formRef} style={{background:C.primaryLight,borderRadius:14,padding:"20px",border:"1.5px solid "+C.primary}}>
                <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:14}}>Editing: {p.name}</div>
                {profileFormFields(true)}
              </div>;
            }

            return <div key={p.id} style={{background:C.surfaceAlt,borderRadius:14,padding:"14px 16px",opacity:p.active?1:0.65}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div style={{paddingTop:2,flexShrink:0}}><Toggle value={p.active} onChange={function(){var pid=p.id;setProfiles(function(prev){return prev.map(function(x){return x.id===pid?Object.assign({},x,{active:!x.active}):x;});});}} /></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.textPrimary,lineHeight:1.3,marginBottom:4}}>{p.name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    <Chip label={p.active?"Active":"Inactive"} bg={p.active?C.primaryLight:C.surfaceAlt} color={p.active?C.primary:C.textHint} />
                    <Chip label={"max "+p.limit} />
                    {(p.sources||["af"]).map(function(src){var s=SOURCES[src];return <Chip key={src} label={s.label} bg={s.bg} color={s.color} />;}) }
                    {(p.locations||[]).map(function(loc){return <Chip key={loc} label={"📍 "+loc} bg={C.primaryLight} color={C.primary} />;})}
                  </div>
                </div>
              </div>
              <div style={{position:"relative",display:"block",marginBottom:10}} className="jt-query-pill">
                <div style={{fontSize:12,color:C.textSecondary,fontFamily:"monospace",background:C.surface,padding:"6px 10px",borderRadius:8,cursor:"default",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{p.query}"</div>
                <div className="jt-query-tooltip" style={{display:"none",position:"fixed",marginTop:4,background:C.textPrimary,color:C.surface,fontSize:11,padding:"10px 14px",borderRadius:10,zIndex:400,whiteSpace:"pre-wrap",boxShadow:"0 4px 20px rgba(0,0,0,0.25)",width:300,wordBreak:"break-all",lineHeight:1.7,pointerEvents:"none"}}>
                  {(p.sources||["af"]).includes("af")&&"AF API:\n"+afUrl+"\n"}
                  {(p.sources||["af"]).includes("jsearch")&&"JSearch:\n"+jsUrl}
                </div>
              </div>
              {st&&<Alert type={st.type==="loading"?"info":st.type}>{st.msg}</Alert>}
              <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid "+C.border,flexWrap:"wrap"}}>
                <Btn onClick={function(){startEdit(p);}} style={{fontSize:12,padding:"8px 14px",flex:1,textAlign:"center",minWidth:60}}>✏ Edit</Btn>
                <Btn onClick={function(){if(p.active) runProfile(p);}} disabled={!p.active} style={{fontSize:12,padding:"8px 14px",flex:1,textAlign:"center",minWidth:60,background:p.active?C.primaryLight:"transparent",color:p.active?C.primary:C.textHint}}>▶ Fetch</Btn>
                <Btn variant="danger" onClick={function(){var pid=p.id;setProfiles(function(prev){return prev.filter(function(x){return x.id!==pid;});});}} style={{fontSize:12,padding:"8px 14px",minWidth:60}}>🗑</Btn>
              </div>
            </div>;
          })}
        </div>}
    </Card>
    <Card>
      <SectionTitle>API keys</SectionTitle>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <Label hint="The Arbetsförmedlingen API is free and open — no key needed. Leave blank to use it without authentication.">Arbetsförmedlingen API key (optional)</Label>
          <div style={{display:"flex",gap:8}}><Inp type={showAfKey?"text":"password"} value={afKey} onChange={function(e){var v=e.target.value;setAfKey(v);}} placeholder="Leave blank — no key needed" style={{fontFamily:"monospace"}} /><Btn onClick={function(){setShowAfKey(function(v){return !v;});}} style={{whiteSpace:"nowrap",padding:"10px 16px"}}>{showAfKey?"Hide":"Show"}</Btn></div>
        </div>
        <div>
          <Label hint="Sign up free at rapidapi.com, search for JSearch by OpenWeb Ninja, subscribe to the free plan, and paste your key here.">JSearch API key (for Indeed, LinkedIn, Glassdoor)</Label>
          <div style={{display:"flex",gap:8}}><Inp type={showJsKey?"text":"password"} value={jsKey} onChange={function(e){var v=e.target.value;setJsKey(v);}} placeholder="Paste your RapidAPI key here" style={{fontFamily:"monospace"}} /><Btn onClick={function(){setShowJsKey(function(v){return !v;});}} style={{whiteSpace:"nowrap",padding:"10px 16px"}}>{showJsKey?"Hide":"Show"}</Btn></div>
        </div>
        <div>
          <Label hint="Required for AI match scoring, cover letters, and reports. Get a key at console.anthropic.com and paste it here. Starts with 'sk-ant-'.">Anthropic API key (for AI features)</Label>
          <div style={{display:"flex",gap:8}}><Inp type={showAnthropicKey?"text":"password"} value={anthropicKey} onChange={function(e){var v=e.target.value;setAnthropicKey(v);}} placeholder="sk-ant-..." style={{fontFamily:"monospace"}} /><Btn onClick={function(){setShowAnthropicKey(function(v){return !v;});}} style={{whiteSpace:"nowrap",padding:"10px 16px"}}>{showAnthropicKey?"Hide":"Show"}</Btn></div>
        </div>
        <Alert type="info">🔒 Keys are stored encrypted in your Firestore account and are never shared with anyone. <InfoTip>Your API keys are only used when you explicitly trigger a fetch or AI action. They are stored in your personal Firestore document, accessible only when signed in as you.</InfoTip></Alert>
      </div>
    </Card>
  </div>;
}

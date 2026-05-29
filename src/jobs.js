// ─── Job Row ──────────────────────────────────────────────────────────────────
function JobRow({job:j,expanded,selected,onSelectToggle,onToggle,onStatusChange,onNotesChange,onArchiveToggle,onDismiss,onWriteCoverLetter,onCoverLetterChange}){
  var src=SOURCES[j.sourceType]||SOURCES.manual;
  var hasRichDetails=!!(j.description||j.employerUrl||j.applyUrl);
  var hasNotes=!!(j.notes&&j.notes.trim());
  var todayStr=new Date().toISOString().slice(0,10);
  var deadlineSoon=j.deadline&&j.deadline>=todayStr&&(new Date(j.deadline)-new Date())<7*24*60*60*1000;
  var deadlinePast=j.deadline&&j.deadline<todayStr;
  var isArchived=!!j.archived;
  var [noteDraft,setNoteDraft]=useState(j.notes||"");
  useEffect(function(){ setNoteDraft(j.notes||""); },[j.id,j.notes]);
  function commitNotes(){ if((j.notes||"")!==noteDraft) onNotesChange(noteDraft); }

  var rowBg=selected?C.primaryLight:isArchived?"#F0F0EE":C.surfaceAlt;
  var rowBorder=selected?"1.5px solid "+C.primary:isArchived?"1.5px dashed "+C.border:"1.5px solid transparent";

  var scoreColor=j.score>=75?C.success:j.score>=50?C.warning:C.error;
  var scoreBg=j.score>=75?C.successBg:j.score>=50?C.warningBg:C.errorBg;

  return <div style={{background:rowBg,borderRadius:14,border:rowBorder,
    opacity:isArchived&&!selected?0.75:1,
    transition:"background 0.15s"}}>

    {/* Collapsed header */}
    <div style={{padding:"14px 14px 12px",display:"flex",alignItems:"flex-start",gap:10}}>
      {onSelectToggle&&<input type="checkbox" checked={!!selected} onChange={onSelectToggle}
        onClick={function(e){e.stopPropagation();}}
        style={{width:18,height:18,marginTop:2,flexShrink:0,cursor:"pointer",accentColor:C.primary}}
        aria-label="Select this job" />}

      <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={onToggle}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:4}}>
          <span style={{flex:1,fontSize:15,fontWeight:700,color:C.textPrimary,
            lineHeight:1.3,wordBreak:"break-word"}}>{j.title}
            {isArchived&&<span style={{fontSize:11,padding:"1px 6px",borderRadius:8,
              background:C.border,color:C.textSecondary,fontWeight:600,
              marginLeft:6,verticalAlign:"middle"}}>archived</span>}
          </span>
          {j.scored!==false&&j.score!=null&&<span style={{
            fontSize:12,fontWeight:700,color:scoreColor,background:scoreBg,
            borderRadius:8,padding:"2px 7px",flexShrink:0,lineHeight:1.6}}>
            {j.score}%
          </span>}
        </div>

        <div style={{fontSize:13,color:C.textSecondary,marginBottom:6,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {j.company}{j.location?<span style={{color:C.textHint}}> · {j.location}</span>:null}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <Sel value={j.status} onChange={onStatusChange}
            onClick={function(e){e.stopPropagation();}}
            style={{fontSize:12,padding:"4px 8px",
              background:STATUS[j.status].bg,color:STATUS[j.status].color,
              fontWeight:700,border:"none",borderRadius:8,
              cursor:"pointer",flexShrink:0}}>
            {STATUSES.map(function(s){return <option key={s}>{s}</option>;})}
          </Sel>
          {deadlinePast&&<span style={{fontSize:11,fontWeight:600,color:C.error}}>⚠ Deadline passed</span>}
          {!deadlinePast&&deadlineSoon&&<span style={{fontSize:11,fontWeight:600,color:C.warning}}>⏰ {j.deadline}</span>}
          {hasNotes&&!expanded&&<span style={{fontSize:12,color:C.textHint}} title="Has notes">📝</span>}
          {j.coverLetter&&!expanded&&<span title="Cover letter saved" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:C.primary,background:C.primary+"22",borderRadius:6,padding:"2px 7px",lineHeight:1,verticalAlign:"middle"}}>✉</span>}
          <span style={{marginLeft:"auto",fontSize:11,color:C.primary,fontWeight:600,whiteSpace:"nowrap"}}>
            {expanded?"▲ Less":"▼ "+(hasNotes||hasRichDetails?"Details":"Notes")}
          </span>
        </div>
      </div>
    </div>

    {/* Expanded section */}
    {expanded&&<div style={{borderTop:"1px solid "+C.border,padding:"14px 14px 16px"}}>
      <div style={{fontSize:12,color:C.textHint,marginBottom:12,display:"flex",
        flexWrap:"wrap",gap:"4px 12px"}}>
        <span>Added {j.date}</span>
        {j.employmentType&&<span>{j.employmentType}</span>}
        {j.remote===true&&<span>🌐 Remote</span>}
        {j.salary&&<span>💰 {j.salary}</span>}
        {!deadlinePast&&!deadlineSoon&&j.deadline&&<span>📅 {j.deadline}</span>}
      </div>

      {j.rationale&&j.scored!==false&&<div style={{
        fontSize:13,color:C.textSecondary,fontStyle:"italic",
        background:C.surface,borderRadius:8,padding:"8px 12px",
        marginBottom:12,lineHeight:1.55,borderLeft:"3px solid "+C.primary}}>
        {j.rationale}
      </div>}

      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
        <Chip label={src.label} bg={src.bg} color={src.color} />
        {j.tags.map(function(t,i){return <Chip key={t+i} label={t} />;})}
        {(j.applyUrl||j.url)&&<a href={j.applyUrl||j.url} target="_blank"
          rel="noopener noreferrer"
          style={{fontSize:12,color:C.primary,fontWeight:600,textDecoration:"none",marginLeft:"auto"}}>
          View posting ↗
        </a>}
      </div>

      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:C.textHint,
          letterSpacing:"0.5px",marginBottom:6}}>NOTES</div>
        <Txta value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}}
          onBlur={commitNotes}
          placeholder="Track progress, interview prep, contacts, next steps..."
          rows={3} />
      </div>

      {j.description&&<div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:C.textHint,
          letterSpacing:"0.5px",marginBottom:6}}>ROLE DESCRIPTION</div>
        <div style={{fontSize:13,lineHeight:1.6,color:C.textPrimary,
          maxHeight:280,overflowY:"auto",whiteSpace:"pre-wrap",
          background:C.surface,padding:"10px 12px",borderRadius:10,
          border:"1px solid "+C.border}}>{j.description}</div>
      </div>}

      {(j.employerUrl||j.applyUrl)&&<div style={{display:"flex",gap:12,
        fontSize:13,marginBottom:14,flexWrap:"wrap"}}>
        {j.employerUrl&&<a href={j.employerUrl} target="_blank"
          rel="noopener noreferrer"
          style={{color:C.primary,fontWeight:600,textDecoration:"none"}}>{j.company} ↗</a>}
        {j.applyUrl&&<a href={j.applyUrl} target="_blank"
          rel="noopener noreferrer"
          style={{color:C.primary,fontWeight:600,textDecoration:"none"}}>Apply ↗</a>}
      </div>}

      {j.coverLetter&&<div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:600,color:C.textHint,
          letterSpacing:"0.5px",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
          COVER LETTER
          <button onClick={function(){navigator.clipboard.writeText(j.coverLetter);}}
            style={{fontSize:11,fontWeight:600,color:C.primary,background:"none",border:"none",
              cursor:"pointer",padding:"1px 6px",borderRadius:6,fontFamily:"inherit"}}>
            Copy
          </button>
          {onWriteCoverLetter&&!j.archived&&<button onClick={function(){onWriteCoverLetter(j.id);}}
            style={{fontSize:11,fontWeight:600,color:C.textSecondary,background:"none",border:"none",
              cursor:"pointer",padding:"1px 6px",borderRadius:6,fontFamily:"inherit"}}>
            Regenerate ↗
          </button>}
        </div>
        <div style={{fontSize:13,lineHeight:1.65,color:C.textPrimary,
          whiteSpace:"pre-wrap",background:C.surface,padding:"10px 12px",
          borderRadius:10,border:"1px solid "+C.border,
          maxHeight:320,overflowY:"auto"}}>{j.coverLetter}</div>
      </div>}

      <div style={{display:"flex",gap:8,flexWrap:"wrap",
        paddingTop:12,borderTop:"1px solid "+C.border}}>
        {onWriteCoverLetter&&!isArchived&&["New","Reviewing","Applied"].includes(j.status)&&
          <button onClick={function(){onWriteCoverLetter(j.id);}}
            style={{flex:"1 1 auto",fontSize:12,fontWeight:600,
              padding:"9px 12px",borderRadius:9,border:"none",
              background:C.primaryLight,color:C.primary,cursor:"pointer",
              fontFamily:"inherit",whiteSpace:"nowrap"}}>
            ✉ Cover letter
          </button>}
        {onArchiveToggle&&
          <button onClick={onArchiveToggle}
            style={{flex:"0 0 auto",fontSize:12,fontWeight:600,
              padding:"9px 14px",borderRadius:9,
              border:"1px solid "+C.border,
              background:"transparent",color:C.textSecondary,cursor:"pointer",
              fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {isArchived?"↩ Restore":"📦 Archive"}
          </button>}
        {onDismiss&&!isArchived&&
          <button onClick={onDismiss} title="Dismiss — remove and don't show again"
            style={{flex:"0 0 auto",fontSize:12,fontWeight:600,
              padding:"9px 14px",borderRadius:9,
              border:"1px solid "+C.border,
              background:"transparent",color:C.error,cursor:"pointer",
              fontFamily:"inherit",whiteSpace:"nowrap"}}>
            🗑 Dismiss
          </button>}
      </div>
    </div>}
  </div>;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
function Jobs({jobs,setJobs,rescoreAll,scoringStatus,scoringError,cv,sort,setSort,dismissJob,tombstoneIds,startCoverLetter,pendingJobsView,setPendingJobsView}){
  var [filter,setFilter]=useState("All");
  var [statusGroupFilter,setStatusGroupFilter]=useState(null);
  var [sourceFilter,setSourceFilter]=useState("all");
  var [scoreFilter,setScoreFilter]=useState(0);
  var [search,setSearch]=useState("");
  var [showAdd,setShowAdd]=useState(false);
  var [showArchived,setShowArchived]=useState(false);
  var [showFilters,setShowFilters]=useState(false);
  var [expandedId,setExpandedId]=useState(null);
  var [selectedIds,setSelectedIds]=useState(new Set());
  var [form,setForm]=useState({title:"",company:"",location:"",tags:"",applyUrl:"",salary:"",employmentType:"",description:""});

  useEffect(function(){
    if(!pendingJobsView) return;
    var p=pendingJobsView;
    if(p.status&&typeof p.status==="string"){ setFilter(p.status); setStatusGroupFilter(null); setShowFilters(true); }
    else if(p.statusGroup){ setStatusGroupFilter(p.statusGroup); setFilter("All"); setShowFilters(true); }
    else if(Object.keys(p).length===0||p.expandId){ setFilter("All"); setStatusGroupFilter(null); }
    if(typeof p.archived==="boolean") setShowArchived(p.archived);
    setSourceFilter("all"); setScoreFilter(0); setSearch("");
    if(p.expandId){
      var match=jobs.find(function(j){return String(j.id)===String(p.expandId);});
      if(match) setExpandedId(match.id);
    }
    if(setPendingJobsView) setPendingJobsView(null);
    setTimeout(function(){ window.scrollTo({top:0,behavior:"smooth"}); },0);
  },[pendingJobsView]);

  var filtered=jobs
    .filter(function(j){return showArchived?true:!j.archived;})
    .filter(function(j){return filter==="All"||j.status===filter;})
    .filter(function(j){
      if(!statusGroupFilter) return true;
      if(statusGroupFilter==="applied") return APPLIED_STATUSES.includes(j.status);
      return true;
    })
    .filter(function(j){return sourceFilter==="all"||j.sourceType===sourceFilter;})
    .filter(function(j){
      if(scoreFilter===0) return true;
      if(j.scored===false) return false;
      return(j.score||0)>=scoreFilter;
    })
    .filter(function(j){return matchesSearch(j,search);});
  filtered=sortJobs(filtered,sort);

  var todayStr=new Date().toISOString().slice(0,10);
  var passedCount=jobs.filter(function(j){return !j.archived&&j.deadline&&j.deadline<todayStr;}).length;
  var archivedCount=jobs.filter(function(j){return j.archived;}).length;

  var filteredIdSet=new Set(filtered.map(function(j){return String(j.id);}));
  var visibleSelectedCount=0;
  selectedIds.forEach(function(id){ if(filteredIdSet.has(id)) visibleSelectedCount++; });
  var allVisibleSelected=filtered.length>0&&visibleSelectedCount===filtered.length;

  function toggleSelect(jobId){
    var key=String(jobId);
    setSelectedIds(function(prev){
      var next=new Set(prev);
      if(next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function toggleSelectAllVisible(){
    setSelectedIds(function(prev){
      var next=new Set(prev);
      if(allVisibleSelected){
        filtered.forEach(function(j){ next.delete(String(j.id)); });
      }else{
        filtered.forEach(function(j){ next.add(String(j.id)); });
      }
      return next;
    });
  }
  function clearSelection(){ setSelectedIds(new Set()); }
  function bulkSetStatus(newStatus){
    var nowIso=new Date().toISOString();
    setJobs(function(prev){
      return prev.map(function(j){
        if(!selectedIds.has(String(j.id))) return j;
        var patch={status:newStatus};
        if(newStatus==="Applied"&&!j.appliedAt) patch.appliedAt=nowIso;
        if(newStatus==="Rejected"&&!j.rejectedAt) patch.rejectedAt=nowIso;
        if(newStatus==="Ad removed"&&!j.adRemovedAt) patch.adRemovedAt=nowIso;
        return Object.assign({},j,patch);
      });
    });
    clearSelection();
  }
  function bulkDelete(){
    var n=selectedIds.size;
    if(!confirm("Delete "+n+" job"+(n!==1?"s":"")+"? This cannot be undone."))return;
    if(tombstoneIds) tombstoneIds(Array.from(selectedIds));
    setJobs(function(prev){return prev.filter(function(j){return !selectedIds.has(String(j.id));});});
    clearSelection();
  }
  function bulkArchive(){
    setJobs(function(prev){
      return prev.map(function(j){
        return selectedIds.has(String(j.id))?Object.assign({},j,{archived:true}):j;
      });
    });
    clearSelection();
  }
  function bulkUnarchive(){
    setJobs(function(prev){
      return prev.map(function(j){
        return selectedIds.has(String(j.id))?Object.assign({},j,{archived:false}):j;
      });
    });
    clearSelection();
  }
  function toggleArchive(jobId){
    setJobs(function(prev){return prev.map(function(j){return j.id===jobId?Object.assign({},j,{archived:!j.archived}):j;});});
  }
  function archivePassed(){
    if(!passedCount) return;
    if(!confirm("Archive "+passedCount+" job"+(passedCount!==1?"s":"")+" with passed deadlines? You can still view them with \"Show archived\"."))return;
    var today=todayStr;
    setJobs(function(prev){return prev.map(function(j){
      if(!j.archived&&j.deadline&&j.deadline<today) return Object.assign({},j,{archived:true});
      return j;
    });});
  }

  function addJob(){
    if(!form.title||!form.company) return;
    setJobs(function(prev){return [{
      id:Date.now(),title:form.title,company:form.company,location:form.location,
      status:"New",score:NEUTRAL_SCORE,scored:false,rationale:"",
      source:"Manual",sourceType:"manual",
      date:new Date().toISOString().slice(0,10),lang:"English",
      tags:form.tags.split(",").map(function(t){return t.trim();}).filter(Boolean),
      url:form.applyUrl||null,
      description:form.description||"",applyUrl:form.applyUrl||null,
      deadline:null,employmentType:form.employmentType||null,
      salary:form.salary||null,remote:null,employerUrl:null,
    }].concat(prev);});
    setForm({title:"",company:"",location:"",tags:"",applyUrl:"",salary:"",employmentType:"",description:""});
    setShowAdd(false);
  }

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card style={{padding:"16px 20px"}}>
      <div style={{position:"relative",marginBottom:10}}>
        <Inp value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Search by title, company, location, description..." style={{paddingLeft:36,paddingRight:search?36:12}} />
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.textHint,pointerEvents:"none"}}>🔍</span>
        {search&&<button onClick={function(){setSearch("");}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:18,color:C.textHint,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>×</button>}
      </div>
      {(function(){
        var activeFilterCount=0;
        if(filter!=="All"||statusGroupFilter) activeFilterCount++;
        if(sourceFilter!=="all") activeFilterCount++;
        if(scoreFilter>0) activeFilterCount++;
        if(sort!=="added_desc") activeFilterCount++;
        return <button onClick={function(){setShowFilters(function(v){return !v;});}} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,color:showFilters||activeFilterCount>0?C.primary:C.textSecondary,background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontFamily:"inherit"}}>
          <span style={{transition:"transform 0.2s",display:"inline-block",transform:showFilters?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
          Filters &amp; Sort
          {activeFilterCount>0&&<span style={{fontSize:11,fontWeight:700,background:C.primary,color:"#fff",borderRadius:10,padding:"1px 7px",lineHeight:1.6}}>{activeFilterCount}</span>}
        </button>;
      })()}
      {showFilters&&<div style={{marginTop:14,display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>SORT BY</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {SORT_OPTIONS.map(function(o){
              var on=sort===o.key;
              return <button key={o.key} onClick={function(){setSort(o.key);}} style={{fontSize:12,fontWeight:on?700:500,padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,cursor:"pointer"}}>{o.label}</button>;
            })}
          </div>
        </div>
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>FILTER BY STATUS</div>
          {statusGroupFilter==="applied"&&<div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:20,background:C.primaryLight,border:"1.5px dashed "+C.primary,color:C.primary,fontSize:12,fontWeight:600,marginBottom:10}}>
            Showing all applied jobs (Applied, Interview, Offer, Rejected, No response)
            <button onClick={function(){setStatusGroupFilter(null);}} style={{background:"none",border:"none",cursor:"pointer",color:C.primary,fontSize:14,fontWeight:700,padding:0,lineHeight:1}}>×</button>
          </div>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["All"].concat(STATUSES).map(function(s){
              var on=filter===s&&!statusGroupFilter;
              var cnt=s!=="All"?"("+jobs.filter(function(j){return j.status===s&&(showArchived||!j.archived);}).length+")":"";
              return <button key={s} onClick={function(){setFilter(s);setStatusGroupFilter(null);}} style={{fontSize:13,fontWeight:on?700:500,padding:"7px 16px",borderRadius:20,border:"1.5px solid "+(on?STATUS[s]?STATUS[s].color:C.primary:C.border),background:on?(STATUS[s]?STATUS[s].bg:C.primaryLight):"transparent",color:on?(STATUS[s]?STATUS[s].color:C.primary):C.textSecondary,cursor:"pointer"}}>{s} {cnt}</button>;
            })}
          </div>
        </div>
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>FILTER BY SOURCE</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["All sources","all"],["Arbetsförmedlingen","af"],["JSearch","jsearch"],["Manual","manual"]].map(function(item){
              var on=sourceFilter===item[1];
              return <button key={item[1]} onClick={function(){setSourceFilter(item[1]);}} style={{fontSize:12,fontWeight:on?700:500,padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,cursor:"pointer"}}>{item[0]}</button>;
            })}
          </div>
        </div>
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:8}}>FILTER BY MATCH SCORE</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              [0,"Any score",C.border,C.textSecondary,C.surfaceAlt],
              [50,"≥ 50%",C.error,C.error,C.errorBg],
              [70,"≥ 70%",C.warning,C.warning,C.warningBg],
              [85,"≥ 85%",C.success,C.success,C.successBg],
            ].map(function(item){
              var on=scoreFilter===item[0];
              return <button key={item[0]} onClick={function(){setScoreFilter(item[0]);}} style={{fontSize:12,fontWeight:on?700:500,padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(on?item[2]:C.border),background:on?item[4]:"transparent",color:on?item[3]:C.textSecondary,cursor:"pointer"}}>{item[1]}</button>;
            })}
          </div>
          {scoreFilter>0&&<div style={{fontSize:11,color:C.textHint,marginTop:8,fontStyle:"italic"}}>Jobs that haven't been scored yet are hidden while a threshold is active.</div>}
        </div>
        {(archivedCount>0||passedCount>0)&&<div style={{paddingTop:12,borderTop:"1px solid "+C.border,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          {archivedCount>0&&<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",fontSize:13,color:C.textSecondary}}>
            <input type="checkbox" checked={showArchived} onChange={function(){setShowArchived(function(v){return !v;});}} style={{width:16,height:16,cursor:"pointer",accentColor:C.primary}} />
            <span>Show archived ({archivedCount})</span>
          </label>}
          {passedCount>0&&<Btn onClick={archivePassed} style={{fontSize:12,padding:"6px 12px",marginLeft:"auto"}}>📦 Archive passed deadlines ({passedCount})</Btn>}
        </div>}
        {(filter!=="All"||statusGroupFilter||sourceFilter!=="all"||scoreFilter>0||sort!=="added_desc")&&
          <div style={{paddingTop:4}}>
            <button onClick={function(){setFilter("All");setStatusGroupFilter(null);setSourceFilter("all");setScoreFilter(0);setSort("added_desc");}} style={{fontSize:12,color:C.textHint,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit",textDecoration:"underline",textUnderlineOffset:3}}>Clear all filters &amp; sort</button>
          </div>}
      </div>}
    </Card>
    <Card>
      <SectionTitle action={<div style={{display:"flex",gap:8}}>
        <Btn onClick={rescoreAll} disabled={scoringStatus.active||jobs.length===0||!hasCv(cv)} style={{fontSize:13,padding:"8px 16px"}}>{scoringStatus.active?"Scoring "+scoringStatus.done+"/"+scoringStatus.total+"...":"⟳ Rescore all"}</Btn>
        <Btn variant="primary" onClick={function(){setShowAdd(function(v){return !v;});}} style={{fontSize:13,padding:"8px 16px"}}>+ Add job manually</Btn>
      </div>}>Jobs ({filtered.length}{(function(){
        var pool=showArchived?jobs.length:jobs.length-archivedCount;
        return filtered.length!==pool?" of "+pool:"";
      })()})</SectionTitle>
      {!hasCv(cv)&&jobs.length>0&&<Alert type="info">Add your CV in the My CV tab to enable AI match scoring. Until then, scores show as "—".</Alert>}
      {scoringStatus.active&&<Alert type="info">AI is scoring your jobs against your CV... ({scoringStatus.done} of {scoringStatus.total} done)</Alert>}
      {scoringError&&!scoringStatus.active&&<Alert type="error">Scoring failed: {scoringError}</Alert>}
      {showAdd&&<div style={{background:C.surfaceAlt,borderRadius:12,padding:"16px",marginBottom:16,border:"1.5px solid "+C.border}}>
        <div style={{fontSize:14,fontWeight:700,color:C.textPrimary,marginBottom:14}}>Add a job manually</div>
        <div className="jt-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:12}}>
          <div><Label hint="e.g. Senior UX Designer">Job title *</Label><Inp value={form.title} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{title:v});});}} placeholder="Job title" /></div>
          <div><Label hint="e.g. Spotify">Company *</Label><Inp value={form.company} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{company:v});});}} placeholder="Company name" /></div>
          <div><Label hint="e.g. Stockholm or Remote">Location</Label><Inp value={form.location} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{location:v});});}} placeholder="Location" /></div>
          <div><Label hint="Direct link to the job posting">Apply URL</Label><Inp value={form.applyUrl} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{applyUrl:v});});}} placeholder="https://..." /></div>
          <div><Label hint="e.g. Full-time, Contract">Employment type</Label><Inp value={form.employmentType} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{employmentType:v});});}} placeholder="e.g. Full-time" /></div>
          <div><Label hint="e.g. 60 000–80 000 SEK/month">Salary range</Label><Inp value={form.salary} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{salary:v});});}} placeholder="e.g. 70 000 SEK/month" /></div>
          <div style={{gridColumn:"1 / -1"}}><Label hint="Separate with commas">Tags</Label><Inp value={form.tags} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{tags:v});});}} placeholder="e.g. Design, Remote" /></div>
          <div style={{gridColumn:"1 / -1"}}><Label hint="Paste the full role description for better AI match scoring">Role description</Label><Txta value={form.description} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{description:v});});}} placeholder="Paste the job description here..." rows={6} /></div>
        </div>
        <div style={{display:"flex",gap:10}}><Btn variant="primary" onClick={addJob}>Save job</Btn><Btn onClick={function(){setShowAdd(false);}}>Cancel</Btn></div>
      </div>}
      {filtered.length===0
        ?(jobs.length>0
          ?<div style={{textAlign:"center",padding:"30px 20px"}}>
            <div style={{fontSize:32,marginBottom:10}}>🔍</div>
            <div style={{fontSize:15,fontWeight:600,color:C.textSecondary,marginBottom:6}}>No jobs match your filters</div>
            <div style={{fontSize:13,color:C.textHint,marginBottom:14}}>Try clearing the search or changing the filters.</div>
            <Btn onClick={function(){setSearch("");setFilter("All");setSourceFilter("all");setScoreFilter(0);}}>Clear all filters</Btn>
          </div>
          :<EmptyState icon="📋" title="No jobs here yet" body="Add a job manually or fetch from your search profiles." />)
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:visibleSelectedCount>0?C.primaryLight:C.surfaceAlt,borderRadius:10,flexWrap:"wrap",transition:"background 0.15s",position:visibleSelectedCount>0?"sticky":"static",top:visibleSelectedCount>0?4:"auto",zIndex:5,boxShadow:visibleSelectedCount>0?"0 2px 8px rgba(0,0,0,0.06)":"none"}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",flex:"0 0 auto"}}>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} style={{width:18,height:18,cursor:"pointer",accentColor:C.primary}} />
              <span style={{fontSize:13,fontWeight:600,color:visibleSelectedCount>0?C.primary:C.textSecondary}}>
                {visibleSelectedCount>0?visibleSelectedCount+" selected":"Select all visible"}
              </span>
            </label>
            {visibleSelectedCount>0&&<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginLeft:"auto"}}>
              <Sel value="" onChange={function(e){if(e.target.value) bulkSetStatus(e.target.value);}} style={{width:"auto",fontSize:13,padding:"6px 10px",minWidth:160}}>
                <option value="">Change status to…</option>
                {STATUSES.map(function(s){return <option key={s} value={s}>{s}</option>;})}
              </Sel>
              {(function(){
                var sel=jobs.filter(function(j){return selectedIds.has(String(j.id));});
                var allArch=sel.length>0&&sel.every(function(j){return j.archived;});
                return allArch
                  ?<Btn onClick={bulkUnarchive} style={{fontSize:12,padding:"6px 12px"}}>↩ Unarchive</Btn>
                  :<Btn onClick={bulkArchive} style={{fontSize:12,padding:"6px 12px"}}>📦 Archive</Btn>;
              })()}
              <Btn variant="danger" onClick={bulkDelete} style={{fontSize:12,padding:"6px 12px"}}>Delete selected</Btn>
              <Btn onClick={clearSelection} style={{fontSize:12,padding:"6px 12px"}}>Cancel</Btn>
            </div>}
          </div>
          {filtered.map(function(j){
            var jid=String(j.id);
            return <JobRow
              key={j.id}
              job={j}
              expanded={expandedId===j.id}
              selected={selectedIds.has(jid)}
              onSelectToggle={function(){toggleSelect(j.id);}}
              onToggle={function(){setExpandedId(function(cur){return cur===j.id?null:j.id;});}}
              onStatusChange={function(e){var val=e.target.value;setJobs(function(prev){return prev.map(function(x){
                if(x.id!==j.id) return x;
                var patch={status:val};
                if(val==="Applied"&&!x.appliedAt) patch.appliedAt=new Date().toISOString();
                if(val==="Rejected"&&!x.rejectedAt) patch.rejectedAt=new Date().toISOString();
                if(val==="Ad removed"&&!x.adRemovedAt) patch.adRemovedAt=new Date().toISOString();
                return Object.assign({},x,patch);
              });});}}
              onNotesChange={function(val){setJobs(function(prev){return prev.map(function(x){return x.id===j.id?Object.assign({},x,{notes:val}):x;});});}}
              onArchiveToggle={function(){toggleArchive(j.id);}}
              onDismiss={dismissJob?function(){dismissJob(j.id);}:null}
              onWriteCoverLetter={startCoverLetter?function(){startCoverLetter(j.id);}:null}
              onCoverLetterChange={function(text){setJobs(function(prev){return prev.map(function(x){return x.id===j.id?Object.assign({},x,{coverLetter:text}):x;});});}}
            />;
          })}
        </div>}
    </Card>
  </div>;
}

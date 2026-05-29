// ─── StatusSheet — mobile bottom sheet for status picking ────────────────────
function StatusSheet({current,onSelect,onClose}){
  return <React.Fragment>
    <div className="jt-status-sheet-overlay" onClick={onClose} />
    <div className="jt-status-sheet">
      <div className="jt-status-sheet-handle" />
      <div className="jt-status-sheet-title">Change status</div>
      {STATUSES.map(function(s){
        var active=s===current;
        var col=STATUS[s]?STATUS[s].color:"#666";
        var bg=STATUS[s]?STATUS[s].bg:"#eee";
        return <button key={s} className="jt-status-option"
          onClick={function(){onSelect(s);}}
          style={{background:active?bg:"transparent",fontWeight:active?700:500}}>
          <span className="jt-status-dot" style={{background:col}} />
          <span style={{flex:1,color:active?col:C.textPrimary}}>{s}</span>
          {active&&<span style={{color:col,fontSize:18}}>✓</span>}
        </button>;
      })}
    </div>
  </React.Fragment>;
}

// ─── Job Row ──────────────────────────────────────────────────────────────────
function JobRow({job:j,expanded,selected,onSelectToggle,onToggle,onStatusChange,onNotesChange,onArchiveToggle,onDismiss,onWriteCoverLetter}){
  var src=SOURCES[j.sourceType]||SOURCES.manual;
  var hasNotes=!!(j.notes&&j.notes.trim());
  var todayStr=new Date().toISOString().slice(0,10);
  var deadlineSoon=j.deadline&&j.deadline>=todayStr&&(new Date(j.deadline)-new Date())<7*24*60*60*1000;
  var deadlinePast=j.deadline&&j.deadline<todayStr;
  var isArchived=!!j.archived;
  var [noteDraft,setNoteDraft]=useState(j.notes||"");
  var [showStatusSheet,setShowStatusSheet]=useState(false);
  var isMobile=typeof window!=="undefined"&&window.innerWidth<=767;

  useEffect(function(){ setNoteDraft(j.notes||""); },[j.id,j.notes]);
  function commitNotes(){ if((j.notes||"")!==noteDraft) onNotesChange(noteDraft); }

  function handleStatusSelect(val){
    setShowStatusSheet(false);
    onStatusChange({target:{value:val}});
  }

  var scoreColor=j.score>=75?C.success:j.score>=50?C.warning:C.error;
  var scoreBg=j.score>=75?C.successBg:j.score>=50?C.warningBg:C.errorBg;
  var rowBg=selected?C.primaryLight:isArchived?"#F0F0EE":C.surfaceAlt;
  var rowBorder=selected?"1.5px solid "+C.primary:isArchived?"1.5px dashed "+C.border:"1.5px solid transparent";

  return <div className="jt-job-row" style={{background:rowBg,borderRadius:14,border:rowBorder,opacity:isArchived&&!selected?0.75:1,transition:"background 0.15s"}}>

    {showStatusSheet&&<StatusSheet current={j.status} onSelect={handleStatusSelect} onClose={function(){setShowStatusSheet(false);}} />}

    {/* ── Collapsed header ── */}
    <div className="jt-job-row-header" style={{padding:"14px 14px 12px",display:"flex",alignItems:"flex-start",gap:10}}>
      {onSelectToggle&&<input type="checkbox" checked={!!selected} onChange={onSelectToggle}
        onClick={function(e){e.stopPropagation();}}
        style={{width:20,height:20,marginTop:4,flexShrink:0,cursor:"pointer",accentColor:C.primary}} />}

      <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={onToggle}>
        {/* Title + score */}
        <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:5}}>
          <span className="jt-job-title" style={{flex:1,fontSize:15,fontWeight:700,color:C.textPrimary,lineHeight:1.3,wordBreak:"break-word"}}>
            {j.title}
            {isArchived&&<span style={{fontSize:11,padding:"1px 6px",borderRadius:8,background:C.border,color:C.textSecondary,fontWeight:600,marginLeft:6,verticalAlign:"middle"}}>archived</span>}
          </span>
          {j.scored!==false&&j.score!=null&&
            <span className="jt-job-score" style={{fontSize:12,fontWeight:700,color:scoreColor,background:scoreBg,borderRadius:8,padding:"3px 8px",flexShrink:0,lineHeight:1.6}}>
              {j.score}%
            </span>}
        </div>

        {/* Company + location */}
        <div className="jt-job-meta" style={{fontSize:mob()?15:13,color:C.textSecondary,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {j.company}{j.location?<span style={{color:C.textHint}}> · {j.location}</span>:null}
        </div>

        {/* Status + badges row */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {isMobile
            ? <button onClick={function(e){e.stopPropagation();setShowStatusSheet(true);}}
                style={{display:"inline-flex",alignItems:"center",gap:6,
                  fontSize:13,fontWeight:700,padding:"6px 12px",
                  background:STATUS[j.status].bg,color:STATUS[j.status].color,
                  border:"none",borderRadius:10,cursor:"pointer",
                  fontFamily:"inherit",minHeight:36,flexShrink:0}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:STATUS[j.status].color,flexShrink:0}} />
                {j.status}
                <span style={{fontSize:10,opacity:0.7}}>▼</span>
              </button>
            : <select value={j.status} onChange={onStatusChange}
                onClick={function(e){e.stopPropagation();}}
                style={{fontSize:12,padding:"4px 8px",background:STATUS[j.status].bg,color:STATUS[j.status].color,fontWeight:700,border:"none",borderRadius:8,cursor:"pointer",flexShrink:0}}>
                {STATUSES.map(function(s){return <option key={s}>{s}</option>;})}
              </select>}

          {deadlinePast&&<span style={{fontSize:11,fontWeight:600,color:C.error}}>⚠ Deadline passed</span>}
          {!deadlinePast&&deadlineSoon&&<span style={{fontSize:11,fontWeight:600,color:C.warning}}>⏰ {j.deadline}</span>}
          {hasNotes&&!expanded&&<span style={{fontSize:13,color:C.textHint}} title="Has notes">📝</span>}
          {j.coverLetter&&!expanded&&<span title="Cover letter saved" style={{fontSize:12,fontWeight:600,color:C.primary,background:C.primary+"22",borderRadius:6,padding:"2px 7px"}}>✉</span>}
          <span style={{marginLeft:"auto",fontSize:12,color:C.primary,fontWeight:600,whiteSpace:"nowrap"}}>
            {expanded?"▲ Less":"▼ More"}
          </span>
        </div>
      </div>
    </div>

    {/* ── Expanded section ── */}
    {expanded&&<div style={{borderTop:"1px solid "+C.border}}>

      {/* Details strip */}
      <div style={{padding:"12px 14px 0",fontSize:mob()?15:13,color:C.textHint,display:"flex",flexWrap:"wrap",gap:"4px 14px"}}>
        <span>Added {j.date}</span>
        {j.employmentType&&<span>{j.employmentType}</span>}
        {j.remote===true&&<span>🌐 Remote</span>}
        {j.salary&&<span>💰 {j.salary}</span>}
        {!deadlinePast&&!deadlineSoon&&j.deadline&&<span>📅 {j.deadline}</span>}
      </div>

      {/* AI rationale */}
      {j.rationale&&j.scored!==false&&<div style={{margin:"10px 14px 0",fontSize:mob()?15:13,color:C.textSecondary,fontStyle:"italic",background:C.surface,borderRadius:8,padding:"8px 12px",lineHeight:1.55,borderLeft:"3px solid "+C.primary}}>
        {j.rationale}
      </div>}

      {/* Tags + link */}
      <div style={{padding:"10px 14px 0",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <Chip label={src.label} bg={src.bg} color={src.color} />
        {j.tags.map(function(t,i){return <Chip key={t+i} label={t} />;})}
        {(j.applyUrl||j.url)&&<a href={j.applyUrl||j.url} target="_blank" rel="noopener noreferrer"
          style={{fontSize:13,color:C.primary,fontWeight:600,textDecoration:"none",marginLeft:"auto"}}>
          View posting ↗
        </a>}
      </div>

      {/* Notes */}
      <div style={{padding:"12px 14px 0"}}>
        <div style={{fontSize:mob()?13:12,fontWeight:600,color:C.textHint,letterSpacing:"0.5px",marginBottom:6}}>NOTES</div>
        <textarea
          className="jt-notes-area"
          value={noteDraft}
          onChange={function(e){setNoteDraft(e.target.value);}}
          onBlur={commitNotes}
          placeholder="Track progress, interview prep, next steps..."
          rows={3}
          style={{width:"100%",fontSize:14,padding:"10px 12px",borderRadius:10,
            border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,
            boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.5}} />
      </div>

      {/* Full description */}
      {j.description&&<div style={{padding:"10px 14px 0"}}>
        <div style={{fontSize:mob()?13:12,fontWeight:600,color:C.textHint,letterSpacing:"0.5px",marginBottom:6}}>ROLE DESCRIPTION</div>
        <div style={{fontSize:mob()?15:13,lineHeight:1.65,color:C.textPrimary,maxHeight:220,overflowY:"auto",
          whiteSpace:"pre-wrap",background:C.surface,padding:"10px 12px",borderRadius:10,
          border:"1px solid "+C.border}}>{j.description}</div>
      </div>}

      {/* Saved cover letter preview */}
      {j.coverLetter&&<div style={{padding:"10px 14px 0"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.textHint,letterSpacing:"0.5px",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
          COVER LETTER
          <button onClick={function(){navigator.clipboard.writeText(j.coverLetter);}}
            style={{fontSize:11,fontWeight:600,color:C.primary,background:"none",border:"none",cursor:"pointer",padding:"1px 6px",borderRadius:6,fontFamily:"inherit"}}>Copy</button>
        </div>
        <div style={{fontSize:mob()?15:13,lineHeight:1.7,color:C.textPrimary,whiteSpace:"pre-wrap",
          background:C.surface,padding:"10px 12px",borderRadius:10,border:"1px solid "+C.border,
          maxHeight:240,overflowY:"auto"}}>{j.coverLetter}</div>
      </div>}

      {/* ── Action buttons ── */}
      <div className="jt-job-actions" style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
        {/* Primary: cover letter */}
        {onWriteCoverLetter&&!isArchived&&["New","Reviewing","Applied"].includes(j.status)&&
          <button onClick={function(){onWriteCoverLetter(j.id);}}
            className="jt-mob-btn"
            style={{fontSize:14,fontWeight:700,padding:"12px 16px",borderRadius:12,
              border:"none",background:C.primaryLight,color:C.primary,
              cursor:"pointer",fontFamily:"inherit",width:"100%",minHeight:48,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            ✉ Write cover letter
          </button>}

        {/* Secondary: archive + dismiss side by side */}
        <div className="jt-job-action-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {onArchiveToggle&&
            <button onClick={onArchiveToggle}
              style={{fontSize:14,fontWeight:600,padding:"12px 8px",borderRadius:12,
                border:"1.5px solid "+C.border,background:"transparent",
                color:C.textSecondary,cursor:"pointer",fontFamily:"inherit",
                minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {isArchived?"↩ Restore":"📦 Archive"}
            </button>}
          {onDismiss&&!isArchived&&
            <button onClick={onDismiss}
              style={{fontSize:14,fontWeight:600,padding:"12px 8px",borderRadius:12,
                border:"1.5px solid #F5C6C6",background:C.errorBg,
                color:C.error,cursor:"pointer",fontFamily:"inherit",
                minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              🗑 Dismiss
            </button>}
        </div>
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
    setSelectedIds(function(prev){var next=new Set(prev);if(next.has(key)) next.delete(key);else next.add(key);return next;});
  }
  function toggleSelectAllVisible(){
    setSelectedIds(function(prev){
      var next=new Set(prev);
      if(allVisibleSelected){ filtered.forEach(function(j){ next.delete(String(j.id)); }); }
      else{ filtered.forEach(function(j){ next.add(String(j.id)); }); }
      return next;
    });
  }
  function clearSelection(){ setSelectedIds(new Set()); }

  function bulkSetStatus(newStatus){
    var nowIso=new Date().toISOString();
    setJobs(function(prev){return prev.map(function(j){
      if(!selectedIds.has(String(j.id))) return j;
      var patch={status:newStatus};
      if(newStatus==="Applied"&&!j.appliedAt) patch.appliedAt=nowIso;
      if(newStatus==="Rejected"&&!j.rejectedAt) patch.rejectedAt=nowIso;
      if(newStatus==="Ad removed"&&!j.adRemovedAt) patch.adRemovedAt=nowIso;
      return Object.assign({},j,patch);
    });});
    clearSelection();
  }
  function bulkDelete(){
    var n=selectedIds.size;
    if(!confirm("Delete "+n+" job"+(n!==1?"s":"")+"? This cannot be undone.")) return;
    if(tombstoneIds) tombstoneIds(Array.from(selectedIds));
    setJobs(function(prev){return prev.filter(function(j){return !selectedIds.has(String(j.id));});});
    clearSelection();
  }
  function bulkArchive(){
    setJobs(function(prev){return prev.map(function(j){return selectedIds.has(String(j.id))?Object.assign({},j,{archived:true}):j;});});
    clearSelection();
  }
  function bulkUnarchive(){
    setJobs(function(prev){return prev.map(function(j){return selectedIds.has(String(j.id))?Object.assign({},j,{archived:false}):j;});});
    clearSelection();
  }
  function toggleArchive(jobId){
    setJobs(function(prev){return prev.map(function(j){return j.id===jobId?Object.assign({},j,{archived:!j.archived}):j;});});
  }
  function archivePassed(){
    if(!passedCount) return;
    if(!confirm("Archive "+passedCount+" job"+(passedCount!==1?"s":"")+" with passed deadlines?")) return;
    setJobs(function(prev){return prev.map(function(j){
      if(!j.archived&&j.deadline&&j.deadline<todayStr) return Object.assign({},j,{archived:true});
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
      url:form.applyUrl||null,description:form.description||"",
      applyUrl:form.applyUrl||null,deadline:null,
      employmentType:form.employmentType||null,salary:form.salary||null,
      remote:null,employerUrl:null,
    }].concat(prev);});
    setForm({title:"",company:"",location:"",tags:"",applyUrl:"",salary:"",employmentType:"",description:""});
    setShowAdd(false);
  }

  var activeFilterCount=0;
  if(filter!=="All"||statusGroupFilter) activeFilterCount++;
  if(sourceFilter!=="all") activeFilterCount++;
  if(scoreFilter>0) activeFilterCount++;
  if(sort!=="added_desc") activeFilterCount++;

  return <div style={{display:"flex",flexDirection:"column",gap:12}}>

    {/* ── Search + filter bar ── */}
    <Card style={{padding:"14px 16px"}}>
      <div style={{position:"relative",marginBottom:10}}>
        <Inp value={search} onChange={function(e){setSearch(e.target.value);}}
          placeholder="Search jobs…"
          style={{paddingLeft:36,paddingRight:search?36:12}} />
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15,color:C.textHint,pointerEvents:"none"}}>🔍</span>
        {search&&<button onClick={function(){setSearch("");}}
          style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
            background:"none",border:"none",fontSize:20,color:C.textHint,
            cursor:"pointer",padding:"4px 8px",lineHeight:1,minHeight:"auto"}}>×</button>}
      </div>

      <button className="jt-filter-toggle"
        onClick={function(){setShowFilters(function(v){return !v;});}}
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
          background:"none",border:"none",cursor:"pointer",padding:"8px 0",
          fontSize:14,fontWeight:600,color:showFilters||activeFilterCount>0?C.primary:C.textSecondary,
          fontFamily:"inherit",minHeight:44}}>
        <span style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{transition:"transform 0.2s",display:"inline-block",transform:showFilters?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
          Filters &amp; Sort
          {activeFilterCount>0&&<span style={{fontSize:12,fontWeight:700,background:C.primary,color:"#fff",borderRadius:10,padding:"1px 7px",lineHeight:1.6}}>{activeFilterCount}</span>}
        </span>
        {activeFilterCount>0&&<button onClick={function(e){e.stopPropagation();setFilter("All");setStatusGroupFilter(null);setSourceFilter("all");setScoreFilter(0);setSort("added_desc");}}
          style={{fontSize:12,color:C.textHint,background:"none",border:"none",cursor:"pointer",
            padding:"4px 8px",fontFamily:"inherit",minHeight:"auto"}}>Clear all</button>}
      </button>

      {showFilters&&<div style={{display:"flex",flexDirection:"column",gap:16,paddingTop:12,borderTop:"1px solid "+C.border}}>
        {/* Sort */}
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:700,letterSpacing:"0.5px",marginBottom:8}}>SORT BY</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {SORT_OPTIONS.map(function(o){var on=sort===o.key;return <button key={o.key} onClick={function(){setSort(o.key);}} style={{fontSize:13,fontWeight:on?700:500,padding:"7px 14px",borderRadius:20,border:"1.5px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,cursor:"pointer",minHeight:36}}>{o.label}</button>;})}
          </div>
        </div>
        {/* Status filter */}
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:700,letterSpacing:"0.5px",marginBottom:8}}>STATUS</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["All"].concat(STATUSES).map(function(s){
              var on=filter===s&&!statusGroupFilter;
              var cnt=s!=="All"?"("+jobs.filter(function(j){return j.status===s&&(showArchived||!j.archived);}).length+")":"";
              return <button key={s} onClick={function(){setFilter(s);setStatusGroupFilter(null);}} style={{fontSize:13,fontWeight:on?700:500,padding:"7px 14px",borderRadius:20,border:"1.5px solid "+(on?STATUS[s]?STATUS[s].color:C.primary:C.border),background:on?(STATUS[s]?STATUS[s].bg:C.primaryLight):"transparent",color:on?(STATUS[s]?STATUS[s].color:C.primary):C.textSecondary,cursor:"pointer",minHeight:36}}>{s} {cnt}</button>;
            })}
          </div>
        </div>
        {/* Score filter */}
        <div>
          <div style={{fontSize:12,color:C.textHint,fontWeight:700,letterSpacing:"0.5px",marginBottom:8}}>MATCH SCORE</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[[0,"Any"],[50,"≥ 50%"],[70,"≥ 70%"],[85,"≥ 85%"]].map(function(item){
              var on=scoreFilter===item[0];
              return <button key={item[0]} onClick={function(){setScoreFilter(item[0]);}} style={{fontSize:13,fontWeight:on?700:500,padding:"7px 14px",borderRadius:20,border:"1.5px solid "+(on?C.primary:C.border),background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,cursor:"pointer",minHeight:36}}>{item[1]}</button>;
            })}
          </div>
        </div>
        {/* Archived toggle */}
        {archivedCount>0&&<label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none",fontSize:14,color:C.textSecondary,minHeight:44}}>
          <input type="checkbox" checked={showArchived} onChange={function(){setShowArchived(function(v){return !v;});}} style={{width:18,height:18,cursor:"pointer",accentColor:C.primary,flexShrink:0}} />
          Show archived ({archivedCount})
        </label>}
        {passedCount>0&&<Btn onClick={archivePassed} style={{fontSize:13}}>📦 Archive {passedCount} passed deadline{passedCount!==1?"s":""}</Btn>}
      </div>}
    </Card>

    {/* ── Jobs list header ── */}
    <Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:16,fontWeight:700,color:C.textPrimary}}>
          {filtered.length} job{filtered.length!==1?"s":""}
          {(function(){var pool=showArchived?jobs.length:jobs.length-archivedCount;return filtered.length!==pool?" of "+pool:"";})()} 
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={rescoreAll} disabled={scoringStatus.active||jobs.length===0||!hasCv(cv)} style={{fontSize:13,padding:"8px 14px"}}>
            {scoringStatus.active?"Scoring "+scoringStatus.done+"/"+scoringStatus.total+"...":"⟳ Rescore"}
          </Btn>
          <Btn variant="primary" onClick={function(){setShowAdd(function(v){return !v;});}} style={{fontSize:13,padding:"8px 14px"}}>+ Add</Btn>
        </div>
      </div>

      {!hasCv(cv)&&jobs.length>0&&<Alert type="info">Add your CV to enable AI match scoring.</Alert>}
      {scoringStatus.active&&<Alert type="info">Scoring jobs… ({scoringStatus.done}/{scoringStatus.total})</Alert>}
      {scoringError&&!scoringStatus.active&&<Alert type="error">Scoring failed: {scoringError}</Alert>}

      {/* Add job form */}
      {showAdd&&<div style={{background:C.surfaceAlt,borderRadius:12,padding:"16px",marginTop:12,border:"1.5px solid "+C.border}}>
        <div style={{fontSize:15,fontWeight:700,color:C.textPrimary,marginBottom:14}}>Add a job manually</div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:12}}>
          <div><Label hint="e.g. Senior UX Designer">Job title *</Label><Inp value={form.title} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{title:v});});}} placeholder="Job title" /></div>
          <div><Label>Company *</Label><Inp value={form.company} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{company:v});});}} placeholder="Company name" /></div>
          <div><Label>Location</Label><Inp value={form.location} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{location:v});});}} placeholder="e.g. Stockholm" /></div>
          <div><Label>Apply URL</Label><Inp value={form.applyUrl} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{applyUrl:v});});}} placeholder="https://..." /></div>
          <div><Label>Role description</Label><Txta value={form.description} onChange={function(e){var v=e.target.value;setForm(function(f){return Object.assign({},f,{description:v});});}} placeholder="Paste the job description…" rows={5} /></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="primary" onClick={addJob}>Save job</Btn>
          <Btn onClick={function(){setShowAdd(false);}}>Cancel</Btn>
        </div>
      </div>}
    </Card>

    {/* ── Bulk selection bar ── */}
    {visibleSelectedCount>0&&<div style={{position:"sticky",top:4,zIndex:10,background:C.primaryLight,border:"1.5px solid "+C.primary,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
      <span style={{fontSize:14,fontWeight:700,color:C.primary,flex:1}}>{visibleSelectedCount} selected</span>
      <Sel value="" onChange={function(e){if(e.target.value) bulkSetStatus(e.target.value);}} style={{width:"auto",fontSize:13,padding:"6px 10px",minWidth:150}}>
        <option value="">Change status…</option>
        {STATUSES.map(function(s){return <option key={s} value={s}>{s}</option>;})}
      </Sel>
      {(function(){
        var sel=jobs.filter(function(j){return selectedIds.has(String(j.id));});
        var allArch=sel.length>0&&sel.every(function(j){return j.archived;});
        return allArch
          ?<Btn onClick={bulkUnarchive} style={{fontSize:13,padding:"7px 12px"}}>↩ Unarchive</Btn>
          :<Btn onClick={bulkArchive} style={{fontSize:13,padding:"7px 12px"}}>📦 Archive</Btn>;
      })()}
      <Btn variant="danger" onClick={bulkDelete} style={{fontSize:13,padding:"7px 12px"}}>Delete</Btn>
      <Btn onClick={clearSelection} style={{fontSize:13,padding:"7px 12px"}}>Cancel</Btn>
    </div>}

    {/* ── Job list ── */}
    {filtered.length===0
      ?(jobs.length>0
        ?<Card><div style={{textAlign:"center",padding:"24px 16px"}}>
          <div style={{fontSize:32,marginBottom:10}}>🔍</div>
          <div style={{fontSize:15,fontWeight:600,color:C.textSecondary,marginBottom:6}}>No jobs match your filters</div>
          <Btn onClick={function(){setSearch("");setFilter("All");setSourceFilter("all");setScoreFilter(0);}}>Clear filters</Btn>
        </div></Card>
        :<Card><EmptyState icon="📋" title="No jobs yet" body="Add manually or fetch from Search Profiles." /></Card>)
      :<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {/* Select all row */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px"}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",fontSize:14,color:C.textSecondary,minHeight:44}}>
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} style={{width:18,height:18,cursor:"pointer",accentColor:C.primary}} />
            {visibleSelectedCount>0?visibleSelectedCount+" selected":"Select all"}
          </label>
        </div>
        {filtered.map(function(j){
          var jid=String(j.id);
          return <JobRow
            key={j.id} job={j}
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
          />;
        })}
      </div>}
  </div>;
}

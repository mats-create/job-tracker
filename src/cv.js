// cv.js
// Rev: 2026-06-16 — Portrait section moved here (top of My CV); portrait/setPortrait props added.
// Rev: 2026-06-13 — Removed hardcoded CV_IMPORT data and import banner.
// Rev: 2026-06-16 — Row numbers in InlineListEditor (stable, storage-order based).
//   CV_IMPORT contained personal data (tools/skills/achievements) visible
//   to all users. All new users now start with empty CV sections.
// Rev: 2026-06-13 — Added "Clear all CV data" button with two-step confirmation.
// Rev: 2026-06-13 — Added extractedAt timestamp; clarified copy.
// Rev: 2026-06-13 — Consolidated CV controls: Clear button moved next to tab buttons;
//                   status line replaces duplicate Alert; SectionTitle cleaned up.

// ─── InlineListEditor ─────────────────────────────────────────────────────────
function InlineListEditor({items,onChange,fields,addLabel,sortFields,defaultSort}){
  var [editId,setEditId]=useState(null);
  var [draft,setDraft]=useState({});
  var [adding,setAdding]=useState(false);
  var [sort,setSort]=useState(defaultSort||{key:null,dir:"asc"});

  function emptyDraft(){
    var d={};
    fields.forEach(function(f){ d[f.key]=f.type==="number"?0:""; });
    return d;
  }
  function startAdd(){ setDraft(emptyDraft()); setAdding(true); setEditId(null); }
  function startEdit(item){ setDraft(Object.assign({},item)); setEditId(item.id); setAdding(false); }
  function cancel(){ setAdding(false); setEditId(null); setDraft({}); }
  function save(){
    var firstKey=fields[0].key;
    if(!String(draft[firstKey]||"").trim()) return;
    if(adding){
      onChange(items.concat([Object.assign({id:Date.now()},draft)]));
    } else {
      onChange(items.map(function(x){ return x.id===editId?Object.assign({},x,draft):x; }));
    }
    cancel();
  }
  function remove(id){ onChange(items.filter(function(x){ return x.id!==id; })); }
  function setField(key,val){ setDraft(function(d){ return Object.assign({},d,{[key]:val}); }); }
  function toggleSort(key){
    setSort(function(s){
      if(s.key===key) return {key:key,dir:s.dir==="asc"?"desc":"asc"};
      var f=fields.find(function(f){return f.key===key;});
      var defaultDir=(f&&(f.type==="number"||key==="year"))?"desc":"asc";
      return {key:key,dir:defaultDir};
    });
  }

  var displayed=items.slice();
  if(sort.key){
    var sk=sort.key;
    var sd=sort.dir;
    displayed.sort(function(a,b){
      var av=a[sk],bv=b[sk];
      if(sk==="level"){ av=PROF_ORDER[av]||0; bv=PROF_ORDER[bv]||0; return sd==="asc"?av-bv:bv-av; }
      if(typeof av==="number"&&typeof bv==="number"){ return sd==="asc"?av-bv:bv-av; }
      av=String(av||"").toLowerCase(); bv=String(bv||"").toLowerCase();
      if(av<bv) return sd==="asc"?-1:1;
      if(av>bv) return sd==="asc"?1:-1;
      return 0;
    });
  }

  function renderCell(f,val,onChangeFn){
    var baseStyle={fontSize:13,padding:"6px 8px",borderRadius:7,border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
    if(f.type==="select"){
      return <select value={val||""} onChange={function(e){onChangeFn(e.target.value);}} style={baseStyle}>
        {(f.options||[]).map(function(o){ return <option key={o}>{o}</option>; })}
      </select>;
    }
    if(f.type==="number"){
      return <input type="number" min={0} max={50} value={val||""} onChange={function(e){onChangeFn(Number(e.target.value));}} style={Object.assign({},baseStyle,{width:60})} />;
    }
    if(f.multiline){
      return <textarea value={val||""} onChange={function(e){onChangeFn(e.target.value);}} placeholder={f.placeholder||""} rows={2} style={Object.assign({},baseStyle,{resize:"vertical",lineHeight:1.4})} />;
    }
    return <input type="text" value={val||""} onChange={function(e){onChangeFn(e.target.value);}} placeholder={f.placeholder||""} style={baseStyle} />;
  }

  var isEditing=adding||editId!==null;
  var isMobile=typeof window!=="undefined"&&window.innerWidth<600;

  var sortControls=sortFields&&sortFields.length>0&&<div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
    <span style={{fontSize:11,color:C.textHint,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginRight:2}}>Sort:</span>
    {sortFields.map(function(sf){
      var active=sort.key===sf.key;
      var arrow=active?(sort.dir==="asc"?" ↑":" ↓"):"";
      return <button key={sf.key} onClick={function(){toggleSort(sf.key);}} style={{fontSize:12,padding:"3px 10px",borderRadius:6,border:"1.5px solid "+(active?C.primary:C.border),background:active?C.primaryLight:"transparent",color:active?C.primary:C.textSecondary,cursor:"pointer",fontWeight:active?700:400}}>
        {sf.label}{arrow}
      </button>;
    })}
  </div>;

  return <div>
    {items.length>1&&sortControls}
    {displayed.length>0&&<div style={{marginBottom:8}}>
      {displayed.map(function(item){
        if(editId===item.id){
          var stableIdx=items.indexOf(item);
          return <div key={item.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 8px",background:C.primaryLight,borderRadius:8,marginBottom:4}}>
            <div style={{fontSize:11,fontWeight:700,color:C.primary,minWidth:22,paddingTop:5,flexShrink:0,userSelect:"none",textAlign:"right"}}>{stableIdx>=0?stableIdx+1:"—"}</div>
            {fields.map(function(f){
              if(isMobile&&f.mobileHide) return null;
              return <div key={f.key} style={{flex:f.flex||1,minWidth:isMobile?0:(f.minWidth||0)}}>
                {renderCell(f,draft[f.key],function(v){ setField(f.key,v); })}
              </div>;
            })}
            <div style={{display:"flex",gap:4,width:56,flexShrink:0,paddingTop:2}}>
              <button onClick={save} title="Save" style={{flex:1,background:C.primary,color:"#fff",border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:13}}>✓</button>
              <button onClick={cancel} title="Cancel" style={{flex:1,background:C.border,color:C.textPrimary,border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:13}}>✗</button>
            </div>
          </div>;
        }
        var stableIdx=items.indexOf(item);
        return <div key={item.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 8px",borderRadius:8,marginBottom:3,background:C.surfaceAlt}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textHint,minWidth:22,paddingTop:3,flexShrink:0,userSelect:"none",textAlign:"right"}}>{stableIdx>=0?stableIdx+1:"—"}</div>
          {fields.map(function(f){
            if(isMobile&&f.mobileHide) return null;
            var val=item[f.key];
            var display=f.type==="number"&&val?val+" yr"+(val!==1?"s":""):val;
            return <div key={f.key} style={{flex:f.flex||1,minWidth:isMobile?0:(f.minWidth||0),fontSize:13,color:C.textPrimary,whiteSpace:f.multiline?"pre-wrap":"nowrap",overflow:f.multiline?"visible":"hidden",textOverflow:f.multiline?"unset":"ellipsis",wordBreak:f.multiline?"break-word":"normal",lineHeight:1.45}}>
              {display||<span style={{color:C.textHint}}>—</span>}
            </div>;
          })}
          <div style={{display:"flex",gap:4,width:56,flexShrink:0,paddingTop:2}}>
            <button onClick={function(){ startEdit(item); }} disabled={isEditing} title="Edit" style={{flex:1,background:"none",border:"1px solid "+C.border,borderRadius:6,padding:"4px 0",cursor:isEditing?"not-allowed":"pointer",fontSize:12,color:C.textSecondary}}>✏</button>
            <button onClick={function(){ remove(item.id); }} disabled={isEditing} title="Delete" style={{flex:1,background:"none",border:"1px solid "+C.border,borderRadius:6,padding:"4px 0",cursor:isEditing?"not-allowed":"pointer",fontSize:12,color:C.error}}>🗑</button>
          </div>
        </div>;
      })}
    </div>}
    {adding&&<div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 8px",background:C.primaryLight,borderRadius:8,marginBottom:8}}>
      {fields.map(function(f){
        if(isMobile&&f.mobileHide) return null;
        return <div key={f.key} style={{flex:f.flex||1,minWidth:isMobile?0:(f.minWidth||0)}}>
          {renderCell(f,draft[f.key],function(v){ setField(f.key,v); })}
        </div>;
      })}
      <div style={{display:"flex",gap:4,width:56,flexShrink:0,paddingTop:2}}>
        <button onClick={save} title="Save" style={{flex:1,background:C.primary,color:"#fff",border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:13}}>✓</button>
        <button onClick={cancel} title="Cancel" style={{flex:1,background:C.border,color:C.textPrimary,border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer",fontSize:13}}>✗</button>
      </div>
    </div>}
    {!isEditing&&<button onClick={startAdd} style={{fontSize:13,color:C.primary,background:"none",border:"1.5px dashed "+C.primary,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:600,width:"100%",marginTop:displayed.length?4:0}}>+ {addLabel||"Add entry"}</button>}
  </div>;
}

// ─── Portrait uploader with Cropper.js ───────────────────────────────────────
function PortraitUploader({portrait,setPortrait}){
  var [cropping,setCropping]=useState(false);
  var [srcUrl,setSrcUrl]=useState(null);
  var cropperRef=useRef(null);
  var imgRef=useRef(null);
  var fileRef=useRef(null);

  function onFile(e){
    var file=e.target.files&&e.target.files[0];
    if(!file) return;
    if(file.size>10*1024*1024){
      alert("Photo is too large (max 10 MB). Please choose a smaller image.");
      e.target.value=""; return;
    }
    var reader=new FileReader();
    reader.onload=function(ev){ setSrcUrl(ev.target.result); setCropping(true); };
    reader.readAsDataURL(file);
    e.target.value="";
  }

  useEffect(function(){
    if(!cropping||!srcUrl||!imgRef.current) return;
    if(!window.Cropper){
      alert("Image cropper failed to load. Check your internet connection and reload the page.");
      setCropping(false); setSrcUrl(null); return;
    }
    if(cropperRef.current){ cropperRef.current.destroy(); cropperRef.current=null; }
    cropperRef.current=new window.Cropper(imgRef.current,{
      aspectRatio:1,viewMode:1,dragMode:"move",autoCropArea:0.9,
      movable:true,zoomable:true,rotatable:false,scalable:false,
      cropBoxResizable:false,cropBoxMovable:false,
      guides:false,center:false,highlight:false,background:false,
    });
    return function(){ if(cropperRef.current){ cropperRef.current.destroy(); cropperRef.current=null; } };
  },[cropping,srcUrl]);

  function applyPortrait(){
    if(!cropperRef.current) return;
    var canvas=cropperRef.current.getCroppedCanvas({width:240,height:240,imageSmoothingQuality:"high"});
    setPortrait(canvas.toDataURL("image/jpeg",0.88));
    setCropping(false); setSrcUrl(null);
  }

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:16}}>
      {portrait
        ?<img src={portrait} style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"2px solid "+C.border,flexShrink:0}} />
        :<div style={{width:80,height:80,borderRadius:"50%",background:C.surfaceAlt,border:"2px dashed "+C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0,color:C.textHint}}>👤</div>
      }
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontSize:13,color:C.textSecondary,lineHeight:1.5}}>
          {portrait?"Your photo is shown as avatar in the app and included in cover letter PDFs.":"Add a photo to personalise your cover letters and app avatar."}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={function(){fileRef.current&&fileRef.current.click();}} style={{fontSize:13,padding:"8px 14px"}}>
            {portrait?"Change photo":"Upload photo"}
          </Btn>
          {portrait&&<Btn variant="danger" onClick={function(){setPortrait("");}} style={{fontSize:13,padding:"8px 14px"}}>Remove</Btn>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFile} />
    </div>
    {cropping&&srcUrl&&<div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.surface,borderRadius:20,padding:24,width:"min(440px,96vw)",boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.textPrimary,marginBottom:14}}>Adjust photo</div>
        <div style={{width:"100%",height:300,overflow:"hidden",borderRadius:12,background:"#111",marginBottom:16}}>
          <img ref={imgRef} src={srcUrl} style={{maxWidth:"100%",display:"block"}} />
        </div>
        <div style={{fontSize:12,color:C.textHint,marginBottom:16,textAlign:"center"}}>Drag to reposition · Pinch or scroll to zoom</div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="primary" onClick={applyPortrait} style={{flex:1,fontSize:14,minHeight:46}}>✓ Use this photo</Btn>
          <Btn onClick={function(){setCropping(false);setSrcUrl(null);}} style={{fontSize:14,minHeight:46}}>Cancel</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

// ─── CVProfile ────────────────────────────────────────────────────────────────
function CVProfile({cv,setCv,portrait,setPortrait}){
  var [tab,setTab]=useState(cv.uploaded?"upload":"paste");
  var fileRef=useRef();
  var [uploadState,setUploadState]=useState({status:"idle",msg:""});
  var recipients=cv.recipients||[];
  var [newRec,setNewRec]=useState({name:"",email:""});



  async function handleFile(f){
    if(!f) return;
    setUploadState({status:"loading",msg:"Extracting text from "+f.name+"..."});
    try{
      var text=await extractPdfText(f);
      setCv(function(c){return Object.assign({},c,{text:text,fileName:f.name,uploaded:true,extractedAt:new Date().toISOString()});});
      setUploadState({status:"success",msg:"Extracted "+text.length.toLocaleString()+" characters from "+f.name+"."});
    }catch(e){
      setUploadState({status:"error",msg:e.message||"Failed to read PDF."});
    }
  }

  function addRecipient(){
    var name=newRec.name.trim();
    var email=newRec.email.trim();
    if(!name||!isValidEmail(email)) return;
    var isDefault=recipients.length===0;
    setCv(function(c){
      var list=(c.recipients||[]).concat([{id:Date.now(),name:name,email:email,isDefault:isDefault}]);
      return Object.assign({},c,{recipients:list});
    });
    setNewRec({name:"",email:""});
  }
  function removeRecipient(id){
    setCv(function(c){
      var list=(c.recipients||[]).filter(function(r){return r.id!==id;});
      if(!list.some(function(r){return r.isDefault;})&&list.length>0) list[0].isDefault=true;
      return Object.assign({},c,{recipients:list});
    });
  }
  function setDefaultRecipient(id){
    setCv(function(c){
      var list=(c.recipients||[]).map(function(r){return Object.assign({},r,{isDefault:r.id===id});});
      return Object.assign({},c,{recipients:list});
    });
  }

  var EMPTY_CV={text:"",roles:"",industries:"",locations:"",salary:"",workType:"Any",tools:[],skills:[],achievements:[],recipients:[],uploaded:false,fileName:"",extractedAt:""};

  function clearAllCv(){
    if(!confirm(
      "Clear all CV data?\n\n"+
      "This will permanently delete:\n"+
      "• Your CV text (uploaded or pasted)\n"+
      "• All tools & software entries\n"+
      "• All skills & competencies\n"+
      "• All achievements\n"+
      "• All job preferences (roles, industries, locations, salary)\n"+
      "• All saved email recipients\n\n"+
      "Your jobs, search profiles, and API keys are NOT affected.\n\n"+
      "This cannot be undone."
    )) return;
    if(!confirm("Are you sure? All CV data will be permanently deleted.")) return;
    setCv(EMPTY_CV);
  }

  var hasText=!!(cv.text&&cv.text.trim());
  var cvCharCount=hasText?cv.text.length:0;

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>

    <Card>
      <SectionTitle>Profile portrait</SectionTitle>
      <PortraitUploader portrait={portrait||""} setPortrait={setPortrait} />
    </Card>

    <Card>
      <SectionTitle>Your CV <InfoTip>Text is extracted from your PDF and stored for AI match scoring and cover letter generation. The original PDF file is not retained — only the extracted text is saved. Text-based PDFs work best; scanned image PDFs may not extract correctly.</InfoTip></SectionTitle>

      {/* Controls row: mode tabs + clear button */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        {["paste","upload"].map(function(t){
          return <button key={t} onClick={function(){setTab(t);}}
            style={{padding:"8px 20px",borderRadius:10,
              border:"2px solid "+(tab===t?C.primary:C.border),
              background:tab===t?C.primaryLight:"transparent",
              color:tab===t?C.primary:C.textSecondary,
              fontSize:13,fontWeight:tab===t?700:500,cursor:"pointer"}}>
            {t==="paste"?"Paste text":"Upload PDF"}
          </button>;
        })}
        {hasText&&<button onClick={clearAllCv}
          style={{marginLeft:"auto",fontSize:12,fontWeight:600,
            padding:"8px 14px",borderRadius:10,
            border:"1.5px solid "+C.error,background:C.errorBg,
            color:C.error,cursor:"pointer",fontFamily:"inherit",
            whiteSpace:"nowrap"}}>
          🗑 Clear CV
        </button>}
      </div>

      {/* Status line — single source of truth for CV state */}
      {hasText&&<div style={{fontSize:12,color:C.textSecondary,marginBottom:14,
        padding:"7px 12px",borderRadius:8,background:C.successBg,
        border:"1px solid "+C.success,lineHeight:1.6}}>
        <span style={{fontWeight:600,color:C.success}}>✓ CV text active</span>
        {" · "}{cvCharCount.toLocaleString()} characters
        {cv.fileName?" · source: "+cv.fileName:" · pasted text"}
        {cv.extractedAt?" · extracted: "+new Date(cv.extractedAt).toLocaleString("sv-SE",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}
      </div>}
      {!hasText&&<div style={{fontSize:12,color:C.textHint,marginBottom:14,
        padding:"7px 12px",borderRadius:8,background:C.surfaceAlt,
        border:"1px solid "+C.border}}>
        No CV text yet — paste your CV or upload a PDF to enable AI scoring and cover letters.
      </div>}
      {tab==="paste"
        ?<div>
          <Label hint="Paste the full text of your CV — experience, skills, education. Also shows text extracted from an uploaded PDF so you can review it.">CV content</Label>
          <Txta value={cv.text||""} onChange={function(e){var v=e.target.value;setCv(function(c){return Object.assign({},c,{text:v});});}} placeholder="Paste your CV here..." rows={12} />
        </div>
        :<div>
          <div onClick={function(){if(uploadState.status!=="loading") fileRef.current.click();}} style={{border:"2px dashed "+(uploadState.status==="error"?C.error:C.border),borderRadius:14,padding:"40px 20px",textAlign:"center",cursor:uploadState.status==="loading"?"wait":"pointer",background:C.surfaceAlt,opacity:uploadState.status==="loading"?0.7:1}}>
            <div style={{fontSize:32,marginBottom:10}}>{uploadState.status==="loading"?"⏳":uploadState.status==="success"?"✅":"📄"}</div>
            <div style={{fontSize:15,fontWeight:600,color:C.textPrimary,marginBottom:4}}>
              {uploadState.status==="loading"?"Reading PDF..."
                :cv.uploaded?"✓ Text extracted from "+cv.fileName+" — click to extract from a different file"
                :"Click to upload your CV as a PDF — text will be extracted for use by the app"}
            </div>
            <div style={{fontSize:12,color:C.textHint}}></div>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{display:"none"}} onChange={function(e){var f=e.target.files[0];handleFile(f);e.target.value="";}} />
          </div>
          {uploadState.status==="success"&&<Alert type="success">{uploadState.msg} You can review it in the "Paste text" tab.</Alert>}
          {uploadState.status==="error"&&<Alert type="error">{uploadState.msg}</Alert>}
        </div>}
    </Card>
    <Card>
      <SectionTitle>Job preferences <InfoTip>These fields personalise your cover letters and AI scoring. Target roles and locations are especially important — they tell Claude what you're looking for.</InfoTip></SectionTitle>
      <div className="jt-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
        <div><Label hint="e.g. Product Designer, UX Lead">Target job titles</Label><Inp value={cv.roles||""} onChange={function(e){var v=e.target.value;setCv(function(c){return Object.assign({},c,{roles:v});});}} placeholder="e.g. Product Designer, UX Lead" /></div>
        <div><Label hint="e.g. Fintech, SaaS, Healthcare">Preferred industries</Label><Inp value={cv.industries||""} onChange={function(e){var v=e.target.value;setCv(function(c){return Object.assign({},c,{industries:v});});}} placeholder="e.g. Fintech, SaaS" /></div>
        <div><Label hint="e.g. Stockholm, Remote, Malmö">Preferred locations</Label><Inp value={cv.locations||""} onChange={function(e){var v=e.target.value;setCv(function(c){return Object.assign({},c,{locations:v});});}} placeholder="e.g. Stockholm, Remote" /></div>
        <div><Label hint="e.g. 60 000 – 90 000 SEK/month">Salary expectation</Label><Inp value={cv.salary||""} onChange={function(e){var v=e.target.value;setCv(function(c){return Object.assign({},c,{salary:v});});}} placeholder="e.g. 70 000 SEK/month" /></div>
        <div><Label hint="Remote, hybrid, or in the office?">Work type preference</Label><Sel value={cv.workType||"Any"} onChange={function(e){var v=e.target.value;setCv(function(c){return Object.assign({},c,{workType:v});}); }}>{["Any","Remote","Hybrid","On-site"].map(function(o){return <option key={o}>{o}</option>;})}</Sel></div>
      </div>
      <div style={{marginTop:16}}><Btn variant="primary" onClick={function(){alert("Profile saved!");}}>Save profile</Btn></div>
    </Card>
    <Card>
      <SectionTitle>Tools & software <span style={{fontSize:11,fontWeight:400,color:C.textHint,marginLeft:6}}>optional</span> <InfoTip>Tools and software you've used professionally — with years of experience and proficiency level. This feeds AI matching with precise signal. e.g. Figma · 6 yrs · Expert · Spotify, IKEA</InfoTip></SectionTitle>
      <InlineListEditor
        items={cv.tools||[]}
        onChange={function(v){setCv(function(c){return Object.assign({},c,{tools:v});});}}
        addLabel="Add tool"
        defaultSort={{key:"name",dir:"asc"}}
        sortFields={[{key:"name",label:"Name"},{key:"years",label:"Years"},{key:"level",label:"Level"}]}
        fields={[
          {key:"name",label:"Tool / Software",placeholder:"e.g. Figma",flex:2,minWidth:100},
          {key:"years",label:"Years",type:"number",flex:0,minWidth:60},
          {key:"level",label:"Level",type:"select",options:PROFICIENCY,flex:1,minWidth:90},
          {key:"employers",label:"Employer(s)",placeholder:"e.g. Spotify, IKEA",flex:2,minWidth:100,mobileHide:true},
        ]}
      />
    </Card>
    <Card>
      <SectionTitle>Skills & competencies <span style={{fontSize:11,fontWeight:400,color:C.textHint,marginLeft:6}}>optional</span> <InfoTip>Professional capabilities — methodologies, frameworks, soft skills. Separate from tools: "Design systems", "User research", "Stakeholder management" rather than software names.</InfoTip></SectionTitle>
      <InlineListEditor
        items={cv.skills||[]}
        onChange={function(v){setCv(function(c){return Object.assign({},c,{skills:v});});}}
        addLabel="Add skill"
        defaultSort={{key:"name",dir:"asc"}}
        sortFields={[{key:"name",label:"Name"},{key:"years",label:"Years"},{key:"level",label:"Level"}]}
        fields={[
          {key:"name",label:"Skill / Competency",placeholder:"e.g. Design systems",flex:2,minWidth:120},
          {key:"years",label:"Years",type:"number",flex:0,minWidth:60},
          {key:"level",label:"Level",type:"select",options:PROFICIENCY,flex:1,minWidth:90},
          {key:"employers",label:"Employer(s)",placeholder:"e.g. Spotify, IKEA",flex:2,minWidth:100,mobileHide:true},
        ]}
      />
    </Card>
    <Card>
      <SectionTitle>Achievements & highlights <span style={{fontSize:11,fontWeight:400,color:C.textHint,marginLeft:6}}>optional</span> <InfoTip>Specific, measurable accomplishments Claude can cite in cover letters. Be concrete: "Reduced onboarding time by 40%" beats "Improved processes". Numbers and outcomes matter most.</InfoTip></SectionTitle>
      <InlineListEditor
        items={cv.achievements||[]}
        onChange={function(v){setCv(function(c){return Object.assign({},c,{achievements:v});});}}
        addLabel="Add achievement"
        defaultSort={{key:"year",dir:"desc"}}
        sortFields={[{key:"year",label:"Year"},{key:"employer",label:"Employer"}]}
        fields={[
          {key:"description",label:"Achievement",placeholder:"e.g. Reduced onboarding time by 40%",flex:4,minWidth:180,multiline:true},
          {key:"employer",label:"Employer",placeholder:"e.g. Spotify",flex:1,minWidth:80,mobileHide:true},
          {key:"year",label:"Year",placeholder:"2022",flex:0,minWidth:60},
        ]}
      />
    </Card>
    <Card>
      <SectionTitle>Email recipients <InfoTip>Save email addresses you use often — your own, recruiters, specific contacts. When sending a cover letter or report, pick from this list. The default address is pre-selected.</InfoTip></SectionTitle>
      {recipients.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {recipients.map(function(r){return <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.surfaceAlt,borderRadius:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}{r.isDefault&&<Chip label="Default" bg={C.primaryLight} color={C.primary} />}</div>
            <div style={{fontSize:12,color:C.textSecondary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.email}</div>
          </div>
          {!r.isDefault&&<Btn onClick={function(){setDefaultRecipient(r.id);}} style={{fontSize:12,padding:"5px 10px"}}>Make default</Btn>}
          <Btn variant="danger" onClick={function(){removeRecipient(r.id);}} style={{fontSize:12,padding:"5px 10px"}}>Remove</Btn>
        </div>;})}
      </div>}
      {recipients.length===0&&<div style={{fontSize:13,color:C.textHint,fontStyle:"italic",marginBottom:14}}>No recipients saved yet. Add one below.</div>}
      <div className="jt-grid-recipient" style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"end"}}>
        <div><Label hint="e.g. Me, Alex at Spotify, General recruiter">Name or label</Label><Inp value={newRec.name} onChange={function(e){var v=e.target.value;setNewRec(function(n){return Object.assign({},n,{name:v});});}} placeholder="e.g. Me (personal)" /></div>
        <div><Label>Email</Label><Inp value={newRec.email} onChange={function(e){var v=e.target.value;setNewRec(function(n){return Object.assign({},n,{email:v});});}} placeholder="name@example.com" type="email" /></div>
        <Btn variant="primary" onClick={addRecipient} disabled={!newRec.name.trim()||!isValidEmail(newRec.email)}>+ Add</Btn>
      </div>
    </Card>
  </div>;
}

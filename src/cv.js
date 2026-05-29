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
          return <div key={item.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 8px",background:C.primaryLight,borderRadius:8,marginBottom:4}}>
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
        return <div key={item.id} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 8px",borderRadius:8,marginBottom:3,background:C.surfaceAlt}}>
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

// ─── CVProfile ────────────────────────────────────────────────────────────────
function CVProfile({cv,setCv}){
  var [tab,setTab]=useState(cv.uploaded?"upload":"paste");
  var fileRef=useRef();
  var [uploadState,setUploadState]=useState({status:"idle",msg:""});
  var recipients=cv.recipients||[];
  var [newRec,setNewRec]=useState({name:"",email:""});

  var CV_IMPORT = {
    roles:"Product Manager, Senior Product Manager, Product Operations Manager, Chief Product Officer, Product Owner, Agile Development Manager",
    industries:"SaaS, B2B Tech, E-commerce, Digital Services, Fintech",
    locations:"Malmö, Stockholm, Remote, Hybrid",
    workType:"Hybrid",
    tools:[
      {id:1,name:"Jira",years:10,level:"Expert",employers:"Clas Ohlson, Inriver"},
      {id:2,name:"Azure DevOps",years:5,level:"Advanced",employers:"Inriver"},
      {id:3,name:"Aha Roadmaps",years:3,level:"Expert",employers:"Inriver"},
      {id:4,name:"Aha Ideas",years:2,level:"Expert",employers:"Inriver"},
      {id:5,name:"Pendo",years:3,level:"Advanced",employers:"Inriver, Cool Company"},
      {id:6,name:"Confluence",years:8,level:"Advanced",employers:"Inriver, Clas Ohlson"},
      {id:7,name:"Figma",years:4,level:"Intermediate",employers:"Clas Ohlson, Inriver"},
      {id:8,name:"Miro",years:5,level:"Advanced",employers:"Clas Ohlson, Inriver, Cool Company"},
      {id:9,name:"Trello",years:6,level:"Advanced",employers:"Cool Company, Hultgren+Saksi"},
      {id:10,name:"Product Board",years:2,level:"Intermediate",employers:"Inriver"},
      {id:11,name:"InVision",years:3,level:"Intermediate",employers:"Cool Company"},
      {id:12,name:"Balsamiq",years:3,level:"Intermediate",employers:"Cool Company"},
      {id:13,name:"Contentful CMS",years:2,level:"Advanced",employers:"Clas Ohlson"},
      {id:14,name:"Adobe Campaign",years:3,level:"Advanced",employers:"Clas Ohlson"},
      {id:15,name:"Google Analytics",years:8,level:"Advanced",employers:"Cool Company, Clas Ohlson"},
      {id:16,name:"Hotjar",years:3,level:"Intermediate",employers:"Cool Company, Clas Ohlson"},
      {id:17,name:"Slack",years:8,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:18,name:"Office 365",years:10,level:"Expert",employers:"Inriver, Clas Ohlson"},
      {id:19,name:"Wordpress",years:4,level:"Intermediate",employers:"Cool Company, Hultgren+Saksi"},
      {id:20,name:"Searchmetrics",years:2,level:"Intermediate",employers:"Cool Company"},
      {id:21,name:"Mailchimp",years:3,level:"Intermediate",employers:"Cool Company"},
      {id:22,name:"inriver PIM",years:3,level:"Advanced",employers:"Clas Ohlson, Inriver"},
    ],
    skills:[
      {id:101,name:"Product Management",years:15,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:102,name:"Product Operations",years:3,level:"Expert",employers:"Inriver"},
      {id:103,name:"Agile / Scrum",years:12,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:104,name:"SAFe",years:5,level:"Advanced",employers:"Inriver, Clas Ohlson"},
      {id:105,name:"Kanban",years:10,level:"Advanced",employers:"Inriver, Cool Company, Hultgren+Saksi"},
      {id:106,name:"Product Roadmapping",years:12,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:107,name:"Backlog Management",years:12,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:108,name:"Stakeholder Management",years:15,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:109,name:"OKR / KPI frameworks",years:8,level:"Advanced",employers:"Inriver, Cool Company"},
      {id:110,name:"User Story Mapping",years:8,level:"Advanced",employers:"Inriver, Clas Ohlson"},
      {id:111,name:"Jobs To Be Done (JTBD)",years:5,level:"Advanced",employers:"Inriver, Clas Ohlson"},
      {id:112,name:"Workshop Facilitation",years:10,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:113,name:"Team Leadership & Coaching",years:15,level:"Expert",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:114,name:"Digital Strategy",years:15,level:"Expert",employers:"Cool Company, Svensk Byggtjänst"},
      {id:115,name:"SaaS Product Development",years:12,level:"Expert",employers:"Inriver, Cool Company, Svensk Byggtjänst"},
      {id:116,name:"E-commerce",years:8,level:"Advanced",employers:"Clas Ohlson, Svensk Byggtjänst"},
      {id:117,name:"Content Strategy",years:12,level:"Advanced",employers:"Cool Company, Svensk Byggtjänst, IDG"},
      {id:118,name:"Communications & Marketing",years:10,level:"Advanced",employers:"Cool Company, Mediaministeriet"},
      {id:119,name:"Recruitment",years:12,level:"Advanced",employers:"Inriver, Clas Ohlson, Cool Company"},
      {id:120,name:"Change Management",years:10,level:"Advanced",employers:"Inriver, Cool Company, Hultgren+Saksi"},
    ],
    achievements:[
      {id:201,description:"Led implementation of Aha Roadmaps and Aha Ideas as PM tools across product org, becoming Certified Aha Professional",employer:"Inriver",year:"2024"},
      {id:202,description:"Deployed Pendo for user guidance and product usage tracking across the iPMC platform",employer:"Inriver",year:"2024"},
      {id:203,description:"Implemented Voice-of-the-Customer process for product feedback across customer and partner base",employer:"Inriver",year:"2024"},
      {id:204,description:"Product Owner for Global Identity Service — authentication/authorization and access control for entire platform",employer:"Inriver",year:"2023"},
      {id:205,description:"Led development of next-gen headless e-commerce platform covering Search, CMS, PIM and DAM",employer:"Clas Ohlson",year:"2022"},
      {id:206,description:"Built and operated omni-channel loyalty/CRM platform on Adobe Campaign serving personalised newsletters, SMS and event triggers",employer:"Clas Ohlson",year:"2021"},
      {id:207,description:"Built and scaled SaaS product portfolio from startup to international markets as CPO",employer:"Cool Company",year:"2019"},
      {id:208,description:"Recruited and managed distributed cross-functional dev teams including offshore team in Lviv, Ukraine",employer:"Cool Company",year:"2018"},
      {id:209,description:"Developed Match by Cool Company MVP — freelancer/assignment matching app on iOS, Android and browser",employer:"Cool Company",year:"2017"},
      {id:210,description:"Repositioned Svensk Byggtjänst product portfolio from print to subscription-based SaaS as CTO",employer:"Svensk Byggtjänst",year:"2013"},
      {id:211,description:"Established idg.se as Sweden's primary digital hub for IT and tech — communities, e-commerce, recruiting, stock trading",employer:"IDG",year:"2001"},
    ],
  };

  var hasStructuredData=!!(( cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length));

  function importCvData(){
    if(!confirm("This will populate Tools, Skills, Achievements and profile fields from your CV analysis. Any existing entries in those sections will be replaced. Continue?")) return;
    setCv(function(c){
      return Object.assign({},c,{
        roles:c.roles||CV_IMPORT.roles,
        industries:c.industries||CV_IMPORT.industries,
        locations:c.locations||CV_IMPORT.locations,
        workType:(c.workType&&c.workType!=="Any")?c.workType:CV_IMPORT.workType,
        tools:CV_IMPORT.tools,
        skills:CV_IMPORT.skills,
        achievements:CV_IMPORT.achievements,
      });
    });
  }

  async function handleFile(f){
    if(!f) return;
    setUploadState({status:"loading",msg:"Extracting text from "+f.name+"..."});
    try{
      var text=await extractPdfText(f);
      setCv(function(c){return Object.assign({},c,{text:text,fileName:f.name,uploaded:true});});
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

  var hasText=!!(cv.text&&cv.text.trim());
  var cvCharCount=hasText?cv.text.length:0;

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {!hasStructuredData&&<Card style={{border:"2px solid "+C.primary,background:C.primaryLight}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:4}}>✨ CV analysis ready to import</div>
          <div style={{fontSize:13,color:C.textSecondary,lineHeight:1.5}}>Your CV has been analysed and structured into <b>22 tools</b>, <b>20 skills</b> and <b>11 achievements</b>. Click to populate all three sections instantly. You can edit any entry after importing.</div>
        </div>
        <Btn variant="primary" onClick={importCvData} style={{flexShrink:0,alignSelf:"center"}}>Import CV data →</Btn>
      </div>
    </Card>}
    <Card>
      <SectionTitle>Your CV <InfoTip>Your CV is used for AI match scoring and personalised cover letters. The more detail you add, the better the results. PDF files only — text-based PDFs work best.</InfoTip></SectionTitle>
      {hasText&&<Alert type="success">CV loaded · {cvCharCount.toLocaleString()} characters{cv.fileName?" · from "+cv.fileName:" · pasted text"}</Alert>}
      <div style={{display:"flex",gap:8,marginBottom:16,marginTop:hasText?14:0}}>
        {["paste","upload"].map(function(t){return <button key={t} onClick={function(){setTab(t);}} style={{padding:"8px 20px",borderRadius:10,border:"2px solid "+(tab===t?C.primary:C.border),background:tab===t?C.primaryLight:"transparent",color:tab===t?C.primary:C.textSecondary,fontSize:13,fontWeight:tab===t?700:500,cursor:"pointer"}}>{t==="paste"?"Paste text":"Upload PDF"}</button>;})}
      </div>
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
                :cv.uploaded?"✓ "+cv.fileName+" — click to replace"
                :"Click to upload your CV as a PDF"}
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

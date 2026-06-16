// components.js
// Rev: 2026-06-16 — Gabbi SVG avatar icon in sidebar and mobile nav;
//                   NAV_LABELS updated; sidebar renders SVG icons for assistant tab.

const { useState, useRef, useEffect, useCallback } = React;

// ─── Mobile helper ────────────────────────────────────────────────────────────
function mob(){ return typeof window!=="undefined"&&window.innerWidth<=767; }


// ─── Error boundary ───────────────────────────────────────────────────────────
class TabErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error:error}; }
  componentDidCatch(error,info){ console.error("Tab crashed:",error,info); }
  componentDidUpdate(prevProps){
    if(prevProps.tabKey!==this.props.tabKey&&this.state.hasError){
      this.setState({hasError:false,error:null});
    }
  }
  render(){
    if(this.state.hasError){
      return React.createElement("div",{style:{padding:"24px",textAlign:"center"}},
        React.createElement("div",{style:{fontSize:32,marginBottom:12}},"⚠️"),
        React.createElement("div",{style:{fontSize:16,fontWeight:700,color:"#C0392B",marginBottom:8}},"Something went wrong in this tab"),
        React.createElement("div",{style:{fontSize:13,color:"#5A7168",marginBottom:14,maxWidth:480,margin:"0 auto 14px"}},"Try switching to another tab and back, or reload the page. Your saved data is safe."),
        this.state.error&&React.createElement("div",{style:{fontSize:12,color:"#8FA89F",fontFamily:"monospace",background:"#F0F5F2",padding:"8px 12px",borderRadius:8,display:"inline-block",maxWidth:"90%",overflow:"auto"}},String(this.state.error.message||this.state.error))
      );
    }
    return this.props.children;
  }
}


// ─── Gabbi avatar SVG ─────────────────────────────────────────────────────────
function GabbiAvatar({size,active}){
  var s=size||24;
  var fill=active?"#FFFFFF":"#5C8A7A";
  var bg=active?"#5C8A7A":"#EAF2EF";
  // In dark mode C.primary is lighter — use currentColor approach via fill prop
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Face circle */}
    <circle cx="12" cy="12" r="11" fill={bg}/>
    {/* Left eye */}
    <ellipse cx="9" cy="10.5" rx="1.3" ry="1.5" fill={fill}/>
    {/* Right eye */}
    <ellipse cx="15" cy="10.5" rx="1.3" ry="1.5" fill={fill}/>
    {/* Smile */}
    <path d="M8.5 14.5 Q12 17.5 15.5 14.5" stroke={fill} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>;
}

// ─── Primitive UI components ──────────────────────────────────────────────────
function Card({children,style}){ var m=mob(); return <div className="jt-card" style={{background:C.surface,borderRadius:m?14:16,boxShadow:C.shadow,padding:m?"14px 16px":"20px 24px",...(style||{})}}>{children}</div>; }

function Label({children,hint}){ var m=mob(); return <div style={{marginBottom:m?8:6}}><div style={{fontSize:m?15:13,fontWeight:600,color:C.textPrimary,marginBottom:hint?2:0}}>{children}</div>{hint&&<div style={{fontSize:m?13:11,color:C.textHint,marginTop:2}}>{hint}</div>}</div>; }

function Inp({value,onChange,placeholder,type,style,inputMode,autoComplete,enterKeyHint,onBlur,onKeyDown}){
  var autoType=type==="email"?"email":type==="password"?"current-password":undefined;
  return <input type={type||"text"} value={value} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown}
    inputMode={inputMode||(type==="email"?"email":type==="number"?"decimal":undefined)}
    autoComplete={autoComplete||autoType||"off"}
    enterKeyHint={enterKeyHint}
    placeholder={placeholder||""}
    style={{width:"100%",fontSize:mob()?16:14,padding:mob()?"13px 14px":"10px 12px",minHeight:mob()?48:36,borderRadius:10,border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,boxSizing:"border-box",...(style||{})}} />;
}

function Txta({value,onChange,onBlur,placeholder,rows,style}){ var m=mob(); return <textarea value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder||""} rows={rows||4} style={{width:"100%",fontSize:m?16:14,padding:m?"13px 14px":"10px 12px",lineHeight:m?1.65:1.5,borderRadius:10,border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",...(style||{})}} />; }

function Sel({value,onChange,children,style,className}){ var m=mob(); return <select value={value} onChange={onChange} className={className||""} style={{width:"100%",fontSize:m?16:14,padding:m?"13px 14px":"10px 12px",minHeight:m?50:36,borderRadius:10,border:"1.5px solid "+C.border,background:C.surface,color:C.textPrimary,boxSizing:"border-box",...(style||{})}}>{children}</select>; }

function Btn({children,onClick,variant,disabled,style}){
  var m=mob();
  var base={fontSize:m?15:14,fontWeight:600,padding:m?"12px 18px":"10px 20px",minHeight:m?46:36,borderRadius:m?12:10,cursor:disabled?"not-allowed":"pointer",border:"none",opacity:disabled?0.5:1,...(style||{})};
  if(variant==="primary") return <button onClick={onClick} disabled={disabled} style={{...base,background:C.primary,color:"#fff"}}>{children}</button>;
  if(variant==="danger") return <button onClick={onClick} disabled={disabled} style={{...base,background:C.errorBg,color:C.error,border:"1.5px solid #F5C6C6"}}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{...base,background:C.surfaceAlt,color:C.textPrimary,border:"1.5px solid "+C.border}}>{children}</button>;
}

function Toggle({value,onChange,label,hint}){
  return <div style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}} onClick={onChange}>
    <div style={{marginTop:2,width:44,height:24,borderRadius:12,background:value?C.primary:C.border,position:"relative",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:value?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s"}} />
    </div>
    {label&&<div><div style={{fontSize:mob()?16:14,fontWeight:600,color:C.textPrimary}}>{label}</div>{hint&&<div style={{fontSize:mob()?14:12,color:C.textHint,marginTop:2,lineHeight:1.5}}>{hint}</div>}</div>}
  </div>;
}

function Chip({label,bg,color}){ return <span style={{display:"inline-block",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg||C.surfaceAlt,color:color||C.textSecondary,letterSpacing:"0.3px"}}>{label}</span>; }

function ScorePill({score,rationale,scored}){
  var bg=score>=85?C.successBg:score>=70?C.warningBg:C.errorBg;
  var col=score>=85?C.success:score>=70?C.warning:C.error;
  if(scored===false){ bg=C.surfaceAlt; col=C.textHint; }
  var tip=scored===false?"Not scored yet — add your CV, then click Rescore all":(rationale||"");
  return <span title={tip} style={{fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:20,background:bg,color:col,cursor:tip?"help":"default"}}>{scored===false?"—":score+"%"}</span>;
}

function SectionTitle({children,action}){ return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.textPrimary}}>{children}</h2>{action}</div>; }

function EmptyState({icon,title,body}){ return <div style={{textAlign:"center",padding:"40px 20px",color:C.textHint}}><div style={{fontSize:36,marginBottom:12}}>{icon}</div><div style={{fontSize:16,fontWeight:600,color:C.textSecondary,marginBottom:6}}>{title}</div><div style={{fontSize:13}}>{body}</div></div>; }

function Alert({type,children}){
  var bg=type==="success"?C.successBg:type==="error"?C.errorBg:type==="warning"?C.warningBg:C.infoBg;
  var col=type==="success"?C.success:type==="error"?C.error:type==="warning"?C.warning:C.info;
  return <div style={{fontSize:13,padding:"10px 14px",borderRadius:10,background:bg,color:col,marginTop:10}}>{children}</div>;
}

// ─── InfoTip ──────────────────────────────────────────────────────────────────
function InfoTip({children,label}){
  var [open,setOpen]=useState(false);
  var [pos,setPos]=useState({top:0,left:0});
  var btnRef=useRef(null);
  var isMobile=typeof window!=="undefined"&&window.innerWidth<=767;

  function toggle(){
    if(!open&&btnRef.current){
      var r=btnRef.current.getBoundingClientRect();
      setPos({
        top:r.bottom+6,
        left:Math.max(8,Math.min(r.left,window.innerWidth-288)),
      });
    }
    setOpen(function(v){return !v;});
  }

  useEffect(function(){
    if(!open) return;
    function handle(e){
      if(btnRef.current&&!btnRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown",handle);
    document.addEventListener("touchstart",handle);
    return function(){
      document.removeEventListener("mousedown",handle);
      document.removeEventListener("touchstart",handle);
    };
  },[open]);

  var mobile=typeof window!=="undefined"&&window.innerWidth<=767;

  var panelStyle=mobile
    ?{position:"fixed",left:0,right:0,bottom:0,zIndex:600,
       background:C.surface,borderTop:"1px solid "+C.border,
       borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",
       boxShadow:"0 -8px 32px rgba(0,0,0,0.15)",
       fontSize:14,color:C.textSecondary,lineHeight:1.7,
       maxHeight:"60vh",overflowY:"auto"}
    :{position:"fixed",top:pos.top,left:pos.left,zIndex:600,
       width:280,background:C.surface,
       border:"1px solid "+C.border,
       borderRadius:12,padding:"14px 16px",
       boxShadow:C.shadowMd,
       fontSize:13,color:C.textSecondary,lineHeight:1.65};

  return <span style={{display:"inline-block",verticalAlign:"middle",position:"relative"}}>
    <button ref={btnRef} onClick={toggle}
      title={open?"Hide info":"Show info"}
      style={{background:"none",border:"none",cursor:"pointer",
        color:open?C.info:C.textHint,
        fontSize:15,padding:"0 4px",lineHeight:1,
        verticalAlign:"middle",fontWeight:open?700:400,
        minWidth:24,minHeight:24,
        display:"inline-flex",alignItems:"center",gap:3}}>
      {label&&<span style={{fontSize:11,verticalAlign:"middle"}}>{label}</span>}
      <span style={{fontSize:16}}>ⓘ</span>
    </button>
    {open&&<React.Fragment>
      {mobile&&<div onClick={function(){setOpen(false);}}
        style={{position:"fixed",inset:0,zIndex:599,background:"rgba(0,0,0,0.3)"}} />}
      <div style={panelStyle}>
        {mobile&&<div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}} />}
        {children}
        {mobile&&<button onClick={function(){setOpen(false);}}
          style={{marginTop:16,width:"100%",padding:"12px",borderRadius:10,
            border:"none",background:C.primaryLight,color:C.primary,
            fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          Done
        </button>}
      </div>
    </React.Fragment>}
  </span>;
}

// ─── EmailDialog ──────────────────────────────────────────────────────────────
function EmailDialog({recipients,subject,body,onClose,onCopy}){
  var defaultRec=(recipients||[]).find(function(r){return r.isDefault;});
  var [selectedId,setSelectedId]=useState(defaultRec?defaultRec.id:"custom");
  var [customEmail,setCustomEmail]=useState("");
  var [editSubject,setEditSubject]=useState(subject||"");
  var to=selectedId==="custom"?customEmail.trim():(recipients.find(function(r){return r.id===selectedId;})||{}).email||"";
  var emailValid=isValidEmail(to);
  var bodyTooLong=(body||"").length>MAILTO_SAFE_LEN;
  function send(){
    if(!emailValid) return;
    var url=buildMailto(to,editSubject,body);
    window.location.href=url;
  }
  return <div style={{background:C.surfaceAlt,borderRadius:12,padding:"16px",marginTop:14,border:"1.5px solid "+C.border}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{fontSize:14,fontWeight:700,color:C.textPrimary}}>Send via email</div>
      <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:C.textHint,cursor:"pointer",padding:0,lineHeight:1}}>×</button>
    </div>
    <div style={{fontSize:12,color:C.textHint,marginBottom:12}}>This will open your email app with the content pre-filled. You can edit before sending.</div>
    {recipients&&recipients.length>0&&<div style={{marginBottom:10}}>
      <Label>Send to</Label>
      <Sel value={selectedId} onChange={function(e){setSelectedId(e.target.value);}}>
        {recipients.map(function(r){return <option key={r.id} value={r.id}>{r.name} — {r.email}{r.isDefault?" (default)":""}</option>;})}
        <option value="custom">Other email address...</option>
      </Sel>
    </div>}
    {(selectedId==="custom"||!recipients||!recipients.length)&&<div style={{marginBottom:10}}>
      <Label hint="Type the recipient's email address.">Recipient email</Label>
      <Inp value={customEmail} onChange={function(e){setCustomEmail(e.target.value);}} placeholder="name@example.com" type="email" />
    </div>}
    <div style={{marginBottom:12}}>
      <Label>Subject</Label>
      <Inp value={editSubject} onChange={function(e){setEditSubject(e.target.value);}} />
    </div>
    {bodyTooLong&&<Alert type="warning">This message is long ({(body||"").length.toLocaleString()} chars). Some email clients truncate mailto: links. If the body is cut off, use "Copy message" instead and paste it in manually.</Alert>}
    {!emailValid&&to.length>0&&<Alert type="error">That doesn't look like a valid email address.</Alert>}
    <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
      <Btn variant="primary" onClick={send} disabled={!emailValid}>Open in email app →</Btn>
      <Btn onClick={function(){navigator.clipboard.writeText(body||"");if(onCopy) onCopy();}}>Copy message</Btn>
      <Btn onClick={onClose}>Cancel</Btn>
    </div>
  </div>;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({activeTab,setActiveTab,collapsed,setCollapsed,mobileOpen,setMobileOpen,user,onSignOut,theme,setTheme}){
  function pickTab(id){
    setActiveTab(id);
    if(setMobileOpen) setMobileOpen(false);
  }
  var groupedTabs=TAB_GROUPS.map(function(g){
    return{group:g,tabs:TABS.filter(function(t){return t.group===g.id;})};
  }).filter(function(gp){return gp.tabs.length>0;});

  var sidebarClass="jt-sidebar"+(collapsed?" collapsed":"")+(mobileOpen?" open":"");
  return <React.Fragment>
    <div className={"jt-sidebar-overlay"+(mobileOpen?" open":"")} onClick={function(){setMobileOpen(false);}} />
    <nav className={sidebarClass} aria-label="Primary navigation">
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 14px 12px 14px",borderBottom:"1px solid "+C.border,minHeight:56,flexShrink:0}}>
        <div style={{width:34,height:34,borderRadius:10,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🌿</div>
        {!collapsed&&<div style={{flex:1,minWidth:0,overflow:"hidden"}}>
          <div style={{fontSize:14,fontWeight:800,color:C.textPrimary,letterSpacing:"-0.3px",whiteSpace:"nowrap"}}>Job Tracker</div>
          <div style={{fontSize:10,color:C.textHint,fontWeight:500,whiteSpace:"nowrap"}}>AI-powered assistant</div>
        </div>}
      </div>

      <div className="jt-sidebar-scroll">
        {groupedTabs.map(function(gp,i){
          return <div key={gp.group.id} style={{marginBottom:4}}>
            {!collapsed&&<div style={{fontSize:10,fontWeight:700,color:C.textHint,letterSpacing:"0.8px",textTransform:"uppercase",padding:"12px 18px 6px"}}>{gp.group.label}</div>}
            {collapsed&&i>0&&<div style={{height:1,background:C.border,margin:"8px 12px"}} />}
            {gp.tabs.map(function(t){
              var on=activeTab===t.id;
              return <button key={t.id} className={"jt-sb-item"+(on?" active":"")} onClick={function(){pickTab(t.id);}} title={collapsed?t.label:""} style={{display:"flex",alignItems:"center",gap:12,width:"calc(100% - 12px)",margin:"2px 6px",padding:collapsed?"10px":"10px 12px",border:"none",borderRadius:8,background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,fontWeight:on?700:500,fontSize:13,cursor:"pointer",textAlign:"left",justifyContent:collapsed?"center":"flex-start"}}>
                <span style={{fontSize:18,lineHeight:1,flexShrink:0,width:24,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {t.icon==="gabbi"?<GabbiAvatar size={20} active={on} />:t.icon}
                </span>
                {!collapsed&&<span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.label}</span>}
              </button>;
            })}
          </div>;
        })}
      </div>

      {user&&<div style={{borderTop:"1px solid "+C.border,padding:"10px 8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,background:C.surfaceAlt,marginBottom:6}}>
          {user.photoURL
            ?<img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{width:28,height:28,borderRadius:"50%",flexShrink:0,objectFit:"cover"}} />
            :<div style={{width:28,height:28,borderRadius:"50%",background:C.primary,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{(user.displayName||user.email||"?").slice(0,1).toUpperCase()}</div>}
          {!collapsed&&<div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <div style={{fontSize:12,fontWeight:600,color:C.textPrimary,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.displayName||"Signed in"}</div>
            <div style={{fontSize:10,color:C.textHint,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div>
          </div>}
        </div>
        <button onClick={onSignOut} title={collapsed?"Sign out":""} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"7px 10px",border:"none",borderRadius:8,background:"transparent",color:C.textHint,cursor:"pointer",justifyContent:collapsed?"center":"flex-start",fontSize:12}}>
          <span style={{fontSize:14,lineHeight:1,flexShrink:0,width:24,textAlign:"center"}}>↩</span>
          {!collapsed&&<span>Sign out</span>}
        </button>
      </div>}

      <div style={{borderTop:"1px solid "+C.border,padding:"8px"}}>
        {setTheme&&<button onClick={function(){setTheme(theme==="dark"?"light":"dark");}} title={collapsed?(theme==="dark"?"Switch to light":"Switch to dark"):""} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"8px 10px",border:"none",borderRadius:8,background:"transparent",color:C.textHint,cursor:"pointer",justifyContent:collapsed?"center":"flex-start",fontSize:13,marginBottom:2}}>
          <span style={{fontSize:14,lineHeight:1,flexShrink:0,width:24,textAlign:"center"}}>{theme==="dark"?"☀️":"🌙"}</span>
          {!collapsed&&<span>{theme==="dark"?"Light mode":"Dark mode"}</span>}
        </button>}
        <button onClick={function(){setCollapsed(function(v){return !v;});}} title={collapsed?"Expand sidebar":"Collapse sidebar"} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"8px 10px",border:"none",borderRadius:8,background:"transparent",color:C.textHint,cursor:"pointer",justifyContent:collapsed?"center":"flex-start",fontSize:13}}>
          <span style={{fontSize:16,lineHeight:1,flexShrink:0,width:24,textAlign:"center"}}>{collapsed?"»":"«"}</span>
          {!collapsed&&<span>Collapse</span>}
        </button>
      </div>
    </nav>
  </React.Fragment>;
}

// ─── SVG icons for mobile bottom nav ─────────────────────────────────────────
const NAV_ICONS = {
  dashboard: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  jobs:      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  profiles:  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>,
  assistant: <GabbiAvatar size={24} />,
  cv:        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>,
  scheduler: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  covers:    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  reports:   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  more:      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>,
};

const NAV_LABELS = {
  dashboard:"Dashboard",jobs:"My Jobs",profiles:"Search",
  assistant:"Gabbi",cv:"My CV",scheduler:"Schedule",
  covers:"Letters",reports:"Reports",
};

const PRIMARY_TABS = ["dashboard","jobs","profiles","covers","assistant"];
const SECONDARY_TABS = ["scheduler","cv","reports"];

// ─── MobileBottomNav ──────────────────────────────────────────────────────────
function MobileBottomNav({activeTab,setActiveTab,user,onSignOut,theme,setTheme}){
  var [moreOpen,setMoreOpen]=useState(false);
  var inMore=SECONDARY_TABS.includes(activeTab);

  function go(id){ setActiveTab(id); setMoreOpen(false); }

  var primaryTabs=TABS.filter(function(t){return PRIMARY_TABS.includes(t.id);});
  var secondaryTabs=TABS.filter(function(t){return SECONDARY_TABS.includes(t.id);});

  return <React.Fragment>
    {moreOpen&&<div className="jt-more-sheet-overlay" onClick={function(){setMoreOpen(false);}} />}
    {moreOpen&&<div className="jt-more-sheet">
      <div style={{padding:"8px 20px 16px",borderBottom:"1px solid "+C.border,marginBottom:4}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
          {secondaryTabs.map(function(t){
            var active=activeTab===t.id;
            return <button key={t.id} onClick={function(){go(t.id);}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                padding:"16px 8px",borderRadius:14,border:"none",
                background:active?C.primaryLight:"transparent",
                color:active?C.primary:C.textSecondary,
                cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?700:500}}>
              <span style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {NAV_ICONS[t.id]||null}
              </span>
              <span style={{lineHeight:1.3,textAlign:"center"}}>{t.label}</span>
            </button>;
          })}
        </div>
      </div>
      {user&&<div style={{padding:"10px 20px 16px",display:"flex",alignItems:"center",gap:12}}>
        {user.photoURL
          ?<img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{width:36,height:36,borderRadius:"50%",flexShrink:0}} />
          :<div style={{width:36,height:36,borderRadius:"50%",background:C.primary,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{(user.displayName||user.email||"?").slice(0,1).toUpperCase()}</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:C.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.displayName||"Signed in"}</div>
          <div style={{fontSize:11,color:C.textHint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        </div>
        <button onClick={function(){setTheme&&setTheme(theme==="dark"?"light":"dark");}}
          style={{background:"none",border:"1px solid "+C.border,borderRadius:10,
            padding:"0",cursor:"pointer",color:C.textHint,
            width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
          {theme==="dark"?"☀️":"🌙"}
        </button>
        <button onClick={function(){setMoreOpen(false);if(onSignOut)onSignOut();}}
          style={{background:"none",border:"1px solid "+C.border,borderRadius:10,
            padding:"0 12px",cursor:"pointer",fontSize:12,color:C.textHint,
            fontFamily:"inherit",height:44,whiteSpace:"nowrap"}}>
          Sign out
        </button>
      </div>}
    </div>}
    <nav className="jt-bottom-nav">
      {primaryTabs.map(function(t){
        var active=activeTab===t.id&&!moreOpen;
        return <button key={t.id} className={"jt-bottom-nav-item"+(active?" active":"")} onClick={function(){go(t.id);}}>
          <span className="jt-bottom-nav-icon">
            {t.id==="assistant"?<GabbiAvatar size={24} active={active} />:(NAV_ICONS[t.id]||null)}
          </span>
          <span className="jt-bottom-nav-label">{NAV_LABELS[t.id]||t.label}</span>
        </button>;
      })}
      <button className={"jt-bottom-nav-item"+(moreOpen||inMore?" active":"")}
        onClick={function(){setMoreOpen(function(v){return !v;});}}>
        <span className="jt-bottom-nav-icon">{NAV_ICONS.more}</span>
        <span className="jt-bottom-nav-label">More</span>
      </button>
    </nav>
  </React.Fragment>;
}

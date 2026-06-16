// utils.js
// Rev: 2026-06-10 — BUG1+6: scoreJobs() now accepts object {jobs,cv,apiKey,onBatch};
//                   BUG5: filterByLocation remote keyword fallback.
// Rev: 2026-06-11 — scoreJobs continues on batch failure instead of aborting;
//                   returns {result, failedBatches} so callers can surface partial errors.
// Rev: 2026-06-16 — cvSummaryText: numbered lists for tools, skills, achievements
//                   so Gabbi can reference items by index number.

// ─── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "jobTracker.v1";
const STORAGE_VERSION = 1;

function loadState(){
  try{
    var raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    var parsed=JSON.parse(raw);
    if(parsed.version!==STORAGE_VERSION) return null;
    return parsed.data||null;
  }catch(e){
    console.warn("Failed to load saved state:",e);
    return null;
  }
}

function saveState(data){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({version:STORAGE_VERSION,data:data,savedAt:Date.now()}));
  }catch(e){
    console.warn("Failed to save state:",e);
  }
}

function clearState(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
}

// ─── Cloud sync (Firestore) ───────────────────────────────────────────────────
function fbReady(){ return !!(window.firebaseSdk&&window.__firebaseReady); }

var _cloudSaveTimer=null;
var _cloudSavePending=null;
function cloudSave(uid,data,opts){
  if(!fbReady()||!uid) return;
  _cloudSavePending=data;
  if(_cloudSaveTimer) clearTimeout(_cloudSaveTimer);
  var delay=(opts&&opts.immediate)?0:600;
  _cloudSaveTimer=setTimeout(function(){
    var sdk=window.firebaseSdk;
    var ref=sdk.doc(sdk.db,"users",uid);
    var payload={data:_cloudSavePending,updatedAt:Date.now(),schemaVersion:STORAGE_VERSION};
    var dataToWrite=_cloudSavePending;
    _cloudSaveTimer=null;
    _cloudSavePending=null;
    function attempt(retriesLeft){
      sdk.setDoc(ref,payload).then(function(){
        console.log("[CloudSync] Write confirmed. cv.tools:", dataToWrite.cv&&dataToWrite.cv.tools&&dataToWrite.cv.tools.length);
      }).catch(function(err){
        console.warn("Cloud save failed (retries left: "+retriesLeft+"):",err.message||err.code);
        if(retriesLeft>0){
          setTimeout(function(){ attempt(retriesLeft-1); }, 1500);
        }
      });
    }
    attempt(3);
  },delay);
}

function cloudSubscribe(uid,onData,onError){
  if(!fbReady()||!uid) return function(){};
  var sdk=window.firebaseSdk;
  var ref=sdk.doc(sdk.db,"users",uid);
  return sdk.onSnapshot(ref,function(snap){
    if(snap.exists()){
      var v=snap.data();
      onData(v.data||null);
    }else{
      onData(null);
    }
  },function(err){
    console.warn("Cloud subscribe error:",err);
    if(onError) onError(err);
  });
}

function cloudDelete(uid){
  if(!fbReady()||!uid) return Promise.resolve();
  var sdk=window.firebaseSdk;
  var ref=sdk.doc(sdk.db,"users",uid);
  return sdk.deleteDoc(ref).catch(function(err){
    console.warn("Cloud delete failed:",err);
  });
}

function pick(saved,key,fallback){
  if(saved&&Object.prototype.hasOwnProperty.call(saved,key)) return saved[key];
  return fallback;
}

// ─── Network helpers ──────────────────────────────────────────────────────────
const PROXY_FALLBACK = "https://corsproxy.io/?";

async function smartFetch(url,options){
  try{
    var res=await fetch(url,options);
    return{response:res,viaProxy:false};
  }catch(directErr){
    try{
      var res2=await fetch(PROXY_FALLBACK+encodeURIComponent(url),options);
      return{response:res2,viaProxy:true};
    }catch(proxyErr){
      throw new Error("Both direct and proxy requests failed. Direct: "+directErr.message+" · Proxy: "+proxyErr.message);
    }
  }
}

// ─── Email helpers ────────────────────────────────────────────────────────────
const MAILTO_SAFE_LEN = 1800;

function buildMailto(to,subject,body){
  var params=[];
  if(subject) params.push("subject="+encodeURIComponent(subject));
  if(body) params.push("body="+encodeURIComponent(body));
  return "mailto:"+encodeURIComponent(to||"")+(params.length?"?"+params.join("&"):"");
}

function isValidEmail(e){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e||"").trim());
}

// ─── Job search helpers ───────────────────────────────────────────────────────
function matchesSearch(job,query){
  var q=(query||"").trim().toLowerCase();
  if(!q) return true;
  var haystack=[
    job.title,job.company,job.location,job.source,
    job.description,job.employmentType,job.salary,job.notes,
    (job.tags||[]).join(" ")
  ].filter(Boolean).join(" ").toLowerCase();
  var tokens=q.split(/\s+/);
  for(var i=0;i<tokens.length;i++){
    if(haystack.indexOf(tokens[i])===-1) return false;
  }
  return true;
}

// ─── Location filtering ───────────────────────────────────────────────────────
function resolveLocation(locStr){
  if(!locStr) return null;
  var parts=locStr.split(",").map(function(s){return s.trim();});
  for(var i=0;i<parts.length;i++){
    var c=LOCATION_ALIAS_MAP[parts[i].toLowerCase()];
    if(c) return c;
  }
  return null;
}

function filterByLocation(jobs,profileLocations){
  if(!profileLocations||!profileLocations.length) return jobs;
  var wantsRemote=profileLocations.includes("Remote");
  var cityFilters=profileLocations.filter(function(l){return l!=="Remote";});
  return jobs.filter(function(j){
    if(wantsRemote){
      // j.remote===true is the clean signal, but AF API often returns null
      // even for remote-friendly roles. Fall back to location string check.
      if(j.remote===true) return true;
      var locLower=(j.location||"").toLowerCase();
      // Both checks inside the wantsRemote block — don't bleed into city-only profiles
      if(locLower.indexOf("remote")!==-1||locLower.indexOf("distans")!==-1) return true;
      // If we want remote but this job doesn't qualify, still allow it through
      // if it also matches a city filter (mixed remote+city profile)
      if(!cityFilters.length) return false;
      return !!cityFilters.find(function(loc){return resolveLocation(j.location)===loc;});
    }
    if(!cityFilters.length) return false;
    return !!cityFilters.find(function(loc){return resolveLocation(j.location)===loc;});
  });
}

// ─── Job sort ─────────────────────────────────────────────────────────────────
function sortJobs(jobs,sort){
  var arr=jobs.slice();
  var today=new Date().toISOString().slice(0,10);
  arr.sort(function(a,b){
    if(sort==="added_desc") return (b.date||"").localeCompare(a.date||"");
    if(sort==="added_asc") return (a.date||"").localeCompare(b.date||"");
    if(sort==="score_desc"){
      var au=a.scored===false?1:0, bu=b.scored===false?1:0;
      if(au!==bu) return au-bu;
      return (b.score||0)-(a.score||0);
    }
    if(sort==="deadline_asc"){
      var ad=a.deadline||"", bd=b.deadline||"";
      if(!ad&&!bd) return 0;
      if(!ad) return 1;
      if(!bd) return -1;
      var ap=ad<today?1:0, bp=bd<today?1:0;
      if(ap!==bp) return ap-bp;
      return ad.localeCompare(bd);
    }
    if(sort==="company_asc") return (a.company||"").localeCompare(b.company||"");
    return 0;
  });
  return arr;
}

// ─── Job normalisation ────────────────────────────────────────────────────────
function mapAfJob(a,profileName){
  var addr=a.workplace_address||{};
  var locParts=[addr.municipality,addr.region,addr.country].filter(Boolean);
  var loc=locParts.length?locParts.join(", "):"Sweden";
  var employer=a.employer||{};
  var applyUrl=(a.application_details&&a.application_details.url)||a.webpage_url||null;
  var salary=a.salary_description||(a.salary_type&&a.salary_type.label)||null;
  var empType=(a.employment_type&&a.employment_type.label)||null;
  var workType=(a.working_hours_type&&a.working_hours_type.label)||null;
  var remote=typeof a.remote==="boolean"?a.remote:(a.remote_work===true?true:null);
  return {
    id:a.id||Date.now()+Math.random(),
    title:a.headline||"Untitled",
    company:employer.name||employer.workplace||"Unknown",
    location:loc,
    status:"New",
    score:NEUTRAL_SCORE,scored:false,rationale:"",
    source:"Arbetsförmedlingen",sourceType:"af",
    date:(a.publication_date||new Date().toISOString()).slice(0,10),
    lang:"Swedish",
    tags:[profileName,empType,workType].filter(Boolean),
    url:a.webpage_url||null,
    description:(a.description&&(a.description.text||a.description.text_formatted))||"",
    applyUrl:applyUrl,
    deadline:a.application_deadline?a.application_deadline.slice(0,10):null,
    employmentType:empType,
    salary:salary,
    remote:remote,
    employerUrl:employer.url||null,
  };
}

function mapJsJob(a,profileName){
  var locParts=[a.job_city,a.job_state,a.job_country].filter(Boolean);
  var loc=locParts.length?locParts.join(", "):"Unknown";
  var salary=null;
  if(a.job_salary_min||a.job_salary_max){
    var cur=a.job_salary_currency||"";
    var per=a.job_salary_period?" / "+a.job_salary_period.toLowerCase():"";
    if(a.job_salary_min&&a.job_salary_max) salary=a.job_salary_min+"–"+a.job_salary_max+" "+cur+per;
    else salary=(a.job_salary_min||a.job_salary_max)+" "+cur+per;
    salary=salary.trim();
  }
  return {
    id:a.job_id||Date.now()+Math.random(),
    title:a.job_title||"Untitled",
    company:a.employer_name||"Unknown",
    location:loc,
    status:"New",
    score:NEUTRAL_SCORE,scored:false,rationale:"",
    source:a.job_publisher||"JSearch",sourceType:"jsearch",
    date:a.job_posted_at_datetime_utc?a.job_posted_at_datetime_utc.slice(0,10):new Date().toISOString().slice(0,10),
    lang:"English",
    tags:[profileName,a.job_employment_type].filter(Boolean),
    url:a.job_apply_link||null,
    description:a.job_description||"",
    applyUrl:a.job_apply_link||null,
    deadline:a.job_offer_expiration_datetime_utc?a.job_offer_expiration_datetime_utc.slice(0,10):null,
    employmentType:a.job_employment_type||null,
    salary:salary,
    remote:typeof a.job_is_remote==="boolean"?a.job_is_remote:null,
    employerUrl:a.employer_website||null,
  };
}

// ─── PDF text extraction ──────────────────────────────────────────────────────
async function extractPdfText(file){
  if(!window.pdfjsLib) throw new Error("PDF library not loaded. Check your internet connection and reload.");
  var buffer=await file.arrayBuffer();
  var loadingTask=window.pdfjsLib.getDocument({data:new Uint8Array(buffer)});
  var pdf=await loadingTask.promise;
  var pages=[];
  for(var i=1;i<=pdf.numPages;i++){
    var page=await pdf.getPage(i);
    var content=await page.getTextContent();
    var lastY=null;
    var line=[];
    var lines=[];
    for(var k=0;k<content.items.length;k++){
      var it=content.items[k];
      if(!it.str) continue;
      var y=it.transform?it.transform[5]:null;
      if(lastY!==null&&y!==null&&Math.abs(y-lastY)>1){
        lines.push(line.join(" "));
        line=[];
      }
      line.push(it.str);
      lastY=y;
    }
    if(line.length) lines.push(line.join(" "));
    pages.push(lines.join("\n"));
  }
  var text=pages.join("\n\n").trim();
  if(!text) throw new Error("No text found in this PDF. It may be a scanned/image-based PDF that needs OCR. Try pasting the CV text directly instead.");
  return text;
}

// ─── CV helpers ───────────────────────────────────────────────────────────────
function cvSummaryText(cv){
  if(!cv) return "";
  var parts=[];
  if(cv.text) parts.push("CV:\n"+cv.text.slice(0,4000));
  if(cv.roles) parts.push("Target roles: "+cv.roles);
  if(cv.industries) parts.push("Preferred industries: "+cv.industries);
  if(cv.locations) parts.push("Preferred locations: "+cv.locations);
  if(cv.workType&&cv.workType!=="Any") parts.push("Work type preference: "+cv.workType);
  if(cv.salary) parts.push("Salary expectation: "+cv.salary);
  if(cv.tools&&cv.tools.length){
    parts.push("TOOLS & SOFTWARE (reference by number):\n"+cv.tools.map(function(t,i){
      var base=(i+1)+". "+t.name+" ("+t.years+" yr"+(t.years!==1?"s":"")+", "+t.level+")";
      return t.employers?base+" — "+t.employers:base;
    }).join("\n"));
  }
  if(cv.skills&&cv.skills.length){
    parts.push("SKILLS & COMPETENCIES (reference by number):\n"+cv.skills.map(function(s,i){
      var base=(i+1)+". "+s.name+" ("+s.years+" yr"+(s.years!==1?"s":"")+", "+s.level+")";
      return s.employers?base+" — "+s.employers:base;
    }).join("\n"));
  }
  if(cv.achievements&&cv.achievements.length){
    parts.push("KEY ACHIEVEMENTS (reference by number):\n"+cv.achievements.map(function(a,i){
      var line=(i+1)+". "+a.description;
      if(a.employer) line+=" @ "+a.employer;
      if(a.year) line+=" ("+a.year+")";
      return line;
    }).join("\n"));
  }
  return parts.join("\n\n");
}

function hasCv(cv){ return !!(cv&&(cv.text||cv.roles||cv.industries||cv.locations||(cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length))); }

// ─── PDF export (cover letters) ───────────────────────────────────────────────
function extractApplicantName(cv){
  if(!cv||!cv.text) return null;
  var lines=cv.text.split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean);
  if(!lines.length) return null;
  var first=lines[0];
  first=first.replace(/^#+\s*/,"").trim();
  if(first.length>80) return null;
  if(/[@:/\\\d]/.test(first)) return null;
  if(/\b(CV|Resume|Curriculum|Profile|Summary|Experience|Skills|Education)\b/i.test(first)) return null;
  var words=first.split(/\s+/);
  if(words.length<2||words.length>5) return null;
  var nameShaped=words.every(function(w){return /^[A-ZÅÄÖÉÈÀÁÍÓÚÑÆØ][a-zåäöéèàáíóúñæøA-Z\-']+$/.test(w);});
  if(!nameShaped) return null;
  return first;
}

function exportLetterPdf({letter,cv,job}){
  if(!letter||!letter.trim()) return;
  var name=extractApplicantName(cv);
  var today=new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  var recipient="";
  if(job){
    recipient=job.company?job.company:"";
    if(job.title) recipient+=(recipient?" — ":"")+"Re: "+job.title;
  }
  function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  var paragraphs=letter.split(/\n\s*\n/).map(function(p){
    return "<p>"+esc(p).replace(/\n/g,"<br>")+"</p>";
  }).join("\n");
  var docTitle=(name?name+" — ":"")+"Cover letter"+(job&&job.company?" — "+job.company:"");
  var html=
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>"+esc(docTitle)+"</title>"+
    "<style>"+
    "@page{size:A4;margin:22mm 22mm 22mm 22mm}"+
    "html,body{background:#fff}"+
    "body{font-family:Georgia,'Times New Roman',serif;font-size:11.5pt;line-height:1.55;color:#1a1a1a;margin:0;padding:0}"+
    ".letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:14px;border-bottom:1px solid #d0d0d0}"+
    ".letterhead .sender{font-weight:600;font-size:13pt;color:#1a1a1a}"+
    ".letterhead .date{font-size:10.5pt;color:#555}"+
    ".recipient{margin-bottom:28px;font-size:10.5pt;color:#555}"+
    "p{margin:0 0 12px 0;text-align:left;hyphens:auto;word-break:normal;overflow-wrap:break-word}"+
    "p:last-child{margin-bottom:0}"+
    "@media print{.no-print{display:none}}"+
    ".no-print{position:fixed;top:10px;right:10px;background:#5C8A7A;color:#fff;padding:10px 16px;border-radius:8px;font-family:sans-serif;font-size:13px;cursor:pointer;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.2)}"+
    "</style></head><body>"+
    "<button class=\"no-print\" onclick=\"window.print()\">Print / Save as PDF</button>"+
    "<div class=\"letterhead\">"+
    "<div class=\"sender\">"+esc(name||"")+"</div>"+
    "<div class=\"date\">"+esc(today)+"</div>"+
    "</div>"+
    (recipient?"<div class=\"recipient\">"+esc(recipient)+"</div>":"")+
    paragraphs+
    "</body></html>";
  var w=window.open("","_blank");
  if(!w){
    alert("Your browser blocked the PDF window. Allow pop-ups for this page and try again.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(function(){
    try{ w.focus(); w.print(); }catch(e){}
  },250);
}

// ─── Claude API helpers ───────────────────────────────────────────────────────
async function callClaude({apiKey,prompt,maxTokens}){
  if(!apiKey){
    throw new Error("No Anthropic API key set. Add one in Search Profiles → API keys.");
  }
  var res;
  try{
    res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key":apiKey,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true",
      },
      body:JSON.stringify({
        model:CLAUDE_MODEL,
        max_tokens:maxTokens||1000,
        messages:[{role:"user",content:prompt}],
      }),
    });
  }catch(networkErr){
    throw new Error("Network error calling Claude API: "+networkErr.message+". Check your internet connection.");
  }
  if(!res.ok){
    var body="";
    try{ body=await res.text(); }catch(e){}
    if(res.status===401) throw new Error("401 Unauthorized — your Anthropic API key is missing or invalid.");
    if(res.status===403) throw new Error("403 Forbidden — your API key does not have access to this model, or billing is not set up.");
    if(res.status===429) throw new Error("429 Rate limited — too many requests, try again in a moment.");
    if(res.status===400) throw new Error("400 Bad Request — "+(body?body.slice(0,200):"request was rejected by the API."));
    throw new Error("Claude API error "+res.status+(body?": "+body.slice(0,200):""));
  }
  var data=await res.json();
  var text=(data.content&&data.content[0]&&data.content[0].text)||"";
  if(!text) throw new Error("Empty response from Claude API.");
  return text;
}

async function callClaudeChat({apiKey,system,messages,maxTokens}){
  if(!apiKey) throw new Error("No Anthropic API key set. Add one in Search Profiles → API keys.");
  var res;
  try{
    res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key":apiKey,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true",
      },
      body:JSON.stringify({
        model:CLAUDE_MODEL,
        max_tokens:maxTokens||1200,
        system:system,
        messages:messages,
      }),
    });
  }catch(networkErr){
    throw new Error("Network error calling Claude API: "+networkErr.message);
  }
  if(!res.ok){
    var body="";
    try{ body=await res.text(); }catch(e){}
    if(res.status===401) throw new Error("401 Unauthorized — your Anthropic API key is missing or invalid.");
    if(res.status===403) throw new Error("403 Forbidden — check API key and billing.");
    if(res.status===429) throw new Error("429 Rate limited — try again in a moment.");
    throw new Error("Claude API error "+res.status+(body?": "+body.slice(0,200):""));
  }
  var data=await res.json();
  var text=(data.content&&data.content[0]&&data.content[0].text)||"";
  if(!text) throw new Error("Empty response from Claude API.");
  return text;
}

// ─── AI scoring helpers ───────────────────────────────────────────────────────
async function scoreJobBatch(jobs,cv,anthropicKey){
  var jobList=jobs.map(function(j,i){
    var line=(i+1)+'. id="'+String(j.id)+'" | '+j.title+" at "+j.company+" | "+j.location;
    if(j.employmentType) line+=" | "+j.employmentType;
    if(j.salary) line+=" | "+j.salary;
    if(j.tags&&j.tags.length) line+=" | tags: "+j.tags.join(", ");
    if(j.description){
      var desc=j.description.slice(0,1500).replace(/\s+/g," ").trim();
      line+="\n   Description: "+desc;
    }
    return line;
  }).join("\n");

  var prompt="You are an expert career coach scoring how well each job matches this candidate.\n\n"+
    "CANDIDATE:\n"+cvSummaryText(cv)+"\n\n"+
    "JOBS TO SCORE:\n"+jobList+"\n\n"+
    "For each job, produce a match score from 0 to 100 (integer) and a single-sentence rationale "+
    "(max ~12 words) explaining the main reason for the score. Consider: role fit, skills overlap, "+
    "location fit, industry, seniority, and work-type preference.\n\n"+
    'Return ONLY a JSON array, no markdown fences, no preamble. Each id MUST be a STRING, copied verbatim from the id="..." value given. Format:\n'+
    '[{"id": "<exact id string>", "score": <0-100>, "rationale": "<short reason>"}, ...]\n'+
    "One object per job, in the same order.";

  var text=await callClaude({apiKey:anthropicKey,prompt:prompt,maxTokens:1500});
  text=text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```\s*$/,"").trim();
  var parsed=JSON.parse(text);
  if(!Array.isArray(parsed)) throw new Error("Expected JSON array from Claude");
  return parsed;
}

async function scoreJobs(opts,_cv,_apiKey){
  // Accept both object form {jobs,cv,apiKey,onBatch} and legacy positional form
  var jobs, cv, apiKey, onBatch;
  if(opts&&typeof opts==="object"&&!Array.isArray(opts)&&opts.jobs){
    jobs=opts.jobs; cv=opts.cv; apiKey=opts.apiKey; onBatch=opts.onBatch;
  } else {
    jobs=opts; cv=_cv; apiKey=_apiKey; onBatch=null;
  }
  if(!jobs||!jobs.length) return new Map();
  if(!hasCv(cv)) return new Map();
  var result=new Map();
  var doneCount=0;
  var failedBatches=0;
  for(var i=0;i<jobs.length;i+=BATCH_SIZE){
    var batch=jobs.slice(i,i+BATCH_SIZE);
    try{
      var scored=await scoreJobBatch(batch,cv,apiKey);
      var batchResults=[];
      scored.forEach(function(s){
        if(s&&s.id!==undefined&&s.id!==null){
          var score=Math.max(0,Math.min(100,Math.round(Number(s.score)||0)));
          var entry={id:String(s.id),score:score,rationale:(s.rationale||"").toString().slice(0,120)};
          result.set(String(s.id),entry);
          batchResults.push(entry);
        }
      });
      doneCount+=batch.length;
      if(onBatch) onBatch(batchResults,doneCount);
    }catch(e){
      // Continue scoring remaining batches rather than aborting entirely.
      // Jobs in this batch remain scored:false.
      console.warn("Batch scoring failed (batch "+(i/BATCH_SIZE+1)+"):",e);
      failedBatches++;
      doneCount+=batch.length;
    }
  }
  // Return Map for backward compatibility; attach metadata for callers that need it
  result.failedBatches=failedBatches;
  return result;
}

// ─── Report/activity helpers ──────────────────────────────────────────────────
function fmtDate(d){ return d?d.slice(0,10):"—"; }

function isoWeek(dateStr){
  var d=new Date(dateStr);
  var jan4=new Date(d.getFullYear(),0,4);
  var startOfWeek1=new Date(jan4);
  startOfWeek1.setDate(jan4.getDate()-(jan4.getDay()||7)+1);
  var diff=d-startOfWeek1;
  return Math.floor(diff/(7*24*60*60*1000))+1;
}

function weekStart(dateStr){
  var d=new Date(dateStr);
  var day=d.getDay()||7;
  d.setDate(d.getDate()-day+1);
  return d.toISOString().slice(0,10);
}

function weekEnd(dateStr){
  var d=new Date(weekStart(dateStr));
  d.setDate(d.getDate()+6);
  return d.toISOString().slice(0,10);
}

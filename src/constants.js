// constants.js
// Rev: 2026-06-16 — Assistant tab renamed to Gabbi; icon 🫶; moved to overview group
//                   so it sits below Dashboard in sidebar with special green styling.

// ─── Theme palettes ───────────────────────────────────────────────────────────
const LIGHT = {
  primary:"#5C8A7A", primaryLight:"#EAF2EF", primaryDark:"#3D6B5C",
  bg:"#F7F9F7", surface:"#FFFFFF", surfaceAlt:"#F0F5F2", border:"#D8E4DF",
  textPrimary:"#1A2E26", textSecondary:"#5A7168", textHint:"#8FA89F",
  error:"#C0392B", errorBg:"#FDECEA", warning:"#A0692A", warningBg:"#FEF3E2",
  success:"#2E7D5A", successBg:"#E8F5EE", info:"#1A5A8A", infoBg:"#E3EFF8",
  shadow:"0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
  shadowMd:"0 2px 8px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
};
const DARK = {
  primary:"#7AAD9C", primaryLight:"#1F3530", primaryDark:"#5C8A7A",
  bg:"#0F1714", surface:"#1A2420", surfaceAlt:"#222D29", border:"#2E3B36",
  textPrimary:"#E8EDEA", textSecondary:"#A8B5B0", textHint:"#7A8B85",
  error:"#E57B6E", errorBg:"#3A1E1A", warning:"#D4A472", warningBg:"#3A2D1A",
  success:"#7DB89C", successBg:"#1A2E26", info:"#7AABCA", infoBg:"#1A2A3A",
  shadow:"0 1px 3px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25)",
  shadowMd:"0 2px 8px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.3)",
};

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_LIGHT = {
  New:{bg:"#E3EFF8",color:"#1A5A8A"},
  Reviewing:{bg:"#FEF3E2",color:"#A0692A"},
  Applied:{bg:"#E8F5EE",color:"#2E7D5A"},
  Interview:{bg:"#EAF2EF",color:"#3D6B5C"},
  Offer:{bg:"#F3E8FF",color:"#6B3DAA"},
  Rejected:{bg:"#EEE4E0",color:"#6B5B4E"},
  "No response":{bg:"#E4E4E4",color:"#5A5A5A"},
  "Ad removed":{bg:"#F5ECD7",color:"#8A6A1A"},
  "Not relevant":{bg:"#EDECEA",color:"#6B6660"},
};
const STATUS_DARK = {
  New:{bg:"#1A3550",color:"#9BC8E5"},
  Reviewing:{bg:"#3A2D1A",color:"#D4A472"},
  Applied:{bg:"#1A3D2E",color:"#7DB89C"},
  Interview:{bg:"#1F3530",color:"#9BC9B8"},
  Offer:{bg:"#2E1F44",color:"#B89BD8"},
  Rejected:{bg:"#2D2622",color:"#9C8C7E"},
  "No response":{bg:"#2A2A2A",color:"#9A9A9A"},
  "Ad removed":{bg:"#2E2510",color:"#C9A04A"},
  "Not relevant":{bg:"#272624",color:"#9A9590"},
};
const SOURCES_LIGHT = {
  af:{label:"Arbetsförmedlingen",bg:"#EAF2EF",color:"#3D6B5C"},
  jsearch:{label:"JSearch",bg:"#E3EFF8",color:"#1A5A8A"},
  manual:{label:"Manual",bg:"#F0F0F0",color:"#5A5A5A"},
};
const SOURCES_DARK = {
  af:{label:"Arbetsförmedlingen",bg:"#1F3530",color:"#9BC9B8"},
  jsearch:{label:"JSearch",bg:"#1A3550",color:"#9BC8E5"},
  manual:{label:"Manual",bg:"#2A2A2A",color:"#9A9A9A"},
};

// Active palette — mutated in place by applyTheme()
const C = Object.assign({},LIGHT);
const STATUS = Object.assign({},STATUS_LIGHT);
const SOURCES = Object.assign({},SOURCES_LIGHT);

function applyTheme(theme){
  var pal = theme==="dark" ? DARK : LIGHT;
  var statusPal = theme==="dark" ? STATUS_DARK : STATUS_LIGHT;
  var srcPal = theme==="dark" ? SOURCES_DARK : SOURCES_LIGHT;
  Object.keys(pal).forEach(function(k){ C[k]=pal[k]; });
  Object.keys(statusPal).forEach(function(k){ STATUS[k]=statusPal[k]; });
  Object.keys(srcPal).forEach(function(k){ SOURCES[k]=srcPal[k]; });
  if(document&&document.documentElement){
    document.documentElement.setAttribute("data-theme",theme);
  }
}

const THEME_KEY = "jobTracker.theme";
function getSavedTheme(){
  try{
    var t=localStorage.getItem(THEME_KEY);
    if(t==="dark"||t==="light") return t;
  }catch(e){}
  if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}
applyTheme(getSavedTheme());

const STATUSES = Object.keys(STATUS);
const ACTIVE_STATUSES = ["New","Reviewing","Applied","Interview","Offer"];
const CLOSED_STATUSES = ["Rejected","No response","Ad removed","Not relevant"];
const APPLIED_STATUSES = ["Applied","Interview","Offer","Rejected","No response"];

const TABS = [
  {id:"dashboard",label:"Dashboard",icon:"📊",group:"overview"},
  {id:"jobs",label:"My Jobs",icon:"📋",group:"jobs"},
  {id:"profiles",label:"Search Profiles",icon:"🔍",group:"jobs"},
  {id:"assistant",label:"Gabbi",icon:"🫶",group:"overview"},
  {id:"scheduler",label:"Scheduler",icon:"⏱",group:"jobs"},
  {id:"covers",label:"Cover Letters",icon:"✉️",group:"outputs"},
  {id:"reports",label:"Reports",icon:"📈",group:"outputs"},
  {id:"cv",label:"My CV",icon:"📄",group:"setup"},
];

const TAB_GROUPS = [
  {id:"overview",label:"Overview"},
  {id:"jobs",label:"Jobs"},
  {id:"outputs",label:"Outputs"},
  {id:"setup",label:"Setup"},
];

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_FULL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_SCHEDULE = {enabled:false,days:["Mon","Tue","Wed","Thu","Fri"],startTime:"08:00",stopTime:"18:00",intervalMinutes:60};

const SAMPLE_JOBS = [
  {id:1,title:"Senior Product Designer",company:"Stripe",location:"Remote",status:"New",score:87,source:"Manual",sourceType:"manual",date:"2026-04-17",lang:"English",tags:["Design","Fintech"],url:null},
  {id:2,title:"UX Lead",company:"Spotify",location:"Stockholm",status:"Reviewing",score:74,source:"Email",sourceType:"manual",date:"2026-04-15",lang:"English",tags:["UX","Music"],url:null},
  {id:3,title:"Head of Design",company:"Holaluz",location:"Barcelona",status:"Applied",score:91,source:"Arbetsförmedlingen",sourceType:"af",date:"2026-04-12",lang:"Spanish",tags:["Leadership"],url:null},
];

const SAMPLE_PROFILES = [
  {id:1,name:"UX Design Sweden",query:"UX designer produktdesign",limit:10,active:true,sources:["af"]},
  {id:2,name:"Design Lead Global",query:"design lead head of design",limit:10,active:true,sources:["jsearch"]},
  {id:3,name:"Remote Design Roles",query:"product designer remote",limit:10,active:false,sources:["af","jsearch"]},
];

// ─── Location options ─────────────────────────────────────────────────────────
const LOCATION_OPTIONS=[
  {value:"Stockholm",   aliases:["Stockholm","Stockholm County","Stockholms län"]},
  {value:"Göteborg",    aliases:["Göteborg","Gothenburg","Västra Götaland","Göteborg och Bohus"]},
  {value:"Malmö",       aliases:["Malmö","Malmo","Skåne","Skåne län"]},
  {value:"Uppsala",     aliases:["Uppsala","Uppsala län"]},
  {value:"Linköping",   aliases:["Linköping","Linkoping","Östergötland"]},
  {value:"Örebro",      aliases:["Örebro","Orebro","Örebro län"]},
  {value:"Västerås",    aliases:["Västerås","Vasteras","Västmanland"]},
  {value:"Helsingborg", aliases:["Helsingborg"]},
  {value:"Norrköping",  aliases:["Norrköping","Norrkoping"]},
  {value:"Jönköping",   aliases:["Jönköping","Jonkoping","Jönköpings län"]},
  {value:"Lund",        aliases:["Lund"]},
  {value:"Umeå",        aliases:["Umeå","Umea","Västerbotten"]},
  {value:"Gävle",       aliases:["Gävle","Gavle","Gävleborg"]},
  {value:"Borås",       aliases:["Borås","Boras"]},
  {value:"Sundsvall",   aliases:["Sundsvall","Västernorrland"]},
  {value:"Karlstad",    aliases:["Karlstad","Värmland"]},
  {value:"Oskarshamn",  aliases:["Oskarshamn","Kalmar","Kalmar län"]},
  {value:"Remote",      aliases:["Remote","remote","Distans"]},
];

var LOCATION_ALIAS_MAP={};
LOCATION_OPTIONS.forEach(function(opt){
  LOCATION_ALIAS_MAP[opt.value.toLowerCase()]=opt.value;
  opt.aliases.forEach(function(a){ LOCATION_ALIAS_MAP[a.toLowerCase()]=opt.value; });
});

const SORT_OPTIONS=[
  {key:"added_desc",label:"Newest first"},
  {key:"added_asc",label:"Oldest first"},
  {key:"score_desc",label:"Best match first"},
  {key:"deadline_asc",label:"Deadline (soonest first)"},
  {key:"company_asc",label:"Company (A–Z)"},
];

const NEUTRAL_SCORE = 50;
const BATCH_SIZE = 15;
const CLAUDE_MODEL = "claude-sonnet-4-6";

const PROFICIENCY = ["Beginner","Intermediate","Advanced","Expert"];
const PROF_ORDER = {Beginner:0,Intermediate:1,Advanced:2,Expert:3};

// assistant.js
// ─── Revision history (older entries compacted, full history in git) ──────────
// Rev: 2026-06-04 to 2026-06-16 — Gabbi rename; CV write-back via <<<ACTION>>>
//   protocol (cv_edit, cv_bulk_edit, cv_pref, job_update, profile_update);
//   <<<PROFILE>>> suggestions; index-based item referencing; Option C ActionCard
//   with per-item checkboxes and before/after diff; markdown renderer (headings,
//   numbered lists, tables, linebreaks); context-aware starter prompts;
//   assessment coaching coverage in system prompt.
//
// ─── This week ───────────────────────────────────────────────────────────────
// Rev: 2026-06-17 — Categories converted from hardcoded Swedish strings to
//                   language-neutral ids (cv/matching/cover/interview/assessment/
//                   strategy/forYou) with bilingual label map. Category chips,
//                   save dialog, and empty-state copy all translate with the SV/EN
//                   toggle. Backward-compatible: resolveCategoryId() maps legacy
//                   saved prompts (stored with the old Swedish label as category)
//                   to the correct id — no data loss, no Firestore migration.
// Rev: 2026-06-17 — CURATED_PROMPTS now bilingual: each entry has a lang field
//                   ("sv"/"en"), all 10 duplicated in English. SV/EN toggle added
//                   to PromptLibrary header (sessionStorage-persisted, default sv).
//                   For You prompts and saved prompts unaffected — shown regardless
//                   of selected language (they're already in a fixed/own language).
// Rev: 2026-06-17 — Prompt library: curated starter prompts per category + user-saved
//                   prompts (savedPrompts prop, mirrors dismissedIds pattern in app.js).
//                   Save action on user chat bubbles (hover/tap reveals "🔖 Save").
// Rev: 2026-06-17 — Context-aware starters merged into PromptLibrary as virtual
//                   "För dig just nu" category; old separate starter rendering removed.
//                   All getStarterPrompts translated to Swedish for language consistency.
//                   Two curated prompts adjusted to avoid overlap with dynamic starters.
//                   Visual consistency: For You prompts use same card style as curated.
// Rev: 2026-06-17 — PromptLibrary moved to overlay pattern: inline when conversation
//                   is empty (fills chat area), popup via 💡 button in input row when
//                   conversation is active. Bottom-sheet on mobile, centered modal on
//                   desktop. Eliminates scrolling between answers and input.
// Rev: 2026-06-17 — Gabbi scope expanded: system prompt now covers interview prep,
//                   personality/aptitude assessments (Big Five, Hogan, DISC, etc.),
//                   career strategy, cover letter advice. Old "outside scope" refusal
//                   replaced with "full career journey" framing.
// Rev: 2026-06-17 — Web search enabled: callClaudeChat receives web_search_20250305
//                   tool; system prompt instructs Gabbi to search instead of saying
//                   "google it". Response handling updated for multi-block content.
// Rev: 2026-06-17 — Compact header: two Cards merged into one; redundant description
//                   removed; title+Clear inline; conversation area gets ~60px more space.
//                   Save action lives on the user's own chat bubble (hover/tap reveals
//                   "🔖 Save" — only after sending, never as blank-slate authoring) so
//                   only prompts the user has actually seen work get reused. Library
//                   panel is collapsible above the chat input; clicking an entry fills
//                   the input without sending.

// ─── Prompt library: categories + curated starters ───────────────────────────
// ─── Prompt library: language-neutral category ids + bilingual labels ────────
// Categories are identified by a stable id, never by the displayed label, so the
// UI can render in Swedish or English without breaking filtering or storage.
var PROMPT_FOR_YOU_ID="forYou";
var PROMPT_CATEGORY_IDS=[PROMPT_FOR_YOU_ID,"cv","matching","cover","interview","assessment","strategy"];
var PROMPT_CATEGORY_LABELS={
  sv:{forYou:"För dig just nu",cv:"CV & profil",matching:"Jobbmatchning",cover:"Personligt brev",interview:"Intervjuförberedelse",assessment:"Personlighetstester",strategy:"Karriärstrategi"},
  en:{forYou:"For you right now",cv:"CV & Profile",matching:"Job Matching",cover:"Cover Letter",interview:"Interview Prep",assessment:"Personality Tests",strategy:"Career Strategy"},
};
function categoryLabel(id,lang){
  var map=PROMPT_CATEGORY_LABELS[lang]||PROMPT_CATEGORY_LABELS.sv;
  return map[id]||id;
}
// Backward compatibility: prompts saved before this change stored the old
// Swedish label text directly as `category` (e.g. "CV & profil"). Build a
// reverse lookup so those legacy entries still resolve to the right id —
// no Firestore migration needed, nothing is lost.
var PROMPT_LEGACY_LABEL_TO_ID={};
Object.keys(PROMPT_CATEGORY_LABELS).forEach(function(l){
  var map=PROMPT_CATEGORY_LABELS[l];
  Object.keys(map).forEach(function(id){ PROMPT_LEGACY_LABEL_TO_ID[map[id]]=id; });
});
function resolveCategoryId(raw){
  if(PROMPT_CATEGORY_IDS.indexOf(raw)>=0) return raw;
  return PROMPT_LEGACY_LABEL_TO_ID[raw]||raw;
}

var CURATED_PROMPTS=[
  {categoryId:"cv",title:"Hitta luckor mot en roll",prompt:"Jag funderar på rollen [måltitel] som jag inte sökt än. Baserat på en typisk sådan tjänst — vilka kompetenser eller erfarenheter saknar jag troligen, och hur skulle jag kunna formulera om befintlig erfarenhet för att bättre matcha?",lang:"sv"},
  {categoryId:"cv",title:"Stärk en svag mening",prompt:"Titta på [sektion] i mitt CV. Finns det passiva eller vaga formuleringar som kan bli starkare, utan att du hittar på siffror eller resultat som inte finns?",lang:"sv"},
  {categoryId:"matching",title:"Hur fungerar matchningsscoret?",prompt:"Förklara hur matchningsscoret räknas fram rent generellt. Vilka faktorer väger tyngst, och vad kan jag göra för att höja mitt genomsnittliga score över tid?",lang:"sv"},
  {categoryId:"matching",title:"Hjälp mig prioritera",prompt:"Av mina nuvarande New-jobb, vilka tre borde jag prioritera att granska först och varför?",lang:"sv"},
  {categoryId:"cover",title:"Anpassa tonen",prompt:"Det här brevet känns för formellt/informellt för rollen. Kan du justera tonen utan att ändra innehållet?",lang:"sv"},
  {categoryId:"interview",title:"Vanliga frågor för rollen",prompt:"Vilka intervjufrågor är typiska för [jobbtitel], och hur skulle jag kunna svara baserat på mitt CV?",lang:"sv"},
  {categoryId:"interview",title:"Träna på STAR-svar",prompt:"Hjälp mig formulera ett STAR-svar (Situation, Task, Action, Result) för min erfarenhet av [ämne från CV], till en fråga om [kompetens].",lang:"sv"},
  {categoryId:"interview",title:"Analysera feedback",prompt:"Här är feedback jag fick efter en intervju: [klistra in]. Vilka mönster ser du, och vad bör jag öva på inför nästa?",lang:"sv"},
  {categoryId:"assessment",title:"Förklara ett testformat",prompt:"Jag ska göra ett [Big Five/Hogan/DISC/etc]-test för en process. Vad mäter det, och finns det något jag bör tänka på utifrån min profil?",lang:"sv"},
  {categoryId:"strategy",title:"Gap-analys vid karriärbyte",prompt:"Jag siktar på en övergång från [nuvarande roll] till [målroll]. Vilka delar av min erfarenhet överförs direkt, och vilka behöver jag bygga vidare på?",lang:"sv"},

  {categoryId:"cv",title:"Find gaps against a role",prompt:"I'm considering the role [target title] which I haven't applied to yet. Based on a typical such position — what skills or experience am I likely missing, and how could I reframe existing experience to better match?",lang:"en"},
  {categoryId:"cv",title:"Strengthen a weak sentence",prompt:"Look at [section] in my CV. Are there passive or vague phrasings that could be stronger, without you inventing numbers or results that don't exist?",lang:"en"},
  {categoryId:"matching",title:"How does the match score work?",prompt:"Explain generally how the match score is calculated. Which factors weigh the most, and what can I do to raise my average score over time?",lang:"en"},
  {categoryId:"matching",title:"Help me prioritise",prompt:"Of my current New jobs, which three should I prioritise reviewing first, and why?",lang:"en"},
  {categoryId:"cover",title:"Adjust the tone",prompt:"This letter feels too formal/informal for the role. Can you adjust the tone without changing the content?",lang:"en"},
  {categoryId:"interview",title:"Common questions for the role",prompt:"What interview questions are typical for [job title], and how could I answer them based on my CV?",lang:"en"},
  {categoryId:"interview",title:"Practice a STAR answer",prompt:"Help me put together a STAR answer (Situation, Task, Action, Result) for my experience with [topic from CV], for a question about [competency].",lang:"en"},
  {categoryId:"interview",title:"Analyse feedback",prompt:"Here's feedback I got after an interview: [paste it]. What patterns do you see, and what should I practise before the next one?",lang:"en"},
  {categoryId:"assessment",title:"Explain a test format",prompt:"I'm taking a [Big Five/Hogan/DISC/etc] test for a process. What does it measure, and is there anything I should keep in mind given my profile?",lang:"en"},
  {categoryId:"strategy",title:"Gap analysis for a career change",prompt:"I'm aiming for a move from [current role] to [target role]. Which parts of my experience transfer directly, and which do I need to build further?",lang:"en"},
];

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
      // Include key dates for pipeline analysis
      var dates=[];
      if(j.date) dates.push("added:"+j.date.slice(0,10));
      if(j.appliedAt) dates.push("applied:"+j.appliedAt.slice(0,10));
      if(j.interviewAt) dates.push("interview:"+j.interviewAt.slice(0,10));
      if(j.offerAt) dates.push("offer:"+j.offerAt.slice(0,10));
      if(j.rejectedAt) dates.push("rejected:"+j.rejectedAt.slice(0,10));
      if(j.noResponseAt) dates.push("no-response:"+j.noResponseAt.slice(0,10));
      var dateStr=dates.length?" | "+dates.join(", "):"";
      var notes=j.notes?" | notes: "+j.notes.slice(0,100):"";
      lines.push("• id:"+j.id+" "+score+" — "+j.title+" @ "+j.company+loc+emp+tags+rat+dateStr+notes+desc);
    });
  });
  return "Total jobs: "+jobs.length+" ("+Object.keys(groups).map(function(k){return k+": "+groups[k].length;}).join(", ")+")\n"+lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildAssistantSystem(cv,profiles,jobs){
  var cvBlock=hasCv(cv)?cvSummaryText(cv):"(No CV loaded yet — ask the user to add their CV in the My CV tab.)";
  var existing=(profiles||[]).length
    ? profiles.map(function(p){
        return "- id:"+p.id+" \""+p.name+"\" · query: "+p.query+" · sources: "+(p.sources||[]).join("+")+
               " · max "+p.limit+" · "+(p.active?"active":"inactive");
      }).join("\n")
    : "(No profiles saved yet.)";
  var pipelineBlock=jobsSummaryText(jobs||[]);

  return [
    "You are Gabbi, an AI assistant embedded in a personal job-tracking app.",
    "Your personality: warm, direct, practically helpful. You use the user's first name if you know it.",
    "",
    "You help with these topics:",
    "  (a) How this app's features work.",
    "  (b) Designing and editing search profiles.",
    "  (c) What the connected APIs (Arbetsförmedlingen, JSearch) can do.",
    "  (d) Analysing the user's job pipeline — patterns, matches, strategic advice.",
    "  (e) Analysing and improving CV sections (tools, skills, achievements, preferences).",
    "  (f) Applying edits to CV and job data when the user asks.",
    "  (g) Interview preparation — common questions, STAR technique, mock answers grounded in the user's CV.",
    "  (h) Personality and aptitude assessments used in recruitment (Big Five, Hogan, OPQ32, DISC, MBTI, Alva Labs, Birkman, Matrigma, Cubiks, SHL, Watson-Glaser, SJTs, video interviews). Explain what they measure, how to prepare, and what to expect. Relate advice to the user's profile when possible.",
    "  (i) Career strategy and professional development — role transitions, skill gap analysis, networking advice, salary negotiation, personal branding.",
    "  (j) Cover letter strategy — tone, structure, what to emphasise for specific roles.",
    "",
    "Your scope is the full career journey: from CV and job search, through applications and assessments, to interviews and career growth.",
    "If a question is completely unrelated to career, professional development, or this app, say so briefly and redirect.",
    "",
    "═══ WEB SEARCH ═══",
    "You have access to a web search tool. Use it when you need current information that is not in the user's CV or pipeline — for example to look up details about a specific employer, a specific assessment test, industry salary data, or interview practices at a particular company.",
    "Never tell the user to 'google it' — search for them instead.",
    "",
    "TONE: friendly, concise, practical. One clarifying question at a time max.",
    "",
    "FORMATTING: use markdown formatting to improve readability:",
    "• Use ## for section headings and ### for sub-headings in longer responses.",
    "• Use - bullet lists for unordered items; put each item on its own line.",
    "• Use 1. 2. 3. numbered lists for steps, rankings, or ordered items.",
    "• Use | col | col | markdown tables for comparisons, skill gaps, structured data.",
    "• Use **bold** for key terms and *italic* for emphasis.",
    "• Use single line breaks between list items for breathing room.",
    "• Keep responses concise — use structure to replace length, not add to it.",
    "",
    "═══ WHAT GABBI CAN WRITE ═══",
    "You can make changes to: CV sections, job status/notes, search profiles.",
    "Always describe what you plan to change and ask for confirmation BEFORE emitting action blocks.",
    "Never emit action blocks unless the user has explicitly confirmed.",
    "You may emit multiple action blocks in one reply.",
    "Do NOT use markdown code fences around action blocks.",
    "",
    "═══ ACTION PROTOCOL ═══",
    "",
    "── 1. CV EDITS (tools, skills, achievements) ──",
    "<<<ACTION>>>",
    "{\"type\":\"cv_edit\",\"section\":\"tools\",\"op\":\"add\",\"item\":{\"name\":\"Notion\",\"years\":2,\"level\":\"Intermediate\",\"employers\":\"\"}}",
    "<<</ACTION>>>",
    "Sections: \"tools\", \"skills\", \"achievements\"",
    "Ops: add | edit | delete",
    "Identifying existing entries (for edit/delete): use index (preferred) OR name match.",
    "  index: 1-based number shown in the CV sections and in the numbered list below. Use this whenever the user refers to an item by number.",
    "  name: exact name match for tools/skills (fallback when no index given).",
    "  description: substring match for achievements (fallback when no index given).",
    "Example edit by index: {\"type\":\"cv_edit\",\"section\":\"tools\",\"op\":\"edit\",\"index\":3,\"item\":{\"level\":\"Expert\"}}",
    "Example delete by index: {\"type\":\"cv_edit\",\"section\":\"tools\",\"op\":\"delete\",\"index\":5}",
    "Tool/Skill fields: name (string), years (number), level (Beginner|Intermediate|Advanced|Expert), employers (string)",
    "Achievement fields: description (string), employer (string), year (string)",
    "",
    "── 1b. CV BULK EXTRACTION (use this when extracting from CV text) ──",
    "<<<ACTION>>>",
    "{\"type\":\"cv_bulk_edit\",\"section\":\"tools\",\"op\":\"add\",\"items\":[{\"name\":\"Figma\",\"years\":4,\"level\":\"Advanced\",\"employers\":\"Spotify\"},{\"name\":\"Jira\",\"years\":8,\"level\":\"Expert\",\"employers\":\"Spotify, IKEA\"}]}",
    "<<</ACTION>>>",
    "Use cv_bulk_edit (not cv_edit) whenever you are extracting multiple entries at once.",
    "Fields: same as cv_edit. section: tools | skills | achievements.",
    "op values for cv_bulk_edit:",
    "  add     — adds items not already present (deduplicates). Use for extraction when user wants to keep existing entries.",
    "  replace — replaces the ENTIRE section with the new items list. Use when user wants to update/refresh/overwrite a section.",
    "items: array of ALL entries for that section in one block. One block per section.",
    "NEVER use cv_bulk_edit with fewer than 2 items — use cv_edit for single entries.",
    "IMPORTANT: Before using op:replace, confirm with the user that they want to overwrite existing entries.",
    "",
    "── 2. CV PREFERENCES ──",
    "<<<ACTION>>>",
    "{\"type\":\"cv_pref\",\"field\":\"roles\",\"value\":\"Product Manager, CPO, Product Owner\"}",
    "<<</ACTION>>>",
    "Fields: roles | industries | locations | salary | workType (Any|Remote|Hybrid|On-site)",
    "",
    "── 3. JOB UPDATES ──",
    "<<<ACTION>>>",
    "{\"type\":\"job_update\",\"jobId\":12345,\"op\":\"setStatus\",\"value\":\"Applied\"}",
    "<<</ACTION>>>",
    "Ops:",
    "  setStatus — value must be one of: New, Reviewing, Applied, Interview, Offer, Rejected, No response, Ad removed, Not relevant",
    "  setNotes  — value is a string (replaces existing notes)",
    "  appendNote — value is appended to existing notes with a newline separator",
    "  setDate   — manually set or correct a milestone date. field must be one of: appliedAt, interviewAt, offerAt, rejectedAt, noResponseAt. value must be an ISO date string (YYYY-MM-DD) or null to clear.",
    "jobId must exactly match the id shown in the pipeline list below.",
    "When setting status, the app auto-sets the corresponding date automatically. Use setDate only when the user wants to correct a date that was set wrong.",
    "For job updates: if the user says a company or title name rather than an id, find the matching job in the pipeline and use its id.",
    "",
    "── 4. PROFILE UPDATES ──",
    "<<<ACTION>>>",
    "{\"type\":\"profile_update\",\"profileId\":12345,\"op\":\"setActive\",\"value\":false}",
    "<<</ACTION>>>",
    "Ops:",
    "  setActive — value: true or false",
    "  setQuery  — value: new query string",
    "  setLimit  — value: integer 5–50",
    "  delete    — no value needed (removes the profile)",
    "profileId must exactly match the id shown in the profiles list below.",
    "Do NOT delete profiles unless the user explicitly asks to delete (not just deactivate).",
    "",
    "═══ SEARCH PROFILE SUGGESTIONS ═══",
    "When proposing a NEW profile emit:",
    "<<<PROFILE>>>",
    "{\"name\":\"Short name\",\"query\":\"free-text terms\",\"sources\":[\"af\"],\"limit\":15,\"reasoning\":\"One sentence\"}",
    "<<</PROFILE>>>",
    "",
    "═══ API CAPABILITIES ═══",
    "• Arbetsförmedlingen (af) — free Swedish API, single free-text q param, no AND/OR.",
    "• JSearch (jsearch) — RapidAPI, Indeed/LinkedIn/Glassdoor, needs user's RapidAPI key.",
    "",
    "═══ CV ANALYSIS GUIDANCE ═══",
    "When asked to analyse the CV:",
    "• Identify gaps — skills or tools common in the user's target roles that are missing.",
    "• Spot weak entries — vague descriptions, missing years/level/employers.",
    "• Suggest improvements — better wording, missing achievements, underrepresented strengths.",
    "• Cross-reference with the job pipeline — highlight skills that appear in job descriptions but are absent from the CV.",
    "",
    "═══ CV EXTRACTION — IMPORTANT INSTRUCTIONS ═══",
    "When the user asks you to extract tools, skills, or achievements from their CV text, follow these rules exactly:",
    "",
    "RULE 1 — RESPOND WITH A COMPLETE BATCH, NOT INDIVIDUAL ITEMS.",
    "Never suggest entries one at a time. Always extract ALL entries for a section in a single cv_bulk_edit action block.",
    "The user should not need to ask multiple times to get all their data out.",
    "",
    "RULE 1b — CLARIFY ADD VS REPLACE WHEN UPDATING.",
    "When the user asks to 'update', 'refresh', 'replace', or 'redo' their tools/skills/achievements:",
    "  Ask first: 'Do you want to ADD the new entries to your existing list, or REPLACE the entire section?'",
    "  If ADD: use op:add (deduplicates, keeps existing entries).",
    "  If REPLACE: use op:replace (overwrites the entire section with the new list).",
    "  If the section is empty, always use op:add — no need to ask.",
    "  If the user says 'extract from my CV' with no existing entries, always use op:add.",
    "",
    "RULE 2 — EXTRACT FROM THE RAW CV TEXT FIRST, THEN COMPARE.",
    "Read the full CV text carefully. Extract every tool, skill, and achievement you can identify.",
    "Then compare against the existing structured sections — only include entries that are NOT already present.",
    "If a section already has entries, you are adding to it, not replacing it.",
    "",
    "RULE 3 — DEDUPLICATE.",
    "Do not suggest an entry that already exists in the structured section (match by name for tools/skills, description substring for achievements).",
    "",
    "RULE 4 — FILL IN ALL FIELDS.",
    "For every entry, populate all fields as accurately as possible from the CV text:",
    "• Tools/Skills: name, years (estimate from CV dates if not explicit), level (Beginner/Intermediate/Advanced/Expert based on context), employers (company names where used)",
    "• Achievements: description (specific, concrete, outcome-focused), employer, year",
    "",
    "RULE 5 — BE COMPLETE, THEN ASK.",
    "Give a brief one-line intro (e.g. 'Here is what I found in your CV:'), then emit all three bulk action blocks (tools, skills, achievements) in one reply.",
    "After the blocks, add a brief note about what you excluded or were uncertain about.",
    "Never ask clarifying questions BEFORE extracting — extract first, clarify after.",
    "",
    "RULE 6 — QUALITY OVER QUANTITY FOR ACHIEVEMENTS.",
    "Achievements should be specific and measurable where possible. Prefer concrete outcomes ('Reduced onboarding time by 40%') over vague statements ('Improved processes').",
    "Extract achievements from the CV narrative even if not explicitly labelled as achievements.",
    "",
    "═══ PIPELINE ANALYSIS GUIDANCE ═══",
    "Use the pipeline to identify patterns, mismatches, response rates, and strategic advice.",
    "Milestone dates available: added, appliedAt, interviewAt, offerAt, rejectedAt, noResponseAt.",
    "Use these dates to calculate and reason about:",
    "  • Time from application to interview (interviewAt - appliedAt) — interview conversion speed",
    "  • Time from application to rejection (rejectedAt - appliedAt) — rejection speed patterns",
    "  • Interview-to-offer conversion rate (jobs reaching Offer / jobs reaching Interview)",
    "  • Response rate (any response / total applied)",
    "  • Silent applications (Applied with no response after 30+ days — noResponseAt not set)",
    "Ground all observations in actual data. Be cautious with <10 jobs.",
    "For silent jobs (Applied 30+ days, no response), proactively suggest marking them as No response.",
    "",
    "═══ USER'S CV & PREFERENCES ═══",
    cvBlock,
    "",
    "═══ USER'S SEARCH PROFILES ═══",
    existing,
    "",
    "═══ USER'S JOB PIPELINE ═══",
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

// ─── Parse reply into ordered segments ───────────────────────────────────────
function parseReplySegments(reply){
  var profileRe=/<<<PROFILE>>>([\s\S]*?)<<<\/PROFILE>>>/g;
  var actionRe=/<<<ACTION>>>([\s\S]*?)<<<\/ACTION>>>/g;
  var blocks=[];
  var r;
  profileRe.lastIndex=0;
  while((r=profileRe.exec(reply))!==null) blocks.push({index:r.index,end:profileRe.lastIndex,type:"profile",raw:r[1]});
  actionRe.lastIndex=0;
  while((r=actionRe.exec(reply))!==null) blocks.push({index:r.index,end:actionRe.lastIndex,type:"action",raw:r[1]});
  blocks.sort(function(a,b){return a.index-b.index;});

  var segments=[];
  var lastIndex=0;
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
      } else if(b.type==="action"&&obj.type){
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
  var activeJobs=(jobs||[]).filter(function(j){return !j.archived;});
  var scoredCount=activeJobs.filter(function(j){return j.scored!==false&&typeof j.score==="number";}).length;
  var interviewCount=activeJobs.filter(function(j){return j.status==="Interview"||j.status==="Offer";}).length;
  var rejectedCount=activeJobs.filter(function(j){return j.status==="Rejected";}).length;
  var now=Date.now();
  var silentCount=activeJobs.filter(function(j){
    if(j.status!=="Applied") return false;
    var ref=j.appliedAt||j.date;
    return ref&&(now-new Date(ref).getTime())>30*24*60*60*1000;
  }).length;
  var lowestScored=scoredCount>=5?activeJobs.filter(function(j){return j.scored!==false&&typeof j.score==="number";}).sort(function(a,b){return a.score-b.score;})[0]:null;
  var hasStructured=!!(cv&&((cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length)));

  if(!hasCv(cv)){
    return [
      "Jag vill ha hjälp att bygga min första sökprofil.",
      "Vilka typer av jobbsökningar kan appen göra?",
      "Hur ska jag strukturera mitt CV för att få bättre matchningsscore?",
      "Vad kan du hjälpa mig med?",
    ];
  }
  var prompts=[];
  // Context-aware: most urgent/actionable first
  if(silentCount>0) prompts.push("Jag har "+silentCount+" ansökning"+(silentCount>1?"ar":"")+" utan svar i 30+ dagar — vad bör jag göra?");
  if(hasCv(cv)&&!hasStructured) prompts.push("Extrahera mina tools, skills och achievements från min CV-text.");
  if(hasStructured) prompts.push("Granska sektionerna i mitt CV och lägg till det som saknas och är viktigt.");
  if(scoredCount>=10) prompts.push("Föreslå en ny sökprofil baserat på mina högst poängsatta jobb.");
  if(lowestScored) prompts.push("Varför är mitt matchningsscore lågt för "+lowestScored.title+" hos "+lowestScored.company+"?");
  if(interviewCount>=2) prompts.push("Vad har mina Interview-jobb gemensamt?");
  else if(interviewCount===1) prompts.push("Vad utmärker jobbet jag nådde Interview-status för?");
  if(rejectedCount>=3) prompts.push("Finns det mönster i de jobb jag fått avslag på?");
  if(activeJobs.length>0) prompts.push("Uppdatera en jobbstatus eller lägg till en anteckning åt mig.");
  if(hasStructured) prompts.push("Baserat på mina sparade jobb — vilka skills eller tools saknas oftast för de roller jag siktar på?");
  prompts.push("Hjälp mig bygga en sökprofil utifrån mitt CV.");
  return prompts.slice(0,4);
}

// ─── ActionCard ───────────────────────────────────────────────────────────────
function ActionCard({action,onAccept,onReject,accepted,rejected,cv}){
  var a=action;
  var isBulk=a.type==="cv_bulk_edit";
  var allItems=isBulk?(a.items||[]):[];

  // For add op: pre-uncheck items already in the CV section
  var currentSection=isBulk&&cv?(cv[a.section]||[]):[];
  function alreadyExists(item){
    if(a.section==="achievements"){
      var md=(item.description||"").toLowerCase().slice(0,40);
      return currentSection.some(function(x){return x.description&&x.description.toLowerCase().includes(md);});
    }
    return currentSection.some(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase();});
  }

  // Checkbox state — false means unchecked
  var initChecked={};
  allItems.forEach(function(item,i){
    initChecked[i]=a.op!=="add"||!alreadyExists(item);
  });
  var [checked,setChecked]=useState(initChecked);
  var [expanded,setExpanded]=useState(false);
  var m=mob();

  var checkedCount=Object.values(checked).filter(Boolean).length;
  var newCount=allItems.filter(function(it,i){return !alreadyExists(it);}).length;
  var dupeCount=allItems.length-newCount;

  function toggleItem(i){
    setChecked(function(prev){return Object.assign({},prev,{[i]:!prev[i]});});
  }
  function toggleAll(val){
    var next={};
    allItems.forEach(function(_,i){ next[i]=val; });
    setChecked(next);
  }

  function buildFilteredAction(){
    if(!isBulk) return a;
    var selectedItems=allItems.filter(function(_,i){return checked[i];});
    return Object.assign({},a,{items:selectedItems});
  }

  // ── Type labels and colours ──────────────────────────────────────────────
  var typeLabel="";
  var opLabel=isBulk?(a.op==="replace"?"Replace all":checkedCount===allItems.length?"Add all":"Add selected ("+checkedCount+")"):
    a.op==="add"?"Add":a.op==="edit"?"Edit":a.op==="delete"?"Delete":
    a.op==="setStatus"?"Set status":a.op==="setNotes"?"Set notes":
    a.op==="appendNote"?"Add note":a.op==="setDate"?"Set date":a.op==="setActive"?"Toggle":
    a.op==="setQuery"?"Edit query":a.op==="setLimit"?"Edit limit":"Update";
  var opColor=C.success;
  var opBg=C.successBg;

  if(a.type==="cv_edit"){
    typeLabel=a.section==="tools"?"CV Tool":a.section==="skills"?"CV Skill":"CV Achievement";
    opColor=a.op==="delete"?C.error:a.op==="edit"?C.warning:C.success;
    opBg=a.op==="delete"?C.errorBg:a.op==="edit"?C.warningBg:C.successBg;
  } else if(isBulk){
    var secName=a.section==="tools"?"Tools":a.section==="skills"?"Skills":"Achievements";
    typeLabel="CV "+secName;
    opColor=a.op==="replace"?C.warning:C.success;
    opBg=a.op==="replace"?C.warningBg:C.successBg;
  } else if(a.type==="cv_pref"){
    typeLabel="CV Preference";
    opColor=C.info; opBg=C.infoBg;
  } else if(a.type==="job_update"){
    typeLabel="Job";
    opColor=a.op==="setStatus"?C.primary:C.info;
    opBg=a.op==="setStatus"?C.primaryLight:C.infoBg;
  } else if(a.type==="profile_update"){
    typeLabel="Search Profile";
    opColor=a.op==="delete"?C.error:C.warning;
    opBg=a.op==="delete"?C.errorBg:C.warningBg;
  }

  // ── Summary text (for non-bulk or collapsed view) ────────────────────────
  function itemLabel(item){
    if(a.section==="achievements") return (item.description||"").slice(0,80)+(item.employer?" @ "+item.employer:"");
    return (item.name||"")+(item.years?" · "+item.years+" yr":"")+(item.level?" · "+item.level:"");
  }
  var summary="";
  if(isBulk){
    if(a.op==="replace"){
      summary="Replace "+currentSection.length+" existing → "+allItems.length+" new entries";
    } else {
      summary=newCount+" new"+(dupeCount>0?", "+dupeCount+" already in CV (pre-deselected)":"");
    }
  } else if(a.type==="cv_edit"){
    var idxLabel=a.index!=null?"#"+a.index+" ":"";
    var itm=a.item||{};
    if(a.section==="achievements"){
      summary=idxLabel+(itm.description||"").slice(0,120)+(itm.employer?" — "+itm.employer:"")+(itm.year?" ("+itm.year+")":"");
    } else {
      summary=idxLabel+(itm.name||"(by index)")+(itm.years?" · "+itm.years+" yr":"")+(itm.level?" · "+itm.level:"")+(itm.employers?" · "+itm.employers:"");
    }
  } else if(a.type==="cv_pref"){
    summary=(a.field||"")+" → "+(typeof a.value==="string"?a.value.slice(0,100):String(a.value));
  } else if(a.type==="job_update"){
    if(a.op==="setDate") summary="Job #"+a.jobId+" → "+a.field+": "+(a.value||"clear");
    else summary="Job #"+a.jobId+" → "+(typeof a.value==="string"?a.value.slice(0,120):String(a.value||""));
  } else if(a.type==="profile_update"){
    summary="Profile #"+a.profileId+" → "+(a.op==="delete"?"DELETE":typeof a.value!=="undefined"?String(a.value).slice(0,80):"");
  }

  // ── Accepted / rejected states ───────────────────────────────────────────
  if(accepted){
    return <div style={{border:"1.5px solid "+C.success,borderRadius:12,padding:"12px 14px",background:C.successBg,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>✓</span>
      <span style={{fontSize:13,color:C.success,fontWeight:600}}>{opLabel} {typeLabel}: {summary.slice(0,80)} — applied</span>
    </div>;
  }
  if(rejected){
    return <div style={{border:"1.5px solid "+C.border,borderRadius:12,padding:"12px 14px",background:C.surfaceAlt,display:"flex",alignItems:"center",gap:10,opacity:0.5}}>
      <span style={{fontSize:13,color:C.textHint}}>Skipped: {opLabel} {typeLabel}</span>
    </div>;
  }

  // ── Main card ─────────────────────────────────────────────────────────────
  return <div style={{border:"2px solid "+opColor,borderRadius:14,background:opBg,overflow:"hidden"}}>

    {/* Header */}
    <div style={{padding:"12px 14px 10px",borderBottom:isBulk?"1px solid "+(a.op==="replace"?C.warning+"44":C.success+"44"):"none"}}>
      <div style={{fontSize:11,fontWeight:700,color:opColor,letterSpacing:"0.5px",marginBottom:6}}>
        {(isBulk?(a.op==="replace"?"REPLACE":"ADD"):a.op.toUpperCase()).toUpperCase()} {typeLabel.toUpperCase()}
      </div>
      <div style={{fontSize:13,color:C.textSecondary,lineHeight:1.5}}>{summary}</div>
    </div>

    {/* Bulk item list — add op */}
    {isBulk&&a.op!=="replace"&&<div>
      {/* Expand/collapse toggle */}
      <button onClick={function(){setExpanded(function(v){return !v;});}}
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"8px 14px",border:"none",background:"transparent",
          cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
          color:C.textSecondary,borderBottom:"1px solid "+C.success+"33"}}>
        <span>{expanded?"▲ Hide items":"▼ Show all "+allItems.length+" items"}</span>
        {!expanded&&<span style={{fontSize:11,color:C.textHint}}>
          {checkedCount} of {allItems.length} selected
        </span>}
      </button>

      {expanded&&<div style={{maxHeight:320,overflowY:"auto"}}>
        {/* Select all / none controls */}
        <div style={{display:"flex",gap:10,padding:"6px 14px",borderBottom:"1px solid "+C.success+"22",background:C.surface}}>
          <button onClick={function(){toggleAll(true);}}
            style={{fontSize:11,fontWeight:600,color:C.primary,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"2px 0"}}>
            Select all
          </button>
          <span style={{color:C.border}}>·</span>
          <button onClick={function(){toggleAll(false);}}
            style={{fontSize:11,fontWeight:600,color:C.textHint,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"2px 0"}}>
            Deselect all
          </button>
          <span style={{marginLeft:"auto",fontSize:11,color:C.textHint}}>{checkedCount} selected</span>
        </div>

        {/* New items */}
        {allItems.filter(function(it){return !alreadyExists(it);}).length>0&&
          <div style={{padding:"6px 14px 2px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.success,letterSpacing:"0.5px",marginBottom:4}}>NEW</div>
            {allItems.map(function(item,i){
              if(alreadyExists(item)) return null;
              return <label key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"5px 0",cursor:"pointer",userSelect:"none"}}>
                <input type="checkbox" checked={!!checked[i]} onChange={function(){toggleItem(i);}}
                  style={{marginTop:2,flexShrink:0,width:15,height:15,accentColor:C.primary,cursor:"pointer"}} />
                <span style={{fontSize:13,color:checked[i]?C.textPrimary:C.textHint,lineHeight:1.4}}>
                  {itemLabel(item)}
                </span>
              </label>;
            })}
          </div>}

        {/* Already-in-CV items */}
        {dupeCount>0&&
          <div style={{padding:"6px 14px 8px",borderTop:"1px solid "+C.border}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textHint,letterSpacing:"0.5px",marginBottom:4}}>ALREADY IN YOUR CV</div>
            {allItems.map(function(item,i){
              if(!alreadyExists(item)) return null;
              return <label key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"5px 0",cursor:"pointer",userSelect:"none",opacity:0.5}}>
                <input type="checkbox" checked={!!checked[i]} onChange={function(){toggleItem(i);}}
                  style={{marginTop:2,flexShrink:0,width:15,height:15,accentColor:C.primary,cursor:"pointer"}} />
                <span style={{fontSize:13,color:C.textHint,lineHeight:1.4,textDecoration:"line-through"}}>
                  {itemLabel(item)}
                </span>
              </label>;
            })}
          </div>}
      </div>}
    </div>}

    {/* Replace op — show before/after diff */}
    {isBulk&&a.op==="replace"&&<div>
      <button onClick={function(){setExpanded(function(v){return !v;});}}
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"8px 14px",border:"none",background:"transparent",
          cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
          color:C.textSecondary,borderBottom:"1px solid "+C.warning+"33"}}>
        <span>{expanded?"▲ Hide details":"▼ Show before/after"}</span>
      </button>

      {expanded&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
        {/* Current — being removed */}
        <div style={{padding:"8px 14px",borderRight:"1px solid "+C.border,background:C.errorBg+"44"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.error,letterSpacing:"0.5px",marginBottom:6}}>
            CURRENT ({currentSection.length})
          </div>
          <div style={{maxHeight:200,overflowY:"auto"}}>
            {currentSection.map(function(item,i){
              return <div key={i} style={{fontSize:12,color:C.textHint,padding:"3px 0",lineHeight:1.4,textDecoration:"line-through"}}>
                {a.section==="achievements"?(item.description||"").slice(0,60):(item.name||"")}
              </div>;
            })}
          </div>
        </div>
        {/* New — replacing with */}
        <div style={{padding:"8px 14px",background:C.successBg+"44"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.success,letterSpacing:"0.5px",marginBottom:6}}>
            NEW ({allItems.length})
          </div>
          <div style={{maxHeight:200,overflowY:"auto"}}>
            {allItems.map(function(item,i){
              return <div key={i} style={{fontSize:12,color:C.textPrimary,padding:"3px 0",lineHeight:1.4}}>
                {itemLabel(item)}
              </div>;
            })}
          </div>
        </div>
      </div>}
    </div>}

    {/* Action buttons */}
    <div style={{padding:"10px 14px",display:"flex",gap:8,alignItems:"center",
      borderTop:"1px solid "+opColor+"33",background:C.surface}}>
      <Btn variant="primary"
        onClick={function(){onAccept(buildFilteredAction());}}
        disabled={isBulk&&a.op!=="replace"&&checkedCount===0}
        style={{fontSize:13,padding:"7px 16px"}}>
        ✓ {isBulk&&a.op!=="replace"?(checkedCount===allItems.length?"Apply all":"Apply selected ("+checkedCount+")"):"Apply"}
      </Btn>
      <Btn onClick={onReject} style={{fontSize:13,padding:"7px 14px"}}>Skip</Btn>
      {isBulk&&a.op!=="replace"&&<span style={{fontSize:11,color:C.textHint,marginLeft:4}}>
        {checkedCount}/{allItems.length} selected
      </span>}
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
// ─── SavePromptDialog ─────────────────────────────────────────────────────────
var SAVABLE_CATEGORY_IDS=PROMPT_CATEGORY_IDS.filter(function(id){return id!==PROMPT_FOR_YOU_ID;});

function SavePromptDialog({initialText,onSave,onClose}){
  var defaultTitle=initialText.trim().split(/\s+/).slice(0,6).join(" ");
  var [title,setTitle]=useState(defaultTitle);
  var [categoryId,setCategoryId]=useState(SAVABLE_CATEGORY_IDS[0]);
  var dialogLang=getSavedPromptLang(); // follows whatever language the library was last set to
  return <div style={{position:"fixed",inset:0,zIndex:650,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:18,padding:22,width:"min(420px,96vw)",boxShadow:"0 8px 36px rgba(0,0,0,0.25)"}} onClick={function(e){e.stopPropagation();}}>
      <div style={{fontSize:15,fontWeight:700,color:C.textPrimary,marginBottom:4}}>🔖 Save prompt</div>
      <div style={{fontSize:12,color:C.textHint,marginBottom:14,lineHeight:1.5}}>Save this question to reuse later — it'll show up in the prompt library under the category you choose.</div>
      <div style={{marginBottom:12}}>
        <Label>Title</Label>
        <Inp value={title} onChange={function(e){setTitle(e.target.value);}} style={{width:"100%"}} />
      </div>
      <div style={{marginBottom:18}}>
        <Label>Category</Label>
        <Sel value={categoryId} onChange={function(e){setCategoryId(e.target.value);}}>
          {SAVABLE_CATEGORY_IDS.map(function(id){return <option key={id} value={id}>{categoryLabel(id,dialogLang)}</option>;})}
        </Sel>
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="primary" onClick={function(){if(title.trim())onSave({title:title.trim(),category:categoryId,prompt:initialText});}} style={{flex:1,fontSize:14,minHeight:44}} disabled={!title.trim()}>Save</Btn>
        <Btn onClick={onClose} style={{fontSize:14,minHeight:44}}>Cancel</Btn>
      </div>
    </div>
  </div>;
}

// ─── PromptLibrary ────────────────────────────────────────────────────────────
// Visibility is now controlled by the parent (inline in empty state, or shown
// inside an overlay during an active conversation). The library itself just
// renders its content — no self-collapsing header.
var PROMPT_LANG_KEY="jt.promptLibraryLang";
function getSavedPromptLang(){
  try{ var v=sessionStorage.getItem(PROMPT_LANG_KEY); return (v==="sv"||v==="en")?v:"sv"; }catch(e){ return "sv"; }
}

function PromptLibrary({savedPrompts,setSavedPrompts,onUse,cv,jobs}){
  var [activeCat,setActiveCat]=useState(PROMPT_FOR_YOU_ID);
  var [lang,setLang]=useState(getSavedPromptLang);

  function setLangAndPersist(l){
    setLang(l);
    try{ sessionStorage.setItem(PROMPT_LANG_KEY,l); }catch(e){}
  }

  function removeSaved(id){
    setSavedPrompts(function(prev){return (prev||[]).filter(function(p){return p.id!==id;});});
  }

  var isForYou=activeCat===PROMPT_FOR_YOU_ID;
  var forYouPrompts=isForYou?getStarterPrompts(cv,jobs):[];
  var curatedForCat=isForYou?[]:CURATED_PROMPTS.filter(function(p){return p.categoryId===activeCat&&p.lang===lang;});
  var savedForCat=isForYou?[]:(savedPrompts||[]).filter(function(p){return resolveCategoryId(p.category)===activeCat;});

  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:8,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {PROMPT_CATEGORY_IDS.map(function(id){
          var on=activeCat===id;
          return <button key={id} onClick={function(){setActiveCat(id);}}
            style={{fontSize:12,fontWeight:on?700:500,padding:"5px 11px",borderRadius:8,
              border:"1.5px solid "+(on?C.primary:C.border),
              background:on?C.primaryLight:"transparent",color:on?C.primary:C.textSecondary,
              cursor:"pointer",fontFamily:"inherit"}}>{categoryLabel(id,lang)}</button>;
        })}
      </div>
      <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid "+C.border,flexShrink:0}}>
        <button onClick={function(){setLangAndPersist("sv");}}
          style={{fontSize:11,fontWeight:lang==="sv"?700:500,padding:"4px 9px",border:"none",
            background:lang==="sv"?C.primaryLight:"transparent",color:lang==="sv"?C.primary:C.textHint,
            cursor:"pointer",fontFamily:"inherit"}}>SV</button>
        <button onClick={function(){setLangAndPersist("en");}}
          style={{fontSize:11,fontWeight:lang==="en"?700:500,padding:"4px 9px",border:"none",
            background:lang==="en"?C.primaryLight:"transparent",color:lang==="en"?C.primary:C.textHint,
            cursor:"pointer",fontFamily:"inherit"}}>EN</button>
      </div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {forYouPrompts.map(function(text,i){
        var shortTitle=text.trim().split(/\s+/).slice(0,6).join(" ");
        return <div key={"fy"+i} onClick={function(){onUse(text);}}
          style={{padding:"9px 12px",borderRadius:10,background:C.surface,border:"1px solid "+C.border,cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.textPrimary}}>{shortTitle}…</div>
          <div style={{fontSize:12,color:C.textHint,marginTop:2,lineHeight:1.4}}>{text}</div>
        </div>;
      })}
      {curatedForCat.map(function(p,i){
        return <div key={"c"+i} onClick={function(){onUse(p.prompt);}}
          style={{padding:"9px 12px",borderRadius:10,background:C.surface,border:"1px solid "+C.border,cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.textPrimary}}>{p.title}</div>
          <div style={{fontSize:12,color:C.textHint,marginTop:2,lineHeight:1.4}}>{p.prompt}</div>
        </div>;
      })}
      {savedForCat.map(function(p){
        return <div key={p.id} style={{padding:"9px 12px",borderRadius:10,background:C.surfaceAlt,border:"1px solid "+C.border,display:"flex",alignItems:"flex-start",gap:8}}>
          <div onClick={function(){onUse(p.prompt);}} style={{flex:1,cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13,fontWeight:600,color:C.textPrimary}}>{p.title}</span>
              <span style={{fontSize:10,color:C.primary,background:C.primaryLight,padding:"1px 6px",borderRadius:6,fontWeight:600}}>Saved by you</span>
            </div>
            <div style={{fontSize:12,color:C.textHint,marginTop:2,lineHeight:1.4}}>{p.prompt}</div>
          </div>
          <button onClick={function(){removeSaved(p.id);}} title="Remove" style={{background:"none",border:"none",color:C.textHint,cursor:"pointer",fontSize:14,padding:2,flexShrink:0}}>✕</button>
        </div>;
      })}
      {isForYou&&forYouPrompts.length===0&&<div style={{fontSize:13,color:C.textHint,textAlign:"center",padding:"10px 0"}}>{lang==="en"?"Nothing urgent right now — browse the other categories.":"Inget brådskande just nu — bläddra bland övriga kategorier."}</div>}
      {!isForYou&&curatedForCat.length===0&&savedForCat.length===0&&<div style={{fontSize:13,color:C.textHint,textAlign:"center",padding:"10px 0"}}>{lang==="en"?"No prompts in this category yet.":"Inga prompter i denna kategori än."}</div>}
    </div>
  </div>;
}

// ─── PromptLibraryOverlay ─────────────────────────────────────────────────────
// Active-conversation variant: shown as a modal popup, opened from a button in
// the input row, closes when a prompt is picked or user clicks outside.
function PromptLibraryOverlay({savedPrompts,setSavedPrompts,onUse,onClose,cv,jobs}){
  var m=mob();
  return <div style={{position:"fixed",inset:0,zIndex:640,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:m?"flex-end":"center",justifyContent:"center",padding:m?0:24}} onClick={onClose}>
    <div style={{background:C.surface,borderRadius:m?"18px 18px 0 0":18,padding:"20px 18px 16px",width:m?"100%":"min(560px,90vw)",maxHeight:m?"80vh":"70vh",overflowY:"auto",boxShadow:m?"0 -8px 36px rgba(0,0,0,0.25)":"0 8px 36px rgba(0,0,0,0.25)"}} onClick={function(e){e.stopPropagation();}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:700,color:C.textPrimary}}>💡 Prompt library</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.textHint,cursor:"pointer",fontSize:18,padding:4,lineHeight:1}}>✕</button>
      </div>
      <PromptLibrary savedPrompts={savedPrompts} setSavedPrompts={setSavedPrompts}
        onUse={function(text){ onUse(text); onClose(); }}
        cv={cv} jobs={jobs} />
    </div>
  </div>;
}

function ProfileAssistant({cv,setCv,jobs,setJobs,profiles,setProfiles,anthropicKey,conversation,setConversation,setActiveTab,setPendingProfileRun,savedPrompts,setSavedPrompts}){
  var [input,setInput]=useState("");
  var [loading,setLoading]=useState(false);
  var [error,setError]=useState("");
  var [savePromptFor,setSavePromptFor]=useState(null);
  var [hoveredMsg,setHoveredMsg]=useState(null);
  var [libraryOpen,setLibraryOpen]=useState(false);
  var [justSavedId,setJustSavedId]=useState(null);
  var [actionStates,setActionStates]=useState({});
  var scrollRef=useRef(null);

  useEffect(function(){
    if(scrollRef.current){ scrollRef.current.scrollTop=scrollRef.current.scrollHeight; }
  },[conversation,loading]);

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
        tools:[{type:"web_search_20250305",name:"web_search"}],
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

  // ── Profile save/run ─────────────────────────────────────────────────────
  function saveProfile(prof){
    var newProfile={id:Date.now(),name:prof.name,query:prof.query,limit:prof.limit,sources:prof.sources,active:true};
    setProfiles(function(prev){return prev.concat([newProfile]);});
    setJustSavedId(newProfile.id);
  }
  function runNow(profileId){
    setPendingProfileRun(profileId);
    setActiveTab("profiles");
  }

  // ── Apply an action block ─────────────────────────────────────────────────
  function applyAction(action){
    // ── cv_edit ──────────────────────────────────────────────────────────────
    if(action.type==="cv_edit"){
      var sec=action.section;
      var op=action.op;
      var item=action.item||{};
      // Index is 1-based (as shown in UI and cvSummaryText); convert to 0-based
      var idx=action.index!=null?Number(action.index)-1:-1;
      setCv(function(prev){
        var list=(prev[sec]||[]).slice();
        if(op==="add"){
          if(sec==="achievements"){
            list=list.concat([Object.assign({id:Date.now()},item)]);
          } else {
            var exists=list.some(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase();});
            if(!exists) list=list.concat([Object.assign({id:Date.now()},item)]);
          }
        } else if(op==="edit"){
          // Index match takes priority; fall back to name/description match
          if(idx>=0&&idx<list.length){
            list=list.map(function(x,i){return i===idx?Object.assign({},x,item):x;});
          } else if(sec==="achievements"){
            var md=(item.description||"").toLowerCase().slice(0,60);
            list=list.map(function(x){return x.description&&x.description.toLowerCase().includes(md)?Object.assign({},x,item):x;});
          } else {
            list=list.map(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase()?Object.assign({},x,item):x;});
          }
        } else if(op==="delete"){
          if(idx>=0&&idx<list.length){
            list=list.filter(function(x,i){return i!==idx;});
          } else if(sec==="achievements"){
            var md2=(item.description||"").toLowerCase().slice(0,60);
            list=list.filter(function(x){return !(x.description&&x.description.toLowerCase().includes(md2));});
          } else {
            list=list.filter(function(x){return !(x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase());});
          }
        }
        return Object.assign({},prev,{[sec]:list});
      });
    }

    // ── cv_bulk_edit ─────────────────────────────────────────────────────────
    else if(action.type==="cv_bulk_edit"){
      var sec=action.section;
      var items=action.items||[];
      if(!items.length) return;
      var op=action.op||"add";
      setCv(function(prev){
        var list;
        if(op==="replace"){
          // Replace entire section — assign fresh IDs to all incoming items
          list=items.map(function(item){
            return Object.assign({id:Date.now()+Math.random()},item);
          });
        } else {
          // Add — deduplicate against existing entries
          list=(prev[sec]||[]).slice();
          items.forEach(function(item){
            if(sec==="achievements"){
              var matchDesc=(item.description||"").toLowerCase().slice(0,60);
              var exists=list.some(function(x){return x.description&&x.description.toLowerCase().includes(matchDesc);});
              if(!exists) list=list.concat([Object.assign({id:Date.now()+Math.random()},item)]);
            } else {
              var exists=list.some(function(x){return x.name&&x.name.toLowerCase()===(item.name||"").toLowerCase();});
              if(!exists) list=list.concat([Object.assign({id:Date.now()+Math.random()},item)]);
            }
          });
        }
        return Object.assign({},prev,{[sec]:list});
      });
    }

    // ── cv_pref ──────────────────────────────────────────────────────────────
    else if(action.type==="cv_pref"){
      var allowed=["roles","industries","locations","salary","workType"];
      if(allowed.indexOf(action.field)===-1) return;
      setCv(function(prev){
        var patch={};
        patch[action.field]=action.value;
        return Object.assign({},prev,patch);
      });
    }

    // ── job_update ───────────────────────────────────────────────────────────
    else if(action.type==="job_update"&&setJobs){
      var jid=String(action.jobId);
      setJobs(function(prev){
        return prev.map(function(j){
          if(String(j.id)!==jid) return j;
          var patch={};
          if(action.op==="setStatus"){
            patch.status=action.value;
            if(action.value==="Applied"&&!j.appliedAt) patch.appliedAt=new Date().toISOString();
            if(action.value==="Interview"&&!j.interviewAt) patch.interviewAt=new Date().toISOString();
            if(action.value==="Offer"&&!j.offerAt) patch.offerAt=new Date().toISOString();
            if(action.value==="Rejected"&&!j.rejectedAt) patch.rejectedAt=new Date().toISOString();
            if(action.value==="No response"&&!j.noResponseAt) patch.noResponseAt=new Date().toISOString();
            if(action.value==="Ad removed"&&!j.adRemovedAt) patch.adRemovedAt=new Date().toISOString();
          } else if(action.op==="setNotes"){
            patch.notes=String(action.value||"");
          } else if(action.op==="appendNote"){
            patch.notes=((j.notes||"").trim()+(j.notes?"\n":"")+String(action.value||"")).trim();
          } else if(action.op==="setDate"){
            var allowed=["appliedAt","interviewAt","offerAt","rejectedAt","noResponseAt"];
            if(allowed.indexOf(action.field)!==-1){
              // Accept YYYY-MM-DD and convert to ISO, or null to clear
              if(action.value){
                var d=new Date(action.value+"T12:00:00");
                patch[action.field]=isNaN(d.getTime())?null:d.toISOString();
              } else {
                patch[action.field]=null;
              }
            }
          }
          return Object.assign({},j,patch);
        });
      });
    }

    // ── profile_update ───────────────────────────────────────────────────────
    else if(action.type==="profile_update"&&setProfiles){
      var pid=action.profileId;
      if(action.op==="delete"){
        setProfiles(function(prev){return prev.filter(function(p){return p.id!==pid;});});
      } else {
        setProfiles(function(prev){
          return prev.map(function(p){
            if(p.id!==pid) return p;
            var patch={};
            if(action.op==="setActive") patch.active=!!action.value;
            else if(action.op==="setQuery") patch.query=String(action.value||"").slice(0,300);
            else if(action.op==="setLimit") patch.limit=Math.max(1,Math.min(50,parseInt(action.value,10)||15));
            return Object.assign({},p,patch);
          });
        });
      }
    }
  }

  function handleAccept(msgIdx,actionIdx,action){
    // action may be a filtered version (e.g. only checked items from cv_bulk_edit)
    if(action&&action.items&&action.items.length===0) return; // nothing selected
    applyAction(action);
    setActionStates(function(prev){return Object.assign({},prev,{[msgIdx+":"+actionIdx]:"accepted"});});
  }
  function handleReject(msgIdx,actionIdx){
    setActionStates(function(prev){return Object.assign({},prev,{[msgIdx+":"+actionIdx]:"rejected"});});
  }

  // ── Markdown renderer ────────────────────────────────────────────────────
  function renderMarkdown(text){
    if(!text) return null;

    // Split into blocks on double newlines
    var blocks=text.split(/\n{2,}/);

    return blocks.map(function(block,bi){
      var lines=block.split("\n");
      var first=lines[0]?lines[0].trim():"";

      // ── Heading ## ────────────────────────────────────────────────────────
      if(/^##\s/.test(first)){
        return <div key={bi} style={{fontSize:15,fontWeight:700,color:C.textPrimary,
          marginBottom:6,marginTop:bi===0?0:10,lineHeight:1.4}}>
          {inlineFormat(first.replace(/^##\s+/,""))}
        </div>;
      }

      // ── Sub-heading ### ───────────────────────────────────────────────────
      if(/^###\s/.test(first)){
        return <div key={bi} style={{fontSize:14,fontWeight:700,color:C.primary,
          marginBottom:4,marginTop:bi===0?0:8,lineHeight:1.4}}>
          {inlineFormat(first.replace(/^###\s+/,""))}
        </div>;
      }

      // ── Table (lines starting with |) ─────────────────────────────────────
      if(lines.length>=2&&/^\|/.test(first)){
        var tableLines=lines.filter(function(l){return l.trim()&&!/^[\|\s\-:]+$/.test(l.trim());});
        if(tableLines.length>=1){
          var parseRow=function(line){
            return line.split("|").map(function(c){return c.trim();}).filter(function(c,i,a){return i>0&&i<a.length-1;});
          };
          var headers=parseRow(tableLines[0]);
          var rows=tableLines.slice(1).map(parseRow);
          return <table key={bi} style={{width:"100%",borderCollapse:"collapse",fontSize:13,
            marginBottom:8,marginTop:4}}>
            <thead>
              <tr>{headers.map(function(h,hi){
                return <th key={hi} style={{padding:"6px 10px",textAlign:"left",
                  fontWeight:700,fontSize:12,color:C.textSecondary,
                  borderBottom:"2px solid "+C.border,background:C.surfaceAlt}}>
                  {inlineFormat(h)}
                </th>;
              })}</tr>
            </thead>
            <tbody>{rows.map(function(row,ri){
              return <tr key={ri} style={{background:ri%2===0?"transparent":C.surfaceAlt}}>
                {row.map(function(cell,ci){
                  return <td key={ci} style={{padding:"6px 10px",
                    borderBottom:"1px solid "+C.border,color:C.textPrimary,
                    verticalAlign:"top"}}>
                    {inlineFormat(cell)}
                  </td>;
                })}
              </tr>;
            })}</tbody>
          </table>;
        }
      }

      // ── Bullet list (- • *) ───────────────────────────────────────────────
      if(lines.every(function(l){return !l.trim()||/^[-•*]\s/.test(l.trim());})){
        var items=lines.filter(function(l){return l.trim();})
          .map(function(l){return l.trim().replace(/^[-•*]\s+/,"");});
        return <ul key={bi} style={{margin:"4px 0 8px 18px",padding:0,listStyleType:"disc"}}>
          {items.map(function(item,ii){
            return <li key={ii} style={{fontSize:14,lineHeight:1.65,color:C.textPrimary,marginBottom:4}}>
              {inlineFormat(item)}
            </li>;
          })}
        </ul>;
      }

      // ── Numbered list (1. 2. 3.) ──────────────────────────────────────────
      if(lines.every(function(l){return !l.trim()||/^\d+\.\s/.test(l.trim());})){
        var items=lines.filter(function(l){return l.trim();})
          .map(function(l){return l.trim().replace(/^\d+\.\s+/,"");});
        return <ol key={bi} style={{margin:"4px 0 8px 20px",padding:0}}>
          {items.map(function(item,ii){
            return <li key={ii} style={{fontSize:14,lineHeight:1.65,color:C.textPrimary,marginBottom:4}}>
              {inlineFormat(item)}
            </li>;
          })}
        </ol>;
      }

      // ── Plain paragraph — preserve single linebreaks as <br/> ─────────────
      var parts=block.split("\n");
      if(parts.length===1){
        return <p key={bi} style={{margin:"0 0 6px 0",fontSize:14,lineHeight:1.65,color:C.textPrimary}}>
          {inlineFormat(block)}
        </p>;
      }
      return <p key={bi} style={{margin:"0 0 6px 0",fontSize:14,lineHeight:1.65,color:C.textPrimary}}>
        {parts.map(function(line,li){
          return <React.Fragment key={li}>
            {inlineFormat(line)}
            {li<parts.length-1&&<br/>}
          </React.Fragment>;
        })}
      </p>;
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

  // ── Render one assistant message ─────────────────────────────────────────
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
          cv={cv}
          accepted={state==="accepted"}
          rejected={state==="rejected"}
          onAccept={function(filteredAction){handleAccept(msgIdx,ai,filteredAction||seg.value);}}
          onReject={function(){handleReject(msgIdx,ai);}} />;
      }
      return null;
    });
  }

  var hasStructured=!!(cv&&((cv.tools&&cv.tools.length)||(cv.skills&&cv.skills.length)||(cv.achievements&&cv.achievements.length)));

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:15,fontWeight:700,color:C.textPrimary}}>Gabbi — AI Assistant</div>
        {conversation.length>0&&<Btn onClick={clearConversation} style={{fontSize:12,padding:"6px 12px"}}>Clear</Btn>}
      </div>
      {!anthropicKey&&<Alert type="warning">Add your Anthropic API key in Search Profiles → API keys to use Gabbi.</Alert>}
      {!hasCv(cv)&&anthropicKey&&<Alert type="info">Tip: add your CV in My CV so Gabbi can tailor suggestions to your background.</Alert>}
      {hasCv(cv)&&!hasStructured&&anthropicKey&&<Alert type="info">Tip: populate the Tools, Skills and Achievements sections in My CV for richer analysis.</Alert>}
      <div ref={scrollRef} style={{maxHeight:"65vh",overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingRight:4}}>
        {conversation.length===0&&<div>
          <div style={{fontSize:14,color:C.textSecondary,marginBottom:14,lineHeight:1.6}}>
            Hi! I'm Gabbi. I can analyse your CV, suggest improvements, help you build search profiles, discuss your pipeline, or update job statuses and notes. What would you like to work on?
          </div>
          <PromptLibrary savedPrompts={savedPrompts} setSavedPrompts={setSavedPrompts} onUse={function(text){setInput(text);}} cv={cv} jobs={jobs} />
        </div>}

        {conversation.map(function(msg,i){
          if(msg.role==="user"){
            return <div key={i} style={{alignSelf:"flex-end",maxWidth:"85%",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}
              onMouseEnter={function(){setHoveredMsg(i);}} onMouseLeave={function(){setHoveredMsg(function(h){return h===i?null:h;});}}>
              <div style={{background:C.primary,color:"#fff",padding:"10px 14px",borderRadius:"14px 14px 2px 14px",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{msg.content}</div>
              {(hoveredMsg===i||mob())&&<button onClick={function(){setSavePromptFor(msg.content);}}
                style={{fontSize:11,color:C.textHint,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"2px 4px",display:"flex",alignItems:"center",gap:3}}>
                🔖 Save
              </button>}
            </div>;
          }
          return <div key={i} style={{alignSelf:"flex-start",maxWidth:"95%",width:"95%"}}>
            <div style={{fontSize:11,color:C.textHint,fontWeight:600,letterSpacing:"0.5px",marginBottom:4}}>GABBI</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>{renderAssistantMessage(msg.content,i)}</div>
          </div>;
        })}
        {loading&&<div style={{alignSelf:"flex-start",fontSize:13,color:C.textHint,fontStyle:"italic"}}>Gabbi is thinking…</div>}
      </div>

      {error&&<Alert type="error">{error}</Alert>}

      <div style={{display:"flex",gap:8,marginTop:14,alignItems:"stretch"}}>
        <button onClick={function(){setLibraryOpen(true);}} title="Prompt library"
          aria-label="Open prompt library"
          style={{padding:"0 12px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,cursor:"pointer",fontSize:18,fontFamily:"inherit",color:C.textSecondary,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          💡
        </button>
        <Inp value={input} onChange={function(e){setInput(e.target.value);}}
          onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey&&input.trim()&&!loading&&anthropicKey){e.preventDefault();send();}}}
          enterKeyHint="send"
          placeholder="Ask Gabbi anything about your search, CV or pipeline…"
          style={{flex:1}} />
        <Btn variant="primary" onClick={function(){send();}} disabled={loading||!input.trim()||!anthropicKey} style={{padding:"10px 20px"}}>Send</Btn>
      </div>
    </Card>

    {libraryOpen&&<PromptLibraryOverlay savedPrompts={savedPrompts} setSavedPrompts={setSavedPrompts}
      onUse={function(text){setInput(text);}}
      onClose={function(){setLibraryOpen(false);}}
      cv={cv} jobs={jobs} />}

    {savePromptFor&&<SavePromptDialog initialText={savePromptFor}
      onClose={function(){setSavePromptFor(null);}}
      onSave={function(entry){
        setSavedPrompts(function(prev){
          return (prev||[]).concat([{id:"sp_"+Date.now(),title:entry.title,category:entry.category,prompt:entry.prompt,savedAt:new Date().toISOString()}]);
        });
        setSavePromptFor(null);
      }} />}
  </div>;
}

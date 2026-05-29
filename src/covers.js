// ─── Cover Letters ────────────────────────────────────────────────────────────
function CoverLetters({jobs,setJobs,cv,anthropicKey,setActiveTab,pendingCoverLetterJob,setPendingCoverLetterJob}){
  var [showAllStatuses,setShowAllStatuses]=useState(false);
  var eligibleJobs=jobs.filter(function(j){
    if(j.archived) return false;
    return showAllStatuses?true:j.status==="Reviewing";
  });
  var [selectedJob,setSelectedJob]=useState(eligibleJobs[0]?eligibleJobs[0].id:null);
  useEffect(function(){
    var stillEligible=eligibleJobs.some(function(j){return j.id===selectedJob;});
    if(!stillEligible){ setSelectedJob(eligibleJobs[0]?eligibleJobs[0].id:null); }
  },[eligibleJobs.length,showAllStatuses]);

  useEffect(function(){
    if(!pendingCoverLetterJob) return;
    var target=jobs.find(function(j){return j.id===pendingCoverLetterJob;});
    if(target){
      var inPool=eligibleJobs.some(function(j){return j.id===target.id;});
      if(!inPool) setShowAllStatuses(true);
      setSelectedJob(target.id);
    }
    if(setPendingCoverLetterJob) setPendingCoverLetterJob(null);
  },[pendingCoverLetterJob]);

  var [tone,setTone]=useState("Professional");
  var [language,setLanguage]=useState("auto");
  var [letter,setLetter]=useState("");
  var [error,setError]=useState("");
  var [loading,setLoading]=useState(false);
  var [showEmail,setShowEmail]=useState(false);
  var [saved,setSaved]=useState(false);

  function detectJobLanguage(job){
    if(!job) return "English";
    var text=((job.description||"")+" "+(job.title||"")).toLowerCase();
    if(!text.trim()) return "English";
    var svWords=["och","att","för","med","som","det","vi","på","är","av","har","inom","ett","en","till","samt","goda","kunskaper","erfarenhet","arbeta","söker","tjänst","krav","meriterande"];
    var enWords=["and","the","for","with","our","you","we","are","will","your","have","this","that","role","team","experience","skills","join","looking","responsible"];
    var svScore=svWords.reduce(function(n,w){return n+(text.split(new RegExp("\\b"+w+"\\b","g")).length-1);},0);
    var enScore=enWords.reduce(function(n,w){return n+(text.split(new RegExp("\\b"+w+"\\b","g")).length-1);},0);
    return svScore>enScore?"Swedish":"English";
  }

  useEffect(function(){
    var job=jobs.find(function(j){return j.id===selectedJob;});
    setLetter(job&&job.coverLetter?job.coverLetter:"");
    setSaved(false);
    setShowEmail(false);
    setError("");
    setLanguage("auto");
  },[selectedJob]);

  function saveLetter(text){
    if(!setJobs||!selectedJob) return;
    setJobs(function(prev){return prev.map(function(j){
      return j.id===selectedJob?Object.assign({},j,{coverLetter:text||""}):j;
    });});
    setSaved(true);
    setTimeout(function(){setSaved(false);},2000);
  }

  async function generate(){
    var job=eligibleJobs.find(function(j){return j.id===selectedJob;});
    if(!job) return;
    if(!cv.text||cv.text.trim().length<100){
      setError("Please add a substantive CV in the My CV tab first. The letter can only be grounded in what you've actually written.");
      return;
    }
    var resolvedLang=language==="auto"?detectJobLanguage(job):language;
    setLoading(true);setLetter("");setError("");setShowEmail(false);
    try{
      var jobBrief="Title: "+job.title+"\nCompany: "+job.company+"\nLocation: "+(job.location||"Not specified");
      if(job.employmentType) jobBrief+="\nEmployment type: "+job.employmentType;
      if(job.tags&&job.tags.length) jobBrief+="\nTags: "+job.tags.join(", ");
      if(job.description){
        var desc=job.description.slice(0,3000).replace(/\s+/g," ").trim();
        jobBrief+="\n\nJob description:\n"+desc;
      }
      var prompt=
        "You are writing a cover letter for a job applicant. Write it in "+resolvedLang+" with a "+tone.toLowerCase()+" tone.\n\n"+
        "═══ STRICT GROUNDING RULES — FOLLOW EXACTLY ═══\n"+
        "1. The CV below is the ONLY source of truth about the applicant. Do NOT invent, infer, or extrapolate skills, experience, qualifications, achievements, tools, languages, certifications, employers, education, or soft skills that are not explicitly stated in the CV.\n"+
        "2. If the job description lists a requirement that is NOT evidenced in the CV, do NOT claim the applicant has it. Do NOT hint at it, imply it, or use filler phrases suggesting it. Either omit it entirely or frame it honestly as something the applicant is eager to learn.\n"+
        "3. Do NOT use generic stock phrases like \"proven track record\", \"passionate about\", \"results-driven\", \"strong communication skills\", \"team player\", \"proactive self-starter\", \"wealth of experience\", unless those exact qualities are demonstrated by specific content in the CV.\n"+
        "4. When you reference a skill or achievement, it must be traceable to a concrete line or section of the CV. Prefer specific wording from the CV itself.\n"+
        "5. Do NOT fabricate numbers, percentages, metrics, project names, client names, or dates. Only cite numbers that appear in the CV.\n"+
        "6. Keep the letter CONCISE — aim for 200-300 words. A shorter, honest letter is better than a padded, speculative one.\n"+
        "7. If the CV is sparse on something the job needs, it is better to write a shorter letter that highlights what IS a fit, than to pad with generic claims.\n"+
        "8. Start directly with the salutation. No preamble, no meta-commentary, no \"Here is your cover letter\".\n\n"+
        "═══ JOB ═══\n"+jobBrief+"\n\n"+
        "═══ CV & PROFILE (ONLY source of truth about the applicant) ═══\n"+cvSummaryText(cv)+"\n\n"+
        "Write the cover letter now, following every rule above.";
      var text=await callClaude({apiKey:anthropicKey,prompt:prompt,maxTokens:1500});
      setLetter(text);
      if(setJobs&&selectedJob){
        setJobs(function(prev){return prev.map(function(j){
          return j.id===selectedJob?Object.assign({},j,{coverLetter:text}):j;
        });});
      }
    }catch(e){setError(e.message||"Error connecting to Claude. Please try again.");}
    setLoading(false);
  }

  var currentJob=eligibleJobs.find(function(j){return j.id===selectedJob;});
  var emailSubject=currentJob?"Application — "+currentJob.title+" at "+currentJob.company:"Cover letter";
  var reviewingCount=jobs.filter(function(j){return !j.archived&&j.status==="Reviewing";}).length;
  var noJobsAtAll=jobs.filter(function(j){return !j.archived;}).length===0;

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <Card>
      <SectionTitle>Generate a cover letter <InfoTip>Claude writes a personalised cover letter based on the job description and your CV. It only references what's explicitly in your CV — no invented skills. Edit the result before sending.</InfoTip></SectionTitle>
      {noJobsAtAll
        ?<Alert type="warning">Add some jobs first — go to My Jobs or Search Profiles to get started.</Alert>
        :eligibleJobs.length===0
          ?<div style={{padding:"20px",background:C.surfaceAlt,borderRadius:12,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>📝</div>
            <div style={{fontSize:15,fontWeight:600,color:C.textPrimary,marginBottom:6}}>No jobs ready for a cover letter</div>
            <div style={{fontSize:13,color:C.textSecondary,marginBottom:14,lineHeight:1.5}}>Cover letters are drafted for jobs you're actively considering.<br/>Move a job to the <b>Reviewing</b> status first, then come back here.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <Btn variant="primary" onClick={function(){if(setActiveTab) setActiveTab("jobs");}} style={{fontSize:13}}>Go to My Jobs</Btn>
              <Btn onClick={function(){setShowAllStatuses(true);}} style={{fontSize:13}}>Show all statuses anyway</Btn>
            </div>
          </div>
          :<div>
            <div className="jt-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:10}}>
              <div><Label hint={showAllStatuses?"Showing all non-archived jobs.":"Showing jobs you're actively reviewing."}>Select a job</Label><Sel value={selectedJob||""} onChange={function(e){var v=e.target.value;var num=Number(v);setSelectedJob(isNaN(num)||String(num)!==v?v:num);}}>{eligibleJobs.map(function(j){return <option key={j.id} value={j.id}>{j.title} – {j.company}{showAllStatuses?" ["+j.status+"]":""}</option>;})}</Sel></div>
              <div><Label hint="This affects the writing style of the letter.">Tone of voice</Label><Sel value={tone} onChange={function(e){setTone(e.target.value);}}>{["Professional","Conversational","Enthusiastic","Formal","Creative"].map(function(t){return <option key={t}>{t}</option>;})}</Sel></div>
              <div>
                <Label hint="Auto-detect reads the job description language. Override if the result is wrong.">
                  Language
                  {language==="auto"&&currentJob&&<span style={{fontSize:11,color:C.textHint,fontWeight:400,marginLeft:6}}>→ detected: {detectJobLanguage(currentJob)}</span>}
                </Label>
                <Sel value={language} onChange={function(e){setLanguage(e.target.value);}}>
                  <option value="auto">Auto-detect from job description</option>
                  <option value="English">English</option>
                  <option value="Swedish">Swedish</option>
                </Sel>
              </div>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.textSecondary,cursor:"pointer",userSelect:"none",marginBottom:14}}>
              <input type="checkbox" checked={showAllStatuses} onChange={function(){setShowAllStatuses(function(v){return !v;});}} style={{width:14,height:14,cursor:"pointer",accentColor:C.primary}} />
              <span>Show all statuses (by default only jobs in <b>Reviewing</b> status are listed)</span>
              {!showAllStatuses&&reviewingCount>0&&<span style={{color:C.textHint}}>· {reviewingCount} job{reviewingCount!==1?"s":""} reviewing</span>}
            </label>
            <Btn variant="primary" onClick={generate} disabled={loading||!selectedJob||!anthropicKey} style={{padding:"12px 28px"}}>{loading?"Writing your letter...":"Generate cover letter ↗"}</Btn>
            <div style={{fontSize:11,color:C.textHint,marginTop:10,fontStyle:"italic",lineHeight:1.5}}>The letter will only reference skills and experience that appear in your CV. If the job asks for something your CV doesn't cover, it won't be claimed. A sparse CV produces a shorter letter — that's intentional.</div>
          </div>
      }
      {!anthropicKey&&<Alert type="warning">Add your Anthropic API key in Search Profiles → API keys to use this feature.</Alert>}
      {error&&<Alert type="error">{error}</Alert>}
    </Card>
    {letter&&<Card>
      <SectionTitle>Your cover letter</SectionTitle>
      <div style={{fontSize:13,color:C.textHint,marginBottom:12}}></div>
      <Txta value={letter} onChange={function(e){setLetter(e.target.value);setSaved(false);}} rows={16} />
      <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap",alignItems:"center"}}>
        <Btn variant="primary" onClick={function(){setShowEmail(true);}}>✉ Send via email</Btn>
        <Btn onClick={function(){exportLetterPdf({letter:letter,cv:cv,job:currentJob});}}>📄 Export as PDF</Btn>
        <Btn onClick={function(){navigator.clipboard.writeText(letter);}}>Copy to clipboard</Btn>
        <Btn onClick={function(){var b=new Blob([letter],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="cover-letter.txt";a.click();}}>Export as text file</Btn>
        <Btn onClick={function(){saveLetter(letter);}} style={{marginLeft:"auto"}}>{saved?"✓ Saved":"Save changes"}</Btn>
        <Btn variant="danger" onClick={function(){if(confirm("Remove saved cover letter from this job?")){{setLetter("");saveLetter("");}}}}>Remove</Btn>
      </div>
      {showEmail&&<EmailDialog recipients={cv.recipients||[]} subject={emailSubject} body={letter} onClose={function(){setShowEmail(false);}} />}
    </Card>}
  </div>;
}

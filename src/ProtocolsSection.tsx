import { useState, useRef, useEffect, useCallback } from "react";
import TrackerConnect, { type TrackerEntry } from "./TrackerConnect";
import AccountabilityEngine from "./AccountabilityEngine";

// ─── GOAL PRESETS ────────────────────────────────────────────────────────────
const GOAL_PRESETS = [
  { icon:"🔥", label:"Lose belly fat",        fill:"I need to lose visceral belly fat. I'm not morbidly obese but I carry fat in my midsection." },
  { icon:"🩸", label:"Lower blood sugar",     fill:"My doctor said my blood sugar / A1C is too high. I may be pre-diabetic." },
  { icon:"💔", label:"Lower cholesterol",     fill:"My LDL is elevated and my doctor wants to put me on a statin. I want to try lifestyle first." },
  { icon:"😴", label:"Fix my sleep",          fill:"I can't fall asleep, I wake up at 3am, or I wake up exhausted regardless of hours slept." },
  { icon:"⚡", label:"More energy",           fill:"I'm chronically fatigued, brain fog, low motivation — crashing by 2pm every day." },
  { icon:"💪", label:"Build muscle",          fill:"I'm skinny-fat or just untrained. I want to build real muscle and strength." },
  { icon:"🧠", label:"Sharper focus",         fill:"I need better cognitive performance — focus, memory, mental clarity, less brain fog." },
  { icon:"📉", label:"Lower blood pressure",  fill:"My blood pressure is elevated (130s-150s systolic). Doctor is watching it." },
  { icon:"🦴", label:"Reduce inflammation",   fill:"I have joint pain, chronic inflammation, or an autoimmune condition flaring." },
  { icon:"🧬", label:"Optimize hormones",     fill:"I suspect low testosterone / hormone imbalance. Low libido, fatigue, mood swings." },
  { icon:"🫀", label:"Improve heart health",  fill:"I want to meaningfully reduce cardiovascular disease risk — family history or existing markers." },
  { icon:"⚖️", label:"Stop yo-yo dieting",   fill:"I lose weight and gain it back. I need something sustainable that actually works." },
];

const SEED_PROTOCOLS = [
  {
    id:"zone2", name:"Zone 2 Cardio",
    tagline:"Low-intensity aerobic training that rewires your metabolic engine at the mitochondrial level.",
    badge:"validated", trendDelta:"+34%", accentColor:"#00d2a5", category:"movement",
    signals:[{label:"VO2 Max",value:92,color:"#00d2a5"},{label:"Mitochondria",value:88,color:"#64d2ff"},{label:"Fat Oxidation",value:95,color:"#00d2a5"},{label:"Inflammation",value:-60,displayValue:"↓60%",color:"#ff6464"}],
    impacts:[{num:"4–6×",desc:"Mitochondrial density"},{num:"~18%",desc:"Resting HR drop"},{num:"2.3×",desc:"Fat oxidation"}],
    mechanism:"Zone 2 (65–75% max HR) activates AMPK signaling, triggering mitochondrial biogenesis via PGC-1α. Sustained output trains fat oxidation preferentially, reducing inflammatory byproducts. Lactate stays below threshold — no cortisol spike undermining recovery.",
    adaptations:{"Performance":"Stack Zone 2 with 1–2 VO2 max intervals/week. REFUZE the plateau. 4× 45-min fasted sessions maximizes fat adaptation.","Longevity":"3× 60-min sessions/week. Ynot.life protocol: morning Zone 2, track HRV. Non-negotiable for anyone 35+.","Body Composition":"Fasted Zone 2 (90 min, 3×/week) is the most effective fat-loss tool that isn't a diet. REFUZE HIIT-only thinking."},
    nuance:"If you can't hold a conversation, you're above Zone 2. Most people train too hard and negate the adaptation.", custom:false,
  },
  {
    id:"sleep-stack", name:"Sleep Architecture",
    tagline:"Optimizing deep sleep and REM — the biological reset most people are sabotaging nightly.",
    badge:"trending", trendDelta:"+61%", accentColor:"#64d2ff", category:"recovery",
    signals:[{label:"Deep Sleep",value:85,color:"#64d2ff"},{label:"HRV (AM)",value:78,color:"#00d2a5"},{label:"Cortisol Rhythm",value:72,color:"#64d2ff"},{label:"GH Pulse",value:90,color:"#00d2a5"}],
    impacts:[{num:"40%",desc:"Injury risk ↓"},{num:"3×",desc:"Memory consolidation"},{num:"+23%",desc:"Testosterone"}],
    mechanism:"Deep sleep (N3) triggers >70% of daily GH output in the first 90-min cycle. REM consolidates motor learning and metabolic memory. Circadian disruption elevates cortisol, suppresses melatonin, and impairs insulin sensitivity by morning.",
    adaptations:{"Performance":"7.5 or 9 hrs — never 7 or 8 (cuts cycles). Cold room 67°F, blackout, no alcohol within 4 hrs.","Longevity":"Sleep/wake timing ±20 min even weekends. Track HRV with Oura or WHOOP and respond to data, not opinion.","Body Composition":"Sleep deprivation is a fat-gain mechanism. REFUZE late-night eating. Magnesium glycinate 300mg + Apigenin 50mg amplifies N3."},
    nuance:"10 min of morning sunlight before 9am outperforms any sleep supplement stack.", custom:false,
  },
  {
    id:"creatine", name:"Creatine Monohydrate",
    tagline:"500+ peer-reviewed studies. The most validated performance compound in existence.",
    badge:"validated", trendDelta:"+28%", accentColor:"#00d2a5", category:"supplementation",
    signals:[{label:"Power Output",value:92,color:"#00d2a5"},{label:"Cognitive Speed",value:68,color:"#64d2ff"},{label:"Muscle Hydration",value:85,color:"#64d2ff"},{label:"Neuroprotection",value:72,color:"#00d2a5"}],
    impacts:[{num:"5–15%",desc:"Strength output"},{num:"+14%",desc:"Working memory"},{num:"500+",desc:"Peer-reviewed studies"}],
    mechanism:"Creatine phosphate donates phosphate to ADP → ATP resynthesis at maximal effort. Extends PCr availability 10–40%. In brain, buffers ATP during cognitively demanding tasks. Monohydrate is bioequivalent to all 'enhanced' forms.",
    adaptations:{"Performance":"5g/day post-workout with carbs. REFUZE the HCl/buffered upsell — monohydrate is the gold standard.","Longevity":"3–5g/day ongoing. Neuroprotective data compelling — Ynot.life non-negotiable for 40+.","Body Composition":"5g/day. 1–2kg water weight is intramuscular — a feature. REFUZE stopping during a cut."},
    nuance:"~25–30% non-responders exist — typically those with high dietary creatine intake already.", custom:false,
  },
];

const QUICK_SUGGESTS = ["Carnivore Diet","Extended Fasting","Vegan Protocol","Ketogenic Diet","Breathwork / Wim Hof","Red Light Therapy","Grounding / Earthing","Sauna Protocol","Methylene Blue","Peptide Therapy","Polyphasic Sleep","Seed Cycling"];
const OUTCOMES = ["Performance","Longevity","Body Composition"];
const CATEGORIES = ["all","movement","recovery","nutrition","supplementation"];
const RESEARCH_STEPS_MODAL = ["Verifying protocol identity","Searching scientific literature","Extracting mechanisms","Scoring evidence","Generating adaptations","Building card"];
const ANALYSIS_STEPS = ["Parsing your health situation","Cross-referencing clinical evidence","Building ranked interventions","Calculating realistic timelines","Generating daily action plan","Personalizing to your context"];

const TL_COLORS = ["#00d2a5","#64d2ff","#b478ff"];

function badgeColor(b: string) {
  return ({validated:"#00d2a5",trending:"#ff6464",emerging:"#64d2ff",custom:"#b478ff"})[b] || "#64d2ff";
}
function impactColor(i: string) {
  return ({Critical:"#00d2a5",High:"#64d2ff",Moderate:"#ffa040"})[i] || "#ffa040";
}

async function callClaude(messages: any[], system: string, maxTokens = 1200) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt: system, userMessage: messages[messages.length - 1].content, maxTokens }),
  });
  const data = await res.json();
  return data.text || "";
}

// ─── Signal Bar ──────────────────────────────────────────────────────────────
function SignalBar({ label, value, displayValue, color }: any) {
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const S: React.CSSProperties = {
    fontFamily: "EB Garamond, Georgia, serif",
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
      <span style={{ ...S, fontSize:11, color:"rgba(0,180,140,.5)", textTransform:"uppercase", letterSpacing:"0.08em", width:100, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:3, background:"rgba(0,40,30,.6)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${abs}%`, height:"100%", background: isNeg ? `linear-gradient(90deg,rgba(255,100,100,.4),#ff6464)` : `linear-gradient(90deg,${color}44,${color})`, borderRadius:2 }} />
      </div>
      <span style={{ ...S, fontSize:11, color: isNeg?"#ff6464":color, width:36, textAlign:"right" }}>{displayValue||`${value}%`}</span>
    </div>
  );
}

// ─── Ranked Protocol Row (Do This Now) ──────────────────────────────────────
function RankedProtoRow({ item, rank }: { item: any; rank: number }) {
  const [open, setOpen] = useState(rank === 0);
  const tls = [item.day30, item.day60, item.day90];
  const rankColors = ["#00d2a5","#64d2ff","#b478ff","#ffa040","rgba(0,160,130,.6)"];
  const rc = rankColors[Math.min(rank, 4)];

  return (
    <div style={{ background:"rgba(0,6,14,.82)", border:`1px solid rgba(0,165,132,.14)`, borderTop:`2px solid ${rc}`, borderRadius:6, overflow:"hidden" }}>
      <div style={{ padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:12 }} onClick={() => setOpen(o => !o)}>
        <div style={{ fontFamily:"EB Garamond,serif", fontSize:24, color:rc, minWidth:28, lineHeight:1, marginTop:2 }}>#{rank+1}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, color:"rgba(0,215,172,.94)", fontWeight:500, marginBottom:4 }}>{item.name}</div>
          <div style={{ fontSize:14, color:"rgba(0,175,142,.6)", lineHeight:1.5 }}>{item.whyItWorks}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
          <span style={{ fontSize:11, padding:"3px 9px", border:`1px solid ${impactColor(item.impactLevel)}`, borderRadius:2, color:impactColor(item.impactLevel), letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"EB Garamond,serif" }}>{item.impactLevel}</span>
          <span style={{ fontSize:14, color:"rgba(0,165,132,.4)", transform:open?"rotate(180deg)":"none", transition:"transform .2s" }}>⌄</span>
        </div>
      </div>

      {open && (
        <div style={{ padding:"0 20px 20px", borderTop:"1px solid rgba(0,165,132,.1)" }}>
          {/* Do This Now */}
          <div style={{ background:"rgba(0,40,32,.3)", borderLeft:"3px solid #00d2a5", padding:"14px 16px", margin:"16px 0 16px", borderRadius:"0 4px 4px 0" }}>
            <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#00d2a5", marginBottom:10, fontFamily:"EB Garamond,serif" }}>✦ Do This Now — Starting Today</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {item.doNow?.map((a: string, i: number) => (
                <div key={i} style={{ display:"flex", gap:10, fontSize:14, color:"rgba(0,215,172,.88)", lineHeight:1.5 }}>
                  <span style={{ color:"#00d2a5", flexShrink:0, marginTop:1 }}>→</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 30/60/90 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
            {tls.map((tl: any, i: number) => (
              <div key={i} style={{ background:"rgba(0,4,12,.7)", border:"1px solid rgba(0,165,132,.12)", borderRadius:4, padding:"12px 14px", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:TL_COLORS[i], opacity:.4 }} />
                <div style={{ fontFamily:"EB Garamond,serif", fontSize:28, color:TL_COLORS[i], lineHeight:1 }}>{i===0?"30":i===1?"60":"90"}</div>
                <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(0,160,130,.5)", marginBottom:8 }}>Day Result</div>
                <div style={{ fontSize:14, color:"rgba(0,215,172,.9)", fontWeight:500, lineHeight:1.4, marginBottom:4 }}>{tl?.headline}</div>
                <div style={{ fontSize:12, color:"rgba(0,160,130,.55)", lineHeight:1.5 }}>{tl?.detail}</div>
              </div>
            ))}
          </div>

          {/* Evidence */}
          <div style={{ background:"rgba(0,100,80,.06)", border:"1px solid rgba(0,175,138,.15)", borderRadius:4, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", color:"#64d2ff", marginBottom:6, fontFamily:"EB Garamond,serif" }}>What the Science Actually Shows</div>
            <div style={{ fontSize:13, color:"rgba(0,180,145,.75)", lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html:(item.scienceNote||"").replace(/\*\*(.*?)\*\*/g,"<strong style='color:rgba(0,215,172,.9)'>$1</strong>") }} />
          </div>

          {item.refuze && (
            <div style={{ background:"rgba(255,100,100,.05)", border:"1px solid rgba(255,100,100,.15)", borderRadius:4, padding:"10px 14px", display:"flex", gap:10 }}>
              <span style={{ color:"#ff6464", flexShrink:0 }}>✕</span>
              <div style={{ fontSize:13, color:"rgba(200,140,140,.8)", lineHeight:1.6 }}>
                <strong style={{ color:"#ff6464" }}>REFUZE: </strong>{item.refuze}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DO THIS NOW ENGINE ──────────────────────────────────────────────────────
function DoThisNow({ markers }: { markers: any[] }) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle"|"analyzing"|"results"|"error">("idle");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [errMsg, setErrMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function fillPreset(text: string) { setInput(text); setTimeout(() => textareaRef.current?.focus(), 50); }

  async function analyze() {
    if (!input.trim() || input.trim().length < 10) return;
    setPhase("analyzing"); setAnalysisStep(0); setResults(null);
    const timer = setInterval(() => setAnalysisStep(s => s < ANALYSIS_STEPS.length - 1 ? s + 1 : s), 800);

    const markerContext = markers.length > 0
      ? `\n\nUser's actual biomarkers from uploaded documents: ${markers.slice(0, 40).map((m: any) => `${m.name}: ${m.value}${m.unit} (${m.status})`).join(", ")}`
      : "";

    const SYSTEM = `You are Aellux's clinical recommendation engine. Give brutally honest, science-backed health recommendations grounded in peer-reviewed research.

Brand voice: REFUZE = reject fads and generic advice. Ynot.life = pursue peak biology right now.

Rules:
1. No fads. No supplements unless strong evidence exists.
2. Give REAL expected results with realistic ranges — not best-case fantasy.
3. Be specific. Dosages, frequencies, timing matter.
4. Acknowledge when evidence is limited. Never overstate.
5. Prioritize interventions with the highest ROI and evidence strength.
6. Address the ROOT CAUSE, not just symptoms.
7. Always include what people commonly do WRONG (REFUZE block).
8. This is educational information — recommend professional guidance where appropriate.
${markers.length > 0 ? "9. You have the user's actual biomarkers — use them to personalize every recommendation." : ""}

Return ONLY valid JSON. No markdown fences.`;

    const PROMPT = `The user describes their health situation: "${input.trim()}"${markerContext}

Return a JSON object:
{
  "situationSummary": "1 sentence reframing their situation in clinical terms",
  "brutalTruth": "2-3 sentences of honest assessment. What actually causes this. What most people get wrong. No sugarcoating.",
  "protocols": [
    {
      "name": "Protocol name",
      "whyItWorks": "1 sentence specific biological reason",
      "impactLevel": "Critical"|"High"|"Moderate",
      "doNow": ["Specific action 1 with dose/frequency/timing", "Specific action 2", "Specific action 3", "Specific action 4"],
      "day30": { "headline": "Specific measurable result", "detail": "What they will notice and what biomarkers shift" },
      "day60": { "headline": "60-day result", "detail": "Deeper adaptation" },
      "day90": { "headline": "90-day result", "detail": "Full adaptation — labs/metrics/body" },
      "scienceNote": "2-3 sentences on peer-reviewed evidence. Specific — cite study types, effect sizes. Use **bold** for key stats.",
      "refuze": "1-2 sentences on the most common mistake or misconception"
    }
  ],
  "overallTimeline": {
    "day30": { "headline": "30-day combined outcome", "sub": "What they will tangibly feel/see/measure" },
    "day60": { "headline": "60-day combined outcome", "sub": "Systemic shifts" },
    "day90": { "headline": "90-day combined outcome", "sub": "Where they realistically will be at 90 days compliance" }
  },
  "disclaimerNote": "Brief note on when to consult a physician"
}

3-5 protocols ranked by impact. Only evidence-backed interventions. Realistic results — give ranges, not promises.`;

    try {
      const raw = await callClaude([{ role: "user", content: PROMPT }], SYSTEM, 2000);
      clearInterval(timer); setAnalysisStep(ANALYSIS_STEPS.length - 1);
      let parsed;
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { throw new Error("Analysis returned malformed data. Please try again."); }
      setResults(parsed);
      setPhase("results");
    } catch (e: any) {
      clearInterval(timer);
      setErrMsg(e.message || "Analysis failed. Check connection and retry.");
      setPhase("error");
    }
  }

  function reset() { setPhase("idle"); setInput(""); setResults(null); setErrMsg(""); setAnalysisStep(0); }

  const S: React.CSSProperties = { fontFamily: "EB Garamond, Georgia, serif" };
  const card: React.CSSProperties = { background:"rgba(0,6,14,.82)", border:"1px solid rgba(0,165,132,.14)", borderRadius:6 };

  return (
    <div style={{ marginBottom:32 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:12, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(0,200,160,.65)", marginBottom:4, ...S }}>Aellux Intelligence</div>
          <div style={{ fontSize:28, color:"rgba(0,215,172,.96)", fontWeight:500, ...S, display:"flex", alignItems:"center", gap:12 }}>
            Do This Now
            <span style={{ fontSize:11, padding:"3px 9px", background:"rgba(0,229,255,.08)", border:"1px solid rgba(0,229,255,.2)", color:"#64d2ff", borderRadius:2, letterSpacing:"0.14em", textTransform:"uppercase" }}>AI Clinical Engine</span>
          </div>
        </div>
      </div>

      {/* Input */}
      {(phase === "idle" || phase === "error") && (
        <div>
          <div style={{ position:"relative", marginBottom:14 }}>
            <textarea
              ref={textareaRef}
              style={{ width:"100%", background:"rgba(0,8,18,.8)", border:"1px solid rgba(0,175,138,.22)", borderRadius:5, color:"rgba(0,220,175,.92)", fontSize:16, fontFamily:"EB Garamond,Georgia,serif", padding:"16px 18px 48px", outline:"none", resize:"none", minHeight:90, lineHeight:1.6 }}
              placeholder={"Describe your situation… e.g. 'I need to lose belly fat, I'm 42, doc says my blood sugar is borderline' or 'I can't sleep, wake up exhausted, brain fog all day'"}
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={3}
            />
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 12px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid rgba(0,165,132,.12)" }}>
              <span style={{ fontSize:12, color:"rgba(0,155,125,.4)", letterSpacing:"0.06em", fontFamily:"EB Garamond,serif" }}>Be specific — more context = better recommendations</span>
              <button
                onClick={analyze}
                disabled={input.trim().length < 10}
                style={{ fontSize:15, color:"#020810", background:"rgba(0,200,160,.88)", border:"none", borderRadius:3, padding:"5px 16px", cursor:"pointer", fontFamily:"EB Garamond,serif", opacity:input.trim().length < 10 ? .4 : 1 }}
              >Analyze →</button>
            </div>
          </div>

          {phase === "error" && <div style={{ background:"rgba(255,100,100,.07)", border:"1px solid rgba(255,100,100,.25)", borderRadius:4, padding:"12px 14px", fontSize:14, color:"rgba(200,140,140,.8)", marginBottom:14 }}>⚠ {errMsg}</div>}

          <div style={{ fontSize:12, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(0,155,125,.4)", marginBottom:10, ...S }}>Common situations — tap to fill</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {GOAL_PRESETS.map(p => (
              <button key={p.label} onClick={() => fillPreset(p.fill)}
                style={{ background:"rgba(0,6,14,.82)", border:"1px solid rgba(0,165,132,.14)", color:"rgba(0,195,158,.75)", fontFamily:"EB Garamond,Georgia,serif", fontSize:14, padding:"7px 14px", borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
                <span>{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analyzing */}
      {phase === "analyzing" && (
        <div style={{ ...card, padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, fontSize:14, color:"#64d2ff", fontFamily:"EB Garamond,serif", letterSpacing:"0.08em" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#64d2ff", animation:"aellux-star-twinkle 1s ease-in-out infinite" }} />
            Aellux AI is analyzing your situation…
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ANALYSIS_STEPS.map((s, i) => {
              const st = i < analysisStep ? "done" : i === analysisStep ? "active" : "pending";
              return (
                <div key={s} style={{ display:"flex", alignItems:"center", gap:12, fontSize:14, color: st === "done" ? "rgba(0,215,172,.9)" : st === "active" ? "#64d2ff" : "rgba(0,155,125,.4)" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0, background: st === "done" ? "#00d2a5" : "none", border: st === "done" ? "1px solid #00d2a5" : `1px solid ${st === "active" ? "#64d2ff" : "rgba(0,165,132,.2)"}`, color: st === "done" ? "#020810" : st === "active" ? "#64d2ff" : "rgba(0,165,132,.3)" }}>
                    {st === "done" ? "✓" : st === "active" ? "◌" : "·"}
                  </div>
                  {s}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {phase === "results" && results && (
        <div>
          {/* Situation + reset */}
          <div style={{ ...card, padding:"14px 18px", marginBottom:16, borderLeft:"3px solid #ff6464", display:"flex", alignItems:"flex-start", gap:14, flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"#ff6464", marginBottom:4, ...S }}>Your Situation</div>
              <div style={{ fontSize:15, color:"rgba(0,215,172,.9)", fontWeight:500, lineHeight:1.5 }}>{results.situationSummary}</div>
            </div>
            <button onClick={reset} style={{ background:"none", border:"1px solid rgba(0,165,132,.2)", color:"rgba(0,155,125,.5)", fontFamily:"EB Garamond,serif", fontSize:13, padding:"6px 14px", borderRadius:3, cursor:"pointer", flexShrink:0 }}>← New Analysis</button>
          </div>

          {/* Brutal truth */}
          <div style={{ background:"rgba(255,100,100,.06)", border:"1px solid rgba(255,100,100,.2)", borderRadius:6, padding:"16px 18px", marginBottom:20, display:"flex", gap:14 }}>
            <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>🔬</span>
            <div>
              <div style={{ fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase", color:"#ff6464", marginBottom:6, ...S }}>Brutal Truth</div>
              <div style={{ fontSize:15, color:"rgba(210,150,150,.85)", lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html:(results.brutalTruth||"").replace(/REFUZE/g,'<strong style="color:#ff6464">REFUZE</strong>').replace(/Ynot\.life/g,'<strong style="color:#00d2a5">Ynot.life</strong>') }} />
            </div>
          </div>

          {/* Ranked protocols */}
          <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#00d2a5", marginBottom:12, display:"flex", alignItems:"center", gap:10, ...S }}>
            Your Ranked Action Plan
            <div style={{ flex:1, height:1, background:"rgba(0,165,132,.15)" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
            {results.protocols?.map((item: any, i: number) => <RankedProtoRow key={item.name} item={item} rank={i} />)}
          </div>

          {/* Overall timeline */}
          {results.overallTimeline && (
            <div style={{ ...card, padding:"18px 20px", marginBottom:12 }}>
              <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#00d2a5", marginBottom:14, display:"flex", alignItems:"center", gap:10, ...S }}>
                Combined 90-Day Trajectory
                <div style={{ flex:1, height:1, background:"rgba(0,165,132,.15)" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"rgba(0,165,132,.1)" }}>
                {[results.overallTimeline.day30, results.overallTimeline.day60, results.overallTimeline.day90].map((tl: any, i: number) => (
                  <div key={i} style={{ background:"rgba(0,6,14,.9)", padding:"14px 16px" }}>
                    <div style={{ fontFamily:"EB Garamond,serif", fontSize:20, color:TL_COLORS[i], marginBottom:4 }}>{i===0?"Day 30":i===1?"Day 60":"Day 90"}</div>
                    <div style={{ fontSize:14, color:"rgba(0,215,172,.9)", fontWeight:500, lineHeight:1.4, marginBottom:4 }}>{tl?.headline}</div>
                    <div style={{ fontSize:12, color:"rgba(0,160,130,.55)", lineHeight:1.5 }}>{tl?.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.disclaimerNote && (
            <div style={{ fontSize:12, color:"rgba(0,140,115,.45)", lineHeight:1.6, paddingTop:12, borderTop:"1px solid rgba(0,165,132,.1)" }}>⚕ {results.disclaimerNote}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Protocol Card (library) ─────────────────────────────────────────────────
function ProtocolCard({ protocol, selectedOutcome, onRemove }: any) {
  const [expanded, setExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");

  async function loadAI() {
    if (aiText) return;
    setAiLoading(true);
    try {
      const text = await callClaude(
        [{ role: "user", content: `Personalized adaptation for "${protocol.name}" optimized for "${selectedOutcome}". Biological mechanism, optimal implementation, what to avoid. Be specific. 3-4 sentences max.` }],
        `You are the Aellux AI engine. Brand: REFUZE = reject mediocrity. Ynot.life = peak biology mindset. Sharp, direct, biological. Use brand language naturally.`
      );
      setAiText(text);
    } catch { setAiText("AI synthesis unavailable. Retry on next expansion."); }
    setAiLoading(false);
  }

  function toggle() { const n = !expanded; setExpanded(n); if (n) loadAI(); }

  const S: React.CSSProperties = { fontFamily: "EB Garamond, Georgia, serif" };
  const card: React.CSSProperties = { background:"rgba(0,6,14,.82)", border:`1px solid rgba(0,165,132,.14)`, borderRadius:6 };
  const bc = badgeColor(protocol.badge);

  return (
    <div style={{ ...card, overflow:"hidden", borderTop:`2px solid ${protocol.accentColor}` }}>
      <div style={{ padding:"20px 22px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <span style={{ fontSize:11, padding:"3px 9px", border:`1px solid ${bc}`, borderRadius:2, color:bc, letterSpacing:"0.1em", textTransform:"uppercase", ...S }}>{protocol.badge}</span>
          <span style={{ fontSize:12, color:"rgba(0,155,125,.5)", ...S }}>Search <span style={{ color:"#00d2a5" }}>{protocol.trendDelta}</span></span>
        </div>
        <div style={{ ...S, fontSize:24, color:"rgba(0,215,172,.94)", fontWeight:500, lineHeight:1, marginBottom:6 }}>{protocol.name}</div>
        <div style={{ fontSize:15, color:"rgba(0,175,142,.6)", fontWeight:400, lineHeight:1.5, marginBottom:16, ...S }}>{protocol.tagline}</div>

        <div style={{ marginBottom:16 }}>
          {protocol.signals.map((s: any) => <SignalBar key={s.label} {...s} />)}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {protocol.impacts.map((i: any) => (
            <div key={i.desc} style={{ flex:1, background:"rgba(0,4,12,.6)", border:"1px solid rgba(0,165,132,.12)", borderRadius:3, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ ...S, fontSize:20, color:"#00d2a5", lineHeight:1 }}>{i.num}</div>
              <div style={{ fontSize:11, color:"rgba(0,155,125,.5)", marginTop:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>{i.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={toggle} style={{ flex:1, background:"none", border:"1px solid rgba(0,165,132,.2)", color:"rgba(0,165,132,.6)", fontFamily:"EB Garamond,serif", fontSize:13, letterSpacing:"0.1em", textTransform:"uppercase", padding:"8px", cursor:"pointer", borderRadius:3 }}>
            {expanded ? "▲ Collapse" : `▼ Adapt for ${selectedOutcome}`}
          </button>
          {protocol.custom && (
            <button onClick={() => onRemove(protocol.id)} style={{ background:"none", border:"1px solid rgba(0,165,132,.2)", color:"rgba(0,155,125,.4)", fontFamily:"EB Garamond,serif", fontSize:12, padding:"8px 12px", cursor:"pointer", borderRadius:3 }}>✕</button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding:"0 22px 22px", borderTop:"1px solid rgba(0,165,132,.1)" }}>
          <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#64d2ff", marginBottom:8, marginTop:18, display:"flex", alignItems:"center", gap:8, ...S }}>
            Mechanism <div style={{ flex:1, height:1, background:"rgba(0,165,132,.15)" }} />
          </div>
          <p style={{ fontSize:14, lineHeight:1.8, color:"rgba(0,180,145,.7)", marginBottom:16, ...S }}>{protocol.mechanism}</p>

          {protocol.adaptations?.[selectedOutcome] && (
            <>
              <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#64d2ff", marginBottom:8, display:"flex", alignItems:"center", gap:8, ...S }}>
                Your {selectedOutcome} Protocol <div style={{ flex:1, height:1, background:"rgba(0,165,132,.15)" }} />
              </div>
              <div style={{ background:"rgba(0,40,32,.3)", borderLeft:"3px solid #00d2a5", padding:"14px 16px", borderRadius:"0 4px 4px 0", marginBottom:14 }}>
                <div style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:"#00d2a5", marginBottom:6, ...S }}>✦ Aellux Protocol — {selectedOutcome}</div>
                <div style={{ fontSize:14, lineHeight:1.7, color:"rgba(0,215,172,.85)", ...S }} dangerouslySetInnerHTML={{ __html: protocol.adaptations[selectedOutcome].replace(/REFUZE/g,'<strong>REFUZE</strong>').replace(/Ynot\.life/g,'<strong>Ynot.life</strong>') }} />
              </div>
            </>
          )}

          <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#64d2ff", marginBottom:8, display:"flex", alignItems:"center", gap:8, ...S }}>
            AI-Synthesized Insight <div style={{ flex:1, height:1, background:"rgba(0,165,132,.15)" }} />
          </div>
          {aiLoading
            ? <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 0", fontSize:13, color:"#64d2ff", ...S }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#64d2ff", animation:"aellux-star-twinkle 1s ease-in-out infinite" }} />
                Synthesizing…
              </div>
            : aiText
              ? <div style={{ background:"rgba(0,100,80,.08)", borderLeft:"3px solid #64d2ff", padding:"14px 16px", borderRadius:"0 4px 4px 0" }}>
                  <div style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:"#64d2ff", marginBottom:6, ...S }}>✦ Aellux AI — Live Analysis</div>
                  <div style={{ fontSize:14, lineHeight:1.7, color:"rgba(0,215,172,.85)", ...S }}>{aiText}</div>
                </div>
              : null
          }

          {protocol.nuance && (
            <div style={{ background:"rgba(255,100,100,.06)", border:"1px solid rgba(255,100,100,.2)", borderRadius:4, padding:"10px 14px", marginTop:12, display:"flex", gap:10 }}>
              <span style={{ color:"#ff6464", flexShrink:0 }}>⚠</span>
              <div style={{ fontSize:13, color:"rgba(200,140,140,.8)", lineHeight:1.6, ...S }}>
                <strong style={{ color:"rgba(255,120,120,.9)" }}>Know this: </strong>{protocol.nuance}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Protocol Modal ──────────────────────────────────────────────────────
function AddModal({ onClose, onAdd, existingIds }: any) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"input"|"researching"|"preview"|"error">("input");
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [errMsg, setErrMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  async function research(name: string) {
    const n = name.trim(); if (!n) return;
    setQuery(n); setPhase("researching"); setStep(0);
    const timer = setInterval(() => setStep(s => s < RESEARCH_STEPS_MODAL.length - 1 ? s + 1 : s), 700);
    try {
      const raw = await callClaude(
        [{ role: "user", content: `Research health protocol: "${n}"\n\nReturn ONLY valid JSON:\n{"valid":true/false,"name":"display name","tagline":"one sentence max 120 chars","badge":"validated"|"trending"|"emerging"|"custom","trendDelta":"+XX%","accentColor":"#00d2a5"|"#64d2ff"|"#ff6464"|"#b478ff","category":"movement"|"recovery"|"nutrition"|"supplementation","evidenceVerdict":"Strong Evidence"|"Moderate Evidence"|"Limited Evidence"|"Weak / Mixed Evidence","signals":[4 items:{"label":"max 12 chars","value":-95 to 95,"color":"#00d2a5"|"#64d2ff"|"#ff6464"}],"impacts":[3 items:{"num":"value+unit","desc":"max 25 chars"}],"mechanism":"2-3 sentences actual biology","researchSummary":"2-3 sentences honest evidence","adaptations":{"Performance":"2-3 sentences","Longevity":"same","Body Composition":"same"},"nuance":"1-2 sentences caveat","invalidReason":"only if valid=false"}\nNo markdown. Pure JSON.` }],
        `You are Aellux's research engine. Scientific rigor, brutal honesty. REFUZE marketing hype. Return only valid JSON.`
      );
      clearInterval(timer); setStep(RESEARCH_STEPS_MODAL.length - 1);
      let parsed;
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { throw new Error("Malformed data. Please try again."); }
      if (!parsed.valid) { setErrMsg(parsed.invalidReason || `"${n}" is not a recognized health protocol.`); setPhase("error"); return; }
      const newId = n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (existingIds.includes(newId)) { setErrMsg(`"${parsed.name}" is already in your library.`); setPhase("error"); return; }
      setPreview({ ...parsed, id: newId, custom: true });
      setPhase("preview");
    } catch (e: any) {
      clearInterval(timer);
      setErrMsg(e.message || "Research failed. Check connection and retry.");
      setPhase("error");
    }
  }

  function reset() { setPhase("input"); setQuery(""); setPreview(null); setErrMsg(""); setStep(0); }

  const S: React.CSSProperties = { fontFamily: "EB Garamond, Georgia, serif" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(2,8,16,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:24 }} onClick={e => { if (e.currentTarget === e.target) onClose(); }}>
      <div style={{ background:"rgba(0,10,22,.98)", border:"1px solid rgba(0,165,132,.2)", borderTop:"3px solid #00d2a5", borderRadius:8, width:"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ padding:"24px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", color:"#00d2a5", marginBottom:6, ...S }}>Aellux Research Engine</div>
            <div style={{ ...S, fontSize:28, color:"rgba(0,215,172,.96)", fontWeight:500 }}>Add Protocol</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"1px solid rgba(0,165,132,.2)", color:"rgba(0,155,125,.5)", width:34, height:34, borderRadius:3, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"20px 24px 24px" }}>
          {phase === "input" && (
            <>
              <p style={{ fontSize:14, color:"rgba(0,175,142,.6)", lineHeight:1.7, marginBottom:20, ...S }}>Name any protocol — diet, training, recovery, or supplement. AI researches the science, verifies the evidence, and builds a full personalized card.</p>
              <div style={{ position:"relative", marginBottom:14 }}>
                <input ref={inputRef} style={{ width:"100%", background:"rgba(0,8,18,.8)", border:"1px solid rgba(0,175,138,.22)", color:"rgba(0,220,175,.92)", fontFamily:"EB Garamond,Georgia,serif", fontSize:16, padding:"13px 52px 13px 16px", borderRadius:3, outline:"none" }}
                  placeholder="e.g. Carnivore Diet, Extended Fasting, Wim Hof…"
                  value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && research(query)} />
                <button onClick={() => research(query)} disabled={!query.trim()} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"#00d2a5", border:"none", color:"#020810", borderRadius:2, width:36, height:32, cursor:"pointer", fontSize:16 }}>→</button>
              </div>
              <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(0,155,125,.4)", marginBottom:10, ...S }}>Quick Add</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {QUICK_SUGGESTS.filter(s => !existingIds.includes(s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""))).map(s => (
                  <button key={s} onClick={() => research(s)} style={{ background:"rgba(0,6,14,.82)", border:"1px solid rgba(0,165,132,.14)", color:"rgba(0,195,158,.75)", fontFamily:"EB Garamond,serif", fontSize:13, padding:"5px 12px", borderRadius:3, cursor:"pointer" }}>{s}</button>
                ))}
              </div>
            </>
          )}
          {phase === "researching" && (
            <div style={{ background:"rgba(0,6,14,.82)", border:"1px solid rgba(0,165,132,.14)", borderRadius:4, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, fontSize:14, color:"#64d2ff", ...S }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#64d2ff", animation:"aellux-star-twinkle 1s ease-in-out infinite" }} />
                Researching "{query}"…
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {RESEARCH_STEPS_MODAL.map((s, i) => {
                  const st = i < step ? "done" : i === step ? "active" : "pending";
                  return (
                    <div key={s} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color: st==="done"?"rgba(0,215,172,.9)":st==="active"?"#64d2ff":"rgba(0,155,125,.4)", ...S }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0, background:st==="done"?"#00d2a5":"none", border:st==="done"?"1px solid #00d2a5":`1px solid ${st==="active"?"#64d2ff":"rgba(0,165,132,.2)"}`, color:st==="done"?"#020810":st==="active"?"#64d2ff":"rgba(0,165,132,.3)" }}>
                        {st==="done"?"✓":st==="active"?"◌":"·"}
                      </div>
                      {s}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {phase === "error" && (
            <>
              <div style={{ background:"rgba(255,100,100,.07)", border:"1px solid rgba(255,100,100,.25)", borderRadius:3, padding:"12px 14px", fontSize:14, color:"rgba(200,140,140,.8)", marginBottom:12, ...S }}>⚠ {errMsg}</div>
              <button onClick={reset} style={{ background:"none", border:"1px solid rgba(0,165,132,.2)", color:"rgba(0,155,125,.5)", fontFamily:"EB Garamond,serif", fontSize:13, padding:"8px 16px", borderRadius:3, cursor:"pointer" }}>← Try different</button>
            </>
          )}
          {phase === "preview" && preview && (
            <>
              <div style={{ background:"rgba(0,6,14,.82)", border:"1px solid rgba(0,165,132,.14)", borderRadius:4, padding:18, marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                  <div>
                    <div style={{ ...S, fontSize:22, color:"rgba(0,215,172,.94)", fontWeight:500, marginBottom:4 }}>{preview.name}</div>
                    <div style={{ fontSize:14, color:"rgba(0,175,142,.6)", ...S }}>{preview.tagline}</div>
                  </div>
                  <span style={{ fontSize:11, padding:"3px 9px", border:`1px solid ${({"Strong":"#00d2a5","Moderate":"#64d2ff","Limited":"#ffa040","Weak":"#ff6464"} as Record<string,string>)[preview.evidenceVerdict?.split(" ")[0]] || "#64d2ff"}`, borderRadius:2, color:"rgba(0,195,158,.8)", letterSpacing:"0.08em", textTransform:"uppercase", ...S }}>{preview.evidenceVerdict}</span>
                </div>
                <div style={{ marginBottom:12 }}>{preview.signals?.map((s: any) => <SignalBar key={s.label} {...s} />)}</div>
                {preview.researchSummary && <p style={{ fontSize:13, color:"rgba(0,180,145,.7)", lineHeight:1.7, marginTop:10, ...S }}>{preview.researchSummary}</p>}
                {preview.nuance && (
                  <div style={{ background:"rgba(255,100,100,.06)", border:"1px solid rgba(255,100,100,.2)", borderRadius:3, padding:"10px 12px", marginTop:10, display:"flex", gap:8 }}>
                    <span style={{ color:"#ff6464" }}>⚠</span>
                    <div style={{ fontSize:12, color:"rgba(200,140,140,.8)", lineHeight:1.6, ...S }}><strong style={{ color:"rgba(255,120,120,.9)" }}>Know this: </strong>{preview.nuance}</div>
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => { onAdd(preview); onClose(); }} style={{ flex:1, background:"rgba(0,200,160,.88)", color:"#020810", border:"none", fontFamily:"EB Garamond,serif", fontSize:18, padding:"14px", borderRadius:3, cursor:"pointer", fontWeight:500 }}>+ Add to My Protocols</button>
                <button onClick={reset} style={{ background:"none", border:"1px solid rgba(0,165,132,.2)", color:"rgba(0,155,125,.5)", fontFamily:"EB Garamond,serif", fontSize:13, padding:"14px 18px", borderRadius:3, cursor:"pointer" }}>Discard</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
type ProtoTab = 'plan' | 'library' | 'trackers' | 'accountability';

export default function ProtocolsSection({ markers = [] }: { markers?: any[] }) {
  const [tab, setTab] = useState<ProtoTab>('plan');
  const [protocols, setProtocols] = useState(SEED_PROTOCOLS);
  const [outcome, setOutcome] = useState("Performance");
  const [category, setCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [trackerEntries, setTrackerEntries] = useState<TrackerEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('aellux_tracker_entries') || '[]'); } catch { return []; }
  });
  const [connectedSources, setConnectedSources] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aellux_connected_sources') || '[]'); } catch { return []; }
  });

  function handleTrackerData(entries: TrackerEntry[], source: string) {
    const merged = [...trackerEntries.filter(e => e.source !== source || e.date < entries[0]?.date), ...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2000);
    setTrackerEntries(merged);
    localStorage.setItem('aellux_tracker_entries', JSON.stringify(merged));
    if (!connectedSources.includes(source)) {
      const updated = [...connectedSources, source];
      setConnectedSources(updated);
      localStorage.setItem('aellux_connected_sources', JSON.stringify(updated));
    }
  }

  const filtered = category === "all" ? protocols : protocols.filter(p => p.category === category);
  const existingIds = protocols.map(p => p.id);
  const S: React.CSSProperties = { fontFamily: "EB Garamond, Georgia, serif" };

  const TABS: Array<{ id: ProtoTab; label: string; icon: string; badge?: number }> = [
    { id: 'plan',           label: 'Do This Now',     icon: '⚡' },
    { id: 'library',        label: 'Protocol Library', icon: '📚' },
    { id: 'trackers',       label: 'Trackers',         icon: '📡', badge: connectedSources.length },
    { id: 'accountability', label: 'Accountability',   icon: '🎯', badge: trackerEntries.length > 0 ? 1 : undefined },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(0,165,132,.12)", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "none", border: "none",
              borderBottom: tab === t.id ? "2px solid #00d2a5" : "2px solid transparent",
              color: tab === t.id ? "#00d2a5" : "rgba(0,175,142,.5)",
              fontFamily: "EB Garamond,serif", fontSize: 15, padding: "0 16px 14px",
              cursor: "pointer", transition: "all .15s", position: "relative",
            }}>
            <span>{t.icon}</span>
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{ fontSize: 10, background: "rgba(0,195,155,.2)", color: "#00d2a5", padding: "1px 6px", borderRadius: 10, fontFamily: "monospace" }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DO THIS NOW ── */}
      {tab === 'plan' && <DoThisNow markers={markers} />}

      {/* ── PROTOCOL LIBRARY ── */}
      {tab === 'library' && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:12, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(0,200,160,.65)", marginBottom:4, ...S }}>Protocol Library</div>
              <div style={{ fontSize:22, color:"rgba(0,215,172,.94)", fontWeight:500, ...S }}>Trending Protocols</div>
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(0,200,160,.88)", color:"#020810", border:"none", fontFamily:"EB Garamond,serif", fontSize:16, padding:"10px 20px", borderRadius:3, cursor:"pointer", fontWeight:500 }}>
              <span style={{ fontSize:18 }}>+</span> Add Protocol
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(0,155,125,.45)", ...S }}>Outcome →</span>
            {OUTCOMES.map(o => (
              <button key={o} onClick={() => setOutcome(o)}
                style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(0,6,14,.82)", border:`1px solid ${outcome===o?"#00d2a5":"rgba(0,165,132,.14)"}`, color:outcome===o?"#00d2a5":"rgba(0,175,142,.6)", fontFamily:"EB Garamond,serif", fontSize:14, padding:"7px 16px", borderRadius:3, cursor:"pointer" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:outcome===o?"#00d2a5":"rgba(0,155,125,.3)", boxShadow:outcome===o?"0 0 5px #00d2a5":"none" }} />
                {o}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:20 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ background:category===c?"#64d2ff":"rgba(0,6,14,.82)", border:`1px solid ${category===c?"#64d2ff":"rgba(0,165,132,.14)"}`, color:category===c?"#020810":"rgba(0,165,132,.6)", fontFamily:"EB Garamond,serif", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase", padding:"5px 14px", borderRadius:2, cursor:"pointer" }}>
                {c === "all" ? `All (${protocols.length})` : `${c} (${protocols.filter(p=>p.category===c).length})`}
              </button>
            ))}
          </div>
          {filtered.length === 0
            ? <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(0,175,142,.4)", fontSize:16, ...S }}>No protocols in this category.</div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
                {filtered.map(p => (
                  <ProtocolCard key={p.id} protocol={p} selectedOutcome={outcome} onRemove={(id: string) => setProtocols(prev => prev.filter(x => x.id !== id))} />
                ))}
              </div>
          }
          {showModal && <AddModal onClose={() => setShowModal(false)} onAdd={(p: any) => setProtocols(prev => [...prev, p])} existingIds={existingIds} />}
        </div>
      )}

      {/* ── TRACKERS ── */}
      {tab === 'trackers' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize:12, letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(0,200,160,.65)", marginBottom:4, ...S }}>Data Sources</div>
            <div style={{ fontSize:22, color:"rgba(0,215,172,.94)", fontWeight:500, ...S }}>Connect Your Trackers</div>
            <div style={{ fontSize:14, color:"rgba(0,175,142,.5)", marginTop:6, ...S, lineHeight:1.6 }}>
              Upload exports from your wearables or log manually. Aellux uses this data to verify protocol execution — not just what you claim you did.
            </div>
          </div>
          <TrackerConnect
            onDataImported={handleTrackerData}
            connectedSources={connectedSources}
          />
          {trackerEntries.length > 0 && (
            <div style={{ marginTop:24, background:"rgba(0,6,14,.82)", border:"1px solid rgba(0,165,132,.14)", borderRadius:6, padding:"16px 20px" }}>
              <div style={{ fontSize:12, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(0,175,142,.5)", marginBottom:10, ...S }}>Imported Data Summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
                {[
                  { label:"Total Days", value: new Set(trackerEntries.map(e => e.date)).size },
                  { label:"Data Points", value: trackerEntries.reduce((acc, e) => acc + Object.keys(e.metrics).length, 0) },
                  { label:"Sources", value: new Set(trackerEntries.map(e => e.source)).size },
                  { label:"Date Range", value: trackerEntries.length > 0 ? `${trackerEntries[trackerEntries.length-1].date.slice(5)} – ${trackerEntries[0].date.slice(5)}` : '—' },
                ].map(s => (
                  <div key={s.label} style={{ background:"rgba(0,4,12,.7)", border:"1px solid rgba(0,165,132,.1)", borderRadius:3, padding:"10px 12px" }}>
                    <div style={{ fontSize:11, color:"rgba(0,165,132,.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4, ...S }}>{s.label}</div>
                    <div style={{ fontSize:18, color:"#00d2a5", ...S }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setTrackerEntries([]); setConnectedSources([]); localStorage.removeItem('aellux_tracker_entries'); localStorage.removeItem('aellux_connected_sources'); }}
                style={{ marginTop:14, background:"none", border:"1px solid rgba(255,100,100,.2)", color:"rgba(255,100,100,.4)", fontFamily:"EB Garamond,serif", fontSize:12, padding:"5px 14px", borderRadius:2, cursor:"pointer" }}>
                Clear all tracker data
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ACCOUNTABILITY ── */}
      {tab === 'accountability' && (
        <div>
          {trackerEntries.length === 0 && (
            <div style={{ background:"rgba(255,160,64,.06)", border:"1px solid rgba(255,160,64,.2)", borderRadius:6, padding:"14px 18px", marginBottom:20, display:"flex", gap:12, alignItems:"flex-start" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>📡</span>
              <div>
                <div style={{ fontSize:14, color:"rgba(255,190,100,.85)", fontWeight:500, marginBottom:4, ...S }}>No tracker data yet</div>
                <div style={{ fontSize:13, color:"rgba(255,170,80,.6)", lineHeight:1.6, ...S }}>
                  Connect a tracker or log manually in the <button onClick={() => setTab('trackers')} style={{ background:"none", border:"none", color:"#00d2a5", cursor:"pointer", fontFamily:"EB Garamond,serif", fontSize:13, padding:0, textDecoration:"underline" }}>Trackers tab</button> first. Without data, accountability is just vibes.
                </div>
              </div>
            </div>
          )}
          <AccountabilityEngine trackerEntries={trackerEntries} markers={markers} />
        </div>
      )}
    </div>
  );
}

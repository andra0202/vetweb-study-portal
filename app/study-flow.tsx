"use client";

import { FormEvent, useState } from "react";

type Step = "welcome" | "instructions" | "task" | "checking" | "survey" | "reward" | "done";
const steps: Step[] = ["welcome", "instructions", "task", "checking", "survey", "reward", "done"];
const vetWebTaskUrl = process.env.NEXT_PUBLIC_VETWEB_TASK_URL || "https://vetweb.example.com";

export default function StudyFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [agreed, setAgreed] = useState(false);
  const [taskOpened, setTaskOpened] = useState(false);
  const [taskLaunchError, setTaskLaunchError] = useState("");
  const [verified, setVerified] = useState(false);
  const [reference, setReference] = useState("");
  const progress = steps.indexOf(step);
  const move = (next: Step) => setStep(next);
  const openTask = async () => {
    setTaskLaunchError("");
    try {
      const response = await fetch("/api/v1/study-sessions", { method: "POST" });
      if (!response.ok) throw new Error("Study session is not configured");
      const { launchUrl, state } = await response.json() as { launchUrl: string; state: string };
      sessionStorage.setItem("vetweb-study-state", state);
      setTaskOpened(true);
      window.open(launchUrl || vetWebTaskUrl, "_blank", "noopener,noreferrer");
    } catch { setTaskLaunchError("The secure VetWeb connection is not configured yet. Please contact the study team."); }
  };
  const checkVerification = async () => {
    const state = sessionStorage.getItem("vetweb-study-state");
    if (!state) return;
    const response = await fetch(`/api/v1/study-sessions/${encodeURIComponent(state)}`);
    if (response.ok && (await response.json() as { verified: boolean }).verified) setVerified(true);
  };
  const submitSurvey = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); move("reward"); };
  const submitReward = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setReference(`VWS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`); move("done"); };

  return <main className="shell">
    <header><img className="vetweb-logo" src="/images/vetweb-logo-transparent.png" alt="VetWeb" /><div><b>Study Portal</b><small>Research participation portal</small></div></header>
    <div className="progress" aria-label={`Progress: step ${progress + 1} of ${steps.length}`}><span style={{ width: `${((progress + 1) / steps.length) * 100}%` }} /></div>
    {step === "welcome" && <section className="card hero"><p className="eyebrow">VETWEB RESEARCH STUDY</p><h1>Welcome, and thank you for scanning.</h1><p>You will read the instructions, complete one VetWeb task, answer a short questionnaire, and provide a GCash number for the study incentive or raffle.</p><div className="notice"><b>Before you start:</b> Use the same browser for VetWeb and this questionnaire. The questionnaire stays locked until the task is verified.</div><dl><div><dt>Estimated time</dt><dd>10–15 minutes</dd></div><div><dt>After the study</dt><dd>Researcher review and incentive processing</dd></div></dl><button onClick={() => move("instructions")}>Read instructions</button><p className="fine">Study contact details, eligibility criteria, and approved consent information must be completed before public launch.</p></section>}
    {step === "instructions" && <section className="card"><p className="eyebrow">STEP 1 · INSTRUCTIONS</p><h2>What you need to do</h2><ol className="steps"><li>Open the VetWeb task from the next page.</li><li>Complete the requested activity in VetWeb.</li><li>Return here after VetWeb confirms your task.</li><li>Answer the questionnaire and submit your GCash details.</li></ol><div className="notice">Opening the task alone is not enough—VetWeb must send a verified completion result before you can answer the questionnaire.</div><label className="check"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /> <span>I am eligible to participate, understand that participation is voluntary, and agree to continue.</span></label><div className="actions"><button className="secondary" onClick={() => move("welcome")}>Back</button><button disabled={!agreed} onClick={() => move("task")}>Continue to VetWeb</button></div></section>}
    {step === "task" && <section className="card"><p className="eyebrow">STEP 2 · VETWEB TASK</p><h2>Complete the task in VetWeb</h2><p>Select the button below to open VetWeb in a new tab. Follow the task instructions there, then come back to this page.</p><button onClick={openTask}>{taskOpened ? "Open VetWeb again" : "Open VetWeb task"}</button>{taskLaunchError && <p className="fine">{taskLaunchError}</p>}<p className="fine">If the link does not open, allow pop-ups for this site and try again.</p><div className="actions"><button className="secondary" onClick={() => move("instructions")}>Back</button><button disabled={!taskOpened} onClick={() => move("checking")}>I have returned from VetWeb</button></div></section>}
    {step === "checking" && <section className="card"><p className="eyebrow">STEP 3 · VERIFICATION</p><h2>{verified ? "Task verified" : "Checking task completion"}</h2><p>VetWeb must verify the required task events before the questionnaire unlocks. Skipping the task, or simply opening the link, will not unlock it.</p><div className="notice"><b>{verified ? "Verified." : "Verification pending."}</b> {verified ? "You can now continue to the questionnaire." : "Return after you have successfully logged in to VetWeb, then check again."}</div>{verified ? <button onClick={() => move("survey")}>Continue to questionnaire</button> : <div className="actions"><button className="secondary" onClick={() => move("task")}>Return to task</button><button onClick={checkVerification}>Check again</button></div>}</section>}
    {step === "survey" && <section className="card"><p className="eyebrow">STEP 4 · QUESTIONNAIRE</p><h2>Questionnaire coming next</h2><p>The research questions are being finalized. Once approved, this page will show the complete questionnaire after VetWeb verifies the task.</p><div className="notice"><b>Your task completion remains protected.</b><br />The questionnaire will be available only after verified completion.</div><p className="fine">No questionnaire answers are being collected in this preview.</p></section>}
    {step === "reward" && <form className="card" onSubmit={submitReward}><p className="eyebrow">STEP 5 · INCENTIVE DETAILS</p><h2>Where should we send your incentive?</h2><p>After the survey phase ends, the research team will review verified submissions and send the approved <b>₱100 incentive</b>, or process the <b>₱1,000 raffle</b>, according to the final study rules.</p><label>GCash mobile number<input name="gcash" type="tel" inputMode="numeric" placeholder="0917 123 4567" pattern="(\\+63|0)9[0-9]{9}" title="Use a Philippine mobile number, e.g. 09171234567" required /></label><label className="check"><input required type="checkbox" /> <span>I confirm this is the GCash number the research team may use for the approved study incentive or raffle.</span></label><button type="submit">Submit and finish</button><p className="fine">GCash details must be stored separately from questionnaire answers once the production database is connected.</p></form>}
    {step === "done" && <section className="card success"><p className="eyebrow">SUBMISSION RECEIVED</p><h2>Thank you for participating.</h2><output>{reference}</output><p>Keep this reference code. The research team will process verified submissions at the end of the survey phase or according to the raffle rules.</p><p className="fine">Do not share your reference code or GCash number publicly.</p></section>}
  </main>;
}

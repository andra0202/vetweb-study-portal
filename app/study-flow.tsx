"use client";

import { FormEvent, useState } from "react";

type Step = "welcome" | "instructions" | "task" | "appointment" | "notification" | "chatbot" | "checking" | "survey" | "reward" | "done";
const steps: Step[] = ["welcome", "instructions", "task", "appointment", "notification", "chatbot", "checking", "survey", "reward", "done"];
const vetWebTaskUrl = process.env.NEXT_PUBLIC_VETWEB_TASK_URL || "https://vetweb.example.com";

const ratingScale = [
  { value: "5", label: "Very acceptable" },
  { value: "4", label: "Acceptable" },
  { value: "3", label: "Moderately acceptable" },
  { value: "2", label: "Not acceptable" },
  { value: "1", label: "Very not acceptable" },
];

const questionnaireSections = [
  {
    title: "A. Functional suitability",
    questions: [{ code: "A4", characteristic: "Functional appropriateness", english: "VetWeb supports pet-profile registration, appointment booking, checking appointment notifications and status updates, and using the inquiry chatbot.", filipino: "Tinutulungan ng VetWeb ang mga user sa pagdaragdag ng profile ng alagang hayop, pag-book ng appointment, pagtingin sa mga notification at update ng status ng appointment, at paggamit ng inquiry chatbot." }],
  },
  {
    title: "B. Performance efficiency",
    questions: [
      { code: "B1", characteristic: "Time behaviour", english: "VetWeb responds appropriately to user commands when accessing and using its web-based functions.", filipino: "Maayos na tumutugon ang VetWeb sa mga command ng user habang ina-access at ginagamit ang mga web-based function nito." },
      { code: "B3", characteristic: "Functional correctness", english: "VetWeb provides notifications to users based on relevant appointment, queue, account, and clinic events.", filipino: "Nagbibigay ang VetWeb ng mga notification sa mga user batay sa mahahalagang appointment, queue, account, at clinic events." },
      { code: "B4", characteristic: "Time behaviour", english: "VetWeb operates without noticeable lag or buffering during normal clinic management activities.", filipino: "Gumagana ang VetWeb nang walang kapansin-pansing lag o buffering sa karaniwang mga gawain sa pamamahala ng clinic." },
    ],
  },
  {
    title: "C. Compatibility",
    questions: [
      { code: "C2", characteristic: "Interoperability", english: "VetWeb can be accessed through supported internet-connected devices and browsers.", filipino: "Maaaring ma-access ang VetWeb gamit ang mga suportadong device at browser na nakakonekta sa internet." },
      { code: "C3", characteristic: "Interoperability", english: "VetWeb displays and operates properly across supported screen sizes and browser environments.", filipino: "Maayos na naipapakita at gumagana ang VetWeb sa iba't ibang suportadong laki ng screen at browser environment." },
    ],
  },
  {
    title: "D. Usability",
    questions: [
      { code: "D1", characteristic: "Appropriateness recognizability", english: "VetWeb meets the needs of its intended users by providing functions appropriate to their veterinary clinic or pet-care tasks.", filipino: "Natutugunan ng VetWeb ang pangangailangan ng mga target user sa pamamagitan ng mga function na angkop sa kanilang gawain sa veterinary clinic o pag-aalaga ng alagang hayop." },
      { code: "D2", characteristic: "Learnability", english: "VetWeb can be accessed, controlled, and operated by its intended users for their assigned tasks.", filipino: "Maaaring ma-access, makontrol, at magamit ng mga target user ang VetWeb para sa kanilang nakatalagang gawain." },
      { code: "D3", characteristic: "User engagement", english: "VetWeb provides a clear and satisfying user interface that supports effective interaction with its functions.", filipino: "Nagbibigay ang VetWeb ng malinaw at kasiya-siyang user interface na sumusuporta sa mahusay na pakikipag-ugnayan ng user sa mga function nito." },
      { code: "D4", characteristic: "Operability", english: "VetWeb can be utilized by its intended users to perform their assigned veterinary clinic and pet-care tasks.", filipino: "Mabilisang magagamit ng mga target user ang VetWeb upang maisagawa ang kanilang mga nakatalagang gawain sa veterinary clinic at pet-care." },
    ],
  },
  {
    title: "E. Reliability",
    questions: [
      { code: "E1", characteristic: "Faultlessness", english: "VetWeb performs its intended veterinary clinic functions properly during normal operation.", filipino: "Gumagana nang maayos ang mga nilalayong function ng VetWeb para sa veterinary clinic sa karaniwang operasyon." },
      { code: "E2", characteristic: "Availability", english: "VetWeb provides relevant and accurate information needed by its intended users.", filipino: "Nagbibigay ang VetWeb ng angkop at tumpak na impormasyong kailangan ng mga target user nito." },
    ],
  },
  {
    title: "F. Security",
    questions: [
      { code: "F1", characteristic: "Confidentiality", english: "VetWeb restricts access to protected information and functions to authorized users.", filipino: "Nililimitahan ng VetWeb ang access sa protektadong impormasyon at mga function para lamang sa mga awtorisadong user." },
      { code: "F4", characteristic: "Authenticity", english: "VetWeb provides individual accounts for each end user and verifies their identity before granting access.", filipino: "Nagbibigay ang VetWeb ng hiwalay na account sa bawat end user at bine-verify ang kanilang pagkakakilanlan bago sila bigyan ng access." },
    ],
  },
];
const questionnaireItems = questionnaireSections.flatMap(section => section.questions.map(question => ({ ...question, section: section.title })));

export default function StudyFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [agreed, setAgreed] = useState(false);
  const [taskOpened, setTaskOpened] = useState(false);
  const [taskLaunchError, setTaskLaunchError] = useState("");
  const [taskLaunchUrl, setTaskLaunchUrl] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [petRegistered, setPetRegistered] = useState(false);
  const [appointmentBooked, setAppointmentBooked] = useState(false);
  const [notificationOpened, setNotificationOpened] = useState(false);
  const [chatbotUsed, setChatbotUsed] = useState(false);
  const [reference, setReference] = useState("");
  const [surveyMessage, setSurveyMessage] = useState("");
  const [surveyStage, setSurveyStage] = useState<"eligibility" | "ratings" | "feedback">("eligibility");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [eligibility, setEligibility] = useState({ role: "Pet owner / client", adult: "", usedVetWeb: "", anotherSystem: "", anotherSystemDetail: "" });
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [savingRaffle, setSavingRaffle] = useState(false);
  const progress = steps.indexOf(step);
  const move = (next: Step) => setStep(next);
  const openTask = async () => {
    setTaskLaunchError("");
    try {
      const response = await fetch("/api/v1/study-sessions", { method: "POST" });
      if (!response.ok) throw new Error("Study session is not configured");
      const { launchUrl, state, pairingCode: code } = await response.json() as { launchUrl: string; state: string; pairingCode: string };
      sessionStorage.setItem("vetweb-study-state", state);
      setPairingCode(code);
      setTaskLaunchUrl(launchUrl || vetWebTaskUrl);
      setTaskOpened(true);
      window.open(launchUrl || vetWebTaskUrl, "_blank", "noopener,noreferrer");
    } catch { setTaskLaunchError("The secure VetWeb connection is not configured yet. Please contact the study team."); }
  };
  const checkVerification = async () => {
    const state = sessionStorage.getItem("vetweb-study-state");
    if (!state) return;
    const response = await fetch(`/api/v1/study-sessions/${encodeURIComponent(state)}`);
    if (response.ok) {
      const result = await response.json() as { verified: boolean; petRegistered: boolean; appointmentBooked: boolean; notificationOpened: boolean; chatbotUsed: boolean };
      setVerified(result.verified);
      setPetRegistered(result.petRegistered);
      setAppointmentBooked(result.appointmentBooked);
      setNotificationOpened(result.notificationOpened);
      setChatbotUsed(result.chatbotUsed);
    }
  };
  const startQuestionnaire = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("adult") !== "yes" || form.get("usedVetWeb") !== "yes") {
      setSurveyMessage("This questionnaire is for pet owners or clients aged 18 or above who have used VetWeb's client-facing functions. Please return after using VetWeb if you are not yet eligible.");
      return;
    }
    setEligibility({
      role: "Pet owner / client",
      adult: String(form.get("adult") || ""),
      usedVetWeb: String(form.get("usedVetWeb") || ""),
      anotherSystem: String(form.get("priorSystem") || ""),
      anotherSystemDetail: String(form.get("priorSystemDetail") || "").trim(),
    });
    setSurveyMessage("");
    setSurveyStage("ratings");
  };
  const continueRating = () => {
    const current = questionnaireItems[currentQuestion];
    if (!ratings[current.code]) {
      setSurveyMessage("Choose one rating before continuing.");
      return;
    }
    setSurveyMessage("");
    if (currentQuestion === questionnaireItems.length - 1) setSurveyStage("feedback");
    else setCurrentQuestion(index => index + 1);
  };
  const submitSurvey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const state = sessionStorage.getItem("vetweb-study-state");
    if (!state) { setSurveyMessage("Your study session has expired. Please start again from the VetWeb task."); return; }
    setSavingSurvey(true);
    setSurveyMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/v1/questionnaire-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, eligibility, ratings, feedback: String(form.get("feedback") || "").trim() }),
      });
      if (!response.ok) throw new Error("Unable to save questionnaire");
      move("reward");
    } catch {
      setSurveyMessage("Your answers could not be saved. Please check that Docker is running, then try again.");
    } finally { setSavingSurvey(false); }
  };
  const submitReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const state = sessionStorage.getItem("vetweb-study-state");
    if (!state) { setSurveyMessage("Your study session has expired. Please start again from the VetWeb task."); return; }
    setSavingRaffle(true);
    setSurveyMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/v1/payment-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, gcashNumber: String(form.get("gcash") || "") }),
      });
      const result = await response.json() as { referenceCode?: string; error?: string };
      if (!response.ok || !result.referenceCode) {
        setSurveyMessage(result.error === "duplicate_raffle_entry" ? "This GCash number or VetWeb account already has a raffle entry." : result.error === "participant_not_linked" ? "Your VetWeb account could not be linked to this study session. Please start again from the VetWeb task." : "Your raffle details could not be saved. Please try again.");
        return;
      }
      setReference(result.referenceCode);
      move("done");
    } catch { setSurveyMessage("Your raffle details could not be saved. Please try again."); }
    finally { setSavingRaffle(false); }
  };

  return <main className={`shell ${step === "welcome" ? "shell--welcome" : ""}`}>
    <header className="site-header">
      <div className="logo-panel"><img className="vetweb-logo" src="/images/vetweb-logo-transparent.png" alt="VetWeb" /></div>
      <div className="portal-identity"><span>VETWEB RESEARCH</span><b>Study Portal</b><small>Research participation portal</small></div>
    </header>
    <div className="progress" aria-label={`Progress: step ${progress + 1} of ${steps.length}`}><span style={{ width: `${((progress + 1) / steps.length) * 100}%` }} /></div>
    {step === "welcome" && <div className="welcome-stage"><aside className="study-intro"><p className="eyebrow">HOW IT WORKS</p><h2>Your voice can help make pet care easier.</h2><p>Try VetWeb&apos;s client functions, share your experience, and help shape a better digital veterinary service.</p><ol className="journey"><li><span>01</span><div><b>Read the study details</b><small>Understand what participation involves.</small></div></li><li><span>02</span><div><b>Complete the VetWeb client tasks</b><small>Add a pet, book an appointment, check its notification, and use the chatbot.</small></div></li><li><span>03</span><div><b>Answer the questionnaire</b><small>Share feedback after all tasks are verified.</small></div></li></ol><div className="intro-footer"><span>✦</span><p>Designed for a quick, guided research experience.</p></div></aside><section className="card hero"><p className="eyebrow">VETWEB RESEARCH STUDY</p><h1>Welcome, and thank you for scanning.</h1><p>You will try VetWeb&apos;s client functions, then answer a short questionnaire. Eligible verified submissions may join the ₱500 GCash raffle.</p><div className="notice"><b>Before you start:</b> Use the same browser or installed VetWeb app for every task. The questionnaire stays locked until all required actions are verified.</div><dl><div><dt>Estimated time</dt><dd>10–15 minutes</dd></div><div><dt>After the study</dt><dd>Researcher review and ₱500 raffle processing</dd></div></dl><button onClick={() => move("instructions")}>Read instructions</button><p className="fine">Study contact details, eligibility criteria, and approved consent information must be completed before public launch.</p><a className="researcher-access" href="/research/login">Researcher access</a></section></div>}
    {step === "instructions" && <section className="card"><p className="eyebrow">STEP 1 · INSTRUCTIONS</p><h2>What you need to do</h2><ol className="steps"><li>Open VetWeb from the next page and link your one-time study code while signed in.</li><li>Add one pet profile under your account.</li><li>Book an appointment for that pet.</li><li>Open the appointment notification and view its status update.</li><li>Open the Inquiry Chatbot and select an inquiry topic.</li><li>Return here after VetWeb confirms all required actions, then answer the questionnaire.</li></ol><div className="notice">Logging in, completing only one action, or merely opening the study link is not enough—the questionnaire unlocks only after VetWeb confirms every required action for your linked study session.</div><label className="check"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /> <span>I am eligible to participate, understand that participation is voluntary, and agree to continue.</span></label><div className="actions"><button className="secondary" onClick={() => move("welcome")}>Back</button><button disabled={!agreed} onClick={() => move("task")}>Continue to VetWeb</button></div></section>}
    {step === "task" && <section className="card"><p className="eyebrow">STEP 2 · VETWEB TASK</p><h2>Link the study and add a pet profile</h2><p>Open VetWeb in any supported way: browser, installed phone app, iPhone/iPad Home Screen app, or Mac app. While signed in, enter this one-time study code in VetWeb, then add one pet profile.</p><button onClick={openTask}>{taskOpened ? "Open VetWeb again" : "Get study code and open VetWeb"}</button>{pairingCode && <div className="notice"><b>Your study code:</b> <output>{pairingCode}</output><br /><span>Enter it once in VetWeb while signed in, before adding a pet profile.</span></div>}{taskLaunchError && <p className="fine">{taskLaunchError}</p>}<div className="actions"><button className="secondary" onClick={() => move("instructions")}>Back</button><button disabled={!taskOpened} onClick={() => move("appointment")}>I have added a pet profile</button></div></section>}
    {step === "appointment" && <section className="card"><p className="eyebrow">STEP 3 · VETWEB TASK</p><h2>Book an appointment</h2><p>In VetWeb, select the pet you just added and complete the appointment-booking steps. A pending appointment request counts; it does not need to be approved or completed by the clinic.</p><div className="notice"><b>Required:</b> the appointment must be booked after the study code was linked and after the pet profile was added.</div><div className="actions"><button className="secondary" onClick={() => move("task")}>Back</button><button onClick={() => { window.open(taskLaunchUrl || vetWebTaskUrl, "_blank", "noopener,noreferrer"); }}>Open VetWeb</button><button onClick={() => move("notification")}>I have booked an appointment</button></div></section>}
    {step === "notification" && <section className="card"><p className="eyebrow">STEP 4 · VETWEB TASK</p><h2>Check your appointment notification</h2><p>Open VetWeb&apos;s Notifications page, then open the notification for the appointment you just booked. Check the appointment status shown there.</p><div className="notice"><b>Required:</b> open the appointment notification itself, not only the Notifications menu.</div><div className="actions"><button className="secondary" onClick={() => move("appointment")}>Back</button><button onClick={() => { window.open(taskLaunchUrl || vetWebTaskUrl, "_blank", "noopener,noreferrer"); }}>Open VetWeb</button><button onClick={() => move("chatbot")}>I checked the appointment notification</button></div></section>}
    {step === "chatbot" && <section className="card"><p className="eyebrow">STEP 5 · VETWEB TASK</p><h2>Use the Inquiry Chatbot</h2><p>In VetWeb, open Inquiry Chatbot and choose an inquiry topic. You may explore its guided options, then return here.</p><div className="notice"><b>Required:</b> open the authenticated Inquiry Chatbot after completing the appointment-notification step. Choosing a topic lets you experience its guided support.</div><div className="actions"><button className="secondary" onClick={() => move("notification")}>Back</button><button onClick={() => { window.open(taskLaunchUrl || vetWebTaskUrl, "_blank", "noopener,noreferrer"); }}>Open VetWeb</button><button onClick={() => move("checking")}>I used the Inquiry Chatbot</button></div></section>}
    {step === "checking" && <section className="card"><p className="eyebrow">STEP 6 · VERIFICATION</p><h2>{verified ? "VetWeb tasks verified" : chatbotUsed ? "Checking final verification" : notificationOpened ? "Checking chatbot use" : appointmentBooked ? "Checking appointment notification" : petRegistered ? "Checking appointment booking" : "Checking task completion"}</h2><p>VetWeb must verify the linked pet profile, appointment booking, appointment notification, and inquiry chatbot use before the questionnaire unlocks.</p><div className="notice"><b>{verified ? "Verified." : "Verification pending."}</b> {verified ? "You can now continue to the questionnaire." : chatbotUsed ? "Your final verification is being checked. Select Check again shortly." : notificationOpened ? "Now use the Inquiry Chatbot, then check again." : appointmentBooked ? "Now open your appointment notification and view its status, then check again." : petRegistered ? "Now book an appointment in VetWeb, then check again." : "Return after linking the study code and completing the VetWeb tasks, then check again."}</div>{verified ? <button onClick={() => move("survey")}>Continue to questionnaire</button> : <div className="actions"><button className="secondary" onClick={() => move(chatbotUsed ? "checking" : notificationOpened ? "chatbot" : appointmentBooked ? "notification" : petRegistered ? "appointment" : "task")}>Return to VetWeb</button><button onClick={checkVerification}>Check again</button></div>}</section>}
    {step === "survey" && <div className="survey-wizard">
      {surveyStage === "eligibility" && <form onSubmit={startQuestionnaire}>
        <section className="card survey-intro">
          <p className="eyebrow">STEP 5 · QUESTIONNAIRE</p><h2>Tell us about your VetWeb experience</h2>
          <p>We will guide you through a few quick checks, then one statement at a time. This is designed to be calm and easy to complete on a phone.</p>
          <div className="notice"><b>Local test mode:</b> your questionnaire answers are saved to the private database on this laptop. GCash details are not saved yet.</div>
          <div className="rating-key" aria-label="Rating scale">{ratingScale.map(({ value, label }) => <div key={value}><b>{value}</b><span>{label}</span></div>)}</div>
        </section>
        <section className="card respondent-card">
          <p className="eyebrow">PART I · RESPONDENT INFORMATION</p><h3>Before we begin</h3>
          <div className="respondent-grid">
            <fieldset><legend>Participant category</legend><div className="role-pill">Pet owner / client</div></fieldset>
            <fieldset><legend>Are you 18 years old or above?</legend><div className="choice-row"><label><input type="radio" name="adult" value="yes" required /> Yes</label><label><input type="radio" name="adult" value="no" /> No</label></div></fieldset>
            <fieldset><legend>Have you used VetWeb&apos;s client-facing functions?</legend><small>For example: booking, pet records, notifications, or the chatbot.</small><div className="choice-row"><label><input type="radio" name="usedVetWeb" value="yes" required /> Yes</label><label><input type="radio" name="usedVetWeb" value="no" /> No</label></div></fieldset>
            <fieldset><legend>Have you used another veterinary clinic management, appointment, or electronic record system?</legend><div className="choice-row"><label><input type="radio" name="priorSystem" value="yes" required /> Yes</label><label><input type="radio" name="priorSystem" value="no" /> No</label></div><label className="specify">If yes, please specify <input name="priorSystemDetail" maxLength={120} placeholder="Optional" /></label></fieldset>
          </div>
          {surveyMessage && <p className="eligibility-message" role="alert">{surveyMessage}</p>}
          <div className="actions"><button type="button" className="secondary" onClick={() => move("checking")}>Back</button><button type="submit">Start rating VetWeb</button></div>
        </section>
      </form>}
      {surveyStage === "ratings" && <section className="card question-wizard-card">
        <div className="question-wizard-head"><div><p className="eyebrow">PART II · SOFTWARE QUALITY EVALUATION</p><span>{questionnaireItems[currentQuestion].section}</span></div><b>{currentQuestion + 1} <small>of {questionnaireItems.length}</small></b></div>
        <div className="question-progress"><span style={{ width: `${((currentQuestion + 1) / questionnaireItems.length) * 100}%` }} /></div>
        <fieldset className="single-question"><div className="question-topline"><span className="question-code">{questionnaireItems[currentQuestion].code}</span><span>{questionnaireItems[currentQuestion].characteristic}</span></div><legend>{questionnaireItems[currentQuestion].english}</legend><p className="translation">{questionnaireItems[currentQuestion].filipino}</p><p className="choose-label">How would you rate this statement?</p><div className="rating-options">{ratingScale.map(({ value, label }) => <label key={value} title={label}><input type="radio" name={questionnaireItems[currentQuestion].code} value={value} checked={ratings[questionnaireItems[currentQuestion].code] === value} onChange={() => { setRatings(current => ({ ...current, [questionnaireItems[currentQuestion].code]: value })); setSurveyMessage(""); }} /><b>{value}</b><span>{label}</span></label>)}</div></fieldset>
        {surveyMessage && <p className="eligibility-message" role="alert">{surveyMessage}</p>}
        <div className="actions wizard-actions"><button type="button" className="secondary" onClick={() => currentQuestion === 0 ? setSurveyStage("eligibility") : setCurrentQuestion(index => index - 1)}>Back</button><button type="button" onClick={continueRating}>{currentQuestion === questionnaireItems.length - 1 ? "Continue to feedback" : "Next statement"}</button></div>
      </section>}
      {surveyStage === "feedback" && <form className="card feedback-card" onSubmit={submitSurvey}><p className="eyebrow">FINAL STEP · OPTIONAL FEEDBACK</p><h2>Anything else you would like to share?</h2><p>Your ratings are complete. You may add a comment, or continue without one.</p><label htmlFor="feedback"><textarea id="feedback" name="feedback" rows={5} maxLength={2000} placeholder="Optional: Tell us what worked well or what should be improved." /></label><p className="fine">Maximum 2,000 characters.</p>{surveyMessage && <p className="eligibility-message" role="alert">{surveyMessage}</p>}<div className="actions wizard-actions"><button type="button" className="secondary" disabled={savingSurvey} onClick={() => { setSurveyStage("ratings"); setCurrentQuestion(questionnaireItems.length - 1); }}>Back</button><button type="submit" disabled={savingSurvey}>{savingSurvey ? "Saving answers…" : "Save answers and continue"}</button></div></form>}
    </div>}
    {step === "reward" && <form className="card" onSubmit={submitReward}><p className="eyebrow">STEP 6 · RAFFLE DETAILS</p><h2>Where should we send the raffle prize?</h2><p>After the survey phase ends, the research team will review verified submissions and process the <b>₱500 GCash raffle prize</b> according to the final study rules. A prize is not guaranteed; this number will be used only if you are selected.</p><label>GCash mobile number<input name="gcash" type="tel" inputMode="numeric" placeholder="0917 123 4567" pattern="(\\+63|0)9[0-9]{9}" title="Use a Philippine mobile number, e.g. 09171234567" required /></label><label className="check"><input required type="checkbox" /> <span>I confirm this is the GCash number the research team may use to send the ₱500 raffle prize if I am selected.</span></label>{surveyMessage && <p className="eligibility-message" role="alert">{surveyMessage}</p>}<button disabled={savingRaffle} type="submit">{savingRaffle ? "Saving raffle details…" : "Submit and finish"}</button><p className="fine">Your GCash number is encrypted and stored separately from your answers. It is accessible only through the protected researcher dashboard.</p></form>}
    {step === "done" && <section className="card success"><p className="eyebrow">SUBMISSION RECEIVED</p><h2>Thank you for participating.</h2><output>{reference}</output><p>Keep this reference code. The research team will process verified submissions at the end of the survey phase or according to the raffle rules.</p><p className="fine">Do not share your reference code or GCash number publicly.</p></section>}
  </main>;
}

import { prisma } from "../lib/prisma";
import { decryptGcashNumber } from "../lib/payment-claims";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { researcherCookieName, researcherSessionIsValid } from "../lib/researcher-auth";

export const dynamic = "force-dynamic";

function feedbackFromAnswers(answers: unknown) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return "—";
  const feedback = (answers as Record<string, unknown>).feedback;
  return typeof feedback === "string" && feedback.trim() ? feedback : "—";
}

const questionLabels: Record<string, string> = {
  A4: "VetWeb supports pet-profile registration, appointment booking, appointment notifications and status updates, and the inquiry chatbot.",
  B1: "VetWeb responds appropriately to user commands.",
  B3: "VetWeb provides relevant notifications for clinic events.",
  B4: "VetWeb operates without noticeable lag during normal use.",
  C2: "VetWeb works on supported internet-connected devices and browsers.",
  C3: "VetWeb displays and operates properly across screen sizes and browsers.",
  D1: "VetWeb provides functions suited to pet-care tasks.",
  D2: "VetWeb is easy for intended users to learn and operate.",
  D3: "VetWeb provides a clear and satisfying interface.",
  D4: "VetWeb can be used to complete pet-care tasks.",
  E1: "VetWeb performs intended functions properly during normal use.",
  E2: "VetWeb provides relevant and accurate information.",
  F1: "VetWeb restricts protected information to authorized users.",
  F4: "VetWeb provides individual accounts and verifies user identity.",
};

const ratingLabels: Record<string, string> = {
  "5": "Very acceptable",
  "4": "Acceptable",
  "3": "Moderately acceptable",
  "2": "Not acceptable",
  "1": "Very not acceptable",
};

function ratingsFromAnswers(answers: unknown) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  const ratings = (answers as Record<string, unknown>).ratings;
  if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) return [];
  return Object.keys(questionLabels).map(code => ({
    code,
    question: questionLabels[code],
    value: typeof (ratings as Record<string, unknown>)[code] === "string" ? (ratings as Record<string, string>)[code] : "—",
  }));
}

export default async function ResearchDashboard() {
  const cookieStore = await cookies();
  if (!researcherSessionIsValid(cookieStore.get(researcherCookieName)?.value)) redirect("/research/login");
  const claims = await prisma.paymentClaim.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { session: { include: { response: true } } },
  });

  return <main className="research-shell">
    <div className="research-heading"><div><p className="eyebrow">RESEARCHER-ONLY</p><h1>VetWeb Study Raffle Records</h1></div><form action="/api/research/logout" method="post"><button className="secondary" type="submit">Sign out</button></form></div>
    <p className="research-note">Each reference code is linked to one verified questionnaire and its encrypted GCash number. Select <b>View answers</b> to review the participant’s 1–5 ratings for every questionnaire statement. Access is restricted to the researcher dashboard.</p>
    <div className="research-table-wrap"><table>
      <thead><tr><th>Reference code</th><th>GCash number</th><th>Raffle status</th><th>Questionnaire answers</th><th>Participant comment</th><th>Questionnaire submitted</th><th>Raffle entry created</th></tr></thead>
      <tbody>{claims.length ? claims.map(claim => {
        let gcash = "Unavailable";
        try { gcash = decryptGcashNumber(claim.encryptedNumber); } catch { /* Keep encrypted data unreadable when the key is absent or incorrect. */ }
        const ratings = ratingsFromAnswers(claim.session.response?.answers);
        return <tr key={claim.id}><td><code>{claim.referenceCode}</code></td><td>{gcash}</td><td>{claim.state.replaceAll("_", " ")}</td><td>{ratings.length ? <details className="research-answers"><summary>View answers ({ratings.length})</summary><ol>{ratings.map(rating => <li key={rating.code}><b>{rating.code}</b><span>{rating.question}</span><strong>{rating.value} · {ratingLabels[rating.value] ?? "Not recorded"}</strong></li>)}</ol></details> : "No ratings recorded"}</td><td>{feedbackFromAnswers(claim.session.response?.answers)}</td><td>{claim.session.response?.submittedAt.toLocaleString() ?? "—"}</td><td>{claim.createdAt.toLocaleString()}</td></tr>;
      }) : <tr><td colSpan={7}>No raffle entries have been submitted yet.</td></tr>}</tbody>
    </table></div>
  </main>;
}

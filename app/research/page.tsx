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
    <p className="research-note">Each reference code is linked to one verified questionnaire and its encrypted GCash number. Access is restricted to the researcher dashboard.</p>
    <div className="research-table-wrap"><table>
      <thead><tr><th>Reference code</th><th>GCash number</th><th>Raffle status</th><th>Participant comment</th><th>Questionnaire submitted</th><th>Raffle entry created</th></tr></thead>
      <tbody>{claims.length ? claims.map(claim => {
        let gcash = "Unavailable";
        try { gcash = decryptGcashNumber(claim.encryptedNumber); } catch { /* Keep encrypted data unreadable when the key is absent or incorrect. */ }
        return <tr key={claim.id}><td><code>{claim.referenceCode}</code></td><td>{gcash}</td><td>{claim.state.replaceAll("_", " ")}</td><td>{feedbackFromAnswers(claim.session.response?.answers)}</td><td>{claim.session.response?.submittedAt.toLocaleString() ?? "—"}</td><td>{claim.createdAt.toLocaleString()}</td></tr>;
      }) : <tr><td colSpan={6}>No raffle entries have been submitted yet.</td></tr>}</tbody>
    </table></div>
  </main>;
}

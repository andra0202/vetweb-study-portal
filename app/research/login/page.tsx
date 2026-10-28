type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function ResearchLoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  return <main className="research-login-shell">
    <section className="research-login-card">
      <img src="/images/vetweb-logo-transparent.png" alt="VetWeb" />
      <p className="eyebrow">RESEARCHER ACCESS</p>
      <h1>Study records dashboard</h1>
      <p>Use the private researcher password to review reference codes, raffle entries, and protected GCash details.</p>
      {query.error && <p className="eligibility-message" role="alert">That password was not accepted. Please try again.</p>}
      <form action="/api/research/login" method="post">
        <label htmlFor="password">Researcher password<input id="password" name="password" type="password" autoComplete="current-password" required autoFocus /></label>
        <button type="submit">Open researcher dashboard</button>
      </form>
      <a href="/">Return to study portal</a>
    </section>
  </main>;
}

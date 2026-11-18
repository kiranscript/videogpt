"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="workspace-empty" role="alert"><h2>Let’s try that again.</h2><p>The studio could not open this view. Reload to retry.</p><button className="primary-button" onClick={reset}>Reload studio</button></div>;
}

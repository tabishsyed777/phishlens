(() => {
  'use strict';
  const SAMPLE = `From: Billing Support <billing@paypa1.example.invalid>
Reply-To: recovery@secure-mail.example.invalid
Subject: URGENT: verify your account within 24 hours
Date: 13 Nov 2026

Your account will be suspended immediately. Confirm your payment details here:
https://secure-login.example.invalid/verify?session=583920

Attachment: invoice_2026.js`;
  const e = { content: document.querySelector('#content'), sample: document.querySelector('#sample'), scan: document.querySelector('#scan'), clear: document.querySelector('#clear'), status: document.querySelector('#status'), download: document.querySelector('#download'), score: document.querySelector('#score'), scoreHint: document.querySelector('#scoreHint'), riskBar: document.querySelector('#riskBar'), indicators: document.querySelector('#indicators'), high: document.querySelector('#high'), review: document.querySelector('#review'), findingCount: document.querySelector('#findingCount'), findings: document.querySelector('#findings') };
  let latestReport = null;
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  function analyze(text) {
    const findings = []; const urls = [...text.matchAll(/https?:\/\/[^\s<>'"]+/gi)].map((match) => match[0].replace(/[),.;]+$/, ''));
    const add = (severity, title, detail, weight) => findings.push({ severity, title, detail, weight });
    urls.forEach((url) => {
      try {
        const parsed = new URL(url); const host = parsed.hostname.toLowerCase();
        if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) add('high', 'Raw IP link', `The link points directly to ${host} instead of a named domain.`, 30);
        if (host.includes('xn--')) add('high', 'Punycode domain', `The domain ${host} uses an internationalized label that can conceal lookalikes.`, 25);
        if (/@/.test(url.match(/^https?:\/\/([^/]+)/i)?.[1] || '')) add('high', 'Obfuscated destination', 'The URL uses an @ character to disguise its actual destination.', 25);
        if (/^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly)$/i.test(host)) add('review', 'Link shortener', `The destination is hidden behind ${host}; expand and verify it separately.`, 12);
        if (host.split('.').length > 4 || host.length > 45) add('review', 'Unusually complex host', `The destination host ${host} has an unusual shape for a sign-in link.`, 10);
        if (/paypa1|micros0ft|g00gle|appleid|secure-login|account-verify/i.test(host)) add('high', 'Lookalike or bait domain', `The host ${host} uses brand-like or verification language.`, 25);
      } catch { add('high', 'Malformed link', 'A URL-like string could not be parsed cleanly.', 20); }
    });
    const lower = text.toLowerCase(); const pressure = lower.match(/\b(urgent|immediately|suspend(?:ed)?|final notice|within \d+ hours?|verify your account|action required|payment details)\b/gi) || []; if (pressure.length >= 2) add('high', 'Pressure language', `The message uses ${pressure.length} urgency or consequence cues.`, 20); else if (pressure.length) add('review', 'Pressure language', 'The message uses urgency or consequence language.', 10);
    const attachments = [...text.matchAll(/(?:attachment|file|document)\s*[:=-]?\s*[^\n]*\.(exe|scr|js|vbs|cmd|bat|iso|zip|hta)\b/gi)]; if (attachments.length) add('high', 'Risky attachment type', `An attachment uses a script, executable, disk-image, or archive extension (${attachments.map((match) => match[1].toLowerCase()).join(', ')}).`, 25);
    const from = text.match(/^From:.*?@([^\s>]+)/im)?.[1]?.toLowerCase(); const reply = text.match(/^Reply-To:.*?@([^\s>]+)/im)?.[1]?.toLowerCase(); if (from && reply && from !== reply) add('high', 'Sender mismatch', `From uses ${from}, while Reply-To uses ${reply}.`, 25);
    if (/\b(password|passcode|one[- ]time code|payment|card number|bank details)\b/i.test(text) && urls.length) add('review', 'Credential request', 'The message combines a link with a request for sensitive information.', 15);
    const risk = Math.min(100, findings.reduce((sum, finding) => sum + finding.weight, 0)); const high = findings.filter((finding) => finding.severity === 'high').length; const review = findings.filter((finding) => finding.severity === 'review').length;
    return { generated_at: new Date().toISOString(), summary: { risk, indicators: findings.length, high, review }, findings };
  }
  function render(report) { latestReport = report; e.score.textContent = report.summary.risk; e.scoreHint.textContent = report.summary.risk >= 60 ? 'Multiple high-risk signals' : report.summary.risk >= 30 ? 'Pause and verify separately' : 'Few signals found; still use judgment'; e.riskBar.style.width = `${report.summary.risk}%`; e.indicators.textContent = report.summary.indicators; e.high.textContent = report.summary.high; e.review.textContent = report.summary.review; e.findingCount.textContent = `${report.findings.length} indicator${report.findings.length === 1 ? '' : 's'}`; e.status.textContent = 'Triage complete — links not opened'; e.status.classList.add('ready'); e.download.disabled = false; if (!report.findings.length) { e.findings.innerHTML = '<div class="empty"><span>✓</span><strong>No local indicators found</strong><p>That does not prove a message is safe. Verify unexpected requests through a known channel.</p></div>'; return; } e.findings.innerHTML = report.findings.map((finding) => `<article class="finding ${finding.severity}"><span class="finding-icon">${finding.severity === 'high' ? '!' : '·'}</span><div><div class="finding-title">${escapeHtml(finding.title)}</div><div class="finding-detail">${escapeHtml(finding.detail)}</div></div><span class="finding-severity">${finding.severity.toUpperCase()}</span></article>`).join(''); }
  function run() { const text = e.content.value.trim(); if (!text) { e.status.textContent = 'Add a message or URL first'; e.status.classList.remove('ready'); e.content.focus(); return; } render(analyze(text)); document.querySelector('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function clearAll() { e.content.value = ''; latestReport = null; e.status.textContent = 'Waiting for a message'; e.status.classList.remove('ready'); e.download.disabled = true; e.score.textContent = '—'; e.scoreHint.textContent = 'Run a triage pass to calculate'; e.riskBar.style.width = '0'; e.indicators.textContent = '—'; e.high.textContent = '—'; e.review.textContent = '—'; e.findingCount.textContent = '0 indicators'; e.findings.innerHTML = '<div class="empty"><span>◈</span><strong>No triage yet</strong><p>Paste the message or load the sample to surface explainable indicators.</p></div>'; }
  e.sample.addEventListener('click', () => { e.content.value = SAMPLE; run(); }); e.scan.addEventListener('click', run); e.clear.addEventListener('click', clearAll); e.download.addEventListener('click', () => { if (!latestReport) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' })); link.download = 'phishlens-report.json'; link.click(); URL.revokeObjectURL(link.href); });
})();

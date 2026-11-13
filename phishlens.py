#!/usr/bin/env python3
"""Passively triage authorized email or URL text for phishing indicators."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import urlparse


def analyze(text):
    findings, urls = [], [match.group(0).rstrip("),.;") for match in re.finditer(r"https?://[^\s<>'\"]+", text, re.I)]
    def add(severity, title, detail, weight): findings.append({"severity": severity, "title": title, "detail": detail, "weight": weight})
    for url in urls:
        try:
            parsed = urlparse(url)
            host = (parsed.hostname or "").lower()
            if re.fullmatch(r"(?:\d{1,3}\.){3}\d{1,3}", host): add("high", "Raw IP link", f"The link points directly to {host} instead of a named domain.", 30)
            if "xn--" in host: add("high", "Punycode domain", f"The domain {host} uses an internationalized label that can conceal lookalikes.", 25)
            if "@" in parsed.netloc: add("high", "Obfuscated destination", "The URL uses an @ character to disguise its actual destination.", 25)
            if re.fullmatch(r"(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly)", host, re.I): add("review", "Link shortener", f"The destination is hidden behind {host}; expand and verify it separately.", 12)
            if len(host.split(".")) > 4 or len(host) > 45: add("review", "Unusually complex host", f"The destination host {host} has an unusual shape for a sign-in link.", 10)
            if re.search(r"paypa1|micros0ft|g00gle|appleid|secure-login|account-verify", host, re.I): add("high", "Lookalike or bait domain", f"The host {host} uses brand-like or verification language.", 25)
        except ValueError: add("high", "Malformed link", "A URL-like string could not be parsed cleanly.", 20)
    lower = text.lower(); pressure = re.findall(r"\b(urgent|immediately|suspend(?:ed)?|final notice|within \d+ hours?|verify your account|action required|payment details)\b", lower)
    if len(pressure) >= 2: add("high", "Pressure language", f"The message uses {len(pressure)} urgency or consequence cues.", 20)
    elif pressure: add("review", "Pressure language", "The message uses urgency or consequence language.", 10)
    attachments = re.findall(r"(?:attachment|file|document)\s*[:=-]?\s*[^\n]*\.(exe|scr|js|vbs|cmd|bat|iso|zip|hta)\b", text, re.I)
    if attachments: add("high", "Risky attachment type", f"An attachment uses a risky extension ({', '.join(attachments)}).", 25)
    from_match, reply_match = re.search(r"^From:.*?@([^\s>]+)", text, re.I | re.M), re.search(r"^Reply-To:.*?@([^\s>]+)", text, re.I | re.M)
    if from_match and reply_match and from_match.group(1).lower() != reply_match.group(1).lower(): add("high", "Sender mismatch", f"From uses {from_match.group(1)}, while Reply-To uses {reply_match.group(1)}.", 25)
    if re.search(r"\b(password|passcode|one[- ]time code|payment|card number|bank details)\b", text, re.I) and urls: add("review", "Credential request", "The message combines a link with a request for sensitive information.", 15)
    risk = min(100, sum(item["weight"] for item in findings)); high = sum(item["severity"] == "high" for item in findings); review = sum(item["severity"] == "review" for item in findings)
    for item in findings: item.pop("weight", None)
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "summary": {"risk": risk, "indicators": len(findings), "high": high, "review": review}, "findings": findings}


def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument("input", type=Path, help="authorized message or URL text file"); parser.add_argument("--output", type=Path, help="write JSON report to this path"); args = parser.parse_args()
    if not args.input.is_file(): parser.error(f"input file does not exist: {args.input}")
    report = analyze(args.input.read_text(encoding="utf-8", errors="replace")); rendered = json.dumps(report, indent=2) + "\n"
    if args.output: args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(rendered, encoding="utf-8"); print(f"Report written to {args.output}")
    else: print(rendered, end="")


if __name__ == "__main__": main()

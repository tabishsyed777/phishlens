# PhishLens

PhishLens is a passive, local-first phishing-triage tool. It reads pasted email or URL text and highlights suspicious link shapes, sender mismatches, pressure language, risky attachment names, and credential requests. It never opens a URL or contacts an external service.

## Browser dashboard and GitHub Pages

Open `index.html` locally or publish this directory as its own GitHub Pages repository. The included `.github/workflows/pages.yml` deploys the static dashboard from the `main` branch when Pages is configured to use GitHub Actions.

1. Paste the complete message, including headers and links, or load the synthetic sample.
2. Select **Run passive triage**.
3. Treat the risk score as a pause button and review each indicator.
4. Export the JSON note if your security team needs the evidence.

Links are parsed as text only. They are never fetched or opened by this tool.

## Docker CLI

```sh
docker build -t phishlens .
mkdir -p reports
docker run --rm \
  -v "$PWD/samples:/data:ro" \
  -v "$PWD/reports:/reports" \
  phishlens /data/message.txt --output /reports/report.json
```

The sample uses `.example.invalid` domains and synthetic text. Review only messages you are authorized to inspect. Heuristics can miss sophisticated phishing and can flag legitimate messages; verify unexpected requests through a known channel.

## Indicators

The initial rules cover raw IP links, Punycode, URL obfuscation, link shorteners, unusually complex hosts, lookalike or bait domains, urgency language, risky attachment extensions, From/Reply-To mismatches, and requests for sensitive information alongside a link.

## License

MIT. See [LICENSE](LICENSE).

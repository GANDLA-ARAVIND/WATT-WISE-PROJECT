# Screenshots

UI captures referenced by the article series. [Part 1](../../part-1-building-wattwise.md) marks six slots with `📷` callouts.

## Expected files

| Filename | Screen | What to capture |
|---|---|---|
| `dashboard.png` | `/dashboard` | Summary metrics, monthly trend chart, contribution pie, insight cards |
| `upload-flow.png` | `/bills` | Upload card mid-progress or the parsed form with uncertain fields highlighted |
| `analytics.png` | `/analytics` | Seasonal comparison, money contribution cards, appliance list |
| `predictions.png` | `/predictions` | Forecast range, confidence badge, forecast chart with the predicted point |
| `assistant.png` | `/assistant` | A conversation showing the Short answer / Why / Best next moves structure |
| `architecture.png` | — | Optional: a rendered export of the overall system architecture diagram |

## Capture guidance

- Use the dark theme — the app is dark-first (`background: #0B0F19`).
- Capture at 1440px width for desktop shots; 390px for any mobile shots.
- Use a demo account with 4–6 saved bills so charts, trends and High-confidence forecasts have data to show.
- **Redact personal data.** Screenshots of the bills page may show names, addresses, service numbers and account numbers from uploaded documents.
- PNG, and keep files under ~500 KB so they render quickly on GitHub.

## Diagram exports

To produce PNGs from the Mermaid sources for platforms that do not render Mermaid (LinkedIn, Medium):

```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i ../diagrams/overall-system-architecture.md -o architecture.png -b transparent
```

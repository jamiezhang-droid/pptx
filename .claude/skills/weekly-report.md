---
name: weekly-report
description: Generate weekly reports from internal APIs and format for Slack. Use when the user wants to create status reports, compile metrics, or generate weekly summaries.
---

# Weekly Report Skill

Generate weekly reports by pulling data from internal API endpoints and formatting for Slack.

## Configuration

The user should provide or update the following in a `report-config.json` file:

```json
{
  "endpoints": [
    {
      "name": "Metric Name",
      "url": "https://api.example.com/metrics",
      "headers": { "Authorization": "Bearer ${API_TOKEN}" },
      "jsonPath": "data.value"
    }
  ],
  "slackFormat": {
    "title": "Weekly Report",
    "includeDate": true
  }
}
```

## Workflow

### 1. Check Configuration

Look for `report-config.json` in the repo root:

```bash
cat report-config.json 2>/dev/null || echo "Config not found"
```

If missing, ask the user to provide:
- API endpoint URLs
- Required headers/authentication
- Which fields to extract from responses
- Report title and sections

### 2. Create Report Script

Create `generate-report.js` to fetch data and format output:

```javascript
const https = require('https');
const config = require('./report-config.json');

async function fetchMetric(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: endpoint.headers || {}
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const value = getNestedValue(json, endpoint.jsonPath);
          resolve({ name: endpoint.name, value });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

async function generateReport() {
  const results = await Promise.all(
    config.endpoints.map(fetchMetric)
  );
  
  const date = new Date().toISOString().split('T')[0];
  const weekNum = getWeekNumber(new Date());
  
  // Format for Slack
  let slack = `*${config.slackFormat.title}*\n`;
  if (config.slackFormat.includeDate) {
    slack += `_Week ${weekNum} | ${date}_\n\n`;
  }
  
  results.forEach(({ name, value }) => {
    slack += `• *${name}:* ${value}\n`;
  });
  
  console.log(slack);
  return slack;
}

function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

generateReport().catch(console.error);
```

### 3. Run the Report

```bash
node generate-report.js
```

### 4. Output for Slack

Copy the formatted output to post in Slack, or pipe to clipboard:

```bash
node generate-report.js | pbcopy  # macOS
node generate-report.js | xclip   # Linux
```

## Customization

### Adding New Metrics

Add entries to `endpoints` array in `report-config.json`:

```json
{
  "name": "Active Users",
  "url": "https://api.internal.com/users/count",
  "headers": { "X-API-Key": "${INTERNAL_API_KEY}" },
  "jsonPath": "count"
}
```

### Custom Slack Formatting

Modify the `generateReport()` function to add:
- Sections with headers
- Charts (using Slack chart blocks)
- Comparisons with previous week
- Conditional formatting (good/bad indicators)

### Scheduled Automation

For automated weekly runs, add a cron job or GitHub Action:

```yaml
# .github/workflows/weekly-report.yml
name: Weekly Report
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node generate-report.js
```

## Slack Message Format Reference

Use Slack's mrkdwn formatting:
- `*bold*` for emphasis
- `_italic_` for secondary text
- `~strikethrough~` for deprecated
- `` `code` `` for values
- `>` for block quotes
- `:emoji:` for visual indicators

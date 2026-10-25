import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\29190d97-95b4-423a-b512-a1e3583506d6\\artifacts';

// ── Very lightweight markdown → HTML converter (no dependencies) ──
function mdToHtml(md) {
    let html = md
        // Escape HTML special chars first
        .replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;')
        // Headings
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold + italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Blockquote
        .replace(/^&gt; \[!NOTE\]\n&gt; (.+)$/gm, '<div class="note">📝 $1</div>')
        .replace(/^&gt; \[!WARNING\]\n&gt; (.+)$/gm, '<div class="warning">⚠️ $1</div>')
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr>')
        // Links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '<span class="link">$1</span>');

    // Tables
    html = html.replace(/(\|.+\|\n)+/g, (table) => {
        const rows = table.trim().split('\n');
        let out = '<table>';
        rows.forEach((row, i) => {
            if (/^\|[-| ]+\|$/.test(row)) return; // skip separator
            const cells = row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1);
            if (i === 0) {
                out += '<thead><tr>' + cells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>';
            } else {
                out += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
            }
        });
        out += '</tbody></table>';
        return out;
    });

    // Code blocks
    html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Unordered lists
    html = html.replace(/(^- .+(\n|$))+/gm, (block) => {
        const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
    });

    // Ordered lists
    html = html.replace(/(^\d+\. .+(\n|$))+/gm, (block) => {
        const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
        return `<ol>${items}</ol>`;
    });

    // Paragraphs (lines not already wrapped)
    const lines = html.split('\n');
    let result = '';
    let inPre = false;
    for (const line of lines) {
        if (line.startsWith('<pre')) inPre = true;
        if (line.startsWith('</pre')) inPre = false;
        if (inPre) { result += line + '\n'; continue; }
        if (!line.trim()) { result += '<br>'; continue; }
        if (/^<(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|pre|hr|blockquote|div)/.test(line.trim())) {
            result += line + '\n';
        } else {
            result += `<p>${line}</p>\n`;
        }
    }
    return result;
}

function buildPage(title, bodyHtml, accentColor) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --accent: ${accentColor};
    --accent-light: ${accentColor}12;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #94a3b8;
    --border-soft: #e2e8f0;
    --border-accent: ${accentColor}40;
    --bg-light: #f8fafc;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    color: var(--text-primary);
    background: white;
    line-height: 1.6;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  /* Cover Page */
  .cover-box {
    break-after: page;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px;
    background: radial-gradient(circle at top right, var(--bg-light), white 40%);
    position: relative;
    border-top: 12px solid var(--accent);
  }
  
  .cover-logo-placeholder {
    width: 60px;
    height: 60px;
    background: var(--accent);
    color: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 2rem;
    box-shadow: 0 10px 25px -5px var(--border-accent);
  }

  .cover-maintitle {
    font-size: 34pt;
    font-weight: 800;
    line-height: 1.1;
    color: var(--text-primary);
    margin-bottom: 20px;
    letter-spacing: -0.5px;
  }

  .cover-subtitle {
    font-size: 14pt;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 40px;
  }

  .cover-meta {
    margin-top: auto;
    padding-top: 30px;
    border-top: 1px solid var(--border-soft);
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* Main Content Area */
  .content {
    padding: 0 60px 40px;
  }

  /* Typography */
  h1 { font-size: 20pt; font-weight: 800; color: var(--text-primary); margin: 40px 0 16px; letter-spacing: -0.5px; break-after: avoid; }
  h2 { font-size: 15pt; font-weight: 700; color: var(--text-primary); margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--border-soft); break-after: avoid; }
  h3 { font-size: 13pt; font-weight: 700; color: var(--accent); margin: 24px 0 10px; break-after: avoid; }
  h4 { font-size: 11pt; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; break-after: avoid; }

  p { margin-bottom: 12px; color: var(--text-secondary); text-align: justify; hyphens: auto; }
  
  strong { font-weight: 700; color: var(--text-primary); }
  em { font-style: italic; color: var(--text-primary); }
  
  /* Code & Preformatted */
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9pt;
    background: var(--bg-light);
    color: #e11d48;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--border-soft);
  }
  
  pre {
    background: #1e293b;
    color: #f8fafc;
    padding: 20px 24px;
    border-radius: 8px;
    margin: 16px 0;
    overflow-x: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    line-height: 1.5;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    break-inside: avoid;
  }
  pre code { background: none; color: inherit; border: none; padding: 0; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 20px 0;
    font-size: 9.5pt;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-soft);
    break-inside: avoid;
  }
  th {
    background: var(--bg-light);
    color: var(--text-primary);
    padding: 12px 16px;
    text-align: left;
    font-weight: 700;
    border-bottom: 1px solid var(--border-soft);
    text-transform: uppercase;
    font-size: 8.5pt;
    letter-spacing: 0.5px;
  }
  td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-soft);
    color: var(--text-secondary);
  }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }

  /* Lists */
  ul, ol { padding-left: 24px; margin: 12px 0 16px; color: var(--text-secondary); }
  li { margin-bottom: 6px; padding-left: 4px; }
  li::marker { color: var(--accent); font-weight: 700; }

  /* Blockquotes & Notes */
  blockquote {
    border-left: 4px solid var(--accent);
    background: var(--accent-light);
    padding: 14px 20px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
    color: var(--text-primary);
    font-weight: 500;
  }
  blockquote.note { 
    border-color: #3b82f6; 
    background: rgba(59, 130, 246, 0.08); 
  }
  blockquote.warning { 
    border-color: #f59e0b; 
    background: rgba(245, 158, 11, 0.08); 
  }

  hr {
    border: none;
    border-top: 1px solid var(--border-soft);
    margin: 32px 0;
    position: relative;
  }
  hr::after {
    content: "◈";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--border-soft);
    background: white;
    padding: 0 10px;
    font-size: 12px;
  }

  /* Markdown custom spans */
  .link { color: var(--accent); font-weight: 600; text-decoration: none; border-bottom: 1px dotted var(--accent); }

  /* Header / Footer Print Margins */
  @page { 
    margin: 20mm;
    size: A4;
    @bottom-right {
        content: counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 9pt;
        color: #94a3b8;
    }
    @bottom-left {
        content: "ACS School & College";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 9pt;
        color: #94a3b8;
    }
  }

  /* Specific Print Adjustments */
  @media print {
    body { background: white; }
    .cover-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    blockquote { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .content { padding: 0; } 
  }
</style>
</head>
<body>
<div class="cover-box">
  <div class="cover-logo-placeholder">ACS</div>
  <div class="cover-subtitle">CONFIDENTIAL DOCUMENT</div>
  <h1 class="cover-maintitle">${title}</h1>
  <p style="font-size: 13pt; color: var(--text-secondary); max-width: 600px;">
    Comprehensive system documentation and operational guidelines for the ACS School Management platform.
  </p>
  
  <div class="cover-meta">
    <div>
      <span style="display: block; color: var(--text-tertiary); font-size: 8.5pt; text-transform: uppercase; margin-bottom: 4px;">Prepared For</span>
      <strong>ACS School & College, Faisalabad</strong>
    </div>
    <div style="text-align: right;">
      <span style="display: block; color: var(--text-tertiary); font-size: 8.5pt; text-transform: uppercase; margin-bottom: 4px;">Date Generated</span>
      <strong>${new Date().toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}</strong>
    </div>
  </div>
</div>

<div class="content">
${bodyHtml}
</div>
</body>
</html>`;
}

async function generatePDF(htmlContent, outputPath, label) {
    console.log(`⏳ Generating ${label}...`);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    await browser.close();
    console.log(`✅ Saved: ${outputPath}`);
}

async function main() {
    const demoMd   = readFileSync(`${ARTIFACTS_DIR}\\ACS_Demo_Presentation.md`, 'utf-8');
    const guideMd  = readFileSync(`${ARTIFACTS_DIR}\\ACS_User_Guide.md`, 'utf-8');

    const demoHtml  = buildPage('Demo Presentation', mdToHtml(demoMd),  '#2563eb');
    const guideHtml = buildPage('Complete User Guide', mdToHtml(guideMd), '#7c3aed');

    // Also save the HTML files (useful fallback)
    writeFileSync(`${ARTIFACTS_DIR}\\ACS_Demo_Presentation.html`,  demoHtml);
    writeFileSync(`${ARTIFACTS_DIR}\\ACS_User_Guide.html`,          guideHtml);

    await generatePDF(demoHtml,  `${ARTIFACTS_DIR}\\ACS_Demo_Presentation.pdf`,  'Demo Presentation PDF');
    await generatePDF(guideHtml, `${ARTIFACTS_DIR}\\ACS_User_Guide.pdf`,          'User Guide PDF');

    console.log('\n🎉 Both PDFs are ready!');
    console.log(`📁 Location: ${ARTIFACTS_DIR}`);
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });

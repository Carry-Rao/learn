function escapeHtml(html) {
  return html.replace(/</g, "\x26lt;").replace(/>/g, "\x26gt;");
}

function renderTable(header, rows) {
  let tpl = "<table><thead><tr>";
  for (let i = 0; i < header.length; i++) tpl += `<th>${header[i]}</th>`;
  tpl += "</tr></thead><tbody>";
  for (let i = 0; i < rows.length; i++) {
    tpl += "<tr>";
    for (let j = 0; j < rows[i].length; j++) tpl += `<td>${rows[i][j]}</td>`;
    tpl += "</tr>";
  }
  return tpl + "</tbody></table>";
}

function parseInline(line) {
  line = line.replace(/\!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
  line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  line = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  line = line.replace(/\*(.*?)\*/g, "<i>$1</i>");
  line = line.replace(/\b_(.*?)_\b/g, "<i>$1</i>");
  line = line.replace(/`(.*?)`/g, '<code class="code-inline">$1</code>');
  return line;
}

export function parseMarkdown(raw) {
  const lines = raw.split("\n");
  const codeBlocks = [];
  const codeLangs = [];
  const htmlParts = [];
  let inCode = false;
  let codeContent = "";
  let codeLang = "";
  let codeIdx = 0;
  const tableHeader = [];
  const tableRows = [];
  let inTable = false;
  let listType = null;
  let listItems = [];

  function flushList() {
    if (listType && listItems.length > 0) {
      const tag = listType === "ul" ? "ul" : "ol";
      const items = listItems.map(item => `<li>${parseInline(item)}</li>`).join("");
      htmlParts.push(`<${tag} class="list">${items}</${tag}>`);
    }
    listType = null;
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = escapeHtml(lines[i]);

    if (line.startsWith("```")) {
      if (!inCode) {
        codeIdx++;
        codeLang = line.slice(3).trim();
        codeContent = "";
        codeLangs[codeIdx] = codeLang;
        codeBlocks[codeIdx] = "";
        inCode = true;
      } else {
        codeBlocks[codeIdx] = codeContent;
        htmlParts.push(`<div id="code-block-${codeIdx}" class="code-block"></div>`);
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      codeContent += line + "\n";
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      inTable = true;
      if (line.includes("---")) continue;
      const cells = line.slice(1, -1).split("|").map(c => c.trim());
      tableHeader.length === 0 ? tableHeader.push(...cells) : tableRows.push(cells);
      continue;
    }

    if (inTable) {
      htmlParts.push(renderTable(tableHeader, tableRows));
      tableHeader.length = 0;
      tableRows.length = 0;
      inTable = false;
    }

    const unorderedMatch = line.match(/^(\s*)-\s+(.*)/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)/);

    if (unorderedMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unorderedMatch[2]);
      continue;
    }

    if (orderedMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedMatch[2]);
      continue;
    }

    flushList();

    if (line.startsWith("# ")) {
      htmlParts.push(`<h2>${parseInline(line.slice(2))}</h2>`);
    } else if (line.startsWith("## ")) {
      htmlParts.push(`<h3>${parseInline(line.slice(3))}</h3>`);
    } else if (line.startsWith("### ")) {
      htmlParts.push(`<h4>${parseInline(line.slice(4))}</h4>`);
    } else if (/^-{3,}$/.test(line.trim())) {
      htmlParts.push("<hr>");
    } else if (line.trim() === "") {
      htmlParts.push("<br>");
    } else {
      htmlParts.push(`<p>${parseInline(line)}</p>`);
    }
  }

  flushList();

  if (inTable) {
    htmlParts.push(renderTable(tableHeader, tableRows));
  }

  return {
    html: htmlParts.join(""),
    codeBlocks,
    codeLangs,
    codeCount: codeIdx
  };
}

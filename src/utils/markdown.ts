import markdownToHtml from "./markdownToHtml";
import htmlToMarkdown from "./htmlToMarkdown";
import { readTextFile } from "@tauri-apps/plugin-fs";

import yaml from "yaml";

async function readMarkdownFile(filePath: string) {
  const content = (await readTextFile(filePath)).replace(/^\uFEFF/, "");
  const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;
  let metadata: Record<string, unknown> = {};
  let body = content;

  const match = content.match(frontmatterRegex);
  if (match) {
    body = content.slice(match[0].length);
    try {
      const parsed = yaml.parse(match[1]) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      metadata = {};
    }
  }

  const parsedHTML = await markdownToHtml(body);

  return {
    metadata,
    html: parsedHTML,
  };
}

export { markdownToHtml, htmlToMarkdown, readMarkdownFile };

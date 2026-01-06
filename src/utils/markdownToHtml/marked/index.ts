import { Renderer, marked } from "marked";
import { escape } from "../helpers";

const renderer: Partial<Renderer> = {
  paragraph(this: Renderer, { tokens }) {
    const html = this.parser.parseInline(tokens);
    // don't wrap images in p tags
    if (html.startsWith("<img")) {
      return html + "\n";
    }
    return "<p>" + html + "</p>\n";
  },

  // same as the marked default code renderer
  // here we just adjust it to not add a trailing new line at the end of code blocks
  code({ text, lang, escaped }) {
    const language = (lang || "").match(/^\S*/)?.[0];

    text = text.replace(/\n$/, "");

    if (!language) {
      return (
        "<pre><code>" + (escaped ? text : escape(text)) + "</code></pre>\n"
      );
    }

    return (
      '<pre><code class="language-' +
      escape(language) +
      '">' +
      (escaped ? text : escape(text)) +
      "</code></pre>\n"
    );
  },
};
export default marked.use({ renderer });

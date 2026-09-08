const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "span", "div",
]);

const ALLOWED_ATTRS = new Set([
  "href", "title", "target", "rel",
  "class",
]);

const DANGEROUS_TAGS = new Set([
  "script", "iframe", "form", "input", "button", "textarea", "select",
  "style", "link", "meta", "base", "object", "embed", "applet",
]);

const DANGEROUS_ATTRS = new Set([
  "onabort", "onblur", "onchange", "onclick", "ondblclick", "onerror",
  "onfocus", "onkeydown", "onkeypress", "onkeyup", "onload", "onmousedown",
  "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onreset",
  "onresize", "onscroll", "onselect", "onsubmit", "onunload",
  "style", "formaction", "xlink:href", "xmlns",
]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.nodeValue ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  if (DANGEROUS_TAGS.has(tagName)) {
    return "";
  }

  const allowedTag = ALLOWED_TAGS.has(tagName) ? tagName : "span";
  const attrs: string[] = [];
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (DANGEROUS_ATTRS.has(name)) continue;
    if (!ALLOWED_ATTRS.has(name) && name !== "target" && name !== "rel") continue;
    if (name === "href" && /^javascript:/i.test(attr.value)) continue;
    if (name === "href" && /^vbscript:/i.test(attr.value)) continue;
    attrs.push(`${name}="${escapeHtml(attr.value)}"`);
  }

  const children = Array.from(el.childNodes).map(sanitizeNode).join("");
  if (tagName === "span" && attrs.length === 0 && children === el.innerHTML) {
    return children;
  }
  if (tagName === "div" && attrs.length === 0 && children === el.innerHTML) {
    return children;
  }
  if (tagName === "p" && attrs.length === 0 && children === el.innerHTML) {
    return children;
  }
  if (tagName === allowedTag) {
    return attrs.length > 0 ? `<${tagName} ${attrs.join(" ")}>${children}</${tagName}>` : `<${tagName}>${children}</${tagName}>`;
  }
  return children;
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  const doc = new DOMParser().parseFromString(dirty, "text/html");
  const body = doc.body;
  if (!body) return "";
  const cleaned = Array.from(body.childNodes).map(sanitizeNode).join("");
  return cleaned;
}

export function sanitizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return char;
    }
  });
}

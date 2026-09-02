const { Parser } = require('htmlparser2');

// Parse attributes rather than matching token substrings in raw HTML. Only one
// verification tag is allowed, and it must be in the document's head.
function metaMatches(html, token) {
  const tags = [];
  let inHead = false, inertDepth = 0;
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === 'template') inertDepth++;
      if (inertDepth) return;
      if (name === 'head') inHead = true;
      if (name === 'body') inHead = false;
      if (name === 'meta' && attributes.name === 'agentbridge-verification') {
        tags.push({ inHead, content: attributes.content });
      }
    },
    onclosetag(name) {
      if (name === 'template') inertDepth = Math.max(0, inertDepth - 1);
      if (name === 'head') inHead = false;
    }
  }, { decodeEntities: true });
  parser.end(html);
  return typeof token === 'string' && token.length > 0 && tags.length === 1 &&
    tags[0].inHead && tags[0].content?.trim() === token;
}

module.exports = { metaMatches };

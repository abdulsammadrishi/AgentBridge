const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { metaMatches } = require('../services/verification');
const token = randomBytes(18).toString('hex');
const tag = value => `<meta name="agentbridge-verification" content="${value}" />`;
const page = value => `<html><head>${value}</head><body></body></html>`;
assert(metaMatches(page(tag(token)), token));
assert(metaMatches(page(`<META content=' \n${token}\t ' NAME = 'agentbridge-verification'>`), token));
assert(metaMatches(page(tag(`&#${token.charCodeAt(0)};${token.slice(1)}`)), token));
for (const html of [
  page(tag(token + 'extra')), page(tag('extra' + token)), page(tag(token.toUpperCase())),
  page(tag(token) + tag(token)), page(tag('wrong')), page(`<!-- ${tag(token)} -->`),
  page(`<script>${JSON.stringify(tag(token))}</script>`), page(`<template>${tag(token)}</template>`),
  page(`<meta name="agentbridge-verification" content="${tag(token)}"/>`),
  `<html><head></head><body>${tag(token)}</body></html>`,
  page(`<meta data-name="agentbridge-verification" content="${token}">`),
  page(`<meta name="agentbridge-verification-extra" content="${token}">`)
]) assert.equal(metaMatches(html, token), false, html);
console.log('Verification parsing passed: exact dynamic token, head placement, whitespace, entities, duplicates, malformed markup, comments and scripts.');

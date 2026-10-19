const Module = require("module");
const path = require("path");
const stub = path.join(__dirname, "empty-server-only.js");
const original = Module._resolveFilename;
Module._resolveFilename = function resolveServerOnly(request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return original.call(this, request, parent, isMain, options);
};

// minify string of javascript code
export function minifyJS(code: string): string {
  const uglify = require("uglify-js");

  const minified = uglify.minify(code);

  if (minified.error) {
    throw new Error(`Error minifying JS: ${minified.error}`);
  }

  return minified.code;
}

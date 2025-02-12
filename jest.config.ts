import type { Config } from "jest";

const config: Config = {
  verbose: true,
  testPathIgnorePatterns: ["/dist/", "/out/", "/node_modules/"],
};

export default config;

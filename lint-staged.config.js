export default {
  "*.{js,jsx,ts,tsx,css,html,json,jsonc}": "biome check --write",
  "*.md": () => "node ./scripts/run-rumdl-staged.mjs",
};

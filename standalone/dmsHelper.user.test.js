import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { Window } from "happy-dom";

const htmlPath = resolve("standalone/local/dmsHelperDom.html");
const scriptPath = resolve("standalone/dmsHelper.user.js");

function runUserscript() {
  const window = new Window({
    url: "https://dms.aliyun.com/",
  });
  const { document } = window;

  document.write(readFileSync(htmlPath, "utf8"));
  document.close();

  window.requestAnimationFrame = (callback) => {
    callback();
    return 0;
  };

  if (!window.navigator.clipboard) {
    window.navigator.clipboard = {
      writeText: async () => {},
    };
  }

  window.eval(readFileSync(scriptPath, "utf8"));

  return document;
}

describe("dmsHelper.user.js", () => {
  test("只在当前激活的结果 tab 中注入按钮", () => {
    const document = runUserscript();
    const toolbars = Array.from(document.querySelectorAll(".con-sql-result .bar-top"));

    expect(toolbars).toHaveLength(2);
    expect(
      toolbars[0].querySelectorAll("#dms-helper-csv-btn, #dms-helper-md-btn"),
    ).toHaveLength(0);
    expect(
      toolbars[1].querySelectorAll("#dms-helper-csv-btn, #dms-helper-md-btn"),
    ).toHaveLength(2);
  });
});

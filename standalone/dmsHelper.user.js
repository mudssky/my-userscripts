// ==UserScript==
// @name         DMS 结果表格复制工具 (CSV & Markdown)
// @namespace    dmsHelper
// @version      1.1
// @description  为阿里云 DMS 查询结果添加复制为 CSV 和 Markdown 格式的功能
// @author       You
// @match        *://dms.aliyun.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // --- 配置项 ---
  const SELECTORS = {
    resultContainer: ".con-sql-result",
    toolbar: ".bar-top",
    table: ".art-table",
    headerRow: ".art-table-header-row",
    bodyRows: ".art-table-body .art-table-row",
    headerText: ".text",
    cellText: ".text",
  };

  // --- 核心逻辑 ---

  // 提取表格数据
  function parseTable() {
    const table = document.querySelector(SELECTORS.table);
    if (!table) return null;

    // 1. 提取表头
    const headerEl = table.querySelector(SELECTORS.headerRow);
    const headers = [];
    headerEl.querySelectorAll("th").forEach((th) => {
      const textEl = th.querySelector(SELECTORS.headerText);
      let text = textEl ? textEl.textContent : th.textContent;
      headers.push(text.trim());
    });

    // 2. 提取数据行
    const rows = [];
    const bodyRowEls = table.querySelectorAll(SELECTORS.bodyRows);

    bodyRowEls.forEach((rowEl) => {
      const cells = rowEl.querySelectorAll(".art-table-cell");
      const rowData = [];
      cells.forEach((cell) => {
        const textEl = cell.querySelector(SELECTORS.cellText);
        let text = textEl ? textEl.textContent : cell.textContent;
        rowData.push(text.trim());
      });
      rows.push(rowData);
    });

    return { headers, rows };
  }

  // 格式化为 CSV
  function toCSV(data) {
    if (!data) return "";
    const escape = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [data.headers.map(escape).join(",")];
    data.rows.forEach((row) => {
      lines.push(row.map(escape).join(","));
    });
    return lines.join("\n");
  }

  // 格式化为 Markdown
  function toMarkdown(data) {
    if (!data) return "";
    const { headers, rows } = data;
    const escapePipe = (str) => String(str).replace(/\|/g, "\\|");

    const headerLine = `| ${headers.map(escapePipe).join(" | ")} |`;
    const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
    const bodyLines = rows.map(
      (row) => `| ${row.map(escapePipe).join(" | ")} |`,
    );

    return [headerLine, separatorLine, ...bodyLines].join("\n");
  }

  // 复制到剪贴板
  async function copyText(text, type) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✅ ${type} 已复制到剪贴板`);
    } catch (e) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast(`✅ ${type} 已复制到剪贴板`);
      } catch (err) {
        showToast("❌ 复制失败");
      }
      document.body.removeChild(textarea);
    }
  }

  // Toast 提示
  function showToast(message) {
    const existingToast = document.getElementById("dms-custom-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.id = "dms-custom-toast";
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background-color: #333; color: #fff; padding: 10px 20px; border-radius: 4px;
            font-size: 14px; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
        `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => (toast.style.opacity = "1"));
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.parentNode?.removeChild(toast), 300);
    }, 2500);
  }

  // 创建按钮
  function injectButtons(toolbar) {
    if (toolbar.querySelector("#dms-helper-csv-btn")) return;

    const createBtn = (text, onClick) => {
      const btn = document.createElement("button");
      btn.className = "next-btn next-small next-btn-normal is-wind";
      btn.style.marginLeft = "8px";
      btn.textContent = text;
      btn.onclick = onClick;
      return btn;
    };

    // CSV 按钮
    const csvBtn = createBtn("复制 CSV", () => {
      const data = parseTable();
      if (data) copyText(toCSV(data), "CSV");
    });
    csvBtn.id = "dms-helper-csv-btn";

    // Markdown 按钮
    const mdBtn = createBtn("复制 Markdown", () => {
      const data = parseTable();
      if (data) copyText(toMarkdown(data), "Markdown");
    });
    mdBtn.id = "dms-helper-md-btn";

    toolbar.appendChild(csvBtn);
    toolbar.appendChild(mdBtn);
  }

  // --- 初始化入口 (优化版) ---

  // 检查并处理当前页面
  function checkAndInject() {
    const resultArea = document.querySelector(SELECTORS.resultContainer);
    if (resultArea) {
      const toolbar = resultArea.querySelector(SELECTORS.toolbar);
      if (toolbar) {
        injectButtons(toolbar);
      }
    }
  }

  function init() {
    // 初始检查
    checkAndInject();

    // 监听页面变化 (SPA 路由切换或内容加载)
    const observer = new MutationObserver(() => {
      checkAndInject();
    });

    // 只监听 body 的直接子节点变化，减少性能消耗
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();

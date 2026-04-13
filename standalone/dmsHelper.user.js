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

  // 等待目标元素加载
  function waitFor(selector, root = document) {
    return new Promise((resolve) => {
      if (root.querySelector(selector)) {
        return resolve(root.querySelector(selector));
      }
      const observer = new MutationObserver((mutations, obs) => {
        const el = root.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      observer.observe(root, { childList: true, subtree: true });
    });
  }

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

  // --- 优化后的 Toast 提示 ---
  function showToast(message) {
    // 移除已存在的 toast 防止堆叠
    const existingToast = document.getElementById("dms-custom-toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "dms-custom-toast";
    toast.textContent = message;

    // 注入样式
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: #fff;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none; /* 让点击穿透，不影响操作 */
        `;

    document.body.appendChild(toast);

    // 淡入
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    // 2.5秒后淡出并移除
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2500);
  }

  // 创建按钮
  function injectButtons(toolbar) {
    // 防止重复添加
    if (toolbar.querySelector("#dms-helper-csv-btn")) return;

    const btnStyle = "margin-left: 8px;";

    // CSV 按钮
    const csvBtn = document.createElement("button");
    csvBtn.id = "dms-helper-csv-btn";
    csvBtn.className = "next-btn next-small next-btn-normal is-wind";
    csvBtn.style.cssText = btnStyle;
    csvBtn.textContent = "复制 CSV";
    csvBtn.onclick = () => {
      const data = parseTable();
      if (data) copyText(toCSV(data), "CSV");
    };

    // Markdown 按钮
    const mdBtn = document.createElement("button");
    mdBtn.id = "dms-helper-md-btn";
    mdBtn.className = "next-btn next-small next-btn-normal is-wind";
    mdBtn.style.cssText = btnStyle;
    mdBtn.textContent = "复制 Markdown";
    mdBtn.onclick = () => {
      const data = parseTable();
      if (data) copyText(toMarkdown(data), "Markdown");
    };

    toolbar.appendChild(csvBtn);
    toolbar.appendChild(mdBtn);
  }

  // --- 初始化入口 ---
  async function init() {
    const observer = new MutationObserver(async () => {
      const resultArea = document.querySelector(SELECTORS.resultContainer);
      if (resultArea) {
        const toolbar = resultArea.querySelector(SELECTORS.toolbar);
        if (toolbar) {
          injectButtons(toolbar);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();

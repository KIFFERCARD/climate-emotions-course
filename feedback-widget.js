/* ------------------------------------------------------------------
   Feedback widget — Understanding Climate Emotions (course & curriculum)
   ------------------------------------------------------------------
   Ported from the MHCCA "Evaluating Climate Resilience Initiatives"
   toolkit so both sites share the same look and behaviour. Submissions
   go to the same Supabase project (evaluating-climate-resilience) but
   into a dedicated table, `course_feedback`, so the two projects that
   share the database do not conflict. The publishable key below is
   designed to be exposed in client code; all access is protected by
   Row Level Security (anonymous users may only INSERT; reading and
   managing feedback requires an admin session).

   Usage: include on any page of this site —
     <script src="feedback-widget.js" defer></script>
------------------------------------------------------------------- */
(function () {
  "use strict";

  var SUPABASE_URL = "https://ezihkstrsrwebrebkvva.supabase.co";
  var SUPABASE_KEY = "sb_publishable_PyLiwvxlIdKqQpM7Hi4WDw_d1tEAZWY";
  var SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  var SITE = "understanding-climate-emotions";
  var TABLE = "course_feedback";

  /* ---- styles (cfb- prefix so nothing collides with page CSS) ---- */
  var CSS = [
    ".cfb-tab{position:fixed;right:0;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;",
    "  background:#7eaf04;color:#fff;border:none;padding:16px 9px;border-radius:10px 0 0 10px;",
    "  cursor:pointer;font-family:inherit;font-weight:700;font-size:.82rem;letter-spacing:.05em;",
    "  z-index:9080;box-shadow:-2px 2px 12px rgba(15,36,51,.18)}",
    ".cfb-tab:hover{background:#688f04}",
    ".cfb-overlay{position:fixed;inset:0;background:rgba(15,36,51,.45);opacity:0;pointer-events:none;transition:.2s;z-index:9090}",
    ".cfb-overlay.open{opacity:1;pointer-events:auto}",
    ".cfb-modal{position:fixed;right:18px;bottom:18px;width:min(380px,calc(100vw - 36px));background:#fff;",
    "  border:1px solid #dde5ec;border-radius:16px;box-shadow:0 18px 50px rgba(15,36,51,.25);padding:20px;z-index:9095;",
    "  transform:translateY(16px);opacity:0;pointer-events:none;transition:.2s;max-height:85vh;overflow:auto;",
    "  color:#0f2433;font-size:15px;line-height:1.5;text-align:left}",
    ".cfb-modal.open{transform:none;opacity:1;pointer-events:auto}",
    ".cfb-modal h3{margin:0;font-size:18px;color:#0f2433}",
    ".cfb-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}",
    ".cfb-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#8195a6;line-height:1;padding:0 4px}",
    ".cfb-close:hover{color:#0f2433}",
    ".cfb-page{font-size:.78rem;color:#8195a6;margin:0 0 12px}",
    ".cfb-field{margin-bottom:12px}",
    ".cfb-field label{display:block;font-size:.82rem;font-weight:600;margin-bottom:4px;color:#0f2433}",
    ".cfb-field input,.cfb-field select,.cfb-field textarea{width:100%;box-sizing:border-box;padding:9px 11px;",
    "  border:1px solid #c9d4de;border-radius:8px;font:inherit;font-size:.92rem;color:#0f2433;background:#fff}",
    ".cfb-field textarea{resize:vertical;min-height:88px}",
    ".cfb-field input:focus,.cfb-field select:focus,.cfb-field textarea:focus{outline:2px solid #1470af;outline-offset:1px}",
    ".cfb-submit{display:block;width:100%;border:none;border-radius:10px;padding:11px 16px;cursor:pointer;",
    "  background:#1470af;color:#fff;font:inherit;font-weight:700;font-size:.95rem;box-shadow:0 8px 20px rgba(20,112,175,.28)}",
    ".cfb-submit:hover{background:#0d5a8c}",
    ".cfb-submit[disabled]{opacity:.65;cursor:default}",
    ".cfb-alert{border-radius:10px;padding:11px 14px;font-size:.88rem;margin:0 0 8px;border:1px solid}",
    ".cfb-alert-ok{background:#eef7ef;border-color:#bfe2cd;color:#1f6e41}",
    ".cfb-alert-warn{background:#fdf6e3;border-color:#ecd6a4;color:#8a6512}",
    ".cfb-alert-bad{background:#fdeeea;border-color:#eec4ba;color:#9c3a25}",
    ".cfb-loading{display:inline-block;width:16px;height:16px;border:2.5px solid rgba(255,255,255,.4);",
    "  border-top-color:#fff;border-radius:50%;animation:cfbspin .7s linear infinite;vertical-align:-3px}",
    "@keyframes cfbspin{to{transform:rotate(360deg)}}",
    "@media(max-width:520px){.cfb-tab{top:auto;bottom:90px;transform:none}}"
  ].join("\n");

  /* ---- tiny DOM helper (same pattern as the evaluation toolkit) ---- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "onclick") el.onclick = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.append(c.nodeType ? c : document.createTextNode(c));
    }
    return el;
  }

  /* ---- supabase client (lazy: loaded on first open) ---- */
  var sbClient = null, sbLoading = null;
  function getClient() {
    if (sbClient) return Promise.resolve(sbClient);
    if (!sbLoading) {
      sbLoading = new Promise(function (resolve, reject) {
        if (window.supabase && window.supabase.createClient) { resolve(); return; }
        var s = document.createElement("script");
        s.src = SUPABASE_CDN;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error("Could not load the feedback service.")); };
        document.head.appendChild(s);
      }).then(function () {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return sbClient;
      });
    }
    return sbLoading;
  }

  /* ---- widget ---- */
  function build() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var pageName = location.pathname.split("/").pop() || "index.html";
    var overlay = h("div", { class: "cfb-overlay" });
    var panel = h("div", { class: "cfb-modal", role: "dialog", "aria-label": "Send feedback" });
    function close() { overlay.classList.remove("open"); panel.classList.remove("open"); }

    var cat = h("select", { id: "cfb-cat" },
      h("option", { value: "Suggestion" }, "Suggestion"),
      h("option", { value: "Content" }, "Content / accuracy"),
      h("option", { value: "Bug" }, "Something is broken"),
      h("option", { value: "Other" }, "Other"));
    var msg = h("textarea", { id: "cfb-msg", rows: "4", placeholder: "What works, what is confusing, what is missing?" });
    var nm = h("input", { id: "cfb-name", type: "text", placeholder: "Name (optional)" });
    var em = h("input", { id: "cfb-email", type: "email", placeholder: "Email (optional)" });
    var status = h("div", {});
    var submit = h("button", { class: "cfb-submit" }, "Send feedback");

    submit.onclick = function () {
      var message = msg.value.trim();
      if (!message) {
        status.innerHTML = '<div class="cfb-alert cfb-alert-warn">Please add a message.</div>';
        return;
      }
      submit.disabled = true;
      var orig = submit.textContent;
      submit.innerHTML = '<span class="cfb-loading"></span>';
      getClient().then(function (sb) {
        return sb.from(TABLE).insert({
          site: SITE,
          page: pageName,
          url: location.href,
          category: cat.value,
          message: message,
          name: nm.value.trim() || null,
          email: em.value.trim() || null
        });
      }).then(function (res) {
        submit.disabled = false; submit.textContent = orig;
        if (res && res.error) {
          status.innerHTML = '<div class="cfb-alert cfb-alert-bad">Could not send: ' +
            String(res.error.message).replace(/[<>&]/g, "") + "</div>";
          return;
        }
        msg.value = ""; nm.value = ""; em.value = "";
        status.innerHTML = '<div class="cfb-alert cfb-alert-ok">Thank you. Your feedback was sent.</div>';
        setTimeout(close, 1600);
      }).catch(function (err) {
        submit.disabled = false; submit.textContent = orig;
        status.innerHTML = '<div class="cfb-alert cfb-alert-bad">Could not send: ' +
          String(err && err.message ? err.message : err).replace(/[<>&]/g, "") + "</div>";
      });
    };

    panel.append(
      h("div", { class: "cfb-row" },
        h("h3", {}, "Send feedback"),
        h("button", { class: "cfb-close", "aria-label": "Close", onclick: close }, "×")),
      h("p", { class: "cfb-page" }, "Linked to this page: " + pageName),
      h("div", { class: "cfb-field" }, h("label", { for: "cfb-cat" }, "Type"), cat),
      h("div", { class: "cfb-field" }, h("label", { for: "cfb-msg" }, "Your feedback"), msg),
      h("div", { class: "cfb-field" }, h("label", { for: "cfb-name" }, "Name"), nm),
      h("div", { class: "cfb-field" }, h("label", { for: "cfb-email" }, "Email"), em),
      status, submit
    );

    var tab = h("button", { class: "cfb-tab", "aria-label": "Send feedback",
      onclick: function () {
        overlay.classList.add("open"); panel.classList.add("open");
        getClient().catch(function () {}); /* warm up the client */
        setTimeout(function () { msg.focus(); }, 50);
      } }, "Feedback");
    overlay.onclick = close;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    document.body.append(tab, overlay, panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

/* ==========================================================================
   IMGCRYPT — interface behaviour

   Presentation only. Both forms still submit natively to /encode and /decode
   with the same field names ("image", "message"), so the server contract is
   untouched; everything below is affordance and feedback around them.
   ========================================================================== */
(function () {
  "use strict";

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var shell = $("#app");

  /* ---- 01. Mode switching (replaces the old tab component) -------------- */
  var modeButtons = $$(".mode");
  var views = $$(".view");

  var COPY = {
    encode: {
      crumb: "Workbench / Encode",
      title: ["Hide a message", "inside an image."],
      lede: "Your text is written into the least-significant bit of the blue channel. " +
            "The pixels shift by at most one value — invisible to the eye, intact in the file."
    },
    decode: {
      crumb: "Workbench / Decode",
      title: ["Recover a message", "from an image."],
      lede: "Upload a carrier image and the hidden bit plane is read back, byte by byte, " +
            "until the terminating character is reached."
    }
  };

  function setMode(name) {
    if (!COPY[name]) { return; }

    modeButtons.forEach(function (btn) {
      btn.setAttribute("aria-selected", String(btn.dataset.mode === name));
      btn.setAttribute("tabindex", btn.dataset.mode === name ? "0" : "-1");
    });

    views.forEach(function (view) {
      var on = view.dataset.view === name;
      view.classList.toggle("is-active", on);
      view.hidden = !on;
    });

    if (shell) { shell.dataset.mode = name; }

    var copy = COPY[name];
    var crumb = $("#crumbLabel");
    var title = $("#stageTitle");
    var lede  = $("#stageLede");
    if (crumb) { crumb.textContent = copy.crumb; }
    if (lede)  { lede.textContent = copy.lede; }
    if (title) {
      title.innerHTML = "";
      title.appendChild(document.createTextNode(copy.title[0] + " "));
      var em = document.createElement("em");
      em.textContent = copy.title[1];
      title.appendChild(em);
    }
  }

  modeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () { setMode(btn.dataset.mode); });

    // Roving focus across the mode list, as a tablist should behave.
    btn.addEventListener("keydown", function (event) {
      var step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
               : event.key === "ArrowLeft"  || event.key === "ArrowUp"   ? -1
               : 0;
      if (!step) { return; }
      event.preventDefault();
      var i = modeButtons.indexOf(btn);
      var next = modeButtons[(i + step + modeButtons.length) % modeButtons.length];
      next.focus();
      setMode(next.dataset.mode);
    });
  });

  /* ---- 02. Formatting helpers ------------------------------------------ */
  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) { return "—"; }
    if (bytes < 1024) { return bytes + " B"; }
    if (bytes < 1048576) { return (bytes / 1024).toFixed(1) + " KB"; }
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function formatCount(n) {
    return n.toLocaleString("en-US");
  }

  /* Capacity mirrors the encoder: one bit per pixel in the blue channel,
     eight bits per character, less one character for the terminator. */
  function capacityFor(width, height) {
    return Math.max(0, Math.floor((width * height) / 8) - 1);
  }

  /* ---- 03. Dropzones ---------------------------------------------------- */
  function initDropzone(root) {
    var input   = $(".drop__input", root);
    var chip    = $(".filechip", root.closest(".field") || root.parentNode);
    var scope   = root.closest(".view");
    if (!input || !scope) { return; }

    var chipName  = chip && $(".filechip__name", chip);
    var chipMeta  = chip && $(".filechip__meta", chip);
    var chipThumb = chip && $(".filechip__thumb", chip);

    var preview   = $(".preview", scope);
    var previewImg = preview && $(".preview__img", preview);
    var outName   = $("[data-out='name']", scope);
    var outDims   = $("[data-out='dims']", scope);
    var outSize   = $("[data-out='size']", scope);
    var outCap    = $("[data-out='capacity']", scope);

    var objectUrl = null;

    function releaseUrl() {
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    }

    function reset() {
      releaseUrl();
      root.classList.remove("is-over");
      if (chip) { chip.classList.remove("is-shown"); }
      if (preview) { preview.classList.remove("has-image"); }
      if (previewImg) { previewImg.removeAttribute("src"); }
      [outName, outDims, outSize, outCap].forEach(function (el) {
        if (el) { el.textContent = "—"; el.classList.add("is-muted"); }
      });
      scope.dispatchEvent(new CustomEvent("imgcrypt:capacity", { detail: { capacity: 0 } }));
    }

    function describe(file) {
      releaseUrl();
      objectUrl = URL.createObjectURL(file);

      if (chip) {
        chip.classList.add("is-shown");
        if (chipName) { chipName.textContent = file.name; }
        if (chipMeta) { chipMeta.textContent = formatBytes(file.size); }
        if (chipThumb) { chipThumb.src = objectUrl; }
      }

      if (outName) { outName.textContent = file.name; outName.classList.remove("is-muted"); }
      if (outSize) { outSize.textContent = formatBytes(file.size); outSize.classList.remove("is-muted"); }

      var probe = new Image();
      probe.onload = function () {
        var cap = capacityFor(probe.naturalWidth, probe.naturalHeight);

        if (outDims) {
          outDims.textContent = probe.naturalWidth + " × " + probe.naturalHeight + " px";
          outDims.classList.remove("is-muted");
        }
        if (outCap) {
          outCap.textContent = "≈ " + formatCount(cap) + " chars";
          outCap.classList.remove("is-muted");
        }
        if (preview && previewImg) {
          previewImg.src = objectUrl;
          preview.classList.add("has-image");
        }
        if (chipMeta) {
          chipMeta.textContent = probe.naturalWidth + "×" + probe.naturalHeight +
                                 "  ·  " + formatBytes(file.size);
        }
        scope.dispatchEvent(new CustomEvent("imgcrypt:capacity", { detail: { capacity: cap } }));
      };
      probe.onerror = function () {
        if (outDims) { outDims.textContent = "unreadable"; }
      };
      probe.src = objectUrl;
    }

    input.addEventListener("change", function () {
      if (input.files && input.files[0]) { describe(input.files[0]); }
      else { reset(); }
    });

    ["dragenter", "dragover"].forEach(function (type) {
      root.addEventListener(type, function () { root.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (type) {
      root.addEventListener(type, function () { root.classList.remove("is-over"); });
    });

    root.addEventListener("imgcrypt:reset", reset);
  }

  $$(".drop").forEach(initDropzone);

  /* ---- 04. Message length vs. capacity --------------------------------- */
  (function initCounter() {
    var view = $("[data-view='encode']");
    if (!view) { return; }

    var textarea = $(".textarea", view);
    var hint     = $("#messageHint", view);
    var meter    = $("#capacityMeter", view);
    var fill     = meter && $(".meter__fill", meter);
    var pct      = meter && $(".meter__pct", meter);
    var capacity = 0;

    function render() {
      if (!textarea) { return; }
      var used = textarea.value.length;

      if (hint) {
        hint.textContent = capacity
          ? formatCount(used) + " / " + formatCount(capacity) + " chars"
          : formatCount(used) + " chars";
        hint.classList.toggle("is-warn", capacity > 0 && used > capacity);
      }

      if (meter && fill && pct) {
        var ratio = capacity > 0 ? used / capacity : 0;
        var shown = Math.min(100, ratio * 100);

        // Keep a sliver visible for a non-empty payload, and say "<1%" rather
        // than "0%" so a short message in a large carrier still reads as used.
        fill.style.width = (used > 0 ? Math.max(1.5, shown) : 0).toFixed(2) + "%";
        pct.textContent = capacity === 0 ? "—"
          : used > 0 && ratio < 0.005 ? "<1%"
          : Math.min(999, Math.round(ratio * 100)) + "%";

        meter.classList.toggle("is-over", capacity > 0 && used > capacity);
      }
    }

    if (textarea) { textarea.addEventListener("input", render); }
    view.addEventListener("imgcrypt:capacity", function (event) {
      capacity = event.detail.capacity || 0;
      render();
    });
    render();
  }());

  /* ---- 05. Submit feedback --------------------------------------------- */
  /* /encode answers with a file attachment, so the page never navigates and
     nothing else would tell the user the request landed. */
  $$("form[data-feedback]").forEach(function (form) {
    var button = $(".btn--primary", form);
    var status = $(".status", form);
    var timer;

    form.addEventListener("submit", function () {
      if (!form.checkValidity()) { return; }
      if (button) { button.classList.add("is-busy"); }
      window.clearTimeout(timer);

      if (form.dataset.feedback === "download") {
        timer = window.setTimeout(function () {
          if (button) { button.classList.remove("is-busy"); }
          if (status) { status.classList.add("is-shown"); }
        }, 2200);
      }
    });
  });

  /* ---- 06. Copy the decoded message ------------------------------------- */
  (function initCopy() {
    var button = $("#copyMessage");
    var source = $("#decodedText");
    if (!button || !source) { return; }

    var label = $(".btn__label", button) || button;
    var original = label.textContent;
    var timer;

    button.addEventListener("click", function () {
      var text = source.textContent || "";
      var done = function () {
        label.textContent = "Copied";
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { label.textContent = original; }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { label.textContent = "Press ⌘C"; });
      } else {
        var helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        try { document.execCommand("copy"); done(); } catch (err) { /* no-op */ }
        document.body.removeChild(helper);
      }
    });
  }());

  /* ---- 07. Clear a panel ------------------------------------------------ */
  /* Same name and same contract as before: wipe the inputs in one panel,
     drop any rendered result, and stay on that panel. */
  window.refreshTab = function (tab) {
    var view = $("[data-view='" + tab + "']");
    if (!view) { return; }

    $$("input, textarea", view).forEach(function (field) { field.value = ""; });
    $$(".drop", view).forEach(function (drop) {
      drop.dispatchEvent(new CustomEvent("imgcrypt:reset"));
    });
    $$(".status", view).forEach(function (el) { el.classList.remove("is-shown"); });
    $$(".btn", view).forEach(function (el) { el.classList.remove("is-busy"); });

    var encoded = document.getElementById("encoded-result");
    var decoded = document.getElementById("decoded-result");
    if (tab === "encode" && encoded) { encoded.remove(); }
    if (tab === "decode" && decoded) { decoded.remove(); }

    var textarea = $(".textarea", view);
    if (textarea) { textarea.dispatchEvent(new Event("input")); }

    setMode(tab);
  };

  /* ---- 08. Boot --------------------------------------------------------- */
  setMode(shell && shell.dataset.initialMode ? shell.dataset.initialMode : "encode");
}());

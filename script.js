document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Scroll reveal ----------
(function () {
  document.querySelectorAll(".section, .essay-block").forEach((el) => el.classList.add("reveal"));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: "0px 0px -5% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
    else obs.observe(el);
  });
})();

// ---------- Supporter counter (live) ----------
//
// Reads the real response count from a "Summary" tab in the Google Form's
// response Sheet, published to the web as CSV (Sheet: File > Share > Publish
// to web, that one tab only, CSV format). The Summary tab holds a single
// COUNTA formula over the response Sheet's Timestamp column -- so this fetch
// only ever exposes a number, never any supporter's actual name or email.
(function () {
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfymIn9wHBesBMPO04pfksN9kLYEP1pHAKz27QeUJBDje2PoHO7dEzMPAdXwFn1xWaiaAJvb7YzbyB/pub?gid=92994928&single=true&output=csv";
  const GOAL = 1000;
  const countEl = document.getElementById("supporterCount");
  const progressEl = document.getElementById("supporterProgress");

  function renderCount(count) {
    countEl.textContent = count.toLocaleString();
    if (progressEl) progressEl.style.width = Math.min(100, (count / GOAL) * 100) + "%";
  }

  fetch(CSV_URL, { cache: "no-store" })
    .then((r) => r.text())
    .then((text) => {
      const count = parseInt(text.trim(), 10);
      if (!isNaN(count)) renderCount(count);
    })
    .catch(() => {
      // Leave the static fallback already in the HTML if the fetch fails.
    });
})();

// ---------- Signup form -> Google Form ----------
//
// Submits straight to the real "SLC to PC List" Google Form in the
// background (a hidden iframe, so the page never navigates away). Verified
// via a direct curl POST that Google's formResponse endpoint accepts a bare
// POST of just these entry fields -- no session/anti-spam token required.
const GOOGLE_FORM = {
  action: "https://docs.google.com/forms/u/0/d/e/1FAIpQLSfTSzP971JOZPR5LCZbJkpL0RlaSB7s6sRencxcaBNqlkJuow/formResponse",
  fields: {
    first_name: "entry.1391496669",
    email: "entry.408979955",
    zip: "entry.1809166097",
    notes: "entry.1059909987"
  }
};

(function () {
  const form = document.getElementById("signupForm");
  if (!form) return;
  const fields = document.getElementById("signupFormFields");
  const success = document.getElementById("signupSuccess");
  const ALREADY_SIGNED_KEY = "slctopc_already_signed_up";

  // If this browser has already submitted, skip straight to the success
  // state instead of showing a blank form again. This only catches repeat
  // visits from the SAME browser/device -- it can't stop someone signing up
  // again from a different device. Real deduplication happens by running
  // Google Sheets' Data > Data cleanup > Remove duplicates on the Email
  // column whenever an accurate count is needed.
  if (localStorage.getItem(ALREADY_SIGNED_KEY)) {
    fields.style.display = "none";
    success.classList.add("is-visible");
  }

  function submitToGoogleForm(data) {
    let iframe = document.getElementById("gf-submit-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "gf-submit-frame";
      iframe.name = "gf-submit-frame";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }
    const gForm = document.createElement("form");
    gForm.action = GOOGLE_FORM.action;
    gForm.method = "POST";
    gForm.target = "gf-submit-frame";
    gForm.style.display = "none";

    Object.keys(data).forEach((key) => {
      const entryName = GOOGLE_FORM.fields[key];
      if (!entryName) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = entryName;
      input.value = data[key];
      gForm.appendChild(input);
    });

    document.body.appendChild(gForm);
    gForm.submit();
    // Leave gForm in the DOM briefly rather than removing it immediately --
    // removal right after submit() has been flaky for some form-target
    // submissions in the past.
    setTimeout(() => gForm.remove(), 2000);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    submitToGoogleForm({
      first_name: document.getElementById("su-first").value,
      email: document.getElementById("su-email").value,
      zip: document.getElementById("su-zip").value,
      notes: document.getElementById("su-notes").value
    });
    // Cross-origin submit via hidden iframe means we can't read back a real
    // success/failure response -- this is an optimistic confirmation. The
    // counter itself is separately fetched live from the Sheet, so it'll
    // catch up on its own rather than being incremented here.
    localStorage.setItem(ALREADY_SIGNED_KEY, "1");

    fields.style.display = "none";
    success.classList.add("is-visible");
  });
})();

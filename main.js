/* ════════════════════════════════════════════
   CAMPUS CONNECT — main.js
   Handles: nav scroll, reveal, chips, form, members feed
════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────
// ⚠️ After deploying your backend on Render,
//    replace the URL below with your Render URL
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://portfolio-backend-2t1z.onrender.com/"; // ← UPDATE THIS after Step 6

// ── DOM ELEMENTS ────────────────────────────
const navbar =
  document.getElementById("navbar") || document.querySelector(".nav");
const hamburger = document.getElementById("hamburger");
const navLinks = document.querySelector(".nav__links");
const joinForm = document.getElementById("joinForm");
const formStatus = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
const membersGrid = document.getElementById("membersGrid");
const memberBadge = document.getElementById("memberBadge");
const memberCount = document.getElementById("memberCount");

// ══════════════════════════════════════════
//  NAV — scroll effect + hamburger
// ══════════════════════════════════════════
const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 40);
});

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  navLinks.classList.toggle("open");
});
navLinks.querySelectorAll(".nav__link").forEach((l) =>
  l.addEventListener("click", () => {
    hamburger.classList.remove("open");
    navLinks.classList.remove("open");
  }),
);

// ══════════════════════════════════════════
//  SCROLL REVEAL (Intersection Observer)
// ══════════════════════════════════════════
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Stagger siblings in same container
        const siblings = [
          ...entry.target.parentElement.querySelectorAll(
            ".reveal:not(.visible)",
          ),
        ];
        siblings.forEach((el, i) => {
          el.style.transitionDelay = `${i * 0.07}s`;
        });
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -30px 0px" },
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ══════════════════════════════════════════
//  INTEREST CHIPS — multi-select toggle
// ══════════════════════════════════════════
const chips = document.querySelectorAll(".chip");
const interestsInput = document.getElementById("interests");
const selected = new Set();

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const val = chip.dataset.value;
    if (selected.has(val)) {
      selected.delete(val);
      chip.classList.remove("selected");
    } else {
      selected.add(val);
      chip.classList.add("selected");
    }
    interestsInput.value = [...selected].join(", ");
  });
});

// ══════════════════════════════════════════
//  FORM VALIDATION
// ══════════════════════════════════════════
function validateForm(data) {
  const errors = {};
  if (!data.fullName.trim() || data.fullName.trim().length < 2)
    errors.fullName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
    errors.email = "Please enter a valid email address.";
  if (!data.college.trim() || data.college.trim().length < 2)
    errors.college = "Please enter your college name.";
  if (!data.year) errors.year = "Please select your year of study.";
  if (!data.branch.trim() || data.branch.trim().length < 2)
    errors.branch = "Please enter your branch/major.";
  return errors;
}

function showErrors(errors) {
  ["fullName", "email", "college", "year", "branch"].forEach((field) => {
    const input = document.getElementById(field);
    const errEl = document.getElementById(field + "Err");
    if (errors[field]) {
      input?.classList.add("has-error");
      if (errEl) errEl.textContent = errors[field];
    } else {
      input?.classList.remove("has-error");
      if (errEl) errEl.textContent = "";
    }
  });
}

function clearErrors() {
  ["fullName", "email", "college", "year", "branch"].forEach((field) => {
    document.getElementById(field)?.classList.remove("has-error");
    const e = document.getElementById(field + "Err");
    if (e) e.textContent = "";
  });
}

function setStatus(type, msg) {
  formStatus.className = `form-status ${type}`;
  formStatus.textContent = msg;
  if (type === "success") {
    setTimeout(() => {
      formStatus.className = "form-status";
      formStatus.textContent = "";
    }, 7000);
  }
}

// ══════════════════════════════════════════
//  FORM SUBMIT → POST /api/members
// ══════════════════════════════════════════
joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  formStatus.className = "form-status";
  formStatus.textContent = "";

  const data = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    college: document.getElementById("college").value,
    year: document.getElementById("year").value,
    branch: document.getElementById("branch").value,
    phone: document.getElementById("phone").value,
    interests: interestsInput.value,
    why: document.getElementById("why").value,
  };

  const errors = validateForm(data);
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  // Loading state
  submitBtn.querySelector(".btn-text").hidden = true;
  submitBtn.querySelector(".btn-loader").hidden = false;
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok) {
      setStatus(
        "success",
        `🎉 Welcome to Campus Connect, ${data.fullName.split(" ")[0]}! You're now part of the community.`,
      );
      joinForm.reset();
      selected.clear();
      chips.forEach((c) => c.classList.remove("selected"));
      interestsInput.value = "";
      await fetchMembers(); // refresh members list
    } else {
      setStatus(
        "error",
        result.message || "Something went wrong. Please try again.",
      );
      if (result.errors) showErrors(result.errors);
    }
  } catch (err) {
    console.error(err);
    setStatus(
      "error",
      "⚠️ Cannot reach the server. Is your backend running? Check the API_BASE URL in main.js.",
    );
  } finally {
    submitBtn.querySelector(".btn-text").hidden = false;
    submitBtn.querySelector(".btn-loader").hidden = true;
    submitBtn.disabled = false;
  }
});

// ══════════════════════════════════════════
//  FETCH MEMBERS → GET /api/members
// ══════════════════════════════════════════
async function fetchMembers() {
  try {
    const res = await fetch(`${API_BASE}/members`);
    if (!res.ok) return;
    const { members, count } = await res.json();

    // Show member count badge
    if (count > 0) {
      memberCount.textContent = count;
      memberBadge.style.display = "inline-flex";
    }

    const emptyEl = document.getElementById("membersEmpty");
    if (!members || members.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    // Render cards
    const existingCards = membersGrid.querySelectorAll(".member-card");
    existingCards.forEach((c) => c.remove());

    members.forEach((m, i) => {
      const card = document.createElement("div");
      card.className = "member-card";
      card.style.animationDelay = `${i * 0.06}s`;

      const initials = m.fullName
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("");

      const interestTags = m.interests
        ? m.interests
            .split(",")
            .slice(0, 3)
            .map(
              (i) =>
                `<span class="member-meta-tag">${escHtml(i.trim())}</span>`,
            )
            .join("")
        : "";

      card.innerHTML = `
        <div class="member-card__top">
          <div class="member-avatar">${escHtml(initials)}</div>
          <div>
            <div class="member-card__name">${escHtml(m.fullName)}</div>
            <div class="member-card__college">${escHtml(m.college)}</div>
          </div>
        </div>
        <div class="member-card__meta">
          <span class="member-meta-tag">${escHtml(m.year)}</span>
          <span class="member-meta-tag">${escHtml(m.branch.split(" ").slice(0, 3).join(" "))}</span>
          ${interestTags}
        </div>
        <div class="member-card__joined">Joined ${formatDate(m.createdAt)}</div>
      `;
      membersGrid.appendChild(card);
    });
  } catch (err) {
    // silently fail if backend not running yet
  }
}

// ── Utilities ────────────────────────────────
function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function formatDate(d) {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return "";
  }
}

// ── Footer year & initial fetch ───────────────
document.getElementById("footerYear").textContent =
  `© ${new Date().getFullYear()} Campus Connect`;

fetchMembers();

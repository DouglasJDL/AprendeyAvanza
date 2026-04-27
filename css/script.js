(function () {
    "use strict";

    var doc = document;
    var body = doc.body;

    // -----------------------------------------------------------
    // Theme toggle
    // -----------------------------------------------------------
    var themeToggle = doc.getElementById("themeToggle");
    var STORAGE_KEY = "stepshot-modern-theme";

    function applyTheme(theme) {
        body.setAttribute("data-theme", theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (stored) applyTheme(stored);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) applyTheme("dark");

    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            var current = body.getAttribute("data-theme") || "light";
            applyTheme(current === "dark" ? "light" : "dark");
        });
    }

    // -----------------------------------------------------------
    // Mobile sidebar
    // -----------------------------------------------------------
    var sidebar = doc.getElementById("sidebar");
    var menuToggle = doc.getElementById("menuToggle");
    var overlay = doc.getElementById("overlay");

    function setSidebar(open) {
        if (!sidebar || !menuToggle || !overlay) return;
        sidebar.classList.toggle("is-open", open);
        overlay.classList.toggle("is-visible", open);
        menuToggle.classList.toggle("is-open", open);
        menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
        body.style.overflow = open ? "hidden" : "";
    }
    if (menuToggle) menuToggle.addEventListener("click", function () {
        setSidebar(!sidebar.classList.contains("is-open"));
    });
    if (overlay) overlay.addEventListener("click", function () { setSidebar(false); });

    // -----------------------------------------------------------
    // Accordion: single-open, ALL closed at start, NO auto-scroll
    // -----------------------------------------------------------
    var content = doc.getElementById("content");
    var accordions = content ? Array.prototype.slice.call(content.querySelectorAll(".accordion")) : [];
    var SINGLE_OPEN = true;
    var tocSectionByAccordionId = {}; // accordion.id -> sidebar section li
    var tocLinksByTargetId = {};      // any anchor id -> sidebar link

    function isOpen(acc) { return acc.classList.contains("is-open"); }

    function setAccordionOpen(acc, open, instant) {
        if (!acc) return;
        var tocSection = tocSectionByAccordionId[acc.id];
        if (instant) {
            acc.classList.add("is-no-anim");
            if (tocSection) tocSection.classList.add("is-no-anim");
        }
        acc.classList.toggle("is-open", !!open);
        var trigger = acc.querySelector(".accordion-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (tocSection) {
            tocSection.classList.toggle("is-expanded", !!open);
            var header = tocSection.querySelector(".toc-section-header");
            if (header) {
                header.classList.toggle("is-expanded", !!open);
                header.setAttribute("aria-expanded", open ? "true" : "false");
            }
        }
        if (instant) {
            // Force reflow, then re-enable transitions next frame
            void acc.offsetHeight;
            requestAnimationFrame(function () {
                acc.classList.remove("is-no-anim");
                if (tocSection) tocSection.classList.remove("is-no-anim");
            });
        }
    }

    // Open `acc`. Close any other open section AND open the new one instantly
    // (no animation), so the layout settles immediately and the single smooth
    // scroll that follows lands exactly at the section start.
    function openOnly(acc) {
        if (SINGLE_OPEN) {
            for (var i = 0; i < accordions.length; i++) {
                if (accordions[i] !== acc && isOpen(accordions[i])) {
                    setAccordionOpen(accordions[i], false, true);
                }
            }
        }
        setAccordionOpen(acc, true, true);
    }

    // Smooth-scroll so the accordion's top is at the top of the viewport.
    // openOnly() already snapped the layout, so native scrollIntoView lands
    // exactly at the right place (browser handles scroll-margin-top and the
    // max-scroll cap for the last section).
    function scrollAccordionIntoView(acc) {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                acc.scrollIntoView({ block: "start", behavior: "smooth" });
            });
        });
    }

    accordions.forEach(function (acc) {
        var trigger = acc.querySelector(".accordion-trigger");
        if (!trigger) return;
        trigger.addEventListener("click", function () {
            if (isOpen(acc)) {
                setAccordionOpen(acc, false);
                return;
            }
            openOnly(acc);
            scrollAccordionIntoView(acc);
        });
    });

    // Expand all / Collapse all
    var expandAllBtn = doc.getElementById("expandAll");
    var collapseAllBtn = doc.getElementById("collapseAll");
    if (expandAllBtn) {
        expandAllBtn.addEventListener("click", function () {
            SINGLE_OPEN = false;
            accordions.forEach(function (a) { setAccordionOpen(a, true); });
        });
    }
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener("click", function () {
            SINGLE_OPEN = true;
            accordions.forEach(function (a) { setAccordionOpen(a, false); });
        });
    }

    // -----------------------------------------------------------
    // Build NESTED TOC: each section has a clickable header that
    // expands its step list inline in the sidebar
    // -----------------------------------------------------------
    var tocList = doc.getElementById("tocList");
    var tocEntries = []; // { link, target, type, parentAccordion }

    if (tocList && accordions.length > 0) {
        accordions.forEach(function (acc, gIdx) {
            var titleEl = acc.querySelector(".accordion-trigger-title");
            var sectionTitle = titleEl ? (titleEl.textContent || "").trim() : ("Sección " + (gIdx + 1));

            // Section <li> with header + sublist
            var sectionLi = doc.createElement("li");
            sectionLi.className = "toc-item toc-section";
            sectionLi.dataset.target = acc.id;

            // Section header (button-like)
            var header = doc.createElement("button");
            header.type = "button";
            header.className = "toc-section-header";
            header.setAttribute("aria-expanded", "false");

            var num = doc.createElement("span");
            num.className = "toc-section-num";
            num.textContent = String(gIdx + 1);
            header.appendChild(num);

            var label = doc.createElement("span");
            label.className = "toc-section-label";
            label.textContent = sectionTitle;
            header.appendChild(label);

            var chev = doc.createElement("span");
            chev.className = "toc-section-chevron";
            chev.setAttribute("aria-hidden", "true");
            chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            header.appendChild(chev);

            sectionLi.appendChild(header);
            tocSectionByAccordionId[acc.id] = sectionLi;

            // Sublist of steps under this section
            var sublist = doc.createElement("div");
            sublist.className = "toc-sublist";
            var sublistInner = doc.createElement("ol");
            sublistInner.className = "toc-sublist-inner";

            var stepCards = acc.querySelectorAll(".step-card");
            stepCards.forEach(function (sc) {
                var li = doc.createElement("li");
                li.className = "toc-item";
                var link = doc.createElement("a");
                link.className = "toc-link";
                link.href = "#" + sc.id;
                link.dataset.target = sc.id;
                link.dataset.parent = acc.id;

                var bullet = doc.createElement("span");
                bullet.className = "toc-link-bullet";
                link.appendChild(bullet);

                var stepTitleEl = sc.querySelector(".step-title");
                var stepIndex = sc.getAttribute("data-step-index") || "";
                var span = doc.createElement("span");
                span.className = "toc-link-text";
                span.textContent = (stepTitleEl && stepTitleEl.textContent.trim()) || ("Paso " + stepIndex);
                link.appendChild(span);

                li.appendChild(link);
                sublistInner.appendChild(li);

                tocLinksByTargetId[sc.id] = link;
                tocEntries.push({ link: link, target: sc, type: "step", parentAccordion: acc, parentLi: sectionLi });
            });

            sublist.appendChild(sublistInner);
            sectionLi.appendChild(sublist);
            tocList.appendChild(sectionLi);

            tocLinksByTargetId[acc.id] = header;
            tocEntries.push({ link: header, target: acc, type: "section", parentAccordion: acc, parentLi: sectionLi });

            // Click section header in TOC → toggle accordion + scroll to it
            header.addEventListener("click", function () {
                var willOpen = !isOpen(acc);
                if (willOpen) {
                    openOnly(acc);
                    scrollAccordionIntoView(acc);
                    if (window.innerWidth <= 768) {
                        setTimeout(function () { setSidebar(false); }, 200);
                    }
                } else {
                    setAccordionOpen(acc, false);
                }
            });
        });

        // Click on a step link in TOC: open parent accordion + scroll to step.
        // Same two-pass scroll trick handles the layout shift from closing
        // the previously-open section.
        tocList.addEventListener("click", function (e) {
            var link = e.target.closest && e.target.closest(".toc-link");
            if (!link) return;
            e.preventDefault();
            var targetId = link.dataset.target;
            var parentId = link.dataset.parent;
            var targetEl = doc.getElementById(targetId);
            var parentEl = parentId ? doc.getElementById(parentId) : null;
            if (parentEl && parentEl.classList.contains("accordion")) {
                openOnly(parentEl);
            }
            if (targetEl) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        targetEl.scrollIntoView({ block: "start", behavior: "smooth" });
                    });
                });
                if (window.innerWidth <= 768) {
                    setTimeout(function () { setSidebar(false); }, 200);
                }
            }
        });
    } else if (tocList) {
        var empty = doc.createElement("div");
        empty.className = "toc-empty";
        empty.style.display = "block";
        empty.textContent = "Sin contenido aún.";
        tocList.parentNode.appendChild(empty);
    }

    // -----------------------------------------------------------
    // Active state on scroll (highlights the section/step in viewport)
    // -----------------------------------------------------------
    if ("IntersectionObserver" in window && tocEntries.length > 0) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.id;
                tocEntries.forEach(function (a) {
                    if (a.type === "step") a.link.classList.toggle("is-active", a.target.id === id);
                });
            });
        }, {
            rootMargin: "-25% 0px -65% 0px",
            threshold: 0
        });
        tocEntries.forEach(function (a) {
            if (a.type === "step") observer.observe(a.target);
        });
    }

    // -----------------------------------------------------------
    // Reading progress bar
    // -----------------------------------------------------------
    var progressEl = doc.getElementById("readingProgress");
    function updateProgress() {
        if (!progressEl) return;
        var scrollTop = window.scrollY || doc.documentElement.scrollTop;
        var height = doc.documentElement.scrollHeight - window.innerHeight;
        var pct = height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0;
        progressEl.style.width = pct + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    // -----------------------------------------------------------
    // Stats
    // -----------------------------------------------------------
    if (content) {
        var stepCount = content.querySelectorAll(".step-card").length;
        var sectionCount = content.querySelectorAll(".accordion").length;
        var totalText = (content.textContent || "").trim();
        var wordCount = totalText.split(/\s+/).filter(Boolean).length;
        var readingTime = Math.max(1, Math.round(wordCount / 200));
        var setText = function (id, val) { var el = doc.getElementById(id); if (el) el.textContent = val; };
        setText("statSteps", stepCount);
        setText("statSections", sectionCount);
        setText("statTime", readingTime);
        setText("totalSteps", stepCount);
    }

    // -----------------------------------------------------------
    // Author avatar initial
    // -----------------------------------------------------------
    var avatar = doc.getElementById("authorAvatar");
    if (avatar) {
        var nameEl = doc.querySelector(".hero-author .author-name");
        if (nameEl) {
            var initial = nameEl.textContent.trim().charAt(0).toUpperCase();
            avatar.textContent = initial || "?";
        }
    }

    // -----------------------------------------------------------
    // Search filter — fuzzy: tolerant to typos and accents
    // -----------------------------------------------------------

    // Strip diacritics + lowercase. "Configuración" -> "configuracion"
    var DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");
    function normalize(s) {
        s = (s || "").toString().toLowerCase();
        if (typeof s.normalize === "function") s = s.normalize("NFD");
        return s.replace(DIACRITICS_RE, "");
    }

    // Levenshtein distance between two strings (number of edits to transform one into the other)
    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        var prev = new Array(b.length + 1);
        var curr = new Array(b.length + 1);
        for (var k = 0; k <= b.length; k++) prev[k] = k;
        for (var i = 0; i < a.length; i++) {
            curr[0] = i + 1;
            for (var j = 0; j < b.length; j++) {
                var cost = a.charAt(i) === b.charAt(j) ? 0 : 1;
                curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
            }
            for (var k2 = 0; k2 <= b.length; k2++) prev[k2] = curr[k2];
        }
        return prev[b.length];
    }

    // Match `query` against `text` with typo tolerance. Returns true if:
    //   - query is empty, OR
    //   - normalized query is a substring of normalized text, OR
    //   - every word in query matches some word in text (substring or
    //     within a small Levenshtein distance — bigger tolerance for longer words).
    function fuzzyMatch(text, query) {
        var q = normalize(query).trim();
        if (!q) return true;
        var t = normalize(text);
        if (t.indexOf(q) !== -1) return true;
        var qTokens = q.split(/\s+/).filter(Boolean);
        if (qTokens.length === 0) return true;
        var tTokens = t.split(/[^a-z0-9]+/).filter(Boolean);
        return qTokens.every(function (qt) {
            return tTokens.some(function (tt) {
                if (tt.indexOf(qt) !== -1) return true;
                if (qt.indexOf(tt) !== -1 && tt.length >= 4) return true; // haystack word is contained in query
                if (qt.length < 3) return false; // too short to safely fuzz
                var L = Math.max(qt.length, tt.length);
                var maxDist = L <= 4 ? 1
                            : L <= 7 ? 2
                            : L <= 10 ? 3
                            : 4;
                return levenshtein(qt, tt) <= maxDist;
            });
        });
    }

    var search = doc.getElementById("searchInput");
    if (search && content) {
        var debounce;
        search.addEventListener("input", function () {
            clearTimeout(debounce);
            debounce = setTimeout(function () {
                var q = search.value.trim();

                if (!q) {
                    // Restore default state: all sections visible, all closed
                    accordions.forEach(function (a) {
                        a.classList.remove("is-hidden");
                        a.querySelectorAll(".step-card").forEach(function (s) { s.classList.remove("is-hidden"); });
                        setAccordionOpen(a, false);
                    });
                    Object.keys(tocSectionByAccordionId).forEach(function (id) {
                        tocSectionByAccordionId[id].classList.remove("is-hidden");
                        tocSectionByAccordionId[id].querySelectorAll(".toc-item").forEach(function (li) {
                            li.classList.remove("is-hidden");
                        });
                    });
                    SINGLE_OPEN = true;
                    return;
                }

                accordions.forEach(function (acc) {
                    var titleEl = acc.querySelector(".accordion-trigger-title");
                    var titleText = titleEl ? titleEl.textContent : "";
                    var titleMatches = fuzzyMatch(titleText, q);
                    var stepCards = acc.querySelectorAll(".step-card");
                    var anyStepMatch = false;
                    var matchedSteps = [];
                    stepCards.forEach(function (sc) {
                        var match = fuzzyMatch(sc.textContent, q);
                        // If section title matches, show ALL its steps so user sees full context
                        var visible = titleMatches || match;
                        sc.classList.toggle("is-hidden", !visible);
                        if (match) { anyStepMatch = true; matchedSteps.push(sc); }
                    });
                    var sectionVisible = titleMatches || anyStepMatch;
                    acc.classList.toggle("is-hidden", !sectionVisible);
                    if (sectionVisible) setAccordionOpen(acc, true);
                    var sectionLi = tocSectionByAccordionId[acc.id];
                    if (sectionLi) sectionLi.classList.toggle("is-hidden", !sectionVisible);
                });

                // Hide TOC step links that don't match (and whose parent isn't a title match)
                tocEntries.forEach(function (e) {
                    if (e.type !== "step") return;
                    var hide = e.target.classList.contains("is-hidden") || e.parentAccordion.classList.contains("is-hidden");
                    var li = e.link.parentElement;
                    if (li) li.classList.toggle("is-hidden", hide);
                });
            }, 140);
        });
    }

    // -----------------------------------------------------------
    // Image lightbox
    // -----------------------------------------------------------
    var lightbox = doc.getElementById("lightbox");
    var lightboxImg = doc.getElementById("lightboxImg");
    var lightboxClose = doc.getElementById("lightboxClose");

    function openLightbox(src, alt) {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = src;
        lightboxImg.alt = alt || "";
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        body.style.overflow = "hidden";
    }
    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        body.style.overflow = "";
    }
    doc.addEventListener("click", function (e) {
        var btn = e.target.closest && e.target.closest(".step-figure-button");
        if (btn) {
            e.preventDefault();
            openLightbox(btn.getAttribute("data-img"), btn.getAttribute("data-alt"));
            return;
        }
        if (e.target === lightbox) closeLightbox();
    });
    if (lightboxClose) lightboxClose.addEventListener("click", function (e) {
        e.stopPropagation();
        closeLightbox();
    });
    doc.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            if (lightbox && lightbox.classList.contains("is-open")) closeLightbox();
            else if (sidebar && sidebar.classList.contains("is-open")) setSidebar(false);
        }
    });

    // -----------------------------------------------------------
    // Back to top
    // -----------------------------------------------------------
    var backTop = doc.getElementById("backToTop");
    if (backTop) {
        backTop.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // -----------------------------------------------------------
    // Init: NO accordion open by default. If hash present, open that one.
    // -----------------------------------------------------------
    if (location.hash) {
        var hashEl = doc.getElementById(location.hash.replace(/^#/, ""));
        if (hashEl) {
            var parentAcc = hashEl.closest && hashEl.closest(".accordion");
            if (parentAcc) openOnly(parentAcc);
            setTimeout(function () {
                hashEl.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    }

    updateProgress();
})();

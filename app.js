/* Vibe Coach — engine: state, rendering, the highlighter and the code runner.
   Depends on CHALLENGES / LESSONS / TOK_INFO from content.js. */
'use strict';

/* =====================================================================
   STATE — persisted to localStorage. No streaks, no decay, no guilt.
   ===================================================================== */
var STORAGE_KEY = 'vibeCoachProgress';
var LEGACY_STORAGE_KEY = 'slopPatrolProgress';  // app's former name; adopted once on load

/* True only when there is no saved progress at all — a genuine first visit.
   Set inside loadState(); drives whether the welcome screen shows on boot.
   Declared before the loadState() call below so its assignment is not clobbered. */
var firstVisit = false;

var state = loadState();

function defaultState() {
  return {
    version: 1,
    started: false,
    current: 0,            // array index, derived at load time from currentId
    currentId: null,       // the durable pointer: challenge ids never shift
    done: {},              // id -> true, for answered mc/line challenges
    examGrades: {},        // id -> 'got' | 'missed' (self-graded written stage)
    fixes: {},             // id -> true once the user's own code actually passes
    assisted: {},          // id -> true if the solution was revealed rather than solved
    attempted: {},         // id -> true once the lesson card has been dismissed
    view: 'practice',      // which tab is open: 'learn' | 'practice'
    lessonsDone: {},       // lesson id -> true, self-assessed
    lastSeen: null
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    // Progress saved under the old app name carries over on first load, so the
    // rename doesn't look like a wipe. Copy the value to the new key *before*
    // dropping the old one, so an interruption mid-migration can't lose data —
    // and so the new key exists even if the user never triggers another save.
    if (!raw) {
      var legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        try {
          localStorage.setItem(STORAGE_KEY, legacy);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (e) { /* private mode: still works for this session */ }
      }
    }
    if (!raw) { firstVisit = true; return defaultState(); }
    var parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) { firstVisit = true; return defaultState(); }
    // Saved before a later feature existed: keep the progress, add the field.
    if (!parsed.attempted) parsed.attempted = {};
    if (!parsed.lessonsDone) parsed.lessonsDone = {};
    if (!parsed.fixes) parsed.fixes = {};
    if (!parsed.assisted) parsed.assisted = {};
    if (!parsed.view) parsed.view = 'practice';

    // Saves written before ids were stored used a bare array index. Back then the
    // array was ids 1..15 in order, so index i meant id i+1 — remap once, then
    // resolve whatever id we have back to its current position.
    var wantId = parsed.currentId;
    if (wantId === undefined || wantId === null) wantId = (parsed.current || 0) + 1;
    for (var i = 0; i < CHALLENGES.length; i++) {
      if (CHALLENGES[i].id === wantId) { parsed.current = i; break; }
    }
    parsed.currentId = wantId;
    return parsed;
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  state.lastSeen = Date.now();
  // Record where the user is by challenge id. Storing only the array index
  // breaks the moment a challenge is inserted anywhere before it.
  state.currentId = CHALLENGES[state.current] ? CHALLENGES[state.current].id : null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* private mode etc. — app still works for this session */ }
}

/* Has the user already been through this challenge once? Progress saved before
   lesson cards existed has no `attempted` marks, so treat any answer as one. */
function hasAttempted(ch) {
  return !!(state.attempted[ch.id] || state.done[ch.id] || state.examGrades[ch.id]);
}

function isChallengeDone(ch) {
  if (ch.type === 'predict') return !!state.done[ch.id];
  if (ch.type === 'exam') {
    // Two stages: the written root cause, then code that actually runs.
    var explained = state.examGrades[ch.id] === 'got';
    return ch.fix ? (explained && !!state.fixes[ch.id]) : explained;
  }
  return !!state.done[ch.id];
}

function completedCount() {
  var n = 0;
  for (var i = 0; i < CHALLENGES.length; i++) {
    if (isChallengeDone(CHALLENGES[i])) n++;
  }
  return n;
}

function phaseDone(type) {
  for (var i = 0; i < CHALLENGES.length; i++) {
    if (CHALLENGES[i].type === type && !isChallengeDone(CHALLENGES[i])) return false;
  }
  return true;
}

/* Every exam has its written stage graded 'got' (the fix stage may still be open). */
function examsExplained() {
  for (var i = 0; i < CHALLENGES.length; i++) {
    var ch = CHALLENGES[i];
    if (ch.type === 'exam' && state.examGrades[ch.id] !== 'got') return false;
  }
  return true;
}

function moduleComplete() {
  return phaseDone('mc') && phaseDone('line') && phaseDone('predict') && phaseDone('exam');
}

/* Highest challenge index the user has reached (for nav locking) */
function maxReached() {
  var idx = 0;
  for (var i = 0; i < CHALLENGES.length; i++) {
    var ch = CHALLENGES[i];
    var attempted = ch.type === 'exam' ? !!state.examGrades[ch.id] : !!state.done[ch.id];
    if (attempted) idx = i + 1;
  }
  return Math.max(idx, state.current);
}

/* =====================================================================
   PROGRESS BAR + MILESTONES
   ===================================================================== */
/* [####______] 40% — a meter made of characters, not pixels. */
function asciiBar(pct) {
  var total = 20;
  var filled = Math.round((pct / 100) * total);
  var bar = '';
  for (var i = 0; i < total; i++) bar += (i < filled ? '\u2588' : '\u2591');
  return '[' + bar + '] ' + pct + '%';
}

function updateProgress() {
  var pct = Math.round((completedCount() / CHALLENGES.length) * 100);
  var fill = document.getElementById('progressFill');
  fill.textContent = asciiBar(pct);
  fill.classList.toggle('complete', moduleComplete());

  var mEl = document.getElementById('milestoneText');
  var achieved = true;
  var text;
  if (moduleComplete()) {
    text = '[x] You can fix what you diagnosed — Module 1 complete';
  } else if (phaseDone('mc') && phaseDone('line') && examsExplained()) {
    text = '[x] You can diagnose root causes cold — now make the code run';
  } else if (phaseDone('mc') && phaseDone('line') && phaseDone('predict')) {
    text = '[x] You can predict what code will do — final exam in progress';
  } else if (phaseDone('mc') && phaseDone('line')) {
    text = '[x] You can locate which line broke — now: say what code will print';
  } else if (phaseDone('mc')) {
    text = '[x] You can read a console error — now: find the guilty line';
  } else {
    achieved = false;
    text = 'First skill: reading what the console is actually telling you';
  }
  mEl.textContent = text;
  mEl.classList.toggle('achieved', achieved);
}

/* =====================================================================
   RENDER HELPERS
   ===================================================================== */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------------------------------------------------------------------
   codeify — turn code terms inside a prose string into inline mono tokens
   coloured from the SAME .tok-* palette the code blocks use, so an
   explanation's "const" looks like the const in the snippet above it.

   Recognises, conservatively (only real code terms, never plain words):
     - a small set of unambiguous keywords  -> .tok-kw
     - "quoted" identifiers                 -> .tok-fn (known calls) or .tok-var
     - "quoted" literals / paths / values   -> .tok-str (quotes kept)
     - .method() and .property mentions     -> .tok-fn / .tok-prop

   It is HTML-aware: it only touches text between tags, so authored markup
   in lesson prose (<strong>, backtick examples, ${ }) passes through
   untouched.
   ------------------------------------------------------------------ */
var CT_KW = /\b(?:const|let|var|function|return|async|await)\b/;
/* names that appear as calls in the code — coloured like functions */
var CT_FN = {};
(function () {
  var fns = ('fetch filter map forEach json then push trim split getItem setItem ' +
    'getElementById querySelector getElementsByClassName addEventListener toFixed ' +
    'add parse stringify log fetchScores renderLeaderboard renderCard renderCards ' +
    'saveDraft applyTheme restoreCart sendWelcome addComment getCurrentUser getCount ' +
    'handleSignup loadProducts loadWeather loadComments loadDashboard addTodo ' +
    'displayProfile greetUser showTopScores').split(' ');
  for (var i = 0; i < fns.length; i++) CT_FN[fns[i]] = true;
})();

function ctSpan(kind, inner) { return '<code class="ct tok-' + kind + '">' + inner + '</code>'; }

function ctQuoted(inner) {
  // inner is already HTML-escaped. Plain identifier -> var/fn (no quotes);
  // anything with spaces/slashes/dots/digits/symbols -> string literal (keep quotes).
  if (/^[A-Za-z_$][\w$]*$/.test(inner)) {
    return ctSpan(CT_FN[inner] ? 'fn' : 'var', inner);
  }
  return ctSpan('str', '"' + inner + '"');
}

/* one left-to-right pass over already-HTML-safe text (escaped, or authored
   with entities); replacements are never re-scanned, so inserted spans cannot
   be re-matched */
function ctColorizeSafe(s) {
  return s.replace(
    /"([^"<>]+)"|\b(?:const|let|var|function|return|async|await)\b|\.([A-Za-z_$][\w$]*)(\(\))?/g,
    function (m, quoted, dotName, call) {
      if (quoted !== undefined) return ctQuoted(quoted);
      if (dotName !== undefined) return ctSpan(call ? 'fn' : 'prop', '.' + dotName + (call || ''));
      return CT_KW.test(m) ? ctSpan('kw', m) : m;   // keyword alternative
    });
}

/* codeify: a RAW prose string (plain text that may contain literal < > &,
   e.g. an explanation mentioning <head>). Escape it whole, then colorize. */
function codeify(text) { return ctColorizeSafe(esc(text)); }

/* codeifyHTML: an AUTHORED prose string that already contains intended markup
   (<strong>) and entities (&gt;, ${ }). Keep the tags and entities as-is;
   colorize only the text between tags, without re-escaping. */
function codeifyHTML(html) {
  return String(html).replace(/(<[^>]*>)|([^<]+)/g, function (m, tag, text) {
    return tag ? tag : ctColorizeSafe(text);
  });
}


function tok(kind, inner) {
  return '<span class="tok-' + kind + '" data-tok="' + kind + '">' + inner + '</span>';
}

/* Inside an HTML tag: first name is the tag, the rest are attributes. */
function highlightTag(tagText) {
  var firstName = true;
  var inner = tagText.replace(/(&[a-z]+;)|("[^"]*"|'[^']*')|([a-zA-Z_$][\w$-]*)/g,
    function (m, entity, str, name) {
      if (entity) return entity;              // leave &lt; / &gt; alone
      if (str) return tok('str', str);
      if (firstName) { firstName = false; return tok('tag', name); }
      return tok('attr', name);
    });
  return '<span class="tok-tag" data-tok="tag">' + inner + '</span>';
}

var KEYWORDS = 'const|let|var|function|return|async|await|if|else|for|of|in|new|true|false|null|undefined|this';

/* Lesson code can carry invisible annotation markers (see renderAnnotated).
   They sit between tokens, so the "is this followed by a (" lookaheads have
   to see straight through them. */
var MARK = '[\\u0010-\\u0015]';

/* Order matters: earlier alternatives win at any given position. */
var HL_RE = new RegExp(
  '(\\/\\/[^\\n]*|&lt;!--[^\\n]*)' +                  // 1 comment
  '|(&lt;\\/?[a-zA-Z][^&]*&gt;)' +                    // 2 html tag
  '|(\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)' + // 3 string (incl. backtick)
  '|(&[a-z]+;)' +                                     // 4 stray entity
  '|\\.([a-zA-Z_$][\\w$]*)(?=' + MARK + '*\\s*\\()' + // 5 method call
  '|\\.([a-zA-Z_$][\\w$]*)' +                         // 6 property
  '|\\b(' + KEYWORDS + ')\\b' +                       // 7 keyword
  '|\\b(\\d+(?:\\.\\d+)?)\\b' +                       // 8 number
  '|\\b([a-zA-Z_$][\\w$]*)(?=' + MARK + '*\\s*\\()' + // 9 function
  '|\\b([a-zA-Z_$][\\w$]*)\\b',                       // 10 variable
  'g');

/* Single-pass highlighter (input is already HTML-escaped). */
function highlight(escapedLine) {
  return escapedLine.replace(HL_RE,
    function (m, com, tagText, str, entity, method, prop, kw, num, fn, name) {
      if (com) return tok('com', com);
      if (tagText) return highlightTag(tagText);
      if (str) return tok('str', str);
      if (entity) return entity;
      if (method) return '.' + tok('fn', method);
      if (prop) return '.' + tok('prop', prop);
      if (kw) return tok('kw', kw);
      if (num) return tok('num', num);
      if (fn) return tok('fn', fn);
      if (name) return tok('var', name);
      return m;
    });
}

function renderCodeCard(ch, clickableLines) {
  var lines = ch.code.split('\n');
  var html = '<div class="code-card">';
  html += '<div class="filename"><span>' + esc(ch.filename) + '</span>' +
          '<button class="legend-btn" data-legend="1" aria-label="What do the colors mean?" ' +
          'title="What do the colors mean?">[?]</button></div>';
  html += '<div class="code-scroll"><div class="code-lines">';
  for (var i = 0; i < lines.length; i++) {
    var n = i + 1;
    var cls = clickableLines ? 'code-line clickable' : 'code-line';
    html += '<div class="' + cls + '" data-line="' + n + '">' +
            '<span class="ln">' + n + '</span>' +
            '<span class="lc">' + (highlight(esc(lines[i])) || ' ') + '</span>' +
            '</div>';
  }
  html += '</div></div></div>';
  return html;
}

/* Collapsed by default: what each line of the snippet is doing, in plain
   English. Deliberately neutral — it describes, it doesn't point at the bug. */
function renderExplainer(ch) {
  if (!ch.lineExplanations) return '';
  var lines = ch.code.split('\n');
  var html = '<div class="explainer">' +
             '<button class="explainer-toggle" data-explain="1" aria-expanded="false">' +
               '<span class="caret">[+]</span>' +
               '<span class="toggle-label">Explain line by line</span>' +
             '</button>' +
             '<div class="explainer-body" hidden>';
  for (var i = 0; i < lines.length; i++) {
    var codeHtml = lines[i].trim() === ''
      ? '<span class="exp-blank">(blank line)</span>'
      : highlight(esc(lines[i]));
    html += '<div class="exp-item">' +
              '<div class="exp-code"><span class="exp-ln">Line ' + (i + 1) + ':</span> ' + codeHtml + '</div>' +
              '<div class="exp-text"><span class="exp-arrow">-&gt;</span>' +
                '<span>' + codeify(ch.lineExplanations[i] || '') + '</span></div>' +
            '</div>';
  }
  return html + '</div></div>';
}

function renderConsoleCard(ch) {
  return '' +
  '<div class="console-card">' +
    '<div class="console-tab"><span>Elements</span><span class="tab-active">Console</span><span>Network</span><span>Sources</span></div>' +
    '<div class="console-row">' +
      '<span class="err-icon">✕</span>' +
      '<span class="err-msg">' + esc(ch.error.msg) + '</span>' +
      '<span class="err-src">' + esc(ch.error.src) + '</span>' +
    '</div>' +
    '<div class="console-cursor">\u258a</div>' +
  '</div>';
}

function renderDots(currentIdx) {
  var reach = maxReached();
  var html = '<div class="dots">';
  for (var i = 0; i < CHALLENGES.length; i++) {
    var ch = CHALLENGES[i];
    var cls = 'dot';
    if (isChallengeDone(ch)) cls += ' done';
    else if (ch.type === 'exam' && state.examGrades[ch.id] === 'missed') cls += ' missed';
    if (i === currentIdx) cls += ' current';
    var locked = i > reach;
    if (locked) cls += ' locked';
    html += '<button class="' + cls + '" ' + (locked ? 'disabled' : '') +
            ' data-jump="' + i + '">' + (i + 1) + '</button>';
  }
  html += '</div>';
  return html;
}

function show(screenId) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0, 0);
}

/* =====================================================================
   HOME SCREEN
   ===================================================================== */
function renderHome() {
  var el = document.getElementById('screen-home');
  var html = '<div class="home">';
  if (moduleComplete()) {
    renderSummary();
    show('screen-summary');
    return;
  }
  if (state.started) {
    html += '<div class="big-icon">$ ./vibe-coach --resume</div>';
    html += '<h2>Welcome back</h2>';
    html += '<div class="welcome-back">You’re on challenge <strong>' +
            (state.current + 1) + ' of ' + CHALLENGES.length +
            '</strong>. No streaks, no penalties — just pick up where you left off.</div>';
    html += '<div class="actions" style="justify-content:center">' +
            '<button class="btn btn-primary" id="btnContinue">[ CONTINUE ]</button></div>';
  } else {
    html += '<div class="big-icon">$ ./vibe-coach --module 1</div>';
    html += '<h2>Reading Errors Without Panicking</h2>';
    html += '<p>15 challenges built from real AI slop: hallucinated methods, invented response shapes, half-renamed variables, missing awaits.</p>';
    html += '<p>You’ll learn to read the error, find the guilty line, and diagnose root causes cold.</p>';
    html += '<div class="actions" style="justify-content:center;margin-top:24px">' +
            '<button class="btn btn-primary" id="btnContinue">[ START ]</button></div>';
  }
  html += '</div>';
  el.innerHTML = html;
  document.getElementById('btnContinue').addEventListener('click', function () {
    state.started = true;
    saveState();
    renderChallenge(state.current);
    show('screen-challenge');
  });
  show('screen-home');
}

/* =====================================================================
   CHALLENGE SCREEN
   ===================================================================== */
function phaseLabel(ch) {
  if (ch.type === 'mc') return 'READ THE ERROR';
  if (ch.type === 'line') return 'FIND THE LINE';
  if (ch.type === 'predict') return 'PREDICT THE OUTPUT';
  return 'FINAL EXAM';
}

/* Entry point: coach talks first, unless this challenge has been seen before. */
function renderChallenge(idx) {
  var ch = CHALLENGES[idx];
  if (ch.lesson && !hasAttempted(ch)) renderLesson(idx);
  else renderDrill(idx);
}

/* ---------- the lesson card, before the drill ---------- */
function renderLesson(idx) {
  var ch = CHALLENGES[idx];
  state.current = idx;
  saveState();
  updateProgress();

  var seenBefore = hasAttempted(ch);
  var el = document.getElementById('screen-challenge');
  var html = renderDots(idx);
  html += '<div class="ch-meta"><span>challenge ' + (idx + 1) + ' / ' + CHALLENGES.length + '</span>' +
          '<span class="ch-phase' + (ch.type === 'exam' ? ' exam' : '') + '">' + phaseLabel(ch) + '</span></div>';
  html += '<div class="lesson-wrap"><div class="lesson-card">';
  html += '<div class="lesson-coach"><span class="coach-dot">//</span><span>Before the drill</span></div>';
  html += '<div class="lesson-facts">' +
            '<div class="lesson-fact"><span class="fact-key">Error type</span>' +
              '<span class="fact-val">' + esc(ch.lesson.kind) + '</span></div>' +
            '<div class="lesson-fact"><span class="fact-key">Look in</span>' +
              '<span class="fact-val">' + esc(ch.lesson.where) + '</span></div>' +
          '</div>';
  html += '<div class="lesson-text">' + codeify(ch.lesson.text) + '</div>';
  html += '<div class="lesson-actions"><button class="btn-lesson" id="btnGotIt">' +
          '[ GOT IT — SHOW CHALLENGE ]</button>';
  html += '<div class="lesson-skip-note">' + (seenBefore
            ? 'You’ve seen this one before — the card won’t interrupt you again.'
            : 'You’ll only see this card once. Retries jump straight to the challenge.') +
          '</div></div>';
  html += '</div></div>';
  el.innerHTML = html;

  wireDots(el);
  document.getElementById('btnGotIt').addEventListener('click', function () {
    state.attempted[ch.id] = true;
    saveState();
    renderDrill(idx);
    window.scrollTo(0, 0);
  });
  show('screen-challenge');
}

function wireDots(el) {
  var dots = el.querySelectorAll('[data-jump]');
  for (var i = 0; i < dots.length; i++) {
    dots[i].addEventListener('click', function () {
      renderChallenge(parseInt(this.getAttribute('data-jump'), 10));
    });
  }
}

function renderDrill(idx) {
  var ch = CHALLENGES[idx];
  state.current = idx;
  state.attempted[ch.id] = true;
  saveState();
  updateProgress();

  var el = document.getElementById('screen-challenge');
  var html = renderDots(idx);
  html += '<div class="ch-meta"><span>challenge ' + (idx + 1) + ' / ' + CHALLENGES.length + '</span>' +
          '<span class="ch-phase' + (ch.type === 'exam' ? ' exam' : '') + '">' + phaseLabel(ch) + '</span></div>';
  if (ch.lesson) html += '<button class="lesson-recap" id="btnRecap">[ RE-READ LESSON ]</button>';
  html += '<div class="ch-title">' + esc(ch.title) + '</div>';
  html += renderCodeCard(ch, ch.type === 'line' && !state.done[ch.id]);
  html += renderExplainer(ch);
  if (ch.error) html += renderConsoleCard(ch);
  html += '<div class="question">' + esc(ch.question) + '</div>';
  html += '<div id="interaction"></div>';
  html += '<div id="feedback" class="feedback"></div>';
  html += '<div id="chActions" class="actions"></div>';
  el.innerHTML = html;

  wireDots(el);
  var recap = document.getElementById('btnRecap');
  if (recap) recap.addEventListener('click', function () { renderLesson(idx); });

  if (ch.type === 'mc') setupMC(ch, idx);
  else if (ch.type === 'line') setupLine(ch, idx);
  else if (ch.type === 'predict') setupPredict(ch, idx);
  else setupExam(ch, idx);
}

var CHEERS = ['CORRECT', 'CORRECT — that is the one', 'CORRECT — good read', 'CORRECT', 'CORRECT — exact'];

function showExplanation(ch, cheer) {
  var fb = document.getElementById('feedback');
  var html = '';
  if (cheer) {
    html += '<div class="correct-banner"><span>[ OK ]</span><span>' +
            CHEERS[Math.floor(Math.random() * CHEERS.length)] + '</span></div>';
  }
  html += '<div class="explain"><span class="explain-label">WHY THIS HAPPENS</span>' +
          codeify(ch.explanation) + '</div>';
  fb.innerHTML = html;
}

function showNextButton(idx) {
  var act = document.getElementById('chActions');
  var last = idx === CHALLENGES.length - 1;
  act.innerHTML = '<button class="btn btn-primary" id="btnNext">' +
                  (last ? '[ FINISH ]' : '[ NEXT ]') + '</button>';
  document.getElementById('btnNext').addEventListener('click', function () {
    if (last) {
      state.current = CHALLENGES.length - 1;
      saveState();
      renderSummary();
      show('screen-summary');
    } else {
      renderChallenge(idx + 1);
    }
  });
}

/* ---------- multiple choice ---------- */
/* ---------- predict the output ----------
   Pick what you think it prints, then the app really runs it and shows what
   came back. The answer is settled by execution, not by the option key. */
function setupPredict(ch, idx) {
  var box = document.getElementById('interaction');
  var answered = !!state.done[ch.id];

  var html = '<div class="options">';
  for (var i = 0; i < ch.options.length; i++) {
    var cls = 'opt' + (answered && i === ch.correct ? ' right' : '');
    html += '<button class="' + cls + '" data-opt="' + i + '" ' +
            (answered ? 'disabled' : '') + '>' + esc(ch.options[i]) + '</button>';
  }
  html += '</div><div class="try-again-note" id="tryNote"></div>' +
          '<div id="predictRun"></div>';
  box.innerHTML = html;

  function reveal(picked) {
    var host = document.getElementById('predictRun');
    host.innerHTML = '<div class="run-row"><span class="run-hint">running it for real…</span></div>';
    runSandboxed(ch.code, ch.env, ch.seed).then(function (res) {
      var matched = outputMatches(res.output, ch.expected);
      host.innerHTML =
        '<div class="predict-actual"><div class="sec-label">WHAT IT ACTUALLY PRINTED</div>' +
        renderMiniConsole(res.output) + '</div>' +
        (matched ? '' : '<div class="fix-verdict fail">[ !! ] the executed output did not ' +
                        'match the expected answer — that is a bug in this challenge, not in you</div>');
      if (picked) showExplanation(ch, true);
      else showExplanation(ch, false);
      showNextButton(idx);
    });
  }

  if (answered) { reveal(false); return; }

  var opts = box.querySelectorAll('.opt');
  for (var j = 0; j < opts.length; j++) {
    opts[j].addEventListener('click', function () {
      var pick = parseInt(this.getAttribute('data-opt'), 10);
      if (pick === ch.correct) {
        state.done[ch.id] = true;
        saveState();
        updateProgress();
        for (var k = 0; k < opts.length; k++) opts[k].disabled = true;
        this.classList.add('right');
        this.classList.remove('wrong');
        document.getElementById('tryNote').textContent = '';
        reveal(true);
      } else {
        this.classList.add('wrong');
        this.disabled = true;
        document.getElementById('tryNote').textContent =
          'INCORRECT — think it through once more, then pick again. Retries are free.';
      }
    });
  }
}

function setupMC(ch, idx) {
  var box = document.getElementById('interaction');
  var answered = !!state.done[ch.id];
  var html = '<div class="options">';
  for (var i = 0; i < ch.options.length; i++) {
    var cls = 'opt' + (answered && i === ch.correct ? ' right' : '');
    html += '<button class="' + cls + '" data-opt="' + i + '" ' +
            (answered ? 'disabled' : '') + '>' + esc(ch.options[i]) + '</button>';
  }
  html += '</div><div class="try-again-note" id="tryNote"></div>';
  box.innerHTML = html;

  if (answered) {
    showExplanation(ch, false);
    showNextButton(idx);
    return;
  }

  var opts = box.querySelectorAll('.opt');
  for (var j = 0; j < opts.length; j++) {
    opts[j].addEventListener('click', function () {
      var pick = parseInt(this.getAttribute('data-opt'), 10);
      if (pick === ch.correct) {
        state.done[ch.id] = true;
        saveState();
        updateProgress();
        for (var k = 0; k < opts.length; k++) opts[k].disabled = true;
        this.classList.add('right');
        this.classList.remove('wrong');
        document.getElementById('tryNote').textContent = '';
        showExplanation(ch, true);
        showNextButton(idx);
      } else {
        this.classList.add('wrong');
        this.disabled = true;
        document.getElementById('tryNote').textContent =
          'INCORRECT — re-read the error and try again. Retries are free.';
      }
    });
  }
}

/* ---------- click-the-line ---------- */
function setupLine(ch, idx) {
  var answered = !!state.done[ch.id];
  var box = document.getElementById('interaction');
  box.innerHTML = '<div class="try-again-note" id="tryNote"></div>';

  var lineEls = document.querySelectorAll('#screen-challenge .code-line');

  if (answered) {
    for (var i = 0; i < lineEls.length; i++) {
      if (parseInt(lineEls[i].getAttribute('data-line'), 10) === ch.correctLine) {
        lineEls[i].classList.add('reveal-right');
      }
    }
    showExplanation(ch, false);
    showNextButton(idx);
    return;
  }

  for (var j = 0; j < lineEls.length; j++) {
    lineEls[j].addEventListener('click', function () {
      if (state.done[ch.id]) return;
      var pick = parseInt(this.getAttribute('data-line'), 10);
      if (pick === ch.correctLine) {
        state.done[ch.id] = true;
        saveState();
        updateProgress();
        this.classList.remove('picked-wrong');
        this.classList.add('picked-right');
        for (var k = 0; k < lineEls.length; k++) {
          lineEls[k].classList.remove('clickable');
          if (lineEls[k] !== this) lineEls[k].classList.remove('picked-wrong');
        }
        document.getElementById('tryNote').textContent = '';
        showExplanation(ch, true);
        showNextButton(idx);
      } else {
        this.classList.add('picked-wrong');
        var self = this;
        setTimeout(function () { self.classList.remove('picked-wrong'); }, 700);
        document.getElementById('tryNote').textContent =
          'INCORRECT — where it crashed and where it broke can be different lines.';
      }
    });
  }
}

/* ---------- final exam ---------- */
/* =====================================================================
   FIX STAGE — the second half of a final exam. You explained the bug;
   now edit the code until it genuinely runs. Verified by execution, not
   by self-assessment.
   ===================================================================== */
function renderFixStage(ch) {
  var passed = !!state.fixes[ch.id];
  var assisted = !!state.assisted[ch.id];

  var html = '<div class="fix-stage">' +
    '<div class="sec-label">STAGE 2 — MAKE IT RUN</div>' +
    '<p class="fix-intro">' + esc(ch.fix.intro) + '</p>';

  if (passed) {
    html += '<div class="fix-verdict pass">[ PASS ] your code produced the expected output' +
            (assisted ? ' — with the solution shown' : '') + '</div>';
  }

  html += '<div class="fix-editor-wrap">' +
            '<div class="fix-editor-bar"><span>fix.js</span>' +
              '<span class="fix-expect">expects: ' + esc(ch.fix.expect.join(' / ')) + '</span></div>' +
            '<textarea class="fix-editor" id="fixCode" spellcheck="false" ' +
              'aria-label="Editable code">' + esc(ch.fix.broken) + '</textarea>' +
          '</div>' +
          '<div class="run-row">' +
            '<button class="btn-run" id="fixRun">[ RUN ]</button>' +
            '<button class="btn btn-ghost" id="fixReset">[ RESET CODE ]</button>' +
            '<span class="run-hint" id="fixHintLine">not run yet</span>' +
          '</div>' +
          '<div class="mini-console" id="fixConsole" hidden></div>' +
          '<div id="fixVerdict"></div>' +
          '<div class="fix-help">' +
            '<button class="btn btn-ghost" id="fixHintBtn">[ HINT ]</button>' +
            '<button class="btn btn-ghost" id="fixSolBtn">[ SHOW SOLUTION ]</button>' +
          '</div>' +
          '<div class="fix-hints" id="fixHints"></div>';
  return html + '</div>';
}

function wireFixStage(ch, idx) {
  var editor = document.getElementById('fixCode');
  var hintsShown = 0;

  function verdict(html) { document.getElementById('fixVerdict').innerHTML = html; }

  document.getElementById('fixRun').addEventListener('click', function () {
    var code = editor.value;
    // Clear the previous result first — leaving a stale PASS/FAIL on screen
    // while the next run is in flight reads as the new answer.
    verdict('');
    document.getElementById('fixConsole').hidden = true;
    document.getElementById('fixHintLine').textContent = 'running…';
    runSandboxed(code, ch.fix.env, ch.fix.seed).then(function (res) {
      var con = document.getElementById('fixConsole');
      con.innerHTML = renderMiniConsole(res.output);
      con.hidden = false;
      document.getElementById('fixHintLine').textContent = 'your code, actually executed';

      if (outputMatches(res.output, ch.fix.expect)) {
        state.fixes[ch.id] = true;
        saveState();
        updateProgress();
        verdict('<div class="fix-verdict pass">[ PASS ] that is the expected output' +
                (state.assisted[ch.id] ? ' — solution was shown' : '') + '</div>');
      } else {
        var got = [];
        for (var i = 0; i < res.output.length; i++) {
          if (res.output[i].type === 'log') got.push(res.output[i].text);
        }
        verdict('<div class="fix-verdict fail">[ FAIL ] not there yet</div>' +
                '<div class="fix-diff">' +
                  '<div class="fix-diff-row"><span class="fdk">expected</span>' +
                    '<span class="fdv ok">' + esc(ch.fix.expect.join('\n') || '(nothing)') + '</span></div>' +
                  '<div class="fix-diff-row"><span class="fdk">yours</span>' +
                    '<span class="fdv no">' + esc(got.join('\n') ||
                      (res.threw ? '(threw before printing anything)' : '(nothing printed)')) + '</span></div>' +
                '</div>');
      }
    });
  });

  document.getElementById('fixReset').addEventListener('click', function () {
    editor.value = ch.fix.broken;
    document.getElementById('fixConsole').hidden = true;
    verdict('');
    document.getElementById('fixHintLine').textContent = 'back to the broken version';
  });

  document.getElementById('fixHintBtn').addEventListener('click', function () {
    if (hintsShown >= ch.fix.hints.length) return;
    var box = document.getElementById('fixHints');
    box.innerHTML += '<div class="fix-hint"><span class="fh-n">hint ' + (hintsShown + 1) + '</span>' +
                     esc(ch.fix.hints[hintsShown]) + '</div>';
    hintsShown++;
    if (hintsShown >= ch.fix.hints.length) this.disabled = true;
  });

  document.getElementById('fixSolBtn').addEventListener('click', function () {
    editor.value = ch.fix.solution;
    state.assisted[ch.id] = true;
    saveState();
    this.disabled = true;
    verdict('<div class="fix-verdict assisted">[ -- ] solution loaded into the editor. ' +
            'Run it to see it work, then hit RESET CODE and try it yourself.</div>');
  });
}

function setupExam(ch, idx) {
  var box = document.getElementById('interaction');
  var grade = state.examGrades[ch.id];

  if (grade) {
    var html = '<div class="model-answer"><span class="ma-label">MODEL ANSWER</span>' +
               codeify(ch.modelAnswer) + '</div>';
    html += '<div class="explain" style="margin-top:12px"><span class="explain-label">' +
            (grade === 'got' ? '[ OK ] EXPLAINED' : '[ -- ] MARKED AS MISSED') +
            '</span>' + codeify(ch.explanation) + '</div>';
    if (ch.fix) html += renderFixStage(ch);
    box.innerHTML = html;
    if (ch.fix) wireFixStage(ch, idx);
    var act = document.getElementById('chActions');
    var last = idx === CHALLENGES.length - 1;
    act.innerHTML =
      '<button class="btn btn-ghost" id="btnRetry">[ RETRY ]</button>' +
      '<button class="btn btn-primary" id="btnNext">' + (last ? '[ FINISH ]' : '[ NEXT ]') + '</button>';
    document.getElementById('btnRetry').addEventListener('click', function () {
      delete state.examGrades[ch.id];
      saveState();
      renderChallenge(idx);
    });
    document.getElementById('btnNext').addEventListener('click', function () {
      if (last) { renderSummary(); show('screen-summary'); }
      else renderChallenge(idx + 1);
    });
    return;
  }

  box.innerHTML =
    '<textarea class="exam-input" id="examText" placeholder="Type your explanation of the root cause. A couple of sentences in plain English is perfect."></textarea>' +
    '<div class="actions"><button class="btn btn-primary" id="btnReveal">[ REVEAL MODEL ANSWER ]</button></div>' +
    '<div id="examReveal"></div>';

  document.getElementById('btnReveal').addEventListener('click', function () {
    var userText = document.getElementById('examText').value.trim();
    document.getElementById('examText').disabled = true;
    this.style.display = 'none';

    var html = '<div class="model-answer"><span class="ma-label">MODEL ANSWER</span>' +
               codeify(ch.modelAnswer) + '</div>';
    if (userText) {
      html += '<div class="your-answer"><strong>Your answer:</strong>\n' + esc(userText) + '</div>';
    }
    html += '<div class="self-grade"><p>Compare against the model answer: did you land the same root cause? ' +
            'Marking it missed costs nothing — it queues a free retry.</p>' +
            '<div class="grade-btns">' +
            '<button class="btn btn-green" id="btnGot">[ I GOT IT ]</button>' +
            '<button class="btn btn-ghost" id="btnMissed">[ I MISSED IT ]</button>' +
            '</div></div>';
    document.getElementById('examReveal').innerHTML = html;

    document.getElementById('btnGot').addEventListener('click', function () {
      state.examGrades[ch.id] = 'got';
      saveState();
      updateProgress();
      renderChallenge(idx);
    });
    document.getElementById('btnMissed').addEventListener('click', function () {
      state.examGrades[ch.id] = 'missed';
      saveState();
      updateProgress();
      renderChallenge(idx);
    });
  });
}

/* =====================================================================
   SUMMARY SCREEN
   ===================================================================== */
function renderSummary() {
  updateProgress();
  var el = document.getElementById('screen-summary');
  var exams = CHALLENGES.filter(function (c) { return c.type === 'exam'; });
  var gotAll = moduleComplete();

  var html = '<div class="summary">';
  if (gotAll) {
    html += '<div class="big-icon">[ MODULE 1 : COMPLETE ]</div>';
    html += '<h2>Module 1 complete</h2>';
    html += '<p>You read the errors. You found the lines. You diagnosed root causes cold — and graded yourself honestly doing it.</p>';
    html += '<p>Next time your AI assistant ships you slop, the console is a map, not a threat.</p>';
  } else {
    html += '<div class="big-icon">[ MODULE 1 : IN PROGRESS ]</div>';
    html += '<h2>Almost there</h2>';
    html += '<p>Module 1 is complete when all three final-exam challenges are honestly self-graded “I got it”. Retries are free and expected — that’s how the mental model sets.</p>';
  }

  html += '<div class="exam-status">';
  for (var i = 0; i < exams.length; i++) {
    var ex = exams[i];
    var g = state.examGrades[ex.id];
    var statusHtml = g === 'got'
      ? '<span class="ok">[ OK ]</span>'
      : (g === 'missed' ? '<span class="nope">[ -- ] RETRY</span>' : '<span class="nope">[ ?? ] NOT GRADED</span>');
    var exIdx = CHALLENGES.indexOf(ex);
    html += '<div class="row"><span>Exam: ' + esc(ex.filename) + '</span>' + statusHtml +
            '<button class="btn btn-ghost" style="padding:6px 12px;font-size:0.78rem" data-goto="' + exIdx + '">' +
            (g === 'got' ? '[ REVIEW ]' : '[ RETRY ]') + '</button></div>';
  }
  html += '</div>';

  html += '<div class="actions" style="justify-content:center">' +
          '<button class="btn btn-ghost" id="btnReviewAll">[ REVIEW ALL ]</button></div>';
  html += '<div class="reset-zone"><button class="reset-link" id="btnReset">[ RESET PROGRESS ]</button></div>';
  html += '</div>';
  el.innerHTML = html;

  var gotos = el.querySelectorAll('[data-goto]');
  for (var j = 0; j < gotos.length; j++) {
    gotos[j].addEventListener('click', function () {
      var idx = parseInt(this.getAttribute('data-goto'), 10);
      if (state.examGrades[CHALLENGES[idx].id] === 'missed') {
        delete state.examGrades[CHALLENGES[idx].id];
        saveState();
      }
      renderChallenge(idx);
      show('screen-challenge');
    });
  }
  document.getElementById('btnReviewAll').addEventListener('click', function () {
    renderChallenge(0);
    show('screen-challenge');
  });
  document.getElementById('btnReset').addEventListener('click', function () {
    if (confirm('Wipe all Vibe Coach progress and start fresh?')) {
      state = defaultState();
      saveState();
      updateProgress();
      syncChrome();
      renderHome();
    }
  });
}

/* =====================================================================
   LEARN — lesson list and lesson pages.
   Sections render by type, so a new lesson is data only: add it to
   LESSONS and it appears in the list with no code changes.
   ===================================================================== */
var RUNNABLES = {};                                    // run key -> snippet
var LPREDICTS = {};                                    // run key -> lesson predict block
/* Invisible control characters used only while building a lesson code block:
   they mark where a highlight starts and ends. Written with fromCharCode so
   they stay visible and editable in this source file. */
var M_OPEN = [String.fromCharCode(17), String.fromCharCode(18),
              String.fromCharCode(19), String.fromCharCode(20)];
var M_CLOSE = String.fromCharCode(16);

function lessonDone(l) { return !!state.lessonsDone[l.id]; }

function findLesson(id) {
  for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].id === id) return LESSONS[i];
  return null;
}

/* ---------- code blocks inside lessons ---------- */

/* Wrap each annotation's target text in an invisible marker, highlight the
   line as usual, then swap the markers for colored spans. Markers are
   non-word characters, so they never split a token in the highlighter. */
function renderLessonCode(code, filename, annotations) {
  var lines = code.split('\n');
  var html = '<div class="code-card">';
  if (filename) {
    html += '<div class="filename"><span>' + esc(filename) + '</span>' +
            '<button class="legend-btn" data-legend="1" aria-label="What do the colors mean?" ' +
            'title="What do the colors mean?">[?]</button></div>';
  }
  html += '<div class="code-scroll"><div class="code-lines">';
  for (var i = 0; i < lines.length; i++) {
    var escaped = esc(lines[i]);
    if (annotations) {
      for (var a = 0; a < annotations.length && a < M_OPEN.length; a++) {
        var an = annotations[a];
        if (an.line !== i + 1) continue;
        var needle = esc(an.match);
        var at = escaped.indexOf(needle);
        if (at === -1) continue;
        escaped = escaped.slice(0, at) + M_OPEN[a] + needle + M_CLOSE +
                  escaped.slice(at + needle.length);
      }
    }
    var lineHtml = swapMarkers(highlight(escaped));
    html += '<div class="code-line"><span class="ln">' + (i + 1) + '</span>' +
            '<span class="lc">' + (lineHtml || ' ') + '</span></div>';
  }
  return html + '</div></div></div>';
}

function swapMarkers(s) {
  for (var a = 0; a < M_OPEN.length; a++) {
    s = s.split(M_OPEN[a]).join('<span class="anno anno-' + a + '"><sup>' + (a + 1) + '</sup>');
  }
  return s.split(M_CLOSE).join('</span>');
}

function renderAnnoKey(annotations) {
  var html = '<div class="anno-key">';
  for (var i = 0; i < annotations.length; i++) {
    html += '<div class="anno-item"><span class="anno-num n' + i + '">' + (i + 1) + '</span>' +
              '<span class="at"><b>' + esc(annotations[i].title) + '</b> — ' +
              codeify(annotations[i].text) + '</span></div>';
  }
  return html + '</div>';
}

/* ---------- actually running the snippets ---------- */
function formatLogValue(v) {
  if (typeof v === 'string') return v;
  // JSON.stringify flattens a promise to "{}", which hides the whole point when
  // the lesson is about un-awaited calls. Chrome prints Promise {<pending>}.
  if (v && typeof v.then === 'function') return 'Promise {<pending>}';
  if (typeof v === 'number' || typeof v === 'boolean' || v === null) return String(v);
  if (v === undefined) return 'undefined';
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

/* Output lines are { text, type } where type is 'log' or 'error'. Authored
   fallbacks may be plain strings, which mean 'log'. */
function normalizeOutput(arr) {
  var out = [];
  for (var i = 0; i < (arr || []).length; i++) {
    var v = arr[i];
    out.push(typeof v === 'string' ? { text: v, type: 'log' }
                                   : { text: v.text, type: v.type || 'log' });
  }
  return out;
}

function runSnippet(code, fallback) {
  var out = [];
  var fakeConsole = { log: function () {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(formatLogValue(arguments[i]));
    out.push({ text: parts.join(' '), type: 'log' });
  } };

  var fn;
  try {
    fn = new Function('console', code);
  } catch (e) {
    // Somewhere that blocks Function() entirely; show the known-good output.
    var fb = normalizeOutput(fallback);
    return fb.length ? fb : [{ text: '(could not run here)', type: 'log' }];
  }

  try {
    fn(fakeConsole);
  } catch (err) {
    // A snippet that throws on purpose lands here — report it like DevTools does.
    out.push({ text: 'Uncaught ' + (err.name || 'Error') + ': ' + err.message, type: 'error' });
  }
  return out.length ? out : [{ text: '(nothing was printed)', type: 'log' }];
}

/* =====================================================================
   SANDBOX — runs the user's own edited code for the fix challenges.

   runSnippet above is synchronous, which is fine for the lesson demos but
   cannot execute anything with await or fetch — and those are exactly the
   bugs worth practising. This runner wraps the code in an async IIFE (so
   top-level await works) and injects fake versions of whatever the browser
   APIs the challenge needs. Nothing here touches the real page or network.
   ===================================================================== */

/* A stand-in Response, so res.json() behaves like the real thing. */
function fakeResponse(payload, status) {
  return {
    ok: (status || 200) < 400,
    status: status || 200,
    json: function () { return Promise.resolve(payload); },
    text: function () { return Promise.resolve(JSON.stringify(payload)); }
  };
}

/* Minimal element good enough for the DOM-flavoured challenges. */
function fakeElement(id) {
  return {
    id: id, textContent: '', value: '', innerHTML: '',
    classList: { add: function () {}, remove: function () {}, toggle: function () {} },
    addEventListener: function (evt, fn) { if (typeof fn === 'function') this['on' + evt] = fn; },
    appendChild: function () {}, setAttribute: function () {}, focus: function () {}
  };
}

/* env: which globals the challenge asks for. seed: canned data for them. */
function buildSandbox(env, seed, out) {
  seed = seed || {};
  var api = {
    console: {
      log: function () {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) parts.push(formatLogValue(arguments[i]));
        out.push({ text: parts.join(' '), type: 'log' });
      },
      error: function () {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) parts.push(formatLogValue(arguments[i]));
        out.push({ text: parts.join(' '), type: 'error' });
      }
    }
  };
  var wants = env || [];

  if (wants.indexOf('fetch') !== -1) {
    // seed.responses maps a url substring -> payload (or { payload, status }).
    api.fetch = function (url) {
      var table = seed.responses || {};
      for (var key in table) {
        if (Object.prototype.hasOwnProperty.call(table, key) && String(url).indexOf(key) !== -1) {
          var hit = table[key];
          var body = (hit && hit.payload !== undefined) ? hit.payload : hit;
          return Promise.resolve(fakeResponse(body, hit && hit.status));
        }
      }
      return Promise.resolve(fakeResponse({ error: 'not found' }, 404));
    };
  }

  if (wants.indexOf('dom') !== -1) {
    var nodes = {};
    var lookup = function (key) {
      key = String(key).replace(/^[#.]/, '');
      if (!nodes[key]) nodes[key] = fakeElement(key);
      return (seed.missing || []).indexOf(key) !== -1 ? null : nodes[key];
    };
    api.document = {
      getElementById: lookup,
      querySelector: lookup,
      querySelectorAll: function () { return []; },
      getElementsByClassName: function () { return []; },
      addEventListener: function () {}
    };
  }

  if (wants.indexOf('storage') !== -1) {
    var store = {};
    for (var k in (seed.storage || {})) {
      if (Object.prototype.hasOwnProperty.call(seed.storage, k)) store[k] = seed.storage[k];
    }
    api.localStorage = {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem: function (key, val) { store[key] = String(val); },
      removeItem: function (key) { delete store[key]; }
    };
  }
  return api;
}

/* Browser globals a snippet must never reach by accident. Anything the
   challenge did not ask for is shadowed with undefined, so a challenge that
   forgets to declare `dom` fails loudly instead of quietly driving the real
   page. This is for predictable behaviour, not security — a determined
   escape is always possible, and the only code running here is the user's own. */
var SHADOWED_GLOBALS = [
  'fetch', 'document', 'localStorage', 'sessionStorage', 'XMLHttpRequest',
  'window', 'globalThis', 'self', 'top', 'parent', 'frames', 'location',
  'navigator', 'alert', 'confirm', 'prompt', 'indexedDB', 'WebSocket',
  'importScripts', 'open', 'postMessage'
  // NB: 'eval' and 'arguments' are illegal as strict-mode parameter names, so
  // they cannot be shadowed. Direct eval inherits this scope anyway, meaning
  // eval('document') still sees the shadowed undefined.
];

/* Best-effort capture of rejections that surface after the snippet returns.
   Note: Chrome does NOT dispatch unhandledrejection (or error) to page listeners
   for code compiled via the Function constructor — it reports those straight to
   DevTools — so a promise the snippet starts and never awaits cannot be caught
   here. That case is handled instead by the explicit "nothing was printed"
   diagnostic below, which names the usual cause. */
var sandboxOut = null;
window.addEventListener('unhandledrejection', function (e) {
  if (!sandboxOut) return;
  var err = e.reason;
  sandboxOut.push({
    text: 'Uncaught (in promise) ' + ((err && err.name) || 'Error') +
          ': ' + ((err && err.message) || String(err)),
    type: 'error'
  });
  e.preventDefault();
});

/* Resolves to { output, threw }. Never rejects — a thrown error is a result. */
function runSandboxed(code, env, seed) {
  var out = [];
  var api = buildSandbox(env, seed, out);
  var names = [], values = [];
  for (var i = 0; i < SHADOWED_GLOBALS.length; i++) {
    var g = SHADOWED_GLOBALS[i];
    if (!Object.prototype.hasOwnProperty.call(api, g)) { names.push(g); values.push(undefined); }
  }
  for (var n in api) {
    if (Object.prototype.hasOwnProperty.call(api, n)) { names.push(n); values.push(api[n]); }
  }

  var fn;
  try {
    // The async wrapper is what lets a challenge's own `await` work.
    fn = Function.apply(null, names.concat(
      '"use strict"; return (async function () {\n' + code + '\n})();'));
  } catch (err) {
    out.push({ text: 'Uncaught SyntaxError: ' + err.message, type: 'error' });
    return Promise.resolve({ output: out, threw: true });
  }

  var settled;
  sandboxOut = out;
  try {
    settled = Promise.resolve(fn.apply(null, values));
  } catch (err) {
    settled = Promise.reject(err);
  }

  var threw = false;
  return settled.catch(function (err) {
    threw = true;
    out.push({
      text: 'Uncaught ' + ((err && err.name) || 'Error') + ': ' + ((err && err.message) || String(err)),
      type: 'error'
    });
  }).then(function () {
    // Chrome reports an unhandled rejection a couple of task hops after the
    // snippet returns (measured just under 1ms), so a setTimeout(0) or two loses
    // the race. Wait a short fixed grace instead — imperceptible on a button
    // press, and if it ever were missed the error just falls back to the real
    // console rather than breaking anything.
    return new Promise(function (done) { setTimeout(done, 30); });
  }).then(function () {
    sandboxOut = null;
    for (var i = 0; i < out.length; i++) if (out[i].type === 'error') threw = true;
    if (!out.length) {
      // Silence almost always means async work was started and never awaited:
      // the snippet returned before anything could print.
      out.push({ text: '(nothing reached the console — if this code starts async ' +
                       'work, check that every call to it is awaited)', type: 'log' });
    }
    return { output: out, threw: threw };
  });
}

/* Output matches when the printed log lines equal the expected ones. */
function outputMatches(output, expected) {
  var got = [];
  for (var i = 0; i < output.length; i++) {
    if (output[i].type === 'log') got.push(output[i].text.trim());
  }
  var want = (expected || []).map(function (s) { return String(s).trim(); });
  if (got.length !== want.length) return false;
  for (var j = 0; j < want.length; j++) if (got[j] !== want[j]) return false;
  return true;
}

/* Optional "say what it prints before you run it" gate above a lesson snippet.
   Deliberately only on a couple of steps — prompting on every re-read nags. */
function renderPredictGate(key, predict) {
  if (!predict) return '';
  var html = '<div class="lpredict" id="lp-' + key + '">' +
               '<div class="sec-label">PREDICT FIRST</div>' +
               '<p class="lp-q">' + esc(predict.question) + '</p>' +
               '<div class="options">';
  for (var i = 0; i < predict.options.length; i++) {
    html += '<button class="opt" data-lpredict="' + key + '" data-lp-opt="' + i + '">' +
            esc(predict.options[i]) + '</button>';
  }
  return html + '</div><div class="lp-note" id="lpnote-' + key + '"></div></div>';
}

document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('[data-lpredict]');
  if (!btn) return;
  var key = btn.getAttribute('data-lpredict');
  var predict = LPREDICTS[key];
  if (!predict) return;
  var pick = parseInt(btn.getAttribute('data-lp-opt'), 10);
  var wrap = document.getElementById('lp-' + key);
  var opts = wrap.querySelectorAll('.opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].disabled = true;
    if (i === predict.correct) opts[i].classList.add('right');
  }
  if (pick !== predict.correct) btn.classList.add('wrong');
  document.getElementById('lpnote-' + key).textContent = pick === predict.correct
    ? 'Now run it and confirm.'
    : 'Run it and see what actually comes back — that gap is the useful bit.';
});

function renderRunRow(key, code, fallback, afterRun) {
  RUNNABLES[key] = { code: code, fallback: fallback };
  var html = '<div class="run-row">' +
               '<button class="btn-run" data-run="' + key + '">[ RUN ]</button>' +
               '<span class="run-hint" id="hint-' + key + '">not run yet</span>' +
             '</div>' +
             '<div class="mini-console" id="con-' + key + '" hidden></div>';
  if (afterRun) {
    html += '<div class="after-run" id="after-' + key + '" hidden>' + codeify(afterRun) + '</div>';
  }
  return html;
}

function renderMiniConsole(lines) {
  var html = '<div class="console-card">' +
    '<div class="console-tab"><span>Elements</span><span class="tab-active">Console</span>' +
    '<span>Network</span><span>Sources</span></div>';
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].type === 'error') {
      html += '<div class="console-row"><span class="err-icon">✕</span>' +
              '<span class="err-msg">' + esc(lines[i].text) + '</span></div>';
    } else {
      html += '<div class="console-row console-log"><span class="log-icon">&gt;</span>' +
              '<span class="err-msg">' + esc(lines[i].text) + '</span></div>';
    }
  }
  return html + '<div class="console-cursor">\u258a</div></div>';
}

/* ---------- section renderers, keyed by section.type ---------- */
function secHead(sec) {
  var html = '';
  if (sec.label) html += '<div class="sec-label">' + esc(sec.label) + '</div>';
  if (sec.heading) html += '<h3>' + esc(sec.heading) + '</h3>';
  return html;
}

var SECTION_RENDERERS = {

  hook: function (sec) {
    return '<div class="hook"><p>' + codeify(sec.text) + '</p></div>';
  },

  /* paragraphs are authored markup — <strong> is allowed on purpose */
  prose: function (sec) {
    var html = '<div class="sec">' + secHead(sec);
    for (var i = 0; i < sec.paragraphs.length; i++) html += '<p>' + codeifyHTML(sec.paragraphs[i]) + '</p>';
    return html + '</div>';
  },

  /* one punctuation mark, shown large, with a plain-English read and a
     "here is what breaks" note. paragraphs/breaks are authored markup. */
  symbol: function (sec) {
    var html = '<div class="sec symbol-sec">' +
      '<div class="symbol-head">' +
        '<span class="symbol-glyph">' + esc(sec.symbol) + '</span>' +
        '<span class="symbol-name">' + esc(sec.name) + '</span>' +
      '</div>';
    for (var i = 0; i < sec.paragraphs.length; i++) html += '<p>' + codeifyHTML(sec.paragraphs[i]) + '</p>';
    if (sec.code) html += renderLessonCode(sec.code, null, null);
    if (sec.breaks) {
      html += '<div class="symbol-breaks"><span class="sb-label">MISSING OR WRONG</span>' +
              codeifyHTML(sec.breaks) + '</div>';
    }
    return html + '</div>';
  },

  analogy: function (sec) {
    var html = '<div class="sec">' + secHead(sec) + '<div class="analogy">' +
               '<div class="analogy-row head"><span class="ac">' + esc(sec.head[0]) + '</span>' +
               '<span class="ac">' + esc(sec.head[1]) + '</span></div>';
    for (var i = 0; i < sec.rows.length; i++) {
      html += '<div class="analogy-row"><span class="ac">' + codeify(sec.rows[i][0]) + '</span>' +
              '<span class="ac">' + codeify(sec.rows[i][1]) + '</span></div>';
    }
    return html + '</div></div>';
  },

  /* intro -> code -> Run -> console. The workhorse of a beginner lesson. */
  step: function (sec, lesson, idx) {
    var key = lesson.id + '-step' + idx;
    var html = '<div class="sec">' + secHead(sec);
    for (var i = 0; i < sec.paragraphs.length; i++) html += '<p>' + codeifyHTML(sec.paragraphs[i]) + '</p>';
    html += renderLessonCode(sec.code, sec.filename || null, null);
    if (sec.predict) { LPREDICTS[key] = sec.predict; html += renderPredictGate(key, sec.predict); }
    html += renderRunRow(key, sec.code, sec.fallbackOutput, sec.afterRun);
    return html + '</div>';
  },

  demo: function (sec, lesson, idx) {
    var key = lesson.id + '-demo' + idx;
    var html = '<div class="sec">' + secHead(sec) + '<p>' + codeify(sec.intro) + '</p>';
    html += renderLessonCode(sec.code, sec.filename, sec.annotations);
    html += renderAnnoKey(sec.annotations);
    html += renderRunRow(key, sec.code, sec.fallbackOutput, sec.afterRun);
    return html + '</div>';
  },

  variations: function (sec, lesson, idx) {
    var html = '<div class="sec">' + secHead(sec) + '<p>' + codeify(sec.intro) + '</p>';
    for (var i = 0; i < sec.items.length; i++) {
      var item = sec.items[i];
      var key = lesson.id + '-var' + idx + '-' + i;
      html += '<div class="variation">' +
                '<div class="var-head">' + esc(item.title) +
                  '<span class="var-tag">' + esc(item.tag) + '</span></div>' +
                renderLessonCode(item.code, null, null) +
                (item.predict ? (LPREDICTS[key] = item.predict, renderPredictGate(key, item.predict)) : '') +
                renderRunRow(key, item.code, item.fallbackOutput, null) +
                '<div class="var-note">' + codeify(item.note) + '</div>' +
              '</div>';
    }
    return html + '</div>';
  },

  pitfalls: function (sec) {
    var html = '<div class="sec">' + secHead(sec) + '<div class="pitfalls">';
    for (var i = 0; i < sec.items.length; i++) {
      html += '<div class="pitfall"><span class="pf-icon">!</span>' +
                '<span class="pf-text"><b>' + esc(sec.items[i].bold) + '</b> ' +
                codeify(sec.items[i].rest) + '</span></div>';
    }
    html += '</div>';
    if (sec.note) html += '<div class="pitfalls-note">' + codeify(sec.note) + '</div>';
    return html + '</div>';
  },

  checkpoint: function (sec, lesson) {
    var done = lessonDone(lesson);
    var html = '<div class="checkpoint"><h3>' + esc(sec.heading) + '</h3><div class="abilities">';
    for (var i = 0; i < sec.abilities.length; i++) {
      html += '<div class="ability"><span class="ab-tick">-</span><span>' +
              codeify(sec.abilities[i]) + '</span></div>';
    }
    html += '</div>';
    if (done) {
      html += '<div class="done-state"><span>[ OK ]</span><span>' + esc(sec.doneLabel) + '</span></div>' +
              '<button class="undo-link" data-lesson-undo="' + esc(lesson.id) + '">' +
                esc(sec.undoLabel) + '</button>' +
              '<div class="next-step">Ready to try it on real broken code? ' +
                '<button data-goto-practice="1">[ GO TO PRACTICE ]</button></div>';
    } else {
      html += '<button class="btn btn-green" data-lesson-done="' + esc(lesson.id) + '">' +
              esc(sec.buttonLabel) + '</button>';
    }
    return html + '</div>';
  }
};

/* ---------- screens ---------- */
function renderLessonList() {
  var done = 0;
  for (var i = 0; i < LESSONS.length; i++) if (lessonDone(LESSONS[i])) done++;

  var html = '<div class="lessons-head"><h2>Learn</h2>' +
    '<p>Short lessons that explain the idea before you go hunting for it in broken code. ' +
    'No quizzes and nothing locked — read one whenever you want firmer ground.</p>' +
    '<span class="lessons-count">' + done + ' of ' + LESSONS.length + ' complete</span></div>' +
    '<div class="lesson-list">';

  for (var j = 0; j < LESSONS.length; j++) {
    var l = LESSONS[j];
    var isDone = lessonDone(l);
    html += '<button class="lesson-item' + (isDone ? ' done' : '') + '" data-lesson="' + esc(l.id) + '">' +
              '<span class="lesson-check">' + (isDone ? '[x]' : '[' + (j + 1) + ']') + '</span>' +
              '<span class="lc-body">' +
                '<span class="lc-title">' + esc(l.title) + '</span>' +
                '<span class="lc-blurb">' + esc(l.blurb) + '</span>' +
                '<span class="lc-meta">' + (isDone ? '[x] COMPLETED' : l.minutes + ' MIN READ') + '</span>' +
              '</span></button>';
  }
  document.getElementById('screen-lessons').innerHTML = html + '</div>';
}

function renderLessonPage(id) {
  var lesson = findLesson(id);
  if (!lesson) { renderLessonList(); show('screen-lessons'); return; }
  RUNNABLES = {};
  LPREDICTS = {};

  var html = '<button class="back-link" data-back-to-lessons="1">[ BACK TO LESSONS ]</button>' +
             '<h1 class="lesson-title">' + esc(lesson.title) + '</h1>' +
             '<div class="lesson-sub">' + lesson.minutes + ' min read' +
             (lessonDone(lesson) ? ' · [x] completed' : '') + '</div>';

  for (var i = 0; i < lesson.sections.length; i++) {
    var sec = lesson.sections[i];
    var render = SECTION_RENDERERS[sec.type];
    if (render) html += render(sec, lesson, i);
  }
  document.getElementById('screen-lesson').innerHTML = html;
  show('screen-lesson');
}

/* ---------- tabs ---------- */
function syncChrome() {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].getAttribute('data-view') === state.view);
  }
  document.getElementById('practiceProgress').hidden = state.view !== 'practice';
  document.getElementById('moduleLabel').textContent = state.view === 'learn'
    ? 'Module 1 · Concepts'
    : 'Module 1 · Reading Errors Without Panicking';
}

function enterLearn() {
  state.view = 'learn';
  saveState();
  syncChrome();
  renderLessonList();
  show('screen-lessons');
}

/* First-run intro (also reachable anytime via the header "[ about ]" link).
   Sits in front of the app; it changes nothing until the user acts. */
function renderWelcome() {
  var el = document.getElementById('screen-welcome');
  el.innerHTML =
    '<div class="welcome">' +
      '<div class="welcome-brand"><span class="siren">$</span>VIBE COACH</div>' +
      '<p class="welcome-lede">A place to learn to read, understand, and debug ' +
        'AI-generated code — one small concept at a time.</p>' +
      '<p class="welcome-real">This will not make you a developer on its own — nothing does ' +
        'except building real things and getting stuck. Think of it as the manual you keep open ' +
        'while you do that: a place to drill error-reading and look up what a symbol means when ' +
        'you are confused.</p>' +
      '<div class="welcome-paths">' +
        '<div class="welcome-path"><span class="wp-tag">[ LEARN ]</span>' +
          '<span class="wp-text">Short lessons that build up from zero: what code is, what the ' +
          'symbols mean, how functions work.</span></div>' +
        '<div class="welcome-path"><span class="wp-tag">[ PRACTICE ]</span>' +
          '<span class="wp-text">Drills where you read broken AI code and find what is wrong.</span></div>' +
      '</div>' +
      '<div class="welcome-actions">' +
        '<button class="btn btn-primary" id="btnStartLearning">[ START LEARNING ]</button></div>' +
    '</div>';
  document.getElementById('btnStartLearning').addEventListener('click', enterLearn);
  document.getElementById('practiceProgress').hidden = true;   // no practice chrome on welcome
  show('screen-welcome');
}

/* Coming back to Practice drops you where you were, not on the welcome screen. */
function enterPractice() {
  state.view = 'practice';
  saveState();
  syncChrome();
  if (moduleComplete()) { renderSummary(); show('screen-summary'); }
  else if (state.started) { renderChallenge(state.current); show('screen-challenge'); }
  else renderHome();
}

document.addEventListener('click', function (e) {
  if (!e.target.closest) return;
  var el;

  if (e.target.closest('#aboutLink')) { renderWelcome(); return; }

  if ((el = e.target.closest('.tab'))) {
    var v = el.getAttribute('data-view');
    if (v === 'learn') enterLearn(); else enterPractice();
    return;
  }
  if ((el = e.target.closest('[data-lesson]'))) {
    renderLessonPage(el.getAttribute('data-lesson'));
    return;
  }
  if (e.target.closest('[data-back-to-lessons]')) {
    renderLessonList();
    show('screen-lessons');
    return;
  }
  if ((el = e.target.closest('[data-lesson-done]'))) {
    state.lessonsDone[el.getAttribute('data-lesson-done')] = true;
    saveState();
    renderLessonPage(el.getAttribute('data-lesson-done'));
    return;
  }
  if ((el = e.target.closest('[data-lesson-undo]'))) {
    delete state.lessonsDone[el.getAttribute('data-lesson-undo')];
    saveState();
    renderLessonPage(el.getAttribute('data-lesson-undo'));
    return;
  }
  if (e.target.closest('[data-goto-practice]')) enterPractice();
});

/* run buttons inside lessons */
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('[data-run]');
  if (!btn) return;
  var key = btn.getAttribute('data-run');
  var entry = RUNNABLES[key];
  if (!entry) return;

  var lines = runSnippet(entry.code, entry.fallback);
  var con = document.getElementById('con-' + key);
  con.innerHTML = renderMiniConsole(lines);
  con.hidden = false;

  var hint = document.getElementById('hint-' + key);
  if (hint) hint.textContent = 'executed — live output below';
  var after = document.getElementById('after-' + key);
  if (after) after.hidden = false;
  btn.textContent = '[ RUN AGAIN ]';
});

/* =====================================================================
   TOKEN TOOLTIPS + COLOR LEGEND
   Hover explains a token on desktop; tap does it on touch screens.
   ===================================================================== */
var tipEl = document.getElementById('tokTip');
var backdropEl = document.getElementById('legendBackdrop');
var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);

function closestTok(node) {
  return node && node.closest ? node.closest('[data-tok]') : null;
}

function showTip(target) {
  var info = TOK_INFO[target.getAttribute('data-tok')];
  if (!info) return;
  tipEl.innerHTML = '<span class="tip-label" style="color:' + info.color + '">' +
                    info.label + '</span>' + esc(info.text);
  tipEl.classList.add('visible');

  // Measure, then place above the token — flipping below if there's no room.
  var r = target.getBoundingClientRect();
  var tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  var left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  var top = r.top - th - 8;
  if (top < 8) top = r.bottom + 8;
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}

function hideTip() { tipEl.classList.remove('visible'); }

document.addEventListener('mouseover', function (e) {
  if (!canHover) return;
  var t = closestTok(e.target);
  if (t) showTip(t);
});
document.addEventListener('mouseout', function (e) {
  if (!canHover) return;
  if (closestTok(e.target)) hideTip();
});

/* Tap: explain the token — unless this line is a pickable answer, where the
   tap belongs to the challenge. Tapping anywhere else dismisses. */
document.addEventListener('click', function (e) {
  var t = closestTok(e.target);
  var inPickableLine = e.target.closest && e.target.closest('.code-line.clickable');
  if (t && !inPickableLine) showTip(t);
  else hideTip();
});
window.addEventListener('scroll', hideTip, true);
window.addEventListener('resize', hideTip);

function buildLegend() {
  var order = ['kw', 'str', 'num', 'fn', 'var', 'prop', 'com', 'tag', 'attr'];
  var html = '';
  for (var i = 0; i < order.length; i++) {
    var info = TOK_INFO[order[i]];
    html += '<div class="legend-row">' +
              '<span class="legend-sample" style="color:' + info.color + '">' + info.sample + '</span>' +
              '<span class="legend-desc"><strong>' + info.label + '</strong>' + esc(info.text) + '</span>' +
            '</div>';
  }
  document.getElementById('legendRows').innerHTML = html;
  document.getElementById('legendHint').textContent = canHover
    ? 'Tip: hover any colored word in the code to get just that one explained.'
    : 'Tip: tap any colored word in the code to get just that one explained.';
}

function openLegend() { hideTip(); backdropEl.classList.add('open'); }
function closeLegend() { backdropEl.classList.remove('open'); }

document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('[data-legend]')) openLegend();
});

/* ---------- line-by-line explainer toggle ---------- */
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('[data-explain]');
  if (!btn) return;
  var body = btn.parentNode.querySelector('.explainer-body');
  var isOpen = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  body.hidden = isOpen;
  btn.querySelector('.toggle-label').textContent =
    isOpen ? 'Explain line by line' : 'Hide line-by-line';
  btn.querySelector('.caret').textContent = isOpen ? '[+]' : '[-]';
});
document.getElementById('legendClose').addEventListener('click', closeLegend);
backdropEl.addEventListener('click', function (e) {
  if (e.target === backdropEl) closeLegend();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeLegend(); hideTip(); }
});

/* =====================================================================
   BOOT
   ===================================================================== */
buildLegend();
updateProgress();
syncChrome();
if (firstVisit) renderWelcome();          // no saved progress -> intro first
else if (state.view === 'learn') enterLearn();
else renderHome();

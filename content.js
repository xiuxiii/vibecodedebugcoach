/* Vibe Coach — content only: challenges, lessons, and the syntax-colour
   legend. Loaded before app.js, which renders all of this. */
'use strict';

/* =====================================================================
   CHALLENGE DATA — Module 1: Reading Errors Without Panicking
   types: 'mc'   = multiple choice, "what does this error mean?"
          'line' = click the line number that CAUSED the error
          'exam' = free-text root cause + model answer + honest self-grade
   ===================================================================== */
var CHALLENGES = [

  /* ---------------- Phase 1 (1-8): what is the error telling you? ---------------- */
  {
    id: 1, type: 'mc',
    title: 'The property path that never was',
    lesson: {
      kind: 'TypeError',
      where: 'Console tab',
      text: "This is the single most common error you'll hit with AI-written code, and it always shows up in the Console tab in red. The wording sounds scary but it's saying something simple: \"you asked me for something inside a box, and that box isn't there.\" The key trick is to read the name in quotes at the end — that's what you were reaching FOR, which means the thing just before it in your code is the empty one. So when it says reading 'items', the problem isn't items; it's whatever you expected to be holding items."
    },
    filename: 'app.js',
    code:
"async function loadProducts() {\n" +
"  const response = await fetch('/api/products');\n" +
"  const data = await response.json();\n" +
"  const items = data.data.items;\n" +
"  items.forEach(function (p) { renderCard(p); });\n" +
"}",
    lineExplanations: [
      'Defines a function called "loadProducts" and marks it "async", which means it is allowed to pause and wait for slow work to finish.',
      'Asks the server for the products and waits right here until a reply comes back. The reply gets stored in a variable called "response".',
      'Unpacks that reply into usable data and waits for the unpacking to finish too. The result is stored as "data".',
      'Reaches into "data" for a piece called "data", then for "items" inside that, and stores whatever it finds.',
      'Goes through "items" one at a time and draws a card on the page for each one.',
      'Closes the function. Nothing runs here — it just marks the end.'
    ],
    error: { msg: "Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'items')", src: 'app.js:4' },
    question: 'What is this error actually telling you?',
    options: [
      'The API request failed, so no data came back at all',
      'The items array is empty, so there is nothing to loop over',
      "data.data doesn't exist — the code is reaching into a property path the response never had",
      'The JSON in the response was malformed and could not be parsed'
    ],
    correct: 2,
    explanation: "The phrase \"reading 'items'\" means JavaScript tried to grab .items off something that was undefined — and that something is data.data. The request worked and the JSON parsed fine; the code just guessed the wrong shape (the products are probably at data.results or just data). AI assistants invent response shapes all the time — log the actual response and look at what's really there."
  },

  {
    id: 2, type: 'mc',
    title: 'A method the browser has never heard of',
    lesson: {
      kind: 'TypeError — "is not a function"',
      where: 'Console tab',
      text: "Here's a different flavor of the same red console error. \"Is not a function\" means you tried to DO something to a thing, and that thing has no idea how to do it. There are two reasons this happens: either you've got the wrong kind of thing, or the action you asked for simply doesn't exist. AI assistants are unusually good at inventing action names that sound completely real — so when the name in the error looks reasonable but the browser insists it isn't a function, take the browser's word for it."
    },
    filename: 'app.js',
    code:
"const button = document.querySelector('#save-btn');\n" +
"button.addClickListener(function () {\n" +
"  saveDraft();\n" +
"});",
    lineExplanations: [
      'Searches the page for the element whose id is "save-btn" and stores it in a variable called "button".',
      'Attaches a click handler to that button using a method named "addClickListener".',
      'The instruction meant to run on every click: call "saveDraft".',
      'Closes the handler and the call that was opened two lines above.'
    ],
    error: { msg: 'Uncaught TypeError: button.addClickListener is not a function', src: 'app.js:2' },
    question: 'What is this error actually telling you?',
    options: [
      "The button doesn't exist in the HTML yet when this code runs",
      "addClickListener isn't a real method — the browser has literally never heard of it",
      'The saveDraft function has not been defined at this point',
      'You cannot attach more than one click handler to the same button'
    ],
    correct: 1,
    explanation: "\"X is not a function\" on a method name usually means that method simply doesn't exist on the object. The button was found just fine — but the AI invented addClickListener, which sounds right but isn't a thing. The real API is addEventListener('click', ...). Plausible-sounding-but-fake method names are one of the most common flavors of AI slop."
  },

  {
    id: 3, type: 'mc',
    title: 'The half-renamed variable',
    lesson: {
      kind: 'ReferenceError',
      where: 'Console tab',
      text: "A ReferenceError is a completely different beast from the errors you just saw, and the difference matters. The others meant \"this thing exists but it's empty.\" This one means \"I have never heard this name in my life.\" Nothing was ever labeled with that name anywhere the code can see. Nine times out of ten in AI-generated code, that's because something got renamed in one place and not another — so your fastest move is to search the file for the mystery name and see what it used to be called."
    },
    filename: 'profile.js',
    code:
"function displayProfile(profileData) {\n" +
"  const name = profileData.name;\n" +
"  document.querySelector('#username').textContent = name;\n" +
"  document.querySelector('#bio').textContent = userData.bio;\n" +
"}",
    lineExplanations: [
      'Defines a function that expects to be handed one thing, which it will refer to as "profileData".',
      'Pulls the "name" out of "profileData" and stores it in a variable called "name".',
      'Finds the element with the id "username" and sets the text you see in it to that name.',
      'Finds the element with the id "bio" and sets its text to the "bio" taken from "userData".',
      'Closes the function.'
    ],
    error: { msg: 'Uncaught ReferenceError: userData is not defined', src: 'profile.js:4' },
    question: 'What is this error actually telling you?',
    options: [
      'userData has no value yet because the API has not responded',
      'The .bio property is missing from the profile object',
      'The function was called before it was defined',
      "No variable named userData exists anywhere in scope — nothing was ever called that"
    ],
    correct: 3,
    explanation: "A ReferenceError means the name itself doesn't exist — which is different from a variable that exists but happens to be empty. What happened here: the AI renamed the parameter to profileData but forgot to update one leftover spot that still says userData. Half-finished renames are classic slop from partial edits — search the file for the old name and you'll find the stragglers."
  },

  {
    id: 4, type: 'mc',
    title: 'Unexpected token \'<\'',
    lesson: {
      kind: 'SyntaxError while reading a server reply',
      where: 'Console tab — then go straight to the Network tab',
      text: "This error appears in the Console, but the Console is the wrong place to solve it. It means your code asked the server for data, expected a neat little data package back, and got handed something else entirely. The browser then choked while trying to unwrap it. The single most useful habit here: open the Network tab, click the request, and look at the Response — you'll see exactly what the server actually sent, which is usually nothing like what the code assumed."
    },
    filename: 'settings.js',
    code:
"fetch('/api/user/settings')\n" +
"  .then(function (res) { return res.json(); })\n" +
"  .then(function (settings) {\n" +
"    applyTheme(settings.theme);\n" +
"  });",
    lineExplanations: [
      'Starts a request to the server for the settings at "/api/user/settings".',
      'Once a reply arrives, unpacks it and passes the result along to the next step.',
      'Takes that unpacked result, calls it "settings", and begins the next step with it.',
      'Reads "theme" out of "settings" and hands it to "applyTheme".',
      'Closes the second step and finishes the chain.'
    ],
    error: { msg: "Uncaught (in promise) SyntaxError: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON", src: 'settings.js:2' },
    question: 'What is this error actually telling you?',
    options: [
      "The server sent back an HTML page (probably a 404 or error page), not JSON",
      "There is a stray < typo somewhere in this JavaScript file",
      'The JSON response has a syntax error that the backend needs to fix',
      'res.json() was called before the response finished arriving'
    ],
    correct: 0,
    explanation: "That \"<!DOCTYPE\" in the error is the giveaway: the browser tried to parse a webpage as if it were JSON. Servers answer requests for missing URLs with an HTML error page, and this code trustingly fed that page into res.json(). The URL is probably wrong or the endpoint doesn't exist — open the Network tab and look at what actually came back."
  },

  {
    id: 5, type: 'mc',
    title: 'Filtering an IOU',
    lesson: {
      kind: 'TypeError caused by waiting (or not waiting)',
      where: 'Console tab — often tagged "(in promise)"',
      text: "Some things in code take time: fetching from a server, reading a file, anything that leaves the page. Instead of freezing everything, the browser hands you a claim ticket and lets your code keep running. You're supposed to redeem that ticket before using the goods — that's what the word await does. If you forget it, you end up holding the ticket and trying to use it as if it were the actual data, and the error you get names an action the ticket can't perform."
    },
    filename: 'scores.js',
    code:
"async function showTopScores() {\n" +
"  const scores = fetchScores();\n" +
"  const top = scores.filter(function (s) { return s.value > 90; });\n" +
"  renderLeaderboard(top);\n" +
"}",
    lineExplanations: [
      'Defines a function that can wait for slow operations (like fetching data) to finish before moving on.',
      'Calls another function to get the scores. The result gets stored in a variable called "scores".',
      'Goes through "scores" and keeps only the ones whose "value" is above 90, storing those as "top".',
      'Hands that shortlist to "renderLeaderboard" so it can be shown on the page.',
      'Closes the function.'
    ],
    error: { msg: 'Uncaught (in promise) TypeError: scores.filter is not a function', src: 'scores.js:3' },
    question: 'What is this error actually telling you?',
    options: [
      'The scores array is empty, so there is nothing to filter',
      'fetchScores returned a single object instead of an array',
      "scores is a Promise — an IOU for data that hasn't arrived — because the await is missing",
      'filter cannot be used inside an async function'
    ],
    correct: 2,
    explanation: "Calling an async function without await hands you back a Promise — a \"your data is on the way\" ticket — instead of the data itself. Promises don't have .filter, so the code explodes. When you see \"X.filter/map/forEach is not a function\" right after calling something async, the missing word is almost always await."
  },

  {
    id: 6, type: 'mc',
    title: 'Talking to a page that isn\'t built yet',
    lesson: {
      kind: 'TypeError on null',
      where: 'Console tab — cross-check in the Elements tab',
      text: "When you go looking for something on the page and it isn't there, the browser doesn't complain — it just quietly hands back \"nothing\" and lets your code carry on. The complaint comes one step later, when you try to use that nothing. So an error mentioning null is really a message about a search that came up empty. Two things cause it: you searched for a name that doesn't match what's in the page, or you searched before the browser had finished building that part of the page."
    },
    filename: 'index.html + app.js',
    code:
"<!-- index.html -->\n" +
"<head>\n" +
"  <script src=\"app.js\"><\/script>\n" +
"</head>\n" +
"<body>\n" +
"  <form id=\"signup-form\"> ... </form>\n" +
"</body>\n" +
"\n" +
"// app.js\n" +
"const form = document.getElementById('signup-form');\n" +
"form.addEventListener('submit', handleSignup);",
    lineExplanations: [
      'A note marking which file this part comes from. Browsers ignore it completely.',
      'Opens the "head" of the page — the setup area, which holds nothing a visitor can see.',
      'Loads "app.js" and runs it at this point in the page.',
      'Closes the "head" section.',
      'Opens the "body" — everything a visitor actually sees.',
      'A form on the page, labelled with the id "signup-form" so code can find it later.',
      'Closes the "body".',
      'A blank line separating the page markup above from the JavaScript below.',
      'A note saying the lines below live in "app.js".',
      'Searches the page for the element with the id "signup-form" and stores whatever it finds as "form".',
      'Asks that form to run "handleSignup" whenever it gets submitted.'
    ],
    error: { msg: "Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')", src: 'app.js:2' },
    question: 'What is this error actually telling you?',
    options: [
      "The id 'signup-form' has a typo in it somewhere",
      "The script runs in <head>, before the form exists on the page — so getElementById found nothing",
      'handleSignup has not been defined yet when the listener is attached',
      'addEventListener does not work on form elements, only buttons'
    ],
    correct: 1,
    explanation: "null here means getElementById came back empty-handed. The id matches perfectly — the problem is timing. The script loaded inside <head> and ran immediately, while the browser hadn't yet built the form further down the page. Move the script tag to the end of <body>, or add the defer attribute, and the exact same code works."
  },

  {
    id: 7, type: 'mc',
    title: 'The cart that became "[object Object]"',
    lesson: {
      kind: 'SyntaxError from saved data',
      where: 'Console tab — inspect the saved value under Application → Local Storage',
      text: "Browsers can remember things between visits, but that memory only holds plain text. If you hand it something structured — a shopping cart, a list, a settings object — it doesn't refuse; it flattens it into a useless scrap of text and stores that instead. Nothing goes wrong at that moment, which is what makes this one nasty. The error only appears much later, when you try to unpack what you saved and find gibberish where your data should be."
    },
    filename: 'cart.js',
    code:
"const cart = { items: [], total: 0 };\n" +
"localStorage.setItem('cart', cart);\n" +
"\n" +
"// ...later, on page load:\n" +
"const saved = JSON.parse(localStorage.getItem('cart'));\n" +
"restoreCart(saved);",
    lineExplanations: [
      'Creates a "cart" holding two pieces: an empty list of "items", and a "total" of 0.',
      'Saves that cart into storage in the browser under the name "cart".',
      'A blank line separating the saving from the loading.',
      'A note for the reader: the lines below run on a later visit, not right away.',
      'Reads back whatever was stored under "cart" and converts that text into usable data.',
      'Hands the recovered cart to "restoreCart" so it can be put back on screen.'
    ],
    error: { msg: "Uncaught SyntaxError: Unexpected token 'o', \"[object Obj\"... is not valid JSON", src: 'cart.js:5' },
    question: 'What is this error actually telling you?',
    options: [
      'The cart object was too large to fit in localStorage',
      'JSON.parse cannot handle objects that contain arrays',
      "The 'cart' key does not exist in localStorage yet",
      "localStorage saved the literal text \"[object Object]\" because the object was never turned into JSON first"
    ],
    correct: 3,
    explanation: "localStorage can only store strings. Handed a raw object, it silently converts it to the useless text \"[object Object]\" — and later, JSON.parse chokes on that text (the 'o' in the error is object's own 'o'). Save with localStorage.setItem('cart', JSON.stringify(cart)) and the round-trip works. Silent conversion + loud crash later is a classic pairing."
  },

  {
    id: 8, type: 'mc',
    title: 'The thing that looks like an array',
    lesson: {
      kind: 'TypeError — "is not a function"',
      where: 'Console tab',
      text: "When you grab a group of elements from the page, what you get back isn't always a proper list — sometimes it's a lookalike that holds the same items but can't do all the same tricks. It counts, and you can pull items out by position, but the convenient \"do this to every item\" shortcut may be missing. The error looks identical to a made-up method name, so you have to ask a second question: is this action fake, or is it real but unavailable on this particular kind of thing? Here, it's real — just not on that."
    },
    filename: 'gallery.js',
    code:
"const cards = document.getElementsByClassName('card');\n" +
"cards.forEach(function (card) {\n" +
"  card.classList.add('visible');\n" +
"});",
    lineExplanations: [
      'Collects every element on the page carrying the class "card" and stores the whole group as "cards".',
      'Walks through that group one item at a time, calling each one "card".',
      'For each one, adds the class "visible" — which is what the styling uses to reveal it.',
      'Closes the loop.'
    ],
    error: { msg: 'Uncaught TypeError: cards.forEach is not a function', src: 'gallery.js:2' },
    question: 'What is this error actually telling you?',
    options: [
      "getElementsByClassName returns a collection that looks like an array but isn't one — it has no forEach",
      "No elements with class 'card' exist, so cards is undefined",
      'classList.add cannot be called from inside a loop',
      'forEach only works on arrays created with square brackets in your own code'
    ],
    correct: 0,
    explanation: "getElementsByClassName returns an HTMLCollection — an \"array-like\" object you can index into, but which is missing real array methods like forEach. (Note: even with zero matching elements you'd get an empty collection, not this error.) Use document.querySelectorAll instead — its result does have forEach — or spread the collection into a real array first."
  },

  /* ---------------- Phase 2 (9-12): which line CAUSED it? ---------------- */
  {
    id: 9, type: 'line',
    title: 'The crash site vs. the crime scene',
    lesson: {
      kind: 'New skill: tracing backwards',
      where: 'Console tab — the line number on the right',
      text: "You can read errors now. This next stretch is about a harder question: which line do you actually go fix? Every console error points at a line number, and beginners treat that as the answer — but it's only where the damage surfaced. Bad values travel: a line can quietly produce something empty or wrong, and the crash happens later, wherever that value finally gets used. So read the flagged line, find the thing that was empty, then walk backwards to wherever it came from."
    },
    filename: 'signup.js',
    code:
"// HTML has: <input id=\"email-input\" type=\"email\">\n" +
"const field = document.getElementById('emailInput');\n" +
"const btn = document.getElementById('submit-btn');\n" +
"btn.addEventListener('click', function () {\n" +
"  const email = field.value.trim();\n" +
"  sendWelcome(email);\n" +
"});",
    lineExplanations: [
      'A note showing what the real page contains: an input box whose id is "email-input".',
      'Searches the page for an element with the id "emailInput" and stores the result as "field".',
      'Searches for the element with the id "submit-btn" and stores it as "btn".',
      'Asks that button to run the instructions below whenever it gets clicked.',
      'Reads whatever was typed into "field" and trims off stray spaces at either end.',
      'Passes that address along to "sendWelcome".',
      'Closes the click handler.'
    ],
    error: { msg: "Uncaught TypeError: Cannot read properties of null (reading 'value')", src: 'signup.js:5' },
    question: 'The console says it blew up at line 5 — but which line actually planted the bomb? Tap a line number.',
    correctLine: 2,
    explanation: "Line 5 is just where the body was found. The real crime happened on line 2: it asked for the id 'emailInput', but the HTML says 'email-input' — so getElementById quietly returned null, which sat there harmlessly until line 5 touched it. The line in the error message is where things surfaced, not always where they started."
  },

  {
    id: 10, type: 'line',
    title: 'The bill that came to $42.510',
    lesson: {
      kind: 'TypeError from a value quietly changing type',
      where: 'Console tab',
      text: "Anything a user types into a box arrives as text, even when it's obviously a number — \"10\" is not 10. This matters because the plus sign does two completely different jobs: it adds numbers, and it glues text together. Mix a number with text and it picks gluing, silently, with no complaint. You get a nonsense value that looks almost right, and it doesn't blow up until some later line tries to treat it as a number again."
    },
    filename: 'checkout.js',
    code:
"const priceEl = document.querySelector('#price');\n" +
"const tipInput = document.querySelector('#tip');\n" +
"const bill = 42.50;\n" +
"const total = bill + tipInput.value;\n" +
"priceEl.textContent = '$' + total.toFixed(2);",
    lineExplanations: [
      'Finds the element with the id "price" — the spot on the page where the total will be shown.',
      'Finds the box with the id "tip", where the customer types their tip.',
      'Sets "bill" to 42.50.',
      'Combines "bill" with whatever is sitting in the tip box and stores the outcome as "total".',
      'Rounds "total" to two decimal places, puts a dollar sign in front, and writes it onto the page.'
    ],
    error: { msg: 'Uncaught TypeError: total.toFixed is not a function', src: 'checkout.js:5' },
    question: 'The error is thrown at line 5 — which line actually caused it? Tap a line number.',
    correctLine: 4,
    explanation: "Every input's .value is text, even when it looks like a number. On line 4, + saw a number and a string and chose gluing over adding: 42.5 + \"10\" became the string \"42.510\". Strings don't have .toFixed, so line 5 detonated. Fix the cause, not the crash site: convert first with Number(tipInput.value)."
  },

  {
    id: 11, type: 'line',
    title: 'Hey, undefined!',
    lesson: {
      kind: 'TypeError from a missing wait',
      where: 'Console tab — note the "(in promise)" tag',
      text: "You met the claim-ticket idea back in challenge 5. Now you're tracing it to its source. A forgotten wait doesn't cause trouble on the line where it happens — that line looks perfectly fine and runs without complaint. Instead it hands a ticket to everything downstream, and the crash lands on whichever line first tries to use the data for real. When you see \"(in promise)\" on an error, start scanning upward for a call that should have been waited on."
    },
    filename: 'greet.js',
    code:
"async function greetUser() {\n" +
"  const user = getCurrentUser();\n" +
"  const banner = document.querySelector('#banner');\n" +
"  const first = user.name.split(' ')[0];\n" +
"  banner.textContent = 'Hey, ' + first + '!';\n" +
"}",
    lineExplanations: [
      'Defines a function that is allowed to pause and wait for slow work to finish.',
      'Calls "getCurrentUser" and stores whatever comes back in a variable called "user".',
      'Finds the element with the id "banner", which is where the greeting will go.',
      'Takes the "name" off "user", breaks it apart at the spaces, and keeps the first piece.',
      'Glues that first name into a greeting and writes the result into the banner.',
      'Closes the function.'
    ],
    error: { msg: "Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'split')", src: 'greet.js:4' },
    question: 'The crash happens at line 4 — which line is actually to blame? Tap a line number.',
    correctLine: 2,
    explanation: "Line 2 calls an async function without await, so user is a Promise — an IOU — not an actual user. A Promise has no .name, so user.name is undefined, and line 4 dies trying to .split() it. One missing word on line 2 (await) and everything downstream of it is haunted. This exact shape — missing await up top, crash further down — is everywhere in AI-generated code."
  },

  {
    id: 12, type: 'line',
    title: 'The wrapper property that was never there',
    lesson: {
      kind: 'TypeError from an imagined data shape',
      where: 'Console tab — confirm the real shape in the Network tab',
      text: "Different servers wrap their answers differently: some hand you the list directly, others tuck it inside a labeled box first. An AI assistant can't know which one yours does, so it guesses — confidently, and often wrong. The tell is an error naming a label you've never actually seen in the real response. When that happens, the guilty line isn't where it crashed; it's wherever the code first reached for that imagined label."
    },
    filename: 'comments.js',
    code:
"async function loadComments() {\n" +
"  const res = await fetch('/api/comments');\n" +
"  const data = await res.json();\n" +
"  const list = data.comments;\n" +
"  list.forEach(addComment);\n" +
"}",
    lineExplanations: [
      'Defines a function that can wait for slow work to finish.',
      'Asks the server for the comments and waits right here until it replies.',
      'Unpacks that reply into usable data, waiting for the unpacking to finish.',
      'Reaches into "data" for a piece called "comments" and stores it as "list".',
      'Walks through "list" and runs "addComment" on every entry.',
      'Closes the function.'
    ],
    error: { msg: "Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'forEach')", src: 'comments.js:5' },
    question: 'This API returns a plain array of comments, like [ {...}, {...} ]. The error fires at line 5 — which line caused it? Tap a line number.',
    correctLine: 4,
    explanation: "The API hands back the array directly, but line 4 confidently reaches for data.comments — a wrapper property the AI imagined. That gives undefined, which line 5 then tries to loop over. When an error names a property you never see in the actual response, the bug is wherever the code invented that property, not where it crashed."
  },

  /* ---------------- Phase 3 (16-18): PREDICT THE OUTPUT ----------------
     Commit to an answer, then the app really executes the snippet and shows
     what came back. Ids are 16-18 because they were added after the exams;
     position in this array is what sets the running order. -------------- */
  {
    id: 16, type: 'predict',
    title: 'Same symbol, two jobs',
    lesson: {
      kind: 'New skill: predicting output',
      where: 'Console tab',
      text: "Reading an error is reacting. Predicting output is the thing that stops you needing to. From here on you say what the code will print before you run it, then watch it actually run. Get it wrong and you learn far more than by getting it right — the gap between what you expected and what happened is exactly where a wrong mental model shows itself."
    },
    filename: 'predict.js',
    code:
      "console.log(1 + '1');\n" +
      "console.log('3' * 2);",
    lineExplanations: [
      'Adds the number 1 to the text "1" and writes the result out.',
      'Multiplies the text "3" by the number 2 and writes the result out.'
    ],
    question: 'What does this print? Commit to an answer, then run it.',
    options: ['2 then 6', '11 then 6', '11 then 32', 'It throws — you cannot mix text and numbers'],
    correct: 1,
    expected: ['11', '6'],
    explanation: "Plus is the odd one out. Given a number and some text it gives up on maths and glues them together, so 1 + '1' becomes \"11\". Every other maths symbol has no gluing behaviour to fall back on, so * quietly converts the text to a number and really multiplies: '3' * 2 is 6. This is why a total can come out as \"42.510\" instead of 52.50 — one stray + on text."
  },

  {
    id: 17, type: 'predict',
    title: 'Missing, and missing one level deeper',
    lesson: {
      kind: 'undefined vs. a thrown error',
      where: 'Console tab',
      text: 'Asking an object for something it does not have is not an error. You get back undefined, quietly, and the code carries on. It only becomes an error when you then ask undefined for something. Those are two different moments, and telling them apart is what makes the very first challenge in this module obvious rather than mysterious.'
    },
    filename: 'predict.js',
    code:
      "const user = { name: 'Sam' };\n" +
      "console.log(user.age);\n" +
      "console.log(user.age.length);",
    lineExplanations: [
      'Creates a "user" holding one piece: a "name" set to the text Sam.',
      'Asks "user" for an "age" and writes out whatever comes back.',
      'Asks that same "age" for its "length" and writes out the result.'
    ],
    question: 'What does this print? Commit to an answer, then run it.',
    options: [
      'undefined, then an error about reading length of undefined',
      'null, then 0',
      'An error on the first log — there is no age',
      'undefined, then undefined'
    ],
    correct: 0,
    expected: ['undefined'],
    explanation: "Line 2 is perfectly legal. There is no age, so you get undefined and nothing complains. Line 3 is where it dies, because undefined has no .length to give. That is the exact two-step behind \"Cannot read properties of undefined\" — a harmless miss on one line, then a crash on the next line that touched the result."
  },

  {
    id: 18, type: 'predict',
    title: 'The IOU, printed',
    lesson: {
      kind: 'What an un-awaited call really returns',
      where: 'Console tab',
      text: 'You have met the claim-ticket idea twice now. This time you see the ticket itself. An async function always hands back a promise, even when its body just returns a plain number — and printing that promise shows you something that is very obviously not your data.'
    },
    filename: 'predict.js',
    code:
      "async function getCount() {\n" +
      "  return 1;\n" +
      "}\n" +
      "\n" +
      "console.log(getCount());",
    lineExplanations: [
      'Defines a function called "getCount" and marks it "async".',
      'Its only step: hand back the number 1.',
      'Closes the function.',
      'A blank line.',
      'Calls "getCount" and writes out whatever comes back, with no await.'
    ],
    question: 'What does this print? Commit to an answer, then run it.',
    options: ['1', 'Promise {<pending>}', '[object Promise]', 'It throws — getCount was never awaited'],
    correct: 1,
    expected: ['Promise {<pending>}'],
    explanation: "The body returns 1, but the async marker wraps it, so what comes out is the promise rather than the number. Chrome prints it as Promise {<pending>} — pending because the value is not ready at the instant you logged it. Nothing throws here, which is why a missing await so often surfaces later and somewhere else, as .filter is not a function or reading a property of undefined."
  },

  /* ---------------- Phase 4 (13-15): FINAL EXAM ---------------- */
  {
    id: 13, type: 'exam',
    title: 'Final exam 1 of 3',
    lesson: {
      kind: 'Final exam — no options to pick from',
      where: 'Console tab',
      text: "Last stretch, and the training wheels come off: no choices, you just explain what went wrong in your own words. That's the real skill — being able to say why out loud is what separates \"I pasted a fix\" from \"I understood it.\" This one involves asking a server for something, and there's a step people miss constantly. Getting a reply and reading a reply are two separate actions; a sealed envelope is not a letter."
    },
    filename: 'weather.js',
    code:
"async function loadWeather() {\n" +
"  const data = await fetch('/api/weather?city=austin');\n" +
"  const temp = data.current.temp_f;\n" +
"  document.querySelector('#temp').textContent = temp + '\\u00b0F';\n" +
"}",
    lineExplanations: [
      'Defines a function that is allowed to pause and wait for slow work.',
      'Asks the weather service about Austin, waits for the reply, and stores what comes back as "data".',
      'Reaches into "data" for a piece called "current", then for "temp_f" inside that.',
      'Finds the element with the id "temp" and writes the temperature into it with a degree symbol on the end.',
      'Closes the function.'
    ],
    error: { msg: "Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'temp_f')", src: 'weather.js:3' },
    question: 'In your own words: what is the ROOT CAUSE of this error? (Not the fix — the why.)',
    modelAnswer: "fetch doesn't give you the data — it gives you a Response object (status code, headers, and so on). The actual JSON body needs a second step: await data.json(). Since a Response object has no .current property, that comes back undefined, and reading .temp_f off undefined is the crash. The await IS there, which makes this sneaky — the code awaited the envelope but never opened it.",
    explanation: "If your answer mentioned that fetch returns a Response (not the parsed data) and that the .json() step is missing, you nailed it.",
    fix: {
      intro: 'Now make it actually run. The weather service returns { current: { temp_f: 88 } }. Edit the code until the console prints 88°F.',
      env: ['fetch'],
      seed: { responses: { '/api/weather': { current: { temp_f: 88 } } } },
      broken:
        'async function loadWeather() {\n' +
        "  const data = await fetch('/api/weather?city=austin');\n" +
        '  const temp = data.current.temp_f;\n' +
        "  console.log(temp + '°F');\n" +
        '}\n' +
        '\n' +
        'await loadWeather();',
      expect: ['88°F'],
      hints: [
        'Run it first. The error names the property it could not read — work backwards from there.',
        'fetch hands you an envelope, not the letter. What is in "data" right now is the Response, which has no .current on it.',
        'Opening the envelope is its own step, and it also has to be waited for: const data = await res.json();'
      ],
      solution:
        'async function loadWeather() {\n' +
        "  const res = await fetch('/api/weather?city=austin');\n" +
        '  const data = await res.json();\n' +
        '  const temp = data.current.temp_f;\n' +
        "  console.log(temp + '°F');\n" +
        '}\n' +
        '\n' +
        'await loadWeather();'
    }
  },

  {
    id: 14, type: 'exam',
    title: 'Final exam 2 of 3',
    lesson: {
      kind: 'Final exam — the "works on my machine" class of bug',
      where: "Console tab — but only on someone else's computer",
      text: "This one's a category worth knowing, because it's invisible to the person who wrote it. Code that reads saved data works perfectly for you — you've used the app, so there's data sitting there. A brand-new visitor arrives with nothing saved, hits the same line, and it falls apart. Whenever something breaks only for new users, ask what the code assumes already exists."
    },
    filename: 'todos.js',
    code:
"function addTodo(text) {\n" +
"  const saved = localStorage.getItem('todos');\n" +
"  const todos = JSON.parse(saved);\n" +
"  todos.push({ text: text, done: false });\n" +
"  localStorage.setItem('todos', JSON.stringify(todos));\n" +
"}",
    lineExplanations: [
      'Defines a function that takes one piece of text — the new to-do being added.',
      'Reads whatever the browser has stored under the name "todos".',
      'Converts that stored text back into a usable list called "todos".',
      'Adds a new entry to the list, holding the text and marked as not done.',
      'Turns the updated list back into text and saves it under "todos" again.',
      'Closes the function.'
    ],
    error: { msg: "Uncaught TypeError: Cannot read properties of null (reading 'push')", src: 'todos.js:4' },
    question: 'This works fine on your machine, but crashes for every brand-new visitor. What is the ROOT CAUSE?',
    modelAnswer: "On a first visit, nothing is saved yet — so localStorage.getItem returns null, JSON.parse(null) comes out as null too, and you can't push onto null. The code silently assumed saved data always exists, which was true on the developer's machine (where old data was lying around) and false for everyone else. The fix is a fallback for the empty case: JSON.parse(saved) || [].",
    explanation: "If your answer covered the empty first-visit case — getItem returning null and the code assuming data always exists — you got the core of it. \"Works for me, breaks for new users\" is almost always a hidden assumption about existing state.",
    fix: {
      intro: 'Now make it work for a brand-new visitor. Storage starts completely empty here, exactly like a first visit. Edit the code until the console prints 1.',
      env: ['storage'],
      seed: { storage: {} },
      broken:
        'function addTodo(text) {\n' +
        "  const saved = localStorage.getItem('todos');\n" +
        '  const todos = JSON.parse(saved);\n' +
        '  todos.push({ text: text, done: false });\n' +
        "  localStorage.setItem('todos', JSON.stringify(todos));\n" +
        '  return todos;\n' +
        '}\n' +
        '\n' +
        "console.log(addTodo('buy milk').length);",
      expect: ['1'],
      hints: [
        'Nothing has ever been saved here, so think about what getItem hands back when the key does not exist.',
        'It returns null — and JSON.parse(null) is still null. You cannot push onto null.',
        'Give it something to fall back to when there is nothing saved: JSON.parse(saved) || []'
      ],
      solution:
        'function addTodo(text) {\n' +
        "  const saved = localStorage.getItem('todos');\n" +
        '  const todos = JSON.parse(saved) || [];\n' +
        '  todos.push({ text: text, done: false });\n' +
        "  localStorage.setItem('todos', JSON.stringify(todos));\n" +
        '  return todos;\n' +
        '}\n' +
        '\n' +
        "console.log(addTodo('buy milk').length);"
    }
  },

  {
    id: 15, type: 'exam',
    title: 'Final exam 3 of 3',
    lesson: {
      kind: 'Final exam — timing',
      where: 'Console tab',
      text: "The last one is the boss fight of this module: nothing here is misspelled, misnamed, or invented, and the server works fine. The bug is purely about when things happen. Slow work gets started and set aside, and your code sails right past it to the next line without pausing. Read this one in order of time, not in order of lines on the screen — ask what has actually finished by the moment each line runs."
    },
    filename: 'dashboard.js',
    code:
"function loadDashboard() {\n" +
"  let stats;\n" +
"  fetch('/api/stats')\n" +
"    .then(function (res) { return res.json(); })\n" +
"    .then(function (json) { stats = json; });\n" +
"  renderCards(stats.widgets);\n" +
"}",
    lineExplanations: [
      'Defines the function that sets up the dashboard.',
      'Creates an empty container named "stats", with nothing in it yet.',
      'Starts a request to the server for the dashboard numbers.',
      'Sets up a step to run once the reply arrives: unpack it and pass it along.',
      'Sets up a second step: put that unpacked result into "stats".',
      'Reads "widgets" out of "stats" and hands it to "renderCards" to be drawn.',
      'Closes the function.'
    ],
    error: { msg: "Uncaught TypeError: Cannot read properties of undefined (reading 'widgets')", src: 'dashboard.js:6' },
    question: 'The fetch URL is correct and the API works. What is the ROOT CAUSE of this crash?',
    modelAnswer: "This is a timing bug. fetch starts a request and moves on immediately — the .then callbacks only run later, when the response arrives. But line 6 runs right away, while stats is still undefined. The code starts a job and instantly tries to use its result, without waiting. The fix is to only use stats where the waiting happens: move renderCards inside the .then, or rewrite with await so the function genuinely pauses until the data exists.",
    explanation: "If your answer said the render runs before the fetch finishes — that the code doesn't wait for the async work — you've got the mental model that untangles most vibe-code bugs.",
    fix: {
      intro: 'Last one. The stats endpoint returns { widgets: [3 items] }. Edit the code until the console prints 3 — the count has to be read after the data has actually arrived.',
      env: ['fetch'],
      seed: { responses: { '/api/stats': { widgets: ['a', 'b', 'c'] } } },
      broken:
        'async function loadDashboard() {\n' +
        '  let stats;\n' +
        "  fetch('/api/stats')\n" +
        '    .then(function (res) { return res.json(); })\n' +
        '    .then(function (json) { stats = json; });\n' +
        '  console.log(stats.widgets.length);\n' +
        '}\n' +
        '\n' +
        'await loadDashboard();',
      expect: ['3'],
      hints: [
        'Nothing here is misspelled and the endpoint works. Ask instead: at the moment that last line runs, has the data arrived yet?',
        'It has not. fetch starts the request and the code sails straight past it — the .then callbacks run later.',
        'Either move the logging inside the final .then, or drop the chain entirely: const res = await fetch(...); const stats = await res.json();'
      ],
      solution:
        'async function loadDashboard() {\n' +
        "  const res = await fetch('/api/stats');\n" +
        '  const stats = await res.json();\n' +
        '  console.log(stats.widgets.length);\n' +
        '}\n' +
        '\n' +
        'await loadDashboard();'
    }
  }
];

/* =====================================================================
   LESSONS — the Learn tab. Same shape as CHALLENGES: adding a lesson is
   appending to this array. Sections are rendered by type, so a new lesson
   can mix and match the section kinds below without new code.

   Section types: hook | prose | analogy | demo | variations | pitfalls | checkpoint

   A demo's annotations are given as {line, match}: the renderer finds that
   snippet of text on that line and wraps it in a colored highlight.
   ===================================================================== */
var LESSONS = [
  {
    id: 'code-101',
    title: 'What is code, actually?',
    blurb: 'Start here if you have never written a line. What running code means, what the console is, and why an error is just the computer telling you something.',
    minutes: 5,
    sections: [

      { type: 'hook', text: 'Nothing here assumes you know anything. By the end of this page you will have run five small pieces of code yourself and seen exactly what each one did.' },

      {
        type: 'step',
        label: 'Step 1',
        heading: 'What "running" code means',
        paragraphs: [
          'Code is a list of written instructions. <strong>Running</strong> it means the computer starts at the top, does what that line says, then moves to the next one until it runs out of lines.',
          'Until you run it, code is just text sitting there doing nothing.'
        ],
        code: "console.log('hi');",
        filename: 'try-it.js',
        fallbackOutput: ['hi'],
        afterRun: 'That is the entire idea. One line, read and carried out exactly as written. The computer did not decide anything — the line said to write out "hi", so it wrote out "hi".'
      },

      {
        type: 'step',
        label: 'Step 2',
        heading: 'What the console is',
        paragraphs: [
          'The <strong>console</strong> is a plain text panel built into every browser — closer to a text conversation than anything else, where you send instructions and it sends short replies back.',
          'It has two jobs: showing anything your code deliberately writes out, and showing errors when something goes wrong. The instruction <strong>console.log</strong> means what it says — log this to the console.'
        ],
        code:
          "console.log('This message came from the code.');\n" +
          "console.log('Each log gets its own line.');",
        filename: 'try-it.js',
        fallbackOutput: ['This message came from the code.', 'Each log gets its own line.'],
        afterRun: 'Two instructions, two replies, in the order they were written. This is how you check what your code is really doing: you ask it to write something out, and you read what comes back.'
      },

      {
        type: 'step',
        label: 'Step 3',
        heading: 'What a variable is',
        paragraphs: [
          'A <strong>variable</strong> is a labelled box. You put a value into it, give the box a name, and from then on you can refer to that value by name instead of writing it out again.',
          'Line 1 below puts the text Sam into a box labelled name, and line 2 asks for whatever is in that box.'
        ],
        code:
          "const name = 'Sam';\n" +
          "console.log(name);",
        filename: 'try-it.js',
        fallbackOutput: ['Sam'],
        afterRun: 'Look closely at line 2: there are no quotes around name. That matters. Without quotes it means "the box called name, whatever is in it". With quotes it would have written out the literal word name instead.'
      },

      {
        type: 'step',
        label: 'Step 4',
        heading: 'Text and numbers are different things',
        paragraphs: [
          "Quotes are how you mark something as text.",
          "<strong>'Sam'</strong> with quotes is text; <strong>42</strong> without quotes is a number the computer can count with. This matters because the + sign does two completely different jobs depending on what it is handed."
        ],
        code:
          "console.log('Sam' + '!');\n" +
          "console.log(5 + 3);\n" +
          "console.log('5' + '3');",
        filename: 'try-it.js',
        predict: {
          question: 'Before you press Run — what do these three lines print?',
          options: ['Sam! / 8 / 8', 'Sam! / 8 / 53', 'Sam! / 53 / 53', 'Sam! / 8 / an error'],
          correct: 1
        },
        fallbackOutput: ['Sam!', '8', '53'],
        afterRun: 'Same + sign, three different outcomes. Between text it glues the pieces together. Between numbers it adds them. The third line is the one that catches people out: "5" and "3" look like numbers, but the quotes make them text, so they get glued into 53 instead of added into 8.'
      },

      {
        type: 'step',
        label: 'Step 5',
        heading: 'What an error looks like',
        paragraphs: [
          'This code is broken on purpose. The box is called <strong>name</strong>, but line 2 asks for <strong>nam</strong> — a name that was never used for anything.',
          'Run it and watch what appears in the console.'
        ],
        code:
          "const name = 'Sam';\n" +
          "console.log(nam);",
        filename: 'try-it.js',
        fallbackOutput: [{ text: 'Uncaught ReferenceError: nam is not defined', type: 'error' }],
        afterRun: 'Red does not mean you broke something, and nothing is wrong with your computer. That line is the computer telling you, as precisely as it can, that you asked for nam and it has never heard of it. An error always names the thing it could not do — which is why reading one beats guessing at it.'
      },

      {
        type: 'checkpoint',
        heading: 'You should now be able to…',
        abilities: [
          'Read a line of code and say what will happen when it runs.',
          'Say what the console is, and what console.log puts there.',
          'Recognise an error when you see one, and say what it is complaining about.'
        ],
        buttonLabel: '[ I GET IT ]',
        doneLabel: 'Lesson complete',
        undoLabel: '[ MARK INCOMPLETE ]'
      }
    ]
  },

  {
    id: 'functions-101',
    title: 'What is a JavaScript function?',
    blurb: 'The one idea that unlocks most AI-generated bugs. Recipes, ingredients, and the difference between writing one down and actually cooking it.',
    minutes: 6,
    sections: [

      { type: 'hook', text: 'Almost every bug you will ever hit involves a function doing something you did not expect. Learn to read one properly and most AI slop stops being mysterious — it turns into a short list of places to look.' },

      {
        type: 'prose',
        label: 'The idea',
        heading: 'A function is a recipe',
        paragraphs: [
          'You write a recipe down once, give it a name, and from then on you can cook it as many times as you like without writing it out again. That is the whole point of a function.',
          'A recipe has three moving parts, and so does a function. It has a <strong>name</strong> — what you call it when you want it. It has <strong>ingredients</strong>, the information you hand it, which programmers call the <strong>inputs</strong>. And it has <strong>steps</strong>, the instructions it actually follows, which sit inside the curly brackets and are called the <strong>body</strong>.',
          'Most recipes also produce something: the finished dish. In code that finished dish is called the <strong>return value</strong> — the answer the function hands back to whoever asked for it.',
          'One more thing, and it is the one that trips people up. There are two separate moments. Writing the recipe down is <strong>defining</strong> the function — nothing happens yet, it is just words on a page. Actually cooking it is <strong>calling</strong> the function — that is the moment the steps run and a dish comes out. Hold onto that gap; a surprising number of bugs live in it.'
        ]
      },

      {
        type: 'analogy',
        label: 'Side by side',
        heading: 'The same thing, in two languages',
        head: ['In a kitchen', 'In code'],
        rows: [
          ['The name of the recipe', 'The name of the function — how you ask for it later'],
          ['The ingredients you hand the cook', 'The inputs — information the function needs to do its job'],
          ['The steps you follow', 'The body — the instructions that actually run'],
          ['The finished dish', 'The return value — what comes back out to you']
        ]
      },

      {
        type: 'demo',
        label: 'See it run',
        heading: 'One real function, start to finish',
        intro: 'Here is a complete, working function. Read it once, then press Run and watch what comes out.',
        code:
          'function greet(name) {\n' +
          '  return \'Hello, \' + name + \'!\';\n' +
          '}\n' +
          '\n' +
          'console.log(greet(\'Sam\'));',
        filename: 'example.js',
        annotations: [
          { line: 1, match: 'greet', title: 'The name',
            text: 'What this recipe is called. Nothing happens because of this line alone — you are just writing the recipe down under a name so you can ask for it later.' },
          { line: 1, match: 'name', title: 'The input',
            text: 'A blank space in the recipe. Whatever you hand in gets called "name" for as long as the steps are running.' },
          { line: 2, match: "return 'Hello, ' + name + '!';", title: 'The body',
            text: 'The actual steps. This one glues "Hello, " onto whatever came in, and the word return means "this is the finished dish, hand it back".' },
          { line: 5, match: "greet('Sam')", title: 'The call',
            text: 'Here is where it finally cooks. You ask for the recipe by name and hand it one ingredient, the text "Sam".' }
        ],
        afterRun: 'That line in the console is the finished dish. The function took "Sam" in, built a new piece of text out of it, and handed it back — and console.log printed whatever came back.',
        fallbackOutput: ['Hello, Sam!']
      },

      {
        type: 'variations',
        label: 'Variations',
        heading: 'The same idea, three more ways',
        intro: 'Functions differ mostly in what they take in and what they do inside. Nothing else about the shape changes.',
        items: [
          {
            tag: 'no inputs',
            title: 'A recipe that needs nothing',
            code:
              'function sayHi() {\n' +
              '  return \'Hi there!\';\n' +
              '}\n' +
              '\n' +
              'console.log(sayHi());',
            note: 'What changed: the brackets are empty, because this recipe needs no ingredients. You still have to write the brackets both times, though — and you still have to ask for it. Even a function that takes nothing in has to be called before anything happens.',
            fallbackOutput: ['Hi there!']
          },
          {
            tag: 'two inputs',
            title: 'A recipe with two ingredients',
            code:
              'function fullName(first, last) {\n' +
              '  return first + \' \' + last;\n' +
              '}\n' +
              '\n' +
              'console.log(fullName(\'Ada\', \'Lovelace\'));',
            note: 'What changed: two inputs now, separated by a comma. The order is the whole agreement — the first thing you hand over becomes "first", the second becomes "last". Swap them at the call and you get "Lovelace Ada" with no complaint from anyone.',
            fallbackOutput: ['Ada Lovelace']
          },
          {
            tag: 'several steps',
            title: 'A recipe that does some maths',
            code:
              'function totalWithTip(bill, tipPercent) {\n' +
              '  const tip = bill * (tipPercent / 100);\n' +
              '  return bill + tip;\n' +
              '}\n' +
              '\n' +
              'console.log(totalWithTip(40, 15));',
            predict: {
              question: 'Before you run it — a bill of 40 with a 15% tip. What prints?',
              options: ['46', '6', '55', 'undefined — "tip" is never returned'],
              correct: 0
            },
            note: 'What changed: more than one step, and a temporary holder called "tip" that exists only while the recipe is running. The kitchen is private — nothing outside this function can see "tip". Only the thing you return ever comes back out.',
            fallbackOutput: ['46']
          }
        ]
      },

      {
        type: 'pitfalls',
        label: 'What goes wrong',
        heading: 'How functions break in AI-generated code',
        items: [
          { bold: 'Called before it exists', rest: '— the code asks for a recipe that has not been written down yet.' },
          { bold: 'The wrong number of ingredients', rest: '— the recipe expects two, gets one, and the missing one quietly turns into undefined.' },
          { bold: 'A name that was never real', rest: '— the AI confidently calls a function that nobody ever wrote.' }
        ],
        note: 'You will meet all three over in Practice. For now, just knowing these patterns exist is enough.'
      },

      {
        type: 'checkpoint',
        heading: 'You should now be able to…',
        abilities: [
          'Point at any function in a code snippet and say what it is called, what it takes in, and what it hands back.',
          'Tell the difference between a function being written down and a function actually running.',
          'Explain why the insides of a function are private, and why only the returned value comes back out.'
        ],
        buttonLabel: 'I get it',
        doneLabel: 'Lesson complete',
        undoLabel: 'Actually, let me read that again'
      }
    ]
  }
];

/* ---------------------------------------------------------------------
   Syntax highlighting + the plain-English meaning of every color.
   Every token is tagged with data-tok so it can explain itself on
   hover (desktop) or tap (touch).
   ------------------------------------------------------------------ */
var TOK_INFO = {
  kw:   { label: 'Keyword',   sample: 'const',      color: '#fbbf24',
          text: 'This is a JavaScript keyword — a built-in command the language understands.' },
  str:  { label: 'String',    sample: "'hello'",    color: '#4ade80',
          text: 'This is text data, wrapped in quotes.' },
  num:  { label: 'Number',    sample: '42.50',      color: '#7ab3d5',
          text: 'A numeric value.' },
  fn:   { label: 'Function',  sample: 'fetch()',    color: '#6ee7b7',
          text: 'This is a function being called or defined.' },
  'var':{ label: 'Variable',  sample: 'response',   color: '#d4d4d4',
          text: 'A named container holding a value.' },
  prop: { label: 'Property',  sample: '.items',     color: '#c78e3f',
          text: 'Accessing a piece of data on an object.' },
  com:  { label: 'Comment',   sample: '// note',    color: '#6b7280',
          text: 'A note for humans, ignored by the code.' },
  tag:  { label: 'HTML tag',  sample: '&lt;form&gt;', color: '#a3be5c',
          text: 'An HTML tag — one of the building blocks of the page.' },
  attr: { label: 'HTML attribute', sample: 'id=',   color: '#5eaab0',
          text: 'An HTML attribute — a setting attached to a page element.' }
};


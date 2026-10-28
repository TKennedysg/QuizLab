"use strict";
(() => {
  const topics = window.QUIZ_TOPICS;
  const main = document.getElementById("main");
  const historyKey = "quizlab-history-v1";
  const dialog = document.getElementById("confirm-dialog");
  const shapes = {
    compass:
      '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/><path d="M12 7v5l3 2"/>',
    sparkles:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20"/>',
    atom: '<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trophy:
      '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 1h8"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z"/>',
    shield:
      '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  };
  function icon(name) {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (shapes[name] || shapes.info) +
      "</svg>"
    );
  }
  function esc(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function button(action, text, type = "primary", glyph = "") {
    return (
      '<button class="button ' +
      type +
      '" data-action="' +
      action +
      '">' +
      text +
      (glyph ? icon(glyph) : "") +
      "</button>"
    );
  }
  function notice(text) {
    const el = document.getElementById("storage-banner");
    el.textContent = text;
    el.hidden = false;
  }
  if (!Array.isArray(topics) || topics.length === 0) {
    main.innerHTML =
      "<h1>No se pudieron cargar las preguntas.</h1><p>Comprueba que questions.js está junto a index.html y recarga la página.</p>";
    return;
  }

  function validRecord(r) {
    return (
      r &&
      topics.some((t) => t.id === r.topic) &&
      [5, 10].includes(r.total) &&
      Number.isInteger(r.correct) &&
      r.correct >= 0 &&
      r.correct <= r.total &&
      Number.isFinite(r.seconds) &&
      r.seconds >= 0 &&
      r.seconds <= r.total * 45 &&
      [20, 30, 45].includes(r.limit) &&
      typeof r.date === "string" &&
      Number.isFinite(Date.parse(r.date))
    );
  }
  function loadHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
      return Array.isArray(stored)
        ? stored.filter(validRecord).slice(0, 20)
        : [];
    } catch {
      notice(
        "No se pudo leer el historial. Puedes jugar; los resultados nuevos permanecerán en esta sesión.",
      );
      return [];
    }
  }
  let history = loadHistory();
  let view = "home",
    chosen = topics[0].id,
    count = 5,
    limit = 30,
    session = null,
    timer = null,
    pendingAction = null;
  function saveHistory() {
    try {
      localStorage.setItem(historyKey, JSON.stringify(history));
      return true;
    } catch {
      notice(
        "No se pudo guardar en este navegador. El historial permanecerá disponible durante esta sesión.",
      );
      return false;
    }
  }
  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }
  function screenFocus() {
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function formatTime(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function percent(record) {
    return Math.round((record.correct / record.total) * 100);
  }
  function topicPill(topic) {
    return (
      '<span class="topic-pill ' +
      topic.color +
      '">' +
      icon(topic.icon) +
      esc(topic.name) +
      "</span>"
    );
  }
  function stat(value, label, glyph, note = "") {
    return (
      '<div class="stat"><span class="stat-icon">' +
      icon(glyph) +
      '</span><div><div class="stat-value">' +
      value +
      '</div><div class="stat-label">' +
      label +
      '</div></div><span class="stat-note">' +
      note +
      "</span></div>"
    );
  }
  function syncNav() {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      const active = el.dataset.nav === view;
      el.classList.toggle("active", active);
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    document.getElementById("history-count").textContent = history.length;
    document.getElementById("breadcrumb").textContent = {
      home: "Tu zona de aprendizaje",
      quiz: "Un reto, una nueva idea",
      results: "Así fue tu reto",
      history: "Tu camino de aprendizaje",
    }[view];
  }
  function showHome(focus = true) {
    stopTimer();
    view = "home";
    session = null;
    syncNav();
    const best = history.length ? Math.max(...history.map(percent)) + "%" : "—";
    const questionCount = topics.reduce((n, t) => n + t.questions.length, 0);
    main.innerHTML = [
      '<div class="page-heading"><div><p class="eyebrow">APRENDE ALGO NUEVO HOY</p><h1>Entrena tu curiosidad.</h1></div><span class="date-chip">' +
        icon("sparkles") +
        "Pequeños retos, grandes ideas</span></div>",
      '<section class="hero"><div class="hero-copy"><div class="eyebrow">TU PRÓXIMO DESCUBRIMIENTO</div><h2>El saber empieza<br>con una pregunta.</h2><p>Elige un tema, ponte a prueba y descubre algo que no sabías. Sin presión, a tu ritmo.</p>' +
        button("prepare", "Preparar mi reto", "primary", "arrow") +
        "</div>",
      '<div class="hero-art" aria-hidden="true"><div class="art-circle"></div><div class="art-grid"></div><span class="spark">✧</span><div class="art-card"><span class="art-star">✦</span><strong>¿Y si…?</strong><small>HOY DESCUBRES MÁS</small><div class="art-line"></div><div class="art-line short"></div></div><span class="floating-check">' +
        icon("check") +
        "</span></div></section>",
      '<section class="stats" aria-label="Tu progreso">' +
        stat(history.length, "Retos guardados", "history") +
        stat(best, "Tu mejor resultado", "trophy") +
        stat(questionCount, "Preguntas para descubrir", "book", "3 temas") +
        "</section>",
      '<div class="explore-grid"><section aria-labelledby="topics-title"><div class="section-title"><div><h2 id="topics-title">¿Qué te mueve hoy?</h2><p>Elige una categoría para empezar.</p></div><span class="tiny-tag">3 temas</span></div><div class="categories">',
      ...topics.map(
        (t) =>
          '<button class="category" data-topic="' +
          t.id +
          '" aria-pressed="' +
          (chosen === t.id) +
          '"><span class="selected-dot">' +
          icon("check") +
          '</span><span class="topic-icon ' +
          t.color +
          '">' +
          icon(t.icon) +
          '</span><span class="eyebrow">' +
          esc(t.eyebrow) +
          "</span><h3>" +
          esc(t.name) +
          "</h3><p>" +
          esc(t.description) +
          '</p><span class="card-footer"><span>' +
          t.questions.length +
          " preguntas disponibles</span>" +
          icon("arrow") +
          "</span></button>",
      ),
      '</div><div class="home-bottom">' +
        icon("info") +
        "<p>Cada respuesta incluye una explicación. Equivocarse también es aprender.</p></div></section>",
      '<aside class="setup" id="setup" aria-labelledby="setup-title"><div class="setup-top"><p class="eyebrow">A TU MEDIDA</p><h3 id="setup-title">Arma tu reto</h3><p class="setup-intro">Unos minutos para poner en marcha tus ideas.</p><div id="chosen-topic" class="chosen-topic"></div></div>',
      '<div><label for="question-count">Número de preguntas</label><select id="question-count"><option value="5">5 preguntas · Reto rápido</option><option value="10">10 preguntas · Reto completo</option></select></div>',
      '<div><label for="time-limit">Tiempo por pregunta</label><select id="time-limit"><option value="20">20 segundos · Con energía</option><option value="30">30 segundos · Equilibrado</option><option value="45">45 segundos · Con calma</option></select></div>',
      '<button class="button primary wide" data-action="start">Comenzar reto ' +
        icon("arrow") +
        '</button><p class="setup-note">' +
        icon("shield") +
        "Sin registro. Tu historial se guarda solo en este navegador.</p></aside></div>",
    ].join("");
    document.getElementById("question-count").value = String(count);
    document.getElementById("time-limit").value = String(limit);
    syncChosen();
    if (focus) screenFocus();
  }
  function syncChosen() {
    const topic = topics.find((t) => t.id === chosen);
    document.getElementById("chosen-topic").innerHTML =
      icon(topic.icon) + esc(topic.name);
    document
      .querySelectorAll("[data-topic]")
      .forEach((el) =>
        el.setAttribute("aria-pressed", String(el.dataset.topic === chosen)),
      );
  }
  function startQuiz() {
    stopTimer();
    const topic = topics.find((t) => t.id === chosen);
    const questions = shuffle(topic.questions)
      .slice(0, count)
      .map((raw) => ({
        text: raw[0],
        explanation: raw[3],
        options: shuffle(
          raw[1].map((text, i) => ({ text, correct: i === raw[2] })),
        ),
      }));
    session = {
      topic,
      questions,
      answers: [],
      index: 0,
      selected: null,
      resolved: false,
      limit,
    };
    view = "quiz";
    syncNav();
    beginQuestion();
  }
  function beginQuestion() {
    stopTimer();
    session.selected = null;
    session.resolved = false;
    session.started = Date.now();
    session.deadline = session.started + session.limit * 1000;
    renderQuiz();
    screenFocus();
    timer = setInterval(tick, 200);
    tick();
  }
  function currentQuestion() {
    return session.questions[session.index];
  }
  function tick() {
    if (view !== "quiz" || !session || session.resolved) return;
    const remaining = Math.max(
      0,
      Math.ceil((session.deadline - Date.now()) / 1000),
    );
    const output = document.getElementById("time-remaining");
    if (output) {
      output.textContent = remaining + " s";
      output.parentElement.classList.toggle("urgent", remaining <= 5);
    }
    if (remaining === 0) settle("timeout");
  }
  function beforeDeadline() {
    if (Date.now() >= session.deadline) {
      settle("timeout");
      return false;
    }
    return true;
  }
  function renderQuiz() {
    const q = currentQuestion(),
      answer = session.answers[session.index];
    const resolved = session.resolved,
      last = session.index === session.questions.length - 1;
    const progress =
      ((session.index + (resolved ? 1 : 0)) / session.questions.length) * 100;
    let feedback = "";
    if (resolved) {
      const title =
        answer.status === "timeout"
          ? "Se acabó el tiempo"
          : answer.status === "skip"
            ? "Una idea más para aprender"
            : answer.correct
              ? "¡Así es! Bien pensado."
              : "Ahora ya sabes algo nuevo.";
      feedback =
        '<div class="feedback ' +
        (answer.correct ? "" : "incorrect") +
        '" role="status"><strong>' +
        icon(answer.correct ? "check" : "info") +
        title +
        "</strong><p>" +
        esc(q.explanation) +
        "</p></div>";
    }
    main.innerHTML =
      '<div class="quiz-wrap"><div class="quiz-top">' +
      topicPill(session.topic) +
      '<span class="quiz-count">Pregunta ' +
      (session.index + 1) +
      " de " +
      session.questions.length +
      "</span>" +
      button("leave", "Salir del reto", "ghost", "x") +
      '</div><section class="quiz-card" aria-labelledby="question-title"><div class="quiz-meta"><p class="eyebrow">PON A PRUEBA TUS IDEAS</p><span class="timer" aria-label="Tiempo restante">' +
      icon("clock") +
      '<span id="time-remaining">' +
      (resolved ? "En pausa" : session.limit + " s") +
      '</span></span></div><div class="progress-track" role="progressbar" aria-label="Preguntas completadas" aria-valuemin="0" aria-valuemax="' +
      session.questions.length +
      '" aria-valuenow="' +
      (session.index + (resolved ? 1 : 0)) +
      '"><span style="width:' +
      progress +
      '%"></span></div><h1 class="question-title" id="question-title">' +
      esc(q.text) +
      '</h1><p class="question-hint">' +
      (resolved
        ? "La opción correcta aparece marcada con ✓."
        : "Elige una respuesta y comprueba tu intuición.") +
      '</p><div class="options" role="group" aria-labelledby="question-title">' +
      q.options
        .map((o, i) => {
          let cls = "option",
            badge = "";
          if (resolved && o.correct) {
            cls += " correct";
            badge = icon("check");
          }
          if (resolved && answer.selected === i && !o.correct) {
            cls += " wrong";
            badge = icon("x");
          }
          if (!resolved && session.selected === i) cls += " selected";
          const label = resolved
            ? o.correct
              ? "Respuesta correcta. "
              : answer.selected === i
                ? "Tu respuesta, incorrecta. "
                : ""
            : "";
          return (
            '<button class="' +
            cls +
            '" data-option="' +
            i +
            '" aria-pressed="' +
            (resolved ? answer.selected === i : session.selected === i) +
            '" ' +
            (resolved ? "disabled" : "") +
            ' aria-label="' +
            esc(label + o.text) +
            '"><span class="letter" aria-hidden="true">' +
            String.fromCharCode(65 + i) +
            "</span><span>" +
            esc(o.text) +
            '</span><span class="answer-icon">' +
            badge +
            "</span></button>"
          );
        })
        .join("") +
      "</div>" +
      feedback +
      '<div class="quiz-actions">' +
      (resolved
        ? '<span class="keyboard-hint">Cada intento cuenta.</span>' +
          button(
            "next",
            last ? "Ver resultados" : "Siguiente pregunta",
            "primary",
            "arrow",
          )
        : button("skip", "Saltar pregunta", "ghost") +
          '<span class="keyboard-hint">Atajos: teclas 1–4</span><button id="check-answer" class="button primary" data-action="check" ' +
          (session.selected === null ? "disabled" : "") +
          ">Comprobar " +
          icon("arrow") +
          "</button>") +
      '</div></section><p class="quiz-caption">El tiempo se pausa mientras lees la explicación. Las preguntas y opciones cambian de orden en cada reto.</p></div>';
  }
  function chooseOption(index) {
    if (!session || session.resolved || !beforeDeadline()) return;
    session.selected = index;
    document.querySelectorAll("[data-option]").forEach((el) => {
      const active = Number(el.dataset.option) === index;
      el.classList.toggle("selected", active);
      el.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("check-answer").disabled = false;
  }
  function settle(status) {
    if (!session || session.resolved) return;
    if (status === "answer" && session.selected === null) return;
    stopTimer();
    session.resolved = true;
    const selected = status === "answer" ? session.selected : null;
    session.answers.push({
      selected,
      status,
      correct: selected !== null && currentQuestion().options[selected].correct,
      seconds: Math.min(
        session.limit,
        Math.max(0, (Date.now() - session.started) / 1000),
      ),
    });
    renderQuiz();
    document
      .querySelector('[data-action="next"]')
      .focus({ preventScroll: true });
  }
  function nextQuestion() {
    if (!session || !session.resolved) return;
    if (session.index < session.questions.length - 1) {
      session.index++;
      beginQuestion();
    } else finishQuiz();
  }
  function finishQuiz() {
    stopTimer();
    const correct = session.answers.filter((a) => a.correct).length;
    const seconds = session.answers.reduce((n, a) => n + a.seconds, 0);
    const record = {
      topic: session.topic.id,
      total: session.questions.length,
      correct,
      seconds,
      limit: session.limit,
      date: new Date().toISOString(),
    };
    history.unshift(record);
    history = history.slice(0, 20);
    session.saved = saveHistory();
    session.record = record;
    view = "results";
    syncNav();
    renderResults();
    screenFocus();
  }
  function renderResults() {
    const r = session.record,
      score = percent(r);
    const title =
      score >= 80
        ? "¡Tu curiosidad llega lejos!"
        : score >= 50
          ? "Una buena base para seguir."
          : "Cada pregunta deja una idea.";
    const intro =
      score >= 80
        ? "Tus ideas van por buen camino. ¿Te animas a explorar otro tema?"
        : "Revisa las explicaciones y vuelve a intentarlo. Aprender también es descubrir lo que aún no sabíamos.";
    main.innerHTML =
      '<div class="quiz-wrap"><div class="page-heading"><div><p class="eyebrow">RETO COMPLETADO</p><h2>Un paso más en tu camino.</h2></div>' +
      topicPill(session.topic) +
      '</div><section class="result-hero" aria-label="Resultado del reto"><div class="score-ring" style="--score:' +
      score +
      '%"><div class="score-center"><strong>' +
      score +
      '%</strong><span>de aciertos</span></div></div><div class="result-copy"><p class="eyebrow">BIEN POR DAR EL PASO</p><h1>' +
      title +
      "</h1><p>" +
      intro +
      "</p>" +
      button("retry", "Volver a intentarlo", "primary", "arrow") +
      '</div></section><div class="result-metrics"><div class="result-metric"><strong>' +
      r.correct +
      " / " +
      r.total +
      '</strong><span>Respuestas correctas</span></div><div class="result-metric"><strong>' +
      formatTime(r.seconds) +
      '</strong><span>Tiempo respondiendo</span></div><div class="result-metric"><strong>' +
      session.answers.filter((a) => a.status !== "answer").length +
      '</strong><span>Sin responder</span></div></div><h2 class="review-heading">Cada respuesta, una explicación</h2><div class="review-list">' +
      session.questions
        .map((q, i) => {
          const a = session.answers[i],
            correct = q.options.find((o) => o.correct);
          const given =
            a.status === "timeout"
              ? "Tiempo agotado"
              : a.status === "skip"
                ? "Pregunta saltada"
                : q.options[a.selected].text;
          return (
            '<details class="review-item"><summary><span class="review-status ' +
            (a.correct ? "" : "incorrect") +
            '" aria-label="' +
            (a.correct ? "Correcta" : "Incorrecta o sin responder") +
            '">' +
            icon(a.correct ? "check" : "info") +
            "</span><span>" +
            (i + 1) +
            ". " +
            esc(q.text) +
            '</span></summary><div class="review-body"><p><strong>Tu respuesta:</strong> ' +
            esc(given) +
            "</p><p><strong>Respuesta correcta:</strong> " +
            esc(correct.text) +
            '</p><p class="explanation">' +
            esc(q.explanation) +
            "</p></div></details>"
          );
        })
        .join("") +
      '</div><div class="result-actions">' +
      button("home", "Elegir otro tema", "secondary", "back") +
      button("history", "Ver mi historial", "secondary", "history") +
      '</div><p class="result-save-note">' +
      (session.saved
        ? "Resultado guardado en este navegador."
        : "Resultado disponible durante esta sesión; no se pudo guardar de forma permanente.") +
      "</p></div>";
  }
  function showHistory() {
    stopTimer();
    view = "history";
    session = null;
    syncNav();
    const best = history.length ? Math.max(...history.map(percent)) + "%" : "—";
    const average = history.length
      ? Math.round(
          history.reduce((n, r) => n + percent(r), 0) / history.length,
        ) + "%"
      : "—";
    main.innerHTML =
      '<div class="history-header"><div><p class="eyebrow">PASO A PASO</p><h1>Tu camino de aprendizaje.</h1><p>Cada reto cuenta una pequeña parte de tu progreso.</p></div>' +
      (history.length
        ? button("clear-history", "Borrar historial", "ghost", "trash")
        : "") +
      '</div><section class="stats" aria-label="Estadísticas del historial">' +
      stat(history.length, "Retos guardados", "history") +
      stat(best, "Mejor resultado", "trophy") +
      stat(average, "Promedio de aciertos", "sparkles") +
      "</section>" +
      (history.length
        ? '<section class="history-list" aria-label="Últimos intentos">' +
          history
            .map((r) => {
              const t = topics.find((t) => t.id === r.topic);
              const when = new Intl.DateTimeFormat("es", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(r.date));
              return (
                '<article class="history-row"><span class="topic-icon ' +
                t.color +
                '">' +
                icon(t.icon) +
                '</span><div class="history-details"><h3>' +
                esc(t.name) +
                "</h3><p>" +
                esc(when) +
                " · " +
                r.total +
                " preguntas · " +
                formatTime(r.seconds) +
                '</p></div><div class="history-score">' +
                percent(r) +
                "%<small>" +
                r.correct +
                " de " +
                r.total +
                " correctas</small></div></article>"
              );
            })
            .join("") +
          '</section><p class="history-footnote">Se conservan los últimos 20 retos en este navegador. Tus datos no se sincronizan entre dispositivos.</p>'
        : '<section class="empty-state"><div class="empty-icon">' +
          icon("book") +
          "</div><h2>Todo empieza con una pregunta.</h2><p>Aún no hay retos completados. Elige un tema y dale a tu curiosidad un lugar para empezar.</p>" +
          button("home", "Explorar mi primer reto", "primary", "arrow") +
          "</section>");
    screenFocus();
  }
  function requestConfirm(title, text, action) {
    pendingAction = action;
    document.getElementById("dialog-title").textContent = title;
    document.getElementById("dialog-text").textContent = text;
    dialog.showModal();
    document.getElementById("dialog-cancel").focus();
  }
  function navigate(target) {
    const go = () => (target === "history" ? showHistory() : showHome());
    if (view === "quiz")
      requestConfirm(
        "¿Salir de este reto?",
        "El intento actual no se guardará. Podrás comenzar un nuevo reto cuando quieras.",
        go,
      );
    else go();
  }
  document.getElementById("dialog-cancel").onclick = () => dialog.close();
  document.getElementById("dialog-confirm").onclick = () => {
    const action = pendingAction;
    pendingAction = null;
    dialog.close();
    if (action) action();
  };
  dialog.addEventListener("close", () => {
    pendingAction = null;
  });
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
  document
    .querySelectorAll("[data-nav]")
    .forEach((el) =>
      el.addEventListener("click", () => navigate(el.dataset.nav)),
    );
  main.addEventListener("change", (e) => {
    if (e.target.id === "question-count")
      count = [5, 10].includes(Number(e.target.value))
        ? Number(e.target.value)
        : 5;
    if (e.target.id === "time-limit")
      limit = [20, 30, 45].includes(Number(e.target.value))
        ? Number(e.target.value)
        : 30;
  });
  main.addEventListener("click", (e) => {
    const topic = e.target.closest("[data-topic]");
    if (topic && view === "home") {
      chosen = topic.dataset.topic;
      syncChosen();
      return;
    }
    const option = e.target.closest("[data-option]");
    if (option && view === "quiz") {
      chooseOption(Number(option.dataset.option));
      return;
    }
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "prepare") {
      document
        .getElementById("setup")
        .scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "instant"
            : "smooth",
          block: "center",
        });
      document.getElementById("question-count").focus({ preventScroll: true });
    }
    if (action === "start" || action === "retry") startQuiz();
    if (action === "check" && beforeDeadline()) settle("answer");
    if (action === "skip" && beforeDeadline()) settle("skip");
    if (action === "next") nextQuestion();
    if (action === "home" || action === "leave") navigate("home");
    if (action === "history") navigate("history");
    if (action === "clear-history")
      requestConfirm(
        "¿Borrar tu historial?",
        "Se eliminarán los resultados guardados en este navegador. Esta acción no se puede deshacer.",
        () => {
          history = [];
          saveHistory();
          showHistory();
        },
      );
  });
  document.addEventListener("keydown", (e) => {
    if (
      view === "quiz" &&
      session &&
      !session.resolved &&
      !dialog.open &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      /^[1-4]$/.test(e.key)
    ) {
      e.preventDefault();
      const n = Number(e.key) - 1;
      chooseOption(n);
      document.querySelector('[data-option="' + n + '"]')?.focus();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  window.addEventListener("beforeunload", (e) => {
    if (view === "quiz") {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  showHome(false);
})();

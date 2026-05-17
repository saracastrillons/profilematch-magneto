const API = "/api";

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function setMessage(id, text, ok = false) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = text || "";
    el.className = ok ? "message success" : "message";
  }
}

function showToast(message, type = "success") {

  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;

  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.className = "toast hidden";
  }, 3000);

}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + getToken()
  };
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Respuesta no JSON:", text);
    throw new Error("El servidor no respondió JSON. Revisa que el backend esté corriendo.");
  }
}

function requireFrontAuth() {
  if (location.pathname.includes("dashboard.html") && !getToken()) {
    window.location.href = "index.html";
  }
}

async function register() {
  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
  const role = document.getElementById("role")?.value || "candidate";

  if (!name || !email || !password) return setMessage("registerMsg", "Completa todos los campos.");

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await readJson(res);
    setMessage("registerMsg", data.message, res.ok);

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    setMessage("registerMsg", error.message);
  }
}

async function login() {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();

  if (!email || !password) return setMessage("loginMsg", "Ingresa correo y contraseña.");

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await readJson(res);
    if (!res.ok) return setMessage("loginMsg", data.message);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "dashboard.html";
  } catch (error) {
    setMessage("loginMsg", error.message);
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

function showSection(sectionId, button) {
  document.querySelectorAll(".dash-section").forEach((section) => section.classList.remove("active-section"));
  document.getElementById(sectionId)?.classList.add("active-section");

  document.querySelectorAll(".side-btn").forEach((btn) => btn.classList.remove("active"));
  button?.classList.add("active");
}

function loadUserInfo() {
  const user = getUser();
  const title = document.getElementById("welcomeTitle");
  const roleLabel = document.getElementById("roleLabel");

  if (title && user) title.innerText = `Hola, ${user.name}`;
  if (roleLabel && user) roleLabel.innerText = user.role === "recruiter" ? "Panel de reclutador" : "Panel de candidato";
}

function configureDashboardByRole() {
  if (!location.pathname.includes("dashboard.html")) return;

  const user = getUser();
  if (!user) return;

  const isRecruiter = user.role === "recruiter";
  const candidateMenu = document.getElementById("candidateMenu");
  const recruiterMenu = document.getElementById("recruiterMenu");
  const completionCard = document.getElementById("completionCard");

  document.querySelectorAll(".candidate-only").forEach((el) => el.classList.toggle("hidden", isRecruiter));
  document.querySelectorAll(".recruiter-only").forEach((el) => el.classList.toggle("hidden", !isRecruiter));

  if (candidateMenu) candidateMenu.classList.toggle("hidden", isRecruiter);
  if (recruiterMenu) recruiterMenu.classList.toggle("hidden", !isRecruiter);
  if (completionCard) completionCard.classList.toggle("hidden", isRecruiter);

  document.querySelectorAll(".dash-section").forEach((section) => section.classList.remove("active-section"));
  document.querySelectorAll(".side-btn").forEach((btn) => btn.classList.remove("active"));

  if (isRecruiter) {
    document.getElementById("companySection")?.classList.add("active-section");
    document.querySelector("#recruiterMenu .side-btn")?.classList.add("active");
    loadCompany();
    loadRecruiterJobs();
  } else {
    document.getElementById("profileSection")?.classList.add("active-section");
    document.querySelector("#candidateMenu .side-btn")?.classList.add("active");
    loadProfile();
    loadRecommendations();
    loadJobs();
  }

  loadNotifications();
}

function profilePayload() {
  return {
    phone: document.getElementById("phone")?.value.trim(),
    city: document.getElementById("city")?.value.trim(),
    profession: document.getElementById("profession")?.value.trim(),
    education: document.getElementById("education")?.value.trim(),
    yearsExperience: document.getElementById("yearsExperience")?.value,
    salaryMin: document.getElementById("salaryMin")?.value,
    modality: document.getElementById("modality")?.value,
    seniority: document.getElementById("seniority")?.value,
    availability: document.getElementById("availability")?.value,
    roleTarget: document.getElementById("roleTarget")?.value.trim(),
    linkedin: document.getElementById("linkedin")?.value.trim(),
    github: document.getElementById("github")?.value.trim(),
    experience: document.getElementById("experience")?.value.trim(),
    skills: document.getElementById("skills")?.value.trim()
  };
}

function updateCompletion(profile, user) {
  const fields = [
    profile?.phone,
    profile?.city,
    profile?.profession,
    profile?.education,
    profile?.years_experience,
    profile?.salary_min,
    profile?.modality,
    profile?.seniority,
    profile?.availability,
    profile?.role_target,
    profile?.experience,
    profile?.skills,
    user?.cv_filename
  ];

  const completed = fields.filter((v) => v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0").length;
  const percent = Math.round((completed / fields.length) * 100);

  const text = document.getElementById("completionText");
  const fill = document.getElementById("progressFill");
  if (text) text.innerText = `${percent}%`;
  if (fill) fill.style.width = `${percent}%`;
}

async function loadProfile() {
  if (!location.pathname.includes("dashboard.html")) return;
  try {
    const res = await fetch(`${API}/profile`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    if (res.status === 401) return logout();

    const profile = data.profile || {};
    const user = data.user || {};

    ["phone", "city", "profession", "education", "linkedin", "github", "experience", "skills"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = profile[id] || "";
    });

    if (document.getElementById("yearsExperience")) document.getElementById("yearsExperience").value = profile.years_experience || "";
    if (document.getElementById("salaryMin")) document.getElementById("salaryMin").value = profile.salary_min || "";
    if (document.getElementById("roleTarget")) document.getElementById("roleTarget").value = profile.role_target || "";
    if (document.getElementById("modality")) document.getElementById("modality").value = profile.modality || "Remoto";
    if (document.getElementById("seniority")) document.getElementById("seniority").value = profile.seniority || "Junior";
    if (document.getElementById("availability")) document.getElementById("availability").value = profile.availability || "Inmediata";

    const cvLink = document.getElementById("cvLink");
    if (cvLink && user.cv_filename) {
      cvLink.href = `/uploads/${user.cv_filename}`;
      cvLink.innerText = `Ver CV cargado: ${user.cv_original_name || user.cv_filename}`;
      cvLink.classList.remove("hidden");
    }

    updateCompletion(profile, user);
  } catch (error) {
    console.error(error);
  }
}

async function saveProfile() {
  try {
    const res = await fetch(`${API}/profile`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(profilePayload())
    });

    const data = await readJson(res);
    setMessage("profileMsg", data.message, res.ok);
    await loadProfile();
    await loadRecommendations();
  } catch (error) {
    setMessage("profileMsg", error.message);
  }
}

async function uploadCV() {
  const fileInput = document.getElementById("cvFile");
  if (!fileInput || !fileInput.files.length) return setMessage("cvMsg", "Selecciona un archivo PDF.");

  const formData = new FormData();
  formData.append("cv", fileInput.files[0]);

  try {
    const res = await fetch(`${API}/upload-cv`, {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: formData
    });

    const data = await readJson(res);
    setMessage("cvMsg", data.message, res.ok);
    if (res.ok) await loadProfile();
  } catch (error) {
    setMessage("cvMsg", error.message);
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function salaryText(job) {
  if (!job.salary_min && !job.salary_max) return "Salario no especificado";
  return `${money(job.salary_min)} - ${money(job.salary_max)}`;
}

function scoreClass(score) {
  if (score >= 80) return "score-high";
  if (score >= 55) return "score-mid";
  return "score-low";
}

function getCompatibilityLabel(score) {
  if (score >= 80) return "Alta compatibilidad";
  if (score >= 55) return "Compatibilidad media";
  return "Compatibilidad baja";
}

function getCompatibilityClass(score) {
  if (score >= 80) return "compatibility-high";
  if (score >= 55) return "compatibility-medium";
  return "compatibility-low";
}

function skillsHtml(skills) {
  return String(skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((skill) => `<span>${skill}</span>`)
    .join("");
}

function jobCard(job, explain = false) {
  const score = job.score ?? null;
  return `
    <article class="job-card">
      <div class="job-head">
        <div>
          <span class="tag">${job.modality || "Modalidad"}</span>
          <h3>${job.title}</h3>
          <p>${job.company}</p>
        </div>
        ${
          score !== null
            ? `
              <div class="score-box">
                <div class="score ${scoreClass(score)}">${score}%</div>
                <span class="compatibility-tag ${getCompatibilityClass(score)}">
                  ${getCompatibilityLabel(score)}
                </span>
              </div>
            `
            : ""
        }
      </div>
      <p>${job.description || ""}</p>
      <div class="tags">
        <span>${job.city || "Ciudad no definida"}</span>
        <span>${salaryText(job)}</span>
        <span>${job.seniority || "Nivel no definido"}</span>
        <span>${job.contract_type || "Contrato"}</span>
      </div>
      <div class="skills">${skillsHtml(job.skills)}</div>
      ${explain ? `<div class="explanation"><strong>${job.level}:</strong> ${job.explanation}</div>` : ""}
      <div class="card-actions">
        <button type="button" onclick="showJobDetail(${job.id})">Ver detalle</button>
        <button type="button" onclick="openApplyModal(${job.id})">Postularme</button>
        <button type="button" class="outline" onclick="saveJob(${job.id})">Guardar</button>
      </div>
    </article>
  `;
}

async function loadRecommendations() {
  const container = document.getElementById("recommendationsList");
  if (!container) return;
  container.innerHTML = "<p>Cargando recomendaciones...</p>";

  try {
    const res = await fetch(`${API}/recommendations`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    if (!res.ok) {
      container.innerHTML = `<p class="message">${data.message}</p>`;
      return;
    }
    container.innerHTML = data.map((job) => jobCard(job, true)).join("");
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}
function clearJobFilters() {

  const fields = [
    "filterSearch",
    "filterCity",
    "filterModality",
    "filterSeniority",
    "filterSkill",
    "filterSalary"
  ];

  fields.forEach((id) => {

    const el = document.getElementById(id);

    if (el) {
      el.value = "";
    }

  });

  loadJobs();
}
async function loadJobs() {
  const container = document.getElementById("jobsList");
  if (!container) return;

  const params = new URLSearchParams();
  const search = document.getElementById("filterSearch")?.value.trim();
  const city = document.getElementById("filterCity")?.value.trim();
  const modality = document.getElementById("filterModality")?.value;
  const seniority = document.getElementById("filterSeniority")?.value;
  const skill = document.getElementById("filterSkill")?.value.trim();
  const minSalary = document.getElementById("filterSalary")?.value;

  if (search) params.append("search", search);
  if (city) params.append("city", city);
  if (modality) params.append("modality", modality);
  if (seniority) params.append("seniority", seniority);
  if (skill) params.append("skill", skill);
  if (minSalary) params.append("minSalary", minSalary);

  container.innerHTML = "<p>Cargando vacantes...</p>";

  try {
    const res = await fetch(`${API}/jobs?${params.toString()}`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    if (!res.ok) {
      container.innerHTML = `<p class="message">${data.message}</p>`;
      return;
    }
    container.innerHTML = data.length ? data.map((job) => jobCard(job)).join("") : `<p>No hay vacantes con esos filtros.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}

async function showJobDetail(jobId) {
  const detailPanel = document.getElementById("recommendationDetail");
  const modal = document.getElementById("jobModal");
  const modalContent = document.getElementById("jobModalContent");

  const target = detailPanel && document.getElementById("recommendationsSection")?.classList.contains("active-section")
    ? detailPanel
    : modalContent;

  if (modal && target === modalContent) modal.classList.remove("hidden");
  if (target) target.innerHTML = "<p>Cargando detalle...</p>";

  try {
    const res = await fetch(`${API}/job-detail/${jobId}`, { headers: { Authorization: "Bearer " + getToken() } });
    const job = await readJson(res);
    if (!res.ok) {
      if (target) target.innerHTML = `<p class="message">${job.message}</p>`;
      return;
    }

    const reasons = job.match?.reasons?.length
      ? job.match.reasons.map((reason) => `<li>${reason}</li>`).join("")
      : "<li>No hay explicación disponible.</li>";

    if (target) {
      target.innerHTML = `
  <div class="job-detail-card">
    <div class="job-detail-header">
      <div>
        <span class="tag">${job.modality || "Modalidad no definida"}</span>
        <h2>${job.title}</h2>
        <p>${job.company}</p>
      </div>

      ${
        job.match
          ? `<div class="score ${scoreClass(job.match.score)}">${job.match.score}%</div>`
          : ""
      }
    </div>

    <div class="job-detail-info">
      <p><strong>Ciudad:</strong> ${job.city || "No especificada"}</p>
      <p><strong>Nivel:</strong> ${job.seniority || "No especificado"}</p>
      <p><strong>Contrato:</strong> ${job.contract_type || "No especificado"}</p>
      <p><strong>Salario:</strong> ${salaryText(job)}</p>
    </div>

    ${
      job.match
        ? `
          <div class="match-box">
            <h3>${job.match.level}</h3>
            <ul>
              ${
                job.match.reasons?.length
                  ? job.match.reasons.map((reason) => `<li>${reason}</li>`).join("")
                  : "<li>No hay explicación disponible.</li>"
              }
            </ul>
          </div>
        `
        : ""
    }
    ${
      job.match
        ? `
          <div class="skills-analysis">
    
            <div class="skills-analysis-card ok">
    
              <h3>Habilidades que ya cumples</h3>
    
              <div class="skills">
    
                ${
                  job.match.matchedSkills?.length
    
                    ? job.match.matchedSkills
                        .map((skill) => `<span>${skill}</span>`)
                        .join("")
    
                    : "<p>No se encontraron coincidencias exactas.</p>"
                }
    
              </div>
    
            </div>
    
            <div class="skills-analysis-card missing">
    
              <h3>Habilidades por fortalecer</h3>
    
              <div class="skills">
    
                ${
                  job.match.missingSkills?.length
    
                    ? job.match.missingSkills
                        .map((skill) => `<span>${skill}</span>`)
                        .join("")
    
                    : "<p>Cumples con las habilidades principales solicitadas.</p>"
                }
    
              </div>
    
            </div>
    
          </div>
        `
        : ""
    }
    <h3>Habilidades requeridas</h3>
    <div class="skills">${skillsHtml(job.skills)}</div>

    <h3>Descripción</h3>
    <p>${job.description || "Sin descripción registrada."}</p>

    <h3>Requisitos</h3>
    <p>${job.requirements || "No especificados."}</p>

    <h3>Beneficios</h3>
    <p>${job.benefits || "No especificados."}</p>

    ${
      job.company_description
        ? `<h3>Sobre la empresa</h3><p>${job.company_description}</p>`
        : ""
    }

    ${
      job.company_website
        ? `<p><a href="${job.company_website}" target="_blank">Visitar sitio web de la empresa</a></p>`
        : ""
    }

    <div class="card-actions">
      <button type="button" onclick="openApplyModal(${job.id})">Postularme</button>
      <button type="button" class="outline" onclick="saveJob(${job.id})">Guardar vacante</button>
    </div>
  </div>
`;
    }
  } catch (error) {
    if (target) target.innerHTML = `<p class="message">${error.message}</p>`;
  }
}

function closeJobModal() {
  document.getElementById("jobModal")?.classList.add("hidden");
}

async function saveJob(jobId) {
  try {
    const res = await fetch(`${API}/save-job`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ jobId })
    });
    const data = await readJson(res);
    showToast(data.message, "success");
    if (res.ok) await loadSavedJobs();
  } catch (error) {
    showToast(error.message, "error");
  }
}

let selectedJobToApply = null;

async function openApplyModal(jobId) {
  selectedJobToApply = jobId;

  const modal = document.getElementById("applyModal");
  const summary = document.getElementById("applyJobSummary");
  const message = document.getElementById("applyCoverMessage");

  if (message) message.value = "";

  if (summary) {
    summary.innerHTML = "Cargando información de la vacante...";
  }

  if (modal) {
    modal.classList.remove("hidden");
  }

  try {
    const res = await fetch(`${API}/job-detail/${jobId}`, {
      headers: { Authorization: "Bearer " + getToken() }
    });

    const job = await readJson(res);

    if (summary && res.ok) {
      summary.innerHTML = `
        <strong>${job.title}</strong>
        <span>${job.company}</span>
        <small>${job.city || "Ciudad no especificada"} · ${job.modality || "Modalidad no especificada"}</small>
      `;
    }
  } catch {
    if (summary) {
      summary.innerHTML = "No se pudo cargar el resumen de la vacante.";
    }
  }
}

function closeApplyModal() {
  selectedJobToApply = null;
  document.getElementById("applyModal")?.classList.add("hidden");
}

async function submitApplyModal() {
  if (!selectedJobToApply) return;

  const coverMessage = document.getElementById("applyCoverMessage")?.value.trim() || "";

  await applyToJob(selectedJobToApply, coverMessage);
  closeApplyModal();
}

async function applyToJob(jobId, coverMessage) {
  try {
    const res = await fetch(`${API}/apply`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ jobId, coverMessage })
    });
    const data = await readJson(res);
    showToast(data.message, "success");
    if (res.ok) {
      await loadApplications();
      await loadNotifications();
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadSavedJobs() {
  const container = document.getElementById("savedJobs");
  if (!container) return;
  container.innerHTML = "<p>Cargando guardadas...</p>";

  try {
    const res = await fetch(`${API}/saved-jobs`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    container.innerHTML = data.length ? data.map((job) => jobCard(job)).join("") : "<p>No tienes vacantes guardadas.</p>";
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}
function getApplicationStatusClass(status) {
  switch (status) {

    case "Postulado":
      return "status-blue";

    case "En revisión":
      return "status-yellow";

    case "Entrevista":
      return "status-purple";

    case "Seleccionado":
      return "status-green";

    case "Descartado":
      return "status-red";

    default:
      return "status-gray";
  }
}

function getApplicationStatusClass(status) {
  switch (status) {
    case "Postulado":
      return "status-blue";
    case "En revisión":
      return "status-yellow";
    case "Entrevista":
      return "status-purple";
    case "Seleccionado":
      return "status-green";
    case "Descartado":
      return "status-red";
    default:
      return "status-gray";
  }
}

async function loadApplications() {
  const container = document.getElementById("applications");
  if (!container) return;
  container.innerHTML = "<p>Cargando postulaciones...</p>";

  try {
    const res = await fetch(`${API}/applications`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    container.innerHTML = data.length
      ? data.map((app) => `
        <article class="job-card">
          <h3>${app.title}</h3>
          <p>${app.company}</p>
          <span class="status-badge ${getApplicationStatusClass(app.status)}">
  ${app.status}
</span>
          <div class="tags"><span>${app.modality}</span><span>${salaryText(app)}</span></div>
        </article>
      `).join("")
      : "<p>No tienes postulaciones.</p>";
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}

async function loadEvents() {
  const container = document.getElementById("events");
  if (!container) return;

  try {
    const res = await fetch(`${API}/events`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    container.innerHTML = data.length
  ? data.map((event) => `
    <div class="event-card">

      <div class="event-icon ${getEventClass(event.type)}">
        ${getEventIcon(event.type)}
      </div>

      <div class="event-content">

        <div class="event-top">
          <strong>${getEventTitle(event.type)}</strong>

          <span>
            ${
              event.created_at
                ? new Date(event.created_at).toLocaleString("es-CO")
                : ""
            }
          </span>
        </div>

        <p>
          ${event.description || "Actividad registrada en la plataforma."}
        </p>

        ${
          event.title || event.company
            ? `
              <small>
                ${event.title || ""}
                ${event.company ? " · " + event.company : ""}
              </small>
            `
            : ""
        }

      </div>

    </div>
  `).join("")

  : `
    <div class="empty-state">
      <h3>No hay historial</h3>
      <p>
        Cuando consultes, guardes o te postules a vacantes,
        aparecerá aquí.
      </p>
    </div>
  `;
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}

function getEventTitle(type) {
  if (type === "VIEW") return "Vista de vacante";
  if (type === "SAVE") return "Vacante guardada";
  if (type === "APPLY") return "Postulación realizada";
  if (type === "PROFILE_UPDATED") return "Perfil actualizado";
  if (type === "CV_UPLOADED") return "CV cargado";
  if (type === "JOB_CREATED") return "Vacante publicada";
  if (type === "COMPANY_UPDATED") return "Empresa actualizada";
  if (type === "PASSWORD_UPDATED") return "Contraseña actualizada";
  return "Actividad registrada";
}

function getEventIcon(type) {
  if (type === "VIEW") return "👁";
  if (type === "SAVE") return "★";
  if (type === "APPLY") return "✓";
  if (type === "PROFILE_UPDATED") return "✎";
  if (type === "CV_UPLOADED") return "CV";
  if (type === "JOB_CREATED") return "+";
  if (type === "COMPANY_UPDATED") return "🏢";
  if (type === "PASSWORD_UPDATED") return "🔒";
  return "i";
}

function getEventClass(type) {
  if (type === "VIEW") return "event-blue";
  if (type === "SAVE") return "event-purple";
  if (type === "APPLY") return "event-green";
  if (type === "PROFILE_UPDATED") return "event-orange";
  if (type === "CV_UPLOADED") return "event-green";
  if (type === "JOB_CREATED") return "event-purple";
  if (type === "COMPANY_UPDATED") return "event-blue";
  if (type === "PASSWORD_UPDATED") return "event-orange";
  return "event-gray";
}

async function loadNotifications() {
  const container = document.getElementById("notificationsList");
  const badge = document.getElementById("notificationBadge");

  if (!container) return;

  try {
    const res = await fetch(`${API}/notifications`, {
      headers: {
        Authorization: "Bearer " + getToken()
      }
    });

    const data = await readJson(res);

    if (!res.ok) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Error al cargar notificaciones.</h3>
          <p>${data.message || "Error del servidor."}</p>
        </div>
      `;
      return;
    }

    const notifications = data.notifications || [];
    const unread = data.unread || 0;

    if (badge) {
      badge.textContent = `${unread} sin leer`;
      badge.classList.toggle("has-unread", unread > 0);
    }

    if (!notifications.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No tienes notificaciones</h3>
          <p>Cuando recibas novedades aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notifications.map((n) => {
      const isRead = Number(n.is_read) === 1;

      return `
        <article class="notification-card ${isRead ? "read" : "unread"}">
          <div class="notification-icon ${n.type || "info"}">
            ${getNotificationIcon(n.type)}
          </div>

          <div class="notification-content">
            <div class="notification-top">
              <h3>${n.title || "Notificación"}</h3>
              <span>${formatNotificationDate(n.created_at)}</span>
            </div>

            <p>${n.message || ""}</p>
            <span class="notification-type">${getNotificationTypeLabel(n.type)}</span>

            <div class="notification-buttons">
              ${
                n.link
                  ? `<button type="button" class="detail-btn" onclick="openNotification(${n.id}, '${n.link}')">
  Ver detalle
</button>`
                  : ""
              }

              ${
                !isRead
                  ? `<button type="button" onclick="markNotificationRead(${n.id})">Marcar como leída</button>`
                  : ""
              }

              <button type="button" class="danger" onclick="deleteNotification(${n.id})">
                Eliminar
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    console.error("ERROR REAL EN NOTIFICACIONES:", error);

    container.innerHTML = `
      <div class="empty-state">
        <h3>Error al cargar notificaciones.</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function getNotificationIcon(type) {
  if (type === "success") return "✓";
  if (type === "application") return "👤";
  if (type === "status") return "↻";
  if (type === "security") return "🔒";
  if (type === "warning") return "!";
  return "i";
}

function getNotificationTypeLabel(type) {
  if (type === "success") return "Postulación";
  if (type === "application") return "Reclutador";
  if (type === "status") return "Estado";
  if (type === "security") return "Seguridad";
  if (type === "warning") return "Alerta";
  return "Sistema";
}

function formatNotificationDate(dateValue) {
  if (!dateValue) return "";

  return new Date(dateValue).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function markNotificationRead(id) {
  await fetch(`${API}/notifications/${id}/read`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + getToken()
    }
  });

  loadNotifications();
}

async function markAllNotificationsRead() {
  await fetch(`${API}/notifications/read-all`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + getToken()
    }
  });

  loadNotifications();
}

async function deleteNotification(id) {
  await fetch(`${API}/notifications/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + getToken()
    }
  });

  loadNotifications();
}

async function openNotification(id, link) {
  await markNotificationRead(id);

  if (!link) return;

  const sectionByHash = {
    "#applications": "applicationsSection",
    "#saved": "savedSection",
    "#profile": "profileSection",
    "#notifications": "notificationsSection",
    "#recruiterCandidates": "recruiterCandidatesSection",
    "#recruiter": "recruiterJobsSection"
  };

  const hash = link.includes("#") ? link.substring(link.indexOf("#")) : link;
  const sectionId = sectionByHash[hash];

  if (sectionId) {
    const section = document.getElementById(sectionId);

    document.querySelectorAll(".dash-section").forEach((s) => {
      s.classList.remove("active-section");
    });

    section?.classList.add("active-section");

    document.querySelectorAll(".side-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    const menuButton = Array.from(document.querySelectorAll(".side-btn")).find((btn) =>
      btn.getAttribute("onclick")?.includes(sectionId)
    );

    menuButton?.classList.add("active");

    if (sectionId === "applicationsSection") loadApplications();
    if (sectionId === "savedSection") loadSavedJobs();
    if (sectionId === "profileSection") loadProfile();
    if (sectionId === "recruiterJobsSection") loadRecruiterJobs();

    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadCompany() {
  if (getUser()?.role !== "recruiter") return;

  try {
    const res = await fetch(`${API}/company`, { headers: { Authorization: "Bearer " + getToken() } });
    const company = await readJson(res);
    if (!res.ok) return setMessage("companyMsg", company.message);

    if (company) {
      document.getElementById("companyName").value = company.name || "";
      document.getElementById("companyCity").value = company.city || "";
      document.getElementById("companyWebsite").value = company.website || "";
      document.getElementById("companyDescription").value = company.description || "";
      document.getElementById("jobCompany").value = company.name || "";
    }
    document.getElementById("jobRecruiterEmail").value = getUser()?.email || "";
  } catch (error) {
    setMessage("companyMsg", error.message);
  }
}

async function saveCompany() {
  try {
    const payload = {
      name: document.getElementById("companyName")?.value.trim(),
      city: document.getElementById("companyCity")?.value.trim(),
      website: document.getElementById("companyWebsite")?.value.trim(),
      description: document.getElementById("companyDescription")?.value.trim()
    };

    const res = await fetch(`${API}/company`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await readJson(res);
    setMessage("companyMsg", data.message, res.ok);
    if (res.ok) document.getElementById("jobCompany").value = payload.name;
  } catch (error) {
    setMessage("companyMsg", error.message);
  }
}

async function publishJob() {
  try {
    const payload = {
      title: document.getElementById("jobTitle")?.value.trim(),
      company: document.getElementById("jobCompany")?.value.trim(),
      city: document.getElementById("jobCity")?.value.trim(),
      modality: document.getElementById("jobModality")?.value,
      seniority: document.getElementById("jobSeniority")?.value,
      contractType: document.getElementById("jobContractType")?.value.trim(),
      area: document.getElementById("jobArea")?.value.trim(),
      salaryMin: document.getElementById("jobSalaryMin")?.value,
      salaryMax: document.getElementById("jobSalaryMax")?.value,
      deadline: document.getElementById("jobDeadline")?.value,
      recruiterEmail: document.getElementById("jobRecruiterEmail")?.value.trim(),
      skills: document.getElementById("jobSkills")?.value.trim(),
      description: document.getElementById("jobDescription")?.value.trim(),
      requirements: document.getElementById("jobRequirements")?.value.trim(),
      benefits: document.getElementById("jobBenefits")?.value.trim()
    };

    const res = await fetch(`${API}/recruiter/jobs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await readJson(res);
    setMessage("jobMsg", data.message, res.ok);

    if (res.ok) {
      ["jobTitle", "jobCity", "jobContractType", "jobArea", "jobSalaryMin", "jobSalaryMax", "jobDeadline", "jobSkills", "jobDescription", "jobRequirements", "jobBenefits"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      await loadRecruiterJobs();
    }
  } catch (error) {
    setMessage("jobMsg", error.message);
  }
}

async function loadRecruiterJobs() {
  const container = document.getElementById("recruiterJobs");
  if (!container) return;
  container.innerHTML = "<p>Cargando vacantes...</p>";

  try {
    const res = await fetch(`${API}/recruiter/jobs`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    if (!res.ok) {
      container.innerHTML = `<p class="message">${data.message}</p>`;
      return;
    }

    container.innerHTML = data.length
      ? data.map((job) => `
        <article class="job-card">
          <div class="job-head">
            <div>
              <span class="tag">${Number(job.is_active) === 1 ? "Activa" : "Inactiva"}</span>
              <h3>${job.title}</h3>
              <p>${job.company}</p>
            </div>
            <div class="score">${job.applications_count || 0}</div>
          </div>
          <p>${job.description || ""}</p>
          <div class="tags"><span>${job.city || "Ciudad"}</span><span>${job.modality || "Modalidad"}</span><span>${salaryText(job)}</span></div>
          <div class="card-actions">
            <button type="button" onclick="showJobDetail(${job.id})">Ver detalle</button>
            <button type="button" onclick="loadCandidates(${job.id})">Ver candidatos</button>
            <button type="button" class="outline" onclick="toggleJobStatus(${job.id}, ${Number(job.is_active) === 1 ? 0 : 1})">${Number(job.is_active) === 1 ? "Cerrar" : "Activar"}</button>
          </div>
        </article>
      `).join("")
      : "<p>Aún no has publicado vacantes.</p>";
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}

async function toggleJobStatus(jobId, isActive) {
  try {
    const res = await fetch(`${API}/recruiter/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: Boolean(isActive) })
    });
    const data = await readJson(res);
    showToast(data.message, "success");
    if (res.ok) await loadRecruiterJobs();
  } catch (error) {
    showToast(error.message, "error");
  }
}



async function loadCandidates(jobId) {
  showSection("recruiterCandidatesSection", document.querySelector("#recruiterMenu .side-btn:nth-child(4)"));
  const container = document.getElementById("recruiterCandidates");
  if (!container) return;
  container.innerHTML = "<p>Cargando candidatos...</p>";

  try {
    const res = await fetch(`${API}/recruiter/jobs/${jobId}/applications`, { headers: { Authorization: "Bearer " + getToken() } });
    const data = await readJson(res);
    if (!res.ok) {
      container.innerHTML = `<p class="message">${data.message}</p>`;
      return;
    }

    container.innerHTML = data.length
    ? data.map((candidate) => `
      <article class="job-card candidate-card">
  
        <div class="job-head">
          <div>
            <span class="tag">${candidate.status || "Postulado"}</span>
            <h3>${candidate.candidate_name}</h3>
            <p>${candidate.candidate_email}</p>
          </div>
  
          <div class="score-box">
            <div class="score ${scoreClass(candidate.match_score || 0)}">
              ${candidate.match_score || 0}%
            </div>
  
            <span class="compatibility-tag ${getCompatibilityClass(candidate.match_score || 0)}">
              ${getCompatibilityLabel(candidate.match_score || 0)}
            </span>
          </div>
        </div>
  
        <p><strong>Ciudad:</strong> ${candidate.city || "No registrada"}</p>
        <p><strong>Profesión:</strong> ${candidate.profession || "No registrada"}</p>
        <p><strong>Skills:</strong> ${candidate.skills || "No registradas"}</p>
  
        <div class="candidate-match-box">
          <strong>Explicación del match:</strong>
          <p>${candidate.match_explanation || "No hay explicación disponible."}</p>
  
          <div class="mini-skills-grid">
            <div>
              <strong>Coincide:</strong>
              <p>
                ${
                  candidate.matchedSkills?.length
                    ? candidate.matchedSkills.join(", ")
                    : "Sin coincidencias exactas"
                }
              </p>
            </div>
  
            <div>
              <strong>Por fortalecer:</strong>
              <p>
                ${
                  candidate.missingSkills?.length
                    ? candidate.missingSkills.join(", ")
                    : "Cumple las habilidades principales"
                }
              </p>
            </div>
          </div>
        </div>
  
        <p><strong>Mensaje:</strong> ${candidate.cover_message || "Sin mensaje adicional"}</p>
  
        ${
          candidate.cv_filename
            ? `<p><a href="${API}/uploads/${candidate.cv_filename}" target="_blank">Ver CV: ${candidate.cv_original_name || "Hoja de vida"}</a></p>`
            : `<p>No hay CV adjunto.</p>`
        }
  
        <select id="status-${candidate.application_id}">
          <option value="Postulado" ${candidate.status === "Postulado" ? "selected" : ""}>Postulado</option>
          <option value="En revisión" ${candidate.status === "En revisión" ? "selected" : ""}>En revisión</option>
          <option value="Entrevista" ${candidate.status === "Entrevista" ? "selected" : ""}>Entrevista</option>
          <option value="Seleccionado" ${candidate.status === "Seleccionado" ? "selected" : ""}>Seleccionado</option>
          <option value="Rechazado" ${candidate.status === "Rechazado" ? "selected" : ""}>Rechazado</option>
        </select>
  
        <button onclick="updateApplicationStatus(${candidate.application_id})">
          Actualizar estado
        </button>
  
      </article>
    `).join("")
    : "<p>No hay candidatos postulados.</p>";
  } catch (error) {
    container.innerHTML = `<p class="message">${error.message}</p>`;
  }
}

async function updateApplicationStatus(applicationId, jobId) {
  const status = document.getElementById(`status-${applicationId}`)?.value;
  try {
    const res = await fetch(`${API}/recruiter/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await readJson(res);
    showToast(data.message, "success");
    if (res.ok) await loadCandidates(jobId);
  } catch (error) {
    showToast(error.message, "error");
  }
}

if (location.pathname.includes("dashboard.html")) {
  requireFrontAuth();
  loadUserInfo();
  configureDashboardByRole();
}

async function forgotPassword() {
  const email = document.getElementById("forgotEmail")?.value.trim();

  if (!email) {
    return setMessage("forgotMsg", "Ingresa tu correo electrónico.");
  }

  try {
    const res = await fetch(`${API}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await readJson(res);

    if (!res.ok) {
      return setMessage("forgotMsg", data.message || "No se pudo enviar el correo.");
    }

    setMessage("forgotMsg", data.message || "Se envió el enlace de recuperación.", true);
  } catch (error) {
    setMessage("forgotMsg", error.message);
  }
}

async function resetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const password = document.getElementById("newPassword")?.value.trim();

  if (!token) {
    return setMessage("resetMsg", "El enlace no tiene token de recuperación.");
  }

  if (!password || password.length < 6) {
    return setMessage("resetMsg", "La contraseña debe tener mínimo 6 caracteres.");
  }

  try {
    const res = await fetch(`${API}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token, password })
    });

    const data = await readJson(res);

    if (!res.ok) {
      return setMessage("resetMsg", data.message || "No se pudo actualizar la contraseña.");
    }

    setMessage("resetMsg", data.message || "Contraseña actualizada correctamente.", true);

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2500);
  } catch (error) {
    setMessage("resetMsg", error.message);
  }
}
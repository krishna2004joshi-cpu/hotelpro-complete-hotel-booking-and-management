const seedReservations = [
  { guest: "Sofia Laurent", email: "sofia.laurent@email.com", initials: "SL", color: "#f1dfd1", room: "204 · Deluxe", dates: "Oct 29 – Nov 01", channel: "Direct", status: "Checked in", amount: 654 },
  { guest: "James Miller", email: "j.miller@email.com", initials: "JM", color: "#dce8df", room: "108 · Classic", dates: "Oct 29 – Oct 31", channel: "Booking.com", status: "Arriving", amount: 382 },
  { guest: "Amara Okafor", email: "amara.okafor@email.com", initials: "AO", color: "#e6def0", room: "312 · Suite", dates: "Oct 29 – Nov 03", channel: "Direct", status: "Arriving", amount: 1240 },
  { guest: "Oliver Chen", email: "oliver.chen@email.com", initials: "OC", color: "#e7e4d3", room: "205 · Deluxe", dates: "Oct 28 – Oct 30", channel: "Expedia", status: "Checked in", amount: 436 },
  { guest: "Camille Dubois", email: "camille.dubois@email.com", initials: "CD", color: "#dbe4ed", room: "116 · Classic", dates: "Oct 29 – Nov 02", channel: "Booking.com", status: "Confirmed", amount: 512 },
  { guest: "Noah Williams", email: "noah.w@email.com", initials: "NW", color: "#efe0dd", room: "410 · Junior suite", dates: "Oct 30 – Nov 02", channel: "Direct", status: "Confirmed", amount: 948 },
  { guest: "Priya Sharma", email: "priya.sharma@email.com", initials: "PS", color: "#f0e7d5", room: "221 · Deluxe", dates: "Oct 29 – Oct 31", channel: "Phone", status: "Arriving", amount: 388 },
  { guest: "Lucas Martin", email: "lucas.martin@email.com", initials: "LM", color: "#dde8e4", room: "307 · Suite", dates: "Oct 27 – Oct 30", channel: "Expedia", status: "Checked in", amount: 870 },
];

const storageKey = "hotelpro-demo-reservations-v1";
let reservations = loadReservations();
let activeFilter = "All stays";
let toastTimer;
let currentPage = "overview";

function loadReservations() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!Array.isArray(saved)) return [...seedReservations];
    const merged = new Map(seedReservations.map((reservation) => [reservation.guest.toLowerCase(), reservation]));
    saved.forEach((reservation) => {
      const key = (reservation.email && reservation.email !== "New reservation" ? reservation.email : reservation.guest).toLowerCase();
      merged.set(key, reservation);
    });
    return [...merged.values()];
  } catch {
    return [...seedReservations];
  }
}

function saveReservations() {
  try { localStorage.setItem(storageKey, JSON.stringify(reservations)); } catch { /* The demo still works if storage is unavailable. */ }
}

const rowsEl = document.getElementById("reservationRows");
const searchEl = document.getElementById("reservationSearch");
const toastEl = document.getElementById("toast");
const modal = document.getElementById("modalBackdrop");

function statusClass(status) {
  return ({ "Checked in": "status-checked", Arriving: "status-arriving", Confirmed: "status-confirmed", Pending: "status-pending" })[status] || "status-confirmed";
}

function channelMark(channel) {
  return ({ Direct: "D", "Booking.com": "b", Expedia: "e", Phone: "⌕" })[channel] || "•";
}

function renderReservations() {
  if (!rowsEl) return;
  const query = (searchEl?.value || "").trim().toLowerCase();
  const filtered = reservations.filter((r) => {
    const matchesQuery = `${r.guest} ${r.email} ${r.room} ${r.channel}`.toLowerCase().includes(query);
    const matchesFilter = activeFilter === "All stays" || r.status === activeFilter;
    return matchesQuery && matchesFilter;
  });
  const shown = currentPage === "overview" ? filtered.slice(0, 8) : filtered;
  rowsEl.innerHTML = shown.length ? shown.map((r, index) => `
    <tr>
      <td><div class="guest-cell"><span class="guest-avatar" style="background:${r.color || "#e5e8df"};color:#526052">${escapeHtml(r.initials || initials(r.guest))}</span><span class="guest-name"><strong>${escapeHtml(r.guest)}</strong><span>${escapeHtml(r.email || "New guest")}</span></span></div></td>
      <td class="room-label">${escapeHtml(r.room)}</td><td class="date-cell">${escapeHtml(r.dates)}</td>
      <td><span class="channel-cell"><span class="channel-icon">${escapeHtml(channelMark(r.channel))}</span>${escapeHtml(r.channel)}</span></td>
      <td><span class="status-pill ${statusClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td class="amount-cell">€${Number(r.amount).toLocaleString("en-US")}</td>
      <td><button class="row-menu" data-row-menu="${index}" aria-label="More actions for ${escapeHtml(r.guest)}">···</button></td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty-row">No reservations match this search.</td></tr>`;
  const count = document.getElementById("tableCount");
  if (count) count.textContent = filtered.length;
  const foot = document.getElementById("tableFootText");
  if (foot) foot.textContent = `Showing ${shown.length} of ${currentPage === "overview" ? "146" : filtered.length} reservations`;
  const navCount = document.getElementById("reservationNavCount");
  if (navCount) navCount.textContent = reservations.length;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function initials(name) {
  return String(name || "Guest").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function notify(message) {
  document.getElementById("toastMessage").textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2700);
}

function displayDate() {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const topDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(now);
  document.getElementById("currentDate").textContent = topDate;
  document.getElementById("welcomeDate").textContent = dateLabel.toUpperCase();
}

const viewCopy = {
  overview: ["Overview", "Good morning, Alex", "Here’s what’s happening at your hotel today."],
  reservations: ["Reservations", "Your reservations", "Every stay, all in one place."],
  rooms: ["Rooms & rates", "Rooms & rates", "A live view of availability and housekeeping."],
  guests: ["Guests", "Know your guests", "A little context makes every welcome warmer."],
  reports: ["Reports", "The bigger picture", "Your property’s performance at a glance."],
  inbox: ["Guest inbox", "A warm welcome starts here", "Messages from your guests, gathered in one place."],
  settings: ["Settings", "Make it yours", "Manage the details behind a thoughtful stay."],
};

function setActiveNav(page) {
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
}

function renderModule(page) {
  const metrics = document.querySelector(".metric-grid");
  const dashboard = document.querySelector(".dashboard-grid");
  const recent = document.querySelector(".reservations-panel");
  const footer = document.querySelector(".page-footer");
  let module = document.getElementById("moduleContent");
  if (!module) {
    module = document.createElement("section");
    module.id = "moduleContent";
    module.className = "module-content";
    document.querySelector(".welcome-row").after(module);
  }
  const isOverview = page === "overview";
  metrics.hidden = page === "rooms" || page === "guests" || page === "inbox" || page === "settings";
  dashboard.hidden = page === "reservations" || page === "rooms" || page === "guests" || page === "inbox" || page === "settings";
  recent.hidden = isOverview || page === "rooms" || page === "guests" || page === "inbox" || page === "settings";
  module.hidden = isOverview || page === "reservations" || page === "reports";
  footer.hidden = false;
  if (page === "rooms") module.innerHTML = roomsTemplate();
  if (page === "guests") module.innerHTML = guestsTemplate();
  if (page === "inbox") module.innerHTML = inboxTemplate();
  if (page === "settings") module.innerHTML = settingsTemplate();
  if (page === "reports") {
    module.hidden = false;
    module.innerHTML = reportsTemplate();
    dashboard.hidden = false;
    recent.hidden = true;
  }
  if (page === "reservations") {
    dashboard.hidden = true;
    metrics.hidden = false;
    recent.hidden = false;
  }
}

function roomsTemplate() {
  const rooms = Array.from({ length: 24 }, (_, i) => {
    const number = [101, 102, 103, 104, 105, 106, 107, 108, 201, 202, 203, 204, 205, 206, 207, 208, 301, 302, 303, 304, 305, 306, 307, 308][i];
    const state = i % 9 === 2 ? "Needs cleaning" : i % 7 === 4 ? "Available" : i % 8 === 1 ? "Arriving" : "Occupied";
    const type = i % 8 === 1 ? "Suite" : i % 3 === 0 ? "Classic" : "Deluxe";
    return `<article class="room-card" data-room-status="${state}"><div class="room-card-top"><span class="room-number">${number}</span><span class="room-state ${state === "Occupied" ? "room-occupied" : state === "Available" ? "room-available" : state === "Arriving" ? "room-arriving" : "room-cleaning"}">${state}</span></div><p>${type}</p><div class="room-card-bottom"><span>2 guests</span><strong>€${type === "Suite" ? 310 : type === "Deluxe" ? 218 : 164}<small> / night</small></strong></div></article>`;
  }).join("");
  return `<div class="module-heading"><div><p class="panel-overline">ROOM INVENTORY</p><h2>Room overview <span class="table-count">50 rooms</span></h2></div><div class="room-filters"><select id="roomFilter"><option>All rooms</option><option>Occupied</option><option>Available</option><option>Arriving</option><option>Needs cleaning</option></select><button class="secondary-button" id="roomRefresh">↻ Refresh</button></div></div><div class="room-legend"><span><i class="legend-occupied"></i> Occupied 41</span><span><i class="legend-available"></i> Available 6</span><span><i class="legend-arriving"></i> Arriving 2</span><span><i class="legend-cleaning"></i> Needs cleaning 1</span></div><div class="room-grid">${rooms}</div>`;
}

function guestsTemplate() {
  const unique = [...new Map(reservations.map((r) => [r.email || r.guest, r])).values()];
  const guests = unique.map((r, i) => `<tr><td><div class="guest-cell"><span class="guest-avatar" style="background:${r.color || "#e5e8df"};color:#526052">${escapeHtml(r.initials || initials(r.guest))}</span><span class="guest-name"><strong>${escapeHtml(r.guest)}</strong><span>${escapeHtml(r.email || "New guest")}</span></span></div></td><td>${i % 3 === 0 ? "Returning guest" : "New guest"}</td><td>${i % 3 + 1} ${i % 3 === 0 ? "stays" : "stay"}</td><td>${r.dates.split(" – ")[0]}</td><td><span class="guest-tag">${i % 2 === 0 ? "Preferred" : "Standard"}</span></td><td><button class="row-menu" aria-label="Guest actions">···</button></td></tr>`).join("");
  return `<div class="module-heading"><div><p class="panel-overline">GUEST RELATIONSHIPS</p><h2>Guest directory <span class="table-count">${unique.length} guests</span></h2></div><label class="search-box guest-search"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input id="guestSearch" type="search" placeholder="Search guests" /></label></div><div class="panel module-table-panel"><div class="table-scroll"><table><thead><tr><th>GUEST</th><th>RELATIONSHIP</th><th>STAYS</th><th>LAST VISIT</th><th>SEGMENT</th><th></th></tr></thead><tbody>${guests}</tbody></table></div></div>`;
}

function inboxTemplate() {
  return `<div class="inbox-banner"><div class="inbox-banner-icon">✉</div><div><strong>All caught up on the important things.</strong><p>Three guest conversations are waiting for a reply.</p></div><button class="secondary-button" id="composeMessage">Compose message <span>↗</span></button></div><div class="panel inbox-list"><div class="inbox-list-heading"><h2>Recent conversations</h2><span>3 unread</span></div>${[["JM","James Miller","Early check-in request","Hi, our train arrives around 11am. Is it possible to check in a little earlier?","8 min ago","#dce8df"],["CD","Camille Dubois","A question about parking","Bonjour! Do you have a safe place to leave a rental car overnight?","32 min ago","#dbe4ed"],["PS","Priya Sharma","Dietary preferences","Thank you for confirming. One guest is vegetarian — could you let the kitchen know?","1 hr ago","#f0e7d5"]].map(([ini,name,subject,body,time,color])=>`<button class="message-row"><span class="guest-avatar" style="background:${color};color:#526052">${ini}</span><span class="message-copy"><strong>${name} <small>${subject}</small></strong><span>${body}</span></span><span class="message-time">${time}<i></i></span></button>`).join("")}</div>`;
}

function settingsTemplate() {
  return `<div class="settings-layout"><div class="settings-tabs"><button class="selected">Property details</button><button>Booking preferences</button><button>Team &amp; access</button><button>Notifications</button></div><div class="panel settings-panel"><p class="panel-overline">YOUR PROPERTY</p><h2>Property details</h2><p class="settings-intro">Keep your hotel information current across every guest touchpoint.</p><form id="settingsForm" class="settings-form"><label class="form-field"><span>Property name</span><input value="Maison Verdan" /></label><div class="form-row"><label class="form-field"><span>Property type</span><select><option>Boutique hotel</option><option>Resort</option><option>Bed &amp; breakfast</option></select></label><label class="form-field"><span>Number of rooms</span><input type="number" value="50" /></label></div><label class="form-field"><span>Address</span><input value="18 Rue des Martyrs, 75009 Paris, France" /></label><div class="form-row"><label class="form-field"><span>Check-in from</span><input type="time" value="15:00" /></label><label class="form-field"><span>Check-out by</span><input type="time" value="11:00" /></label></div><div class="settings-save"><span>Changes save in this demo only.</span><button class="primary-button" type="submit">Save changes</button></div></form></div></div>`;
}

function reportsTemplate() {
  return `<div class="reports-strip"><article><span>Total revenue</span><strong>€68,240</strong><small>↑ 8.2% vs. last week</small></article><article><span>Average occupancy</span><strong>78.6%</strong><small>↑ 4.1% vs. last week</small></article><article><span>Average daily rate</span><strong>€214</strong><small>↑ 3.2% vs. last week</small></article><article><span>RevPAR</span><strong>€168</strong><small>↑ 7.8% vs. last week</small></article></div><div class="panel report-note"><span class="desk-note-icon">✦</span><div><strong>A strong week so far.</strong><p>Direct bookings are up 14% compared with this time last week. Thursday continues to be your best-performing night.</p></div><button class="secondary-button" id="exportReport">Export report</button></div>`;
}

function switchPage(page) {
  if (!viewCopy[page]) return;
  currentPage = page;
  const [crumb, title, subtitle] = viewCopy[page];
  document.getElementById("breadcrumbCurrent").textContent = crumb;
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageSubtitle").textContent = subtitle;
  setActiveNav(page);
  renderModule(page);
  renderReservations();
  if (page === "inbox") document.querySelector(".unread-dot")?.classList.add("seen");
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => modal.querySelector("input[name=guest]").focus(), 90);
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll(".nav-item[data-page]").forEach((button) => button.addEventListener("click", () => switchPage(button.dataset.page)));
document.querySelectorAll("[data-navigate]").forEach((button) => button.addEventListener("click", () => switchPage(button.dataset.navigate)));
document.getElementById("newBookingButton").addEventListener("click", openModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelBooking").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

document.getElementById("bookingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const guest = String(form.get("guest")).trim();
  const checkin = new Date(`${form.get("checkin")}T12:00:00`);
  const checkout = new Date(`${form.get("checkout")}T12:00:00`);
  if (checkout <= checkin) {
    notify("Check-out must be after check-in.");
    return;
  }
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
  const room = String(form.get("room"));
  reservations.unshift({
    guest,
    email: "New reservation",
    initials: initials(guest),
    color: "#e6e7d8",
    room,
    dates: `${dateFmt.format(checkin)} – ${dateFmt.format(checkout)}`,
    channel: String(form.get("channel")),
    status: "Confirmed",
    amount: Number(form.get("amount")) || 0,
  });
  saveReservations();
  renderReservations();
  closeModal();
  event.currentTarget.reset();
  notify(`Reservation saved for ${guest}.`);
  if (currentPage !== "overview" && currentPage !== "reservations") switchPage("reservations");
});

searchEl.addEventListener("input", renderReservations);
document.getElementById("filterButton").addEventListener("click", (event) => {
  activeFilter = activeFilter === "All stays" ? "Arriving" : activeFilter === "Arriving" ? "Checked in" : "All stays";
  const button = event.currentTarget;
  button.classList.toggle("filter-active", activeFilter !== "All stays");
  button.querySelector("span").textContent = activeFilter === "All stays" ? "Filter" : activeFilter;
  document.getElementById("activeFilterDot").title = activeFilter;
  renderReservations();
});

document.getElementById("revenuePeriod").addEventListener("change", (event) => {
  const monthly = event.target.value === "month";
  document.getElementById("chartTotal").textContent = monthly ? "€248,960" : "€68,240";
  document.getElementById("chartLabels").innerHTML = monthly ? "<span>Oct 1</span><span>Oct 5</span><span>Oct 10</span><span>Oct 15</span><span>Oct 20</span><span>Oct 25</span><span>Oct 29</span>" : "<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>";
  notify(monthly ? "Showing this month’s revenue." : "Showing this week’s revenue.");
});

document.getElementById("notificationButton").addEventListener("click", () => notify("You’re all caught up — no new alerts."));
document.getElementById("supportButton").addEventListener("click", () => notify("Our hospitality team is ready to help."));
document.getElementById("helpLink").addEventListener("click", (event) => { event.preventDefault(); notify("The HotelPro help center is coming soon."); });
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.addEventListener("click", (event) => {
  const rowMenu = event.target.closest("[data-row-menu]");
  if (rowMenu) notify("Reservation details are ready to view.");
  if (event.target.id === "roomRefresh") notify("Room availability is up to date.");
  if (event.target.id === "composeMessage") notify("Choose a guest to start a new conversation.");
  if (event.target.id === "exportReport") notify("Your report is ready to export.");
  if (event.target.closest(".settings-tabs button")) {
    document.querySelectorAll(".settings-tabs button").forEach((button) => button.classList.remove("selected"));
    event.target.closest("button").classList.add("selected");
    notify(`${event.target.closest("button").textContent.trim()} settings selected.`);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "roomFilter") {
    const filter = event.target.value;
    document.querySelectorAll(".room-card").forEach((card) => { card.hidden = filter !== "All rooms" && card.dataset.roomStatus !== filter; });
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "guestSearch") {
    const query = event.target.value.toLowerCase();
    document.querySelectorAll(".module-table-panel tbody tr").forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); });
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "settingsForm") {
    event.preventDefault();
    notify("Property details saved in this demo.");
  }
});

displayDate();
renderReservations();

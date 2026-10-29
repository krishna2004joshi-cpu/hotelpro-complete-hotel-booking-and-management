const reservationStorageKey = "hotelpro-demo-reservations-v1";
const roomCatalog = {
  classic: { name: "Classic room", room: "112 · Classic", price: 164, party: 2 },
  deluxe: { name: "Verdan deluxe", room: "205 · Deluxe", price: 218, party: 2 },
  suite: { name: "Garden suite", room: "312 · Suite", price: 310, party: 4 },
};
let selectedRoomId = "deluxe";
let selectedStay = null;
let guestToastTimer;

const availabilityForm = document.getElementById("availabilityForm");
const guestModal = document.getElementById("guestModal");
const guestToast = document.getElementById("guestToast");

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDates() {
  const checkin = new Date();
  checkin.setDate(checkin.getDate() + 1);
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + 3);
  const today = localDateString(new Date());
  availabilityForm.elements.checkin.min = today;
  availabilityForm.elements.checkout.min = today;
  availabilityForm.elements.checkin.value = localDateString(checkin);
  availabilityForm.elements.checkout.value = localDateString(checkout);
  return { checkin, checkout };
}

function dateForInput(value) {
  return new Date(`${value}T12:00:00`);
}

function formatStay(dateValue) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(dateForInput(dateValue));
}

function getStayFromForm() {
  const checkin = availabilityForm.elements.checkin.value;
  const checkout = availabilityForm.elements.checkout.value;
  const guests = Number(availabilityForm.elements.guests.value || 2);
  if (!checkin || !checkout || dateForInput(checkout) <= dateForInput(checkin)) {
    showGuestToast("Choose a check-out date after your check-in.");
    return null;
  }
  const nights = Math.round((dateForInput(checkout) - dateForInput(checkin)) / 86400000);
  return { checkin, checkout, guests, nights };
}

function quoteRoom(room, stay) {
  const extraGuestCharge = Math.max(0, stay.guests - 2) * 18;
  return room.price + extraGuestCharge;
}

function refreshRoomPrices(stay) {
  const summary = document.getElementById("availabilitySummary");
  summary.textContent = `Rooms for ${stay.guests} ${stay.guests === 1 ? "guest" : "guests"} · ${stay.nights} ${stay.nights === 1 ? "night" : "nights"} · ${formatStay(stay.checkin)} – ${formatStay(stay.checkout)}.`;
  Object.entries(roomCatalog).forEach(([id, room]) => {
    const card = document.querySelector(`.guest-room-card[data-room="${id}"]`);
    const amount = quoteRoom(room, stay);
    card.querySelector(".room-price strong").textContent = `€${amount}`;
    card.querySelector(".room-price span").textContent = `per night · €${(amount * stay.nights).toLocaleString("en-US")} total`;
    const button = card.querySelector(".choose-room");
    const unavailable = stay.guests > room.party;
    button.disabled = unavailable;
    button.innerHTML = unavailable ? "Too many guests" : "Choose room <span>→</span>";
    button.classList.toggle("room-unavailable", unavailable);
  });
  selectedStay = stay;
}

function showGuestToast(message) {
  guestToast.textContent = message;
  guestToast.classList.add("show");
  window.clearTimeout(guestToastTimer);
  guestToastTimer = window.setTimeout(() => guestToast.classList.remove("show"), 2600);
}

function showBookingModal(roomId) {
  const stay = selectedStay || getStayFromForm();
  if (!stay) return;
  selectedRoomId = roomId;
  const room = roomCatalog[roomId];
  if (stay.guests > room.party) {
    showGuestToast(`The ${room.name.toLowerCase()} is best for up to ${room.party} guests.`);
    return;
  }
  const nightly = quoteRoom(room, stay);
  document.getElementById("guestModalTitle").textContent = "Make it yours.";
  document.getElementById("selectedRoomSummary").textContent = `${room.name} · ${nightly}€ per night`;
  document.getElementById("summaryDates").textContent = `${formatStay(stay.checkin)} – ${formatStay(stay.checkout)} · ${stay.nights} ${stay.nights === 1 ? "night" : "nights"}`;
  document.getElementById("summaryGuests").textContent = `${stay.guests} ${stay.guests === 1 ? "guest" : "guests"}`;
  document.getElementById("summaryTotal").textContent = `€${(nightly * stay.nights).toLocaleString("en-US")}`;
  document.getElementById("guestBookingStep").hidden = false;
  document.getElementById("guestSuccessStep").hidden = true;
  guestModal.classList.add("open");
  guestModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => guestModal.querySelector("input[name=guest]").focus(), 90);
}

function closeBookingModal() {
  guestModal.classList.remove("open");
  guestModal.setAttribute("aria-hidden", "true");
}

function guestInitials(name) {
  return String(name || "Guest").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

function makeConfirmationCode() {
  return `MV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

availabilityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const stay = getStayFromForm();
  if (stay) {
    refreshRoomPrices(stay);
    document.getElementById("rooms").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

availabilityForm.elements.checkin.addEventListener("change", () => {
  const checkin = availabilityForm.elements.checkin.value;
  availabilityForm.elements.checkout.min = checkin;
  if (availabilityForm.elements.checkout.value <= checkin) {
    const nextDay = dateForInput(checkin);
    nextDay.setDate(nextDay.getDate() + 1);
    availabilityForm.elements.checkout.value = localDateString(nextDay);
  }
});

document.querySelectorAll(".choose-room").forEach((button) => button.addEventListener("click", () => showBookingModal(button.dataset.roomId)));
document.getElementById("guestModalClose").addEventListener("click", closeBookingModal);
document.getElementById("doneBooking").addEventListener("click", closeBookingModal);
guestModal.addEventListener("click", (event) => { if (event.target === guestModal) closeBookingModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeBookingModal(); });

document.getElementById("guestBookingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("guest")).trim();
  const email = String(form.get("email")).trim();
  const room = roomCatalog[selectedRoomId];
  const stay = selectedStay || getStayFromForm();
  if (!name || !email || !stay) return;
  const code = makeConfirmationCode();
  const amount = quoteRoom(room, stay) * stay.nights;
  const reservation = {
    guest: name,
    email,
    initials: guestInitials(name),
    color: "#e9dfd2",
    room: room.room,
    dates: `${formatStay(stay.checkin)} – ${formatStay(stay.checkout)}`,
    channel: "Direct",
    status: "Confirmed",
    amount,
    guests: stay.guests,
    confirmation: code,
    note: String(form.get("note") || "").trim(),
  };
  try {
    const existing = JSON.parse(localStorage.getItem(reservationStorageKey) || "[]");
    const stored = Array.isArray(existing) ? existing : [];
    stored.unshift(reservation);
    localStorage.setItem(reservationStorageKey, JSON.stringify(stored));
  } catch {
    showGuestToast("We couldn’t save this booking in your browser. Please try again.");
    return;
  }
  document.getElementById("confirmationCode").textContent = code;
  document.getElementById("confirmationDetails").textContent = `${room.name} · ${reservation.dates} · €${amount.toLocaleString("en-US")}`;
  document.getElementById("guestBookingStep").hidden = true;
  document.getElementById("guestSuccessStep").hidden = false;
  document.getElementById("guestModalTitle").textContent = "You’re all set.";
  event.currentTarget.reset();
});

defaultDates();
refreshRoomPrices(getStayFromForm());

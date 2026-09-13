import assert from "node:assert/strict";

const base = process.env.API_BASE_URL || "http://localhost:8787";
const password = process.env.TEST_APP_PASSWORD || "development-password";

async function request(path, { token, method = "GET", body, raw = false } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: response.status, text: await response.text() };
  const payload = await response.json();
  return { status: response.status, payload };
}

const wrong = await request("/api/auth/login", { method: "POST", body: { name: "Test", password: "wrong" } });
assert.equal(wrong.status, 401);
assert.equal((await request("/api/records")).status, 401);

const loginA = await request("/api/auth/login", { method: "POST", body: { name: "Session A", password } });
const loginB = await request("/api/auth/login", { method: "POST", body: { name: "Session B", password } });
assert.equal(loginA.status, 200);
assert.equal(loginB.status, 200);
const tokenA = loginA.payload.data.token;
const tokenB = loginB.payload.data.token;
assert.equal((await request("/api/auth/me", { token: tokenA })).payload.data.user.name, "Session A");

const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const recordId = `integration-record-${suffix}`;
const addressId = `integration-address-${suffix}`;
const driverId = `integration-driver-${suffix}`;
const importId = `integration-import-${suffix}`;

const created = await request("/api/records", { token: tokenA, method: "POST", body: { id: recordId, name: "Ahmed Test", phone: "7770000", area: "Male", portions: 2 } });
assert.equal(created.status, 201);
const browserBFirst = await request("/api/records", { token: tokenB });
assert.equal(browserBFirst.payload.data.find((item) => item.id === recordId).name, "Ahmed Test");

const updated = await request(`/api/records/${recordId}`, { token: tokenA, method: "PUT", body: { id: recordId, name: "Ahmed Updated", phone: "7770000", area: "Hulhumale", portions: 3, deliveryStatus: "prepared" } });
assert.equal(updated.payload.data.version, 2);
const browserBSecond = await request("/api/records", { token: tokenB });
assert.equal(browserBSecond.payload.data.find((item) => item.id === recordId).name, "Ahmed Updated");

const address = await request(`/api/records/${recordId}/addresses`, { token: tokenA, method: "POST", body: { id: addressId, label: "Home", addressLine1: "M. Test House", islandCity: "Male", isPrimary: true } });
assert.equal(address.status, 201);
assert.equal(address.payload.data.isPrimary, true);
const addressUpdate = await request(`/api/addresses/${addressId}`, { token: tokenA, method: "PUT", body: { label: "Delivery", addressLine1: "Hulhumale Phase 2", islandCity: "Hulhumale", isPrimary: true } });
assert.equal(addressUpdate.payload.data.version, 2);
assert.equal((await request(`/api/addresses/${addressId}`, { token: tokenA, method: "DELETE" })).status, 200);

assert.equal((await request("/api/drivers", { token: tokenA, method: "POST", body: { id: driverId, name: "Driver Test", phone: "7000000" } })).status, 201);
const driverUpdate = await request(`/api/drivers/${driverId}`, { token: tokenA, method: "PUT", body: { name: "Driver Updated", phone: "7000001", active: true } });
assert.equal(driverUpdate.payload.data.version, 2);
assert.equal((await request(`/api/drivers/${driverId}`, { token: tokenA, method: "DELETE" })).status, 200);

const imported = await request("/api/import", { token: tokenA, method: "POST", body: { rows: [{ id: importId, name: "CSV Test", phone: "7999999", addressLine1: "Test Street", islandCity: "Male" }] } });
assert.equal(imported.payload.data.imported, 1);
const exported = await request("/api/export.csv", { token: tokenA, raw: true });
assert.equal(exported.status, 200);
assert.match(exported.text, /^\uFEFF?"id","name","phone"/);

assert.equal((await request(`/api/records/${recordId}`, { token: tokenA, method: "DELETE" })).status, 200);
assert.equal((await request(`/api/records/${importId}`, { token: tokenA, method: "DELETE" })).status, 200);
assert.equal((await request("/api/auth/logout", { token: tokenA, method: "POST" })).status, 200);
assert.equal((await request("/api/auth/me", { token: tokenA })).status, 401);
await request("/api/auth/logout", { token: tokenB, method: "POST" });

console.log("PASS auth wrong/correct/protected/session/logout");
console.log("PASS record create/update/delete");
console.log("PASS address create/update/delete");
console.log("PASS driver create/update/delete");
console.log("PASS two-session shared update");
console.log("PASS import and CSV export");

import { test, expect } from "@playwright/test";

test.describe("FastAPI Backend Health & Webhook APIs", () => {
  test("GET /health returns 200 OK and provider status", async ({ request }) => {
    const response = await request.get("http://localhost:8000/health");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.providers).toBeDefined();
  });

  test("GET /api/v1/chat/models returns multi-provider models", async ({ request }) => {
    const response = await request.get("http://localhost:8000/api/v1/chat/models");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.models)).toBeTruthy();
    expect(data.models.length).toBeGreaterThan(10);
  });

  test("GET /api/v1/stats returns usage telemetry", async ({ request }) => {
    const response = await request.get("http://localhost:8000/api/v1/stats");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.uptime_seconds).toBeDefined();
  });

  test("POST /api/v1/webhooks/payment records transaction receipt", async ({ request }) => {
    const txnId = `TEST_TXN_${Date.now()}`;
    const payload = {
      transaction_id: txnId,
      plan_name: "Pro Unlimited",
      amount: "$19",
      period: "/month",
      payment_method: "upi",
      upi_id: "test@upi",
      timestamp: new Date().toISOString(),
    };

    const response = await request.post("http://localhost:8000/api/v1/webhooks/payment", {
      data: payload,
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.status).toBe("success");
    expect(result.transaction_id).toBe(txnId);

    // Verify GET receipt endpoint
    const receiptResp = await request.get(`http://localhost:8000/api/v1/webhooks/payment/${txnId}`);
    expect(receiptResp.ok()).toBeTruthy();
    const receipt = await receiptResp.json();
    expect(receipt.status).toBe("completed");
  });
});

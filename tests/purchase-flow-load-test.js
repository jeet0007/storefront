import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
export let errorRate = new Rate("errors");
export let purchaseFlowDuration = new Trend("purchase_flow_duration");

export let options = {
  stages: [
    { duration: "2m", target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: "5m", target: 10 }, // Stay at 10 users for 5 minutes
    { duration: "2m", target: 20 }, // Ramp up to 20 users over 2 minutes
    { duration: "5m", target: 20 }, // Stay at 20 users for 5 minutes
    { duration: "2m", target: 0 }, // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 95% of requests must be below 5s
    http_req_failed: ["rate<0.1"], // Error rate must be below 10%
    errors: ["rate<0.1"], // Custom error rate below 10%
    purchase_flow_duration: ["p(95)<30000"], // 95% of full flows under 30s
  },
};

// Environment variables
const BASE_URL =
  __ENV.BASE_URL || "https://pl-staging-api.gbst.ticketsocket.com";
const APP_ID = __ENV.APP_ID;
const APP_CHANNEL_SF = __ENV.APP_CHANNEL_SF;
const APP_BUSINESS = __ENV.APP_BUSINESS;
const EVENT_ID = __ENV.EVENT_ID;
const SEATS_IO_KEY = __ENV.SEATS_IO_KEY;

const headers = {
  "Content-Type": "application/json",
  "Application-id": APP_ID,
  "Application-Channel": APP_CHANNEL_SF,
  "Application-Business": APP_BUSINESS,
};

function handleError(stepName, response, expectedStatus = 200) {
  const isSuccess = Array.isArray(expectedStatus)
    ? expectedStatus.includes(response.status)
    : response.status === expectedStatus;

  if (!isSuccess) {
    console.error(
      `❌ ${stepName} failed - Status: ${
        response.status
      }, Body: ${response.body?.substring(0, 200)}`
    );
    errorRate.add(1);
    return false;
  }
  errorRate.add(0);
  return true;
}

function generateUniqueEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `loadtest.${timestamp}.${random}@example.com`;
}

export default function () {
  const startTime = Date.now();
  let seatsIoWorkspaceId,
    shoppingCartId,
    paymentProcessorId,
    eventId,
    orderNo,
    holdToken;

  try {
    // Step 0a: Create Hold Token from seats.io
    let response = http.post("https://api-na.seatsio.net/hold-tokens", null, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${SEATS_IO_KEY}`,
      },
    });

    if (!handleError("Create Hold Token", response, [200, 201])) return;

    const tokenData = JSON.parse(response.body);
    holdToken = tokenData.holdToken;
    console.log(`✅ Created holdToken: ${holdToken}`);
    sleep(0.5);

    // Step 0b: Hold Seat using the token
    response = http.post(
      `https://api-na.seatsio.net/events/${EVENT_ID}/actions/hold`,
      JSON.stringify({
        holdToken: holdToken,
        objects: [
          {
            objectId: "107 V",
            ticketType: "68481b94861e9c995183b3ed",
          },
        ],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${SEATS_IO_KEY}`,
        },
      }
    );

    if (!handleError("Hold Seat", response, 204)) return;
    console.log(`✅ Seat held successfully`);
    sleep(1);

    // Step 1: Get SeatsIo Workspace
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        body: null,
        requestType: "SeatsIoWorkspace",
      }),
      { headers }
    );

    if (!handleError("SeatsIoWorkspace", response)) return;
    seatsIoWorkspaceId = response.body.trim();
    console.log(`✅ Got seatsIoWorkspaceId: ${seatsIoWorkspaceId}`);
    sleep(1);

    // Step 2: Create Seated Shopping Cart
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "CreateSeatedShoppingCart",
        body: {
          event: EVENT_ID,
          seats: [
            {
              label: "107 V",
              displayLabel: "107 V",
              holdToken: holdToken,
              selectedTicketType: "68481b94861e9c995183b3ed",
              objectType: "GeneralAdmissionArea",
              category: {
                label: "VIP Zone",
                key: "5",
              },
            },
          ],
          applicationParameters: {
            channel: APP_CHANNEL_SF,
            business: APP_BUSINESS,
          },
        },
      }),
      { headers }
    );

    if (!handleError("CreateSeatedShoppingCart", response)) return;
    shoppingCartId = response.body.trim();
    console.log(`✅ Created shopping cart: ${shoppingCartId}`);
    sleep(1);

    // Step 3: Agree User Purchase
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "AgreeUserPurchase",
        body: shoppingCartId,
      }),
      { headers }
    );

    if (!handleError("AgreeUserPurchase", response)) return;
    sleep(1);

    // Step 4: Fill Purchaser Information
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "FillPurchaserInformation",
        body: {
          shoppingCartId: shoppingCartId,
          purchaserInformation: {
            email: generateUniqueEmail(),
            firstName: "Load",
            lastName: "Test",
            address1: "Test Street 123",
            address2: "",
            phone: "+1234567890",
            city: "Test City",
            zone: "TH-10",
            postalCode: "10000",
            country: "US",
          },
        },
      }),
      { headers }
    );

    if (!handleError("FillPurchaserInformation", response)) return;
    sleep(1);

    // Step 5: Get Cart (to get paymentProcessorId)
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "GetCart",
        body: {
          shoppingCartId: shoppingCartId,
          populate: "event",
        },
      }),
      { headers }
    );

    if (!handleError("GetCart", response)) return;
    const cartData = JSON.parse(response.body);
    paymentProcessorId =
      cartData.event?.payment?.paymentProcessor || "default-processor-id";
    eventId = cartData.event?._id || EVENT_ID;
    console.log(`✅ Got paymentProcessorId: ${paymentProcessorId}`);
    console.log(`✅ Got eventId: ${eventId}`);
    sleep(2);

    // Step 6: PaymentProcessorRequest (setup)
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "PaymentProcessorRequest",
        body: {
          paymentProcessorId: paymentProcessorId,
          requestType: "setup",
          body: {
            paymentProcessorId: paymentProcessorId,
            eventId: eventId,
          },
        },
      }),
      { headers }
    );

    if (!handleError("PaymentProcessorRequest Setup", response)) return;
    sleep(1);

    // Step 7: Start Payment
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "StartPayment",
        body: shoppingCartId,
      }),
      { headers }
    );

    if (!handleError("StartPayment", response)) return;
    sleep(2);

    // Step 8: Get Cart with full population
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "GetCart",
        body: {
          shoppingCartId: shoppingCartId,
          populate: [
            { path: "items.ticket" },
            { path: "items.addOn" },
            { path: "event", populate: [{ path: "venue" }] },
            { path: "taxes" },
            { path: "fees" },
            { path: "customer" },
            { path: "promoCodes" },
            { path: "purchaserAnswers.question" },
          ],
        },
      }),
      { headers }
    );

    if (!handleError("GetCart Full", response)) return;
    sleep(1);

    // Step 9: Confirm Payment
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "PaymentProcessorRequest",
        body: {
          paymentProcessorId: paymentProcessorId,
          requestType: "confirmPayment",
          body: {
            shoppingCartId: shoppingCartId,
            method: "Card",
            applicationParameters: {
              channel: "StoreFront",
              business: "Seated",
            },
            tokenResult: {
              token: "cnon:card-nonce-ok",
              details: {
                billing: {
                  postalCode: "11111",
                },
                card: {
                  brand: "VISA",
                  expMonth: 11,
                  expYear: 2027,
                  last4: "1111",
                },
                method: "Card",
              },
            },
            squareItemizationSettings: [],
          },
        },
      }),
      { headers }
    );

    if (!handleError("ConfirmPayment", response)) return;
    sleep(2);

    // Step 10: Get Order Number
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        body: {
          shoppingCartId: shoppingCartId,
          includeCart: false,
        },
        requestType: "GetCartInfo",
      }),
      { headers }
    );

    if (!handleError("GetOrderNo", response)) return;
    const cartInfo = JSON.parse(response.body);
    orderNo = cartInfo.orderNumber;
    console.log(`✅ Got order number: ${orderNo}`);
    sleep(1);

    // Step 11: Get QR Code
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        body: orderNo,
        requestType: "GetPurchaseCodesFromOrderNumber",
      }),
      { headers }
    );

    if (!handleError("GetQR", response)) return;
    const qrData = JSON.parse(response.body);
    const qrCode = qrData.data?.[0]?.originalCode;
    console.log(`✅ Got QR code: ${qrCode}`);

    // Record successful purchase flow completion
    const flowDuration = Date.now() - startTime;
    purchaseFlowDuration.add(flowDuration);
    console.log(`🎉 Complete purchase flow completed in ${flowDuration}ms`);
  } catch (error) {
    console.error(`❌ Purchase flow failed with error: ${error.message}`);
    errorRate.add(1);
  }

  // Random sleep between iterations to simulate real user behavior
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

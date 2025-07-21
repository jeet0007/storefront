import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<10000"], // Very lenient for debugging
  },
};

// Environment variables
const BASE_URL =
  __ENV.BASE_URL || "https://pl-staging-api.gbst.ticketsocket.com";
const APP_ID = __ENV.APP_ID || "683f16cedeca4b490dc580ce";
const APP_CHANNEL_SF = __ENV.APP_CHANNEL_SF || "StoreFront";
const APP_BUSINESS = __ENV.APP_BUSINESS || "Seated";
const EVENT_ID = __ENV.EVENT_ID || "6847fc2b272f1a48fbb04154";
const SEATS_IO_KEY =
  __ENV.SEATS_IO_KEY || "ODExOTJkMTgtNmUxMy00NzUwLTliOWEtZTRhMzVmZDdiYjczOg==";

const headers = {
  "Content-Type": "application/json",
  "Application-id": APP_ID,
  "Application-Channel": APP_CHANNEL_SF,
  "Application-Business": APP_BUSINESS,
};

function logResponse(stepName, response) {
  console.log(`\n=== ${stepName} ===`);
  console.log(`Status: ${response.status}`);
  console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`);
  console.log(`Body (first 500 chars): ${response.body.substring(0, 500)}`);
  console.log(`Body length: ${response.body.length}`);
  console.log("================\n");
}

export default function () {
  let seatsIoWorkspaceId, shoppingCartId, paymentProcessorId, eventId, orderNo;

  // Step 1: Get SeatsIo Workspace
  console.log("Starting Step 1: Get SeatsIo Workspace");
  let response = http.post(
    `${BASE_URL}/sdk/request`,
    JSON.stringify({
      body: null,
      requestType: "SeatsIoWorkspace",
    }),
    { headers }
  );

  logResponse("Step 1 - SeatsIoWorkspace", response);

  if (response.status === 200) {
    try {
      const responseBody = JSON.parse(response.body);
      seatsIoWorkspaceId = responseBody.uuid || responseBody.id;
      console.log(`✅ Parsed seatsIoWorkspaceId: ${seatsIoWorkspaceId}`);
    } catch (e) {
      console.log(`❌ JSON Parse Error: ${e.message}`);
      console.log(`Raw response: ${response.body}`);
    }
  }

  sleep(1);

  // Stop here if Step 1 failed - no point continuing
  if (response.status !== 200) {
    console.log("❌ Step 1 failed - stopping test");
    return;
  }

  // Step 2: Create Seated Shopping Cart (only if Step 1 succeeded)
  if (response.status === 200) {
    console.log("Starting Step 2: Create Seated Shopping Cart");
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
              holdToken: SEATS_IO_KEY,
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

    logResponse("Step 2 - CreateSeatedShoppingCart", response);

    if (response.status === 200) {
      try {
        const responseBody = JSON.parse(response.body);
        shoppingCartId = responseBody.uuid || responseBody.id;
        console.log(`✅ Parsed shoppingCartId: ${shoppingCartId}`);
      } catch (e) {
        console.log(`❌ JSON Parse Error: ${e.message}`);
      }
    }

    sleep(1);

    // Stop here if Step 2 failed - no point continuing
    if (response.status !== 200) {
      console.log("❌ Step 2 failed - stopping test");
      return;
    }
  }

  // Step 3: Agree User Purchase (only if Step 2 succeeded)
  if (shoppingCartId) {
    console.log("Starting Step 3: Agree User Purchase");
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "AgreeUserPurchase",
        body: shoppingCartId,
      }),
      { headers }
    );

    logResponse("Step 3 - AgreeUserPurchase", response);

    sleep(1);
  }

  // Step 4: Fill Purchaser Information (only if Step 3 succeeded)
  if (shoppingCartId) {
    console.log("Starting Step 4: Fill Purchaser Information");
    response = http.post(
      `${BASE_URL}/sdk/request`,
      JSON.stringify({
        requestType: "FillPurchaserInformation",
        body: {
          shoppingCartId: shoppingCartId,
          purchaserInformation: {
            email: "debug.test@example.com",
            firstName: "Debug",
            lastName: "Test",
            address1: "Debug Street 123",
            address2: "",
            phone: "+1234567890",
            city: "Debug City",
            zone: "TH-10",
            postalCode: "12345",
            country: "US",
          },
        },
      }),
      { headers }
    );

    logResponse("Step 4 - FillPurchaserInformation", response);

    sleep(1);
  }

  // Step 5: Get Cart
  if (shoppingCartId) {
    console.log("Starting Step 5: Get Cart");
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

    logResponse("Step 5 - GetCart", response);

    if (response.status === 200) {
      try {
        const responseBody = JSON.parse(response.body);
        paymentProcessorId =
          responseBody.paymentProcessorId || "default-processor-id";
        eventId = responseBody.eventId || EVENT_ID;
        console.log(`✅ Parsed paymentProcessorId: ${paymentProcessorId}`);
        console.log(`✅ Parsed eventId: ${eventId}`);
      } catch (e) {
        console.log(`❌ JSON Parse Error: ${e.message}`);
      }
    }

    sleep(2);
  }
}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 5 },   // Ramp up to 5 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    errors: ['rate<0.05'],           // Error rate should be less than 5%
    http_req_duration: ['p(95)<2000'], // 95% of requests should be under 2s
  },
};

// Environment variables - set these when running k6
const BASE_URL = __ENV.BASE_URL || 'https://your-api-url.com';
const APP_ID = __ENV.APP_ID || 'your-app-id';
const APP_CHANNEL_SF = __ENV.APP_CHANNEL_SF || 'StoreFront';
const APP_BUSINESS = __ENV.APP_BUSINESS || 'Seated';
const EVENT_ID = __ENV.EVENT_ID || 'your-event-id';
const SEATS_IO_KEY = __ENV.SEATS_IO_KEY || 'your-seats-io-key';

const headers = {
  'Content-Type': 'application/json',
  'Application-id': APP_ID,
  'Application-Channel': APP_CHANNEL_SF,
  'Application-Business': APP_BUSINESS,
};

export default function () {
  let seatsIoWorkspaceId, shoppingCartId, paymentProcessorId, eventId, orderNo, qrCode;

  // Step 1: Get SeatsIo Workspace
  let response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "body": null,
    "requestType": "SeatsIoWorkspace"
  }), { headers });

  let result = check(response, {
    'SeatsIoWorkspace request successful': (r) => r.status === 200,
    'SeatsIoWorkspace response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  if (response.status === 200) {
    // SeatsIoWorkspace returns plain text UUID, not JSON
    seatsIoWorkspaceId = response.body.trim();
  }

  sleep(0.5);

  // Step 2: Create Seated Shopping Cart (Ticket Selection)
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "CreateSeatedShoppingCart",
    "body": {
      "event": EVENT_ID,
      "seats": [
        {
          "label": "107 V",
          "displayLabel": "107 V",
          "holdToken": "test-hold-token",
          "selectedTicketType": "68481b94861e9c995183b3ed",
          "objectType": "GeneralAdmissionArea",
          "category": {
            "label": "VIP Zone",
            "key": "5"
          }
        }
      ],
      "applicationParameters": {
        "channel": APP_CHANNEL_SF,
        "business": APP_BUSINESS
      }
    }
  }), { headers });

  result = check(response, {
    'CreateSeatedShoppingCart request successful': (r) => r.status === 200,
    'CreateSeatedShoppingCart response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  if (response.status === 200) {
    shoppingCartId = response.body.trim();
  }

  sleep(0.5);

  // Step 3: Agree User Purchase
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "AgreeUserPurchase",
    "body": shoppingCartId
  }), { headers });

  result = check(response, {
    'AgreeUserPurchase request successful': (r) => r.status === 200,
    'AgreeUserPurchase response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  sleep(0.5);

  // Step 4: Fill Purchaser Information
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "FillPurchaserInformation",
    "body": {
      "shoppingCartId": shoppingCartId,
      "purchaserInformation": {
        "email": `test.loadtest${__VU}@example.com`,
        "firstName": "LoadTest",
        "lastName": `User${__VU}`,
        "address1": "Test Street 123",
        "address2": "",
        "phone": "+1234567890",
        "city": "Test City",
        "zone": "TH-10",
        "postalCode": "12345",
        "country": "US"
      }
    }
  }), { headers });

  result = check(response, {
    'FillPurchaserInformation request successful': (r) => r.status === 200,
    'FillPurchaserInformation response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  sleep(0.5);

  // Step 5: Get Cart (to get payment processor info)
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "GetCart",
    "body": {
      "shoppingCartId": shoppingCartId,
      "populate": "event"
    }
  }), { headers });

  result = check(response, {
    'GetCart request successful': (r) => r.status === 200,
    'GetCart response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  if (response.status === 200) {
    const responseBody = JSON.parse(response.body);
    // Extract paymentProcessorId and eventId from response if available
    paymentProcessorId = responseBody.paymentProcessorId || "default-processor-id";
    eventId = responseBody.eventId || EVENT_ID;
  }

  sleep(0.5);

  // Step 6: Payment Processor Request (Setup)
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "PaymentProcessorRequest",
    "body": {
      "paymentProcessorId": paymentProcessorId,
      "requestType": "setup",
      "body": {
        "paymentProcessorId": paymentProcessorId,
        "eventId": eventId
      }
    }
  }), { headers });

  result = check(response, {
    'PaymentProcessorRequest setup successful': (r) => r.status === 200,
    'PaymentProcessorRequest setup response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  sleep(0.5);

  // Step 7: Start Payment (Place Order)
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "StartPayment",
    "body": shoppingCartId
  }), { headers });

  result = check(response, {
    'StartPayment request successful': (r) => r.status === 200,
    'StartPayment response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  sleep(0.5);

  // Step 8: Get Cart (Detailed)
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "GetCart",
    "body": {
      "shoppingCartId": shoppingCartId,
      "populate": [
        { "path": "items.ticket" },
        { "path": "items.addOn" },
        { "path": "event", "populate": [{ "path": "venue" }] },
        { "path": "taxes" },
        { "path": "fees" },
        { "path": "customer" },
        { "path": "promoCodes" },
        { "path": "purchaserAnswers.question" }
      ]
    }
  }), { headers });

  result = check(response, {
    'GetCart detailed request successful': (r) => r.status === 200,
    'GetCart detailed response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  sleep(0.5);

  // Step 9: Confirm Payment
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "requestType": "PaymentProcessorRequest",
    "body": {
      "paymentProcessorId": paymentProcessorId,
      "requestType": "confirmPayment",
      "body": {
        "shoppingCartId": shoppingCartId,
        "method": "Card",
        "applicationParameters": {
          "channel": "StoreFront",
          "business": "Seated"
        },
        "tokenResult": {
          "token": "cnon:card-nonce-ok",
          "details": {
            "billing": {
              "postalCode": "11111"
            },
            "card": {
              "brand": "VISA",
              "expMonth": 11,
              "expYear": 2027,
              "last4": "1111"
            },
            "method": "Card"
          }
        },
        "squareItemizationSettings": []
      }
    }
  }), { headers });

  result = check(response, {
    'ConfirmPayment request successful': (r) => r.status === 200,
    'ConfirmPayment response time < 3s': (r) => r.timings.duration < 3000,
  });
  errorRate.add(!result);

  sleep(1);

  // Step 10: Get Order Number
  response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "body": {
      "shoppingCartId": shoppingCartId,
      "includeCart": false
    },
    "requestType": "GetCartInfo"
  }), { headers });

  result = check(response, {
    'GetCartInfo request successful': (r) => r.status === 200,
    'GetCartInfo response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);

  if (response.status === 200) {
    const responseBody = JSON.parse(response.body);
    orderNo = responseBody.orderNumber;
  }

  sleep(0.5);

  // Step 11: Get QR Code
  if (orderNo) {
    response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
      "body": orderNo,
      "requestType": "GetPurchaseCodesFromOrderNumber"
    }), { headers });

    result = check(response, {
      'GetPurchaseCodesFromOrderNumber request successful': (r) => r.status === 200,
      'GetPurchaseCodesFromOrderNumber response time < 2s': (r) => r.timings.duration < 2000,
      'QR code received': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.data && body.data.length > 0 && body.data[0].originalCode;
        }
        return false;
      },
    });
    errorRate.add(!result);

    if (response.status === 200) {
      const responseBody = JSON.parse(response.body);
      if (responseBody.data && responseBody.data.length > 0) {
        qrCode = responseBody.data[0].originalCode;
      }
    }
  }

  // Final check - complete purchase flow success
  check(null, {
    'Complete purchase flow successful': () => orderNo && qrCode,
  });

  sleep(2);
}
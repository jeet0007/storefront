import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Ramp up to 100 users (stress level)
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<5000'], // More lenient thresholds for stress test
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://your-api-url.com';
const APP_ID = __ENV.APP_ID || 'your-app-id';
const APP_CHANNEL_SF = __ENV.APP_CHANNEL_SF || 'StoreFront';
const APP_BUSINESS = __ENV.APP_BUSINESS || 'Seated';
const EVENT_ID = __ENV.EVENT_ID || 'your-event-id';

const headers = {
  'Content-Type': 'application/json',
  'Application-id': APP_ID,
  'Application-Channel': APP_CHANNEL_SF,
  'Application-Business': APP_BUSINESS,
};

export default function () {
  // Simplified flow for stress testing - focus on key endpoints
  let response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "body": null,
    "requestType": "SeatsIoWorkspace"
  }), { headers });

  let result = check(response, {
    'SeatsIoWorkspace under stress': (r) => r.status === 200,
  });
  errorRate.add(!result);

  sleep(0.2);

  // Create shopping cart
  if (response.status === 200) {
    response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
      "requestType": "CreateSeatedShoppingCart",
      "body": {
        "event": EVENT_ID,
        "seats": [{
          "label": `${__VU}-${__ITER}`,
          "displayLabel": `User${__VU}-Iter${__ITER}`,
          "holdToken": `stress-test-${__VU}-${__ITER}`,
          "selectedTicketType": "68481b94861e9c995183b3ed",
          "objectType": "GeneralAdmissionArea",
          "category": {
            "label": "VIP Zone",
            "key": "5"
          }
        }],
        "applicationParameters": {
          "channel": APP_CHANNEL_SF,
          "business": APP_BUSINESS
        }
      }
    }), { headers });

    result = check(response, {
      'CreateSeatedShoppingCart under stress': (r) => r.status === 200,
    });
    errorRate.add(!result);
  }

  sleep(0.5);
}
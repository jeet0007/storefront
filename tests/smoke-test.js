import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    errors: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://your-api-url.com';
const APP_ID = __ENV.APP_ID || 'your-app-id';
const APP_CHANNEL_SF = __ENV.APP_CHANNEL_SF || 'StoreFront';
const APP_BUSINESS = __ENV.APP_BUSINESS || 'Seated';

const headers = {
  'Content-Type': 'application/json',
  'Application-id': APP_ID,
  'Application-Channel': APP_CHANNEL_SF,
  'Application-Business': APP_BUSINESS,
};

export default function () {
  // Basic smoke test - just check if the API is responsive
  let response = http.post(`${BASE_URL}/sdk/request`, JSON.stringify({
    "body": null,
    "requestType": "SeatsIoWorkspace"
  }), { headers });

  let result = check(response, {
    'API is accessible': (r) => r.status === 200 || r.status === 404 || r.status === 401,
    'Response time < 1s': (r) => r.timings.duration < 1000,
    'Response has body': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!result);
  sleep(1);
}
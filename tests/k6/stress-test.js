/**
 * STRESS TEST
 * Formål: Find grænsen for hvad serveren kan klare ved gradvist at øge load
 * indtil systemet bryder ned eller performance forringes markant.
 *
 * Kør med: k6 run tests/k6/stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '1m',  target: 10  },  // Opvarmning
    { duration: '2m',  target: 50  },  // Normalt load
    { duration: '2m',  target: 100 },  // Øget load
    { duration: '2m',  target: 200 },  // Højt load
    { duration: '2m',  target: 300 },  // Stress
    { duration: '2m',  target: 400 },  // Ekstremt stress
    { duration: '1m',  target: 0   },  // Nedkøling
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% af requests skal klares under 2s
    http_req_failed:   ['rate<0.05'],  // Fejlrate under 5%
    errors:            ['rate<0.05'],
  },
};

export default function () {
  // GET forside
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'forside status 200': (r) => r.status === 200,
  });
  errorRate.add(homeRes.status !== 200);
  responseTime.add(homeRes.timings.duration);

  sleep(0.5);

  // GET tags
  const tagsRes = http.get(`${BASE_URL}/tags`);
  check(tagsRes, {
    'tags status 200': (r) => r.status === 200,
  });
  errorRate.add(tagsRes.status !== 200);
  responseTime.add(tagsRes.timings.duration);

  sleep(0.5);

  // GET søgning
  const searchRes = http.get(`${BASE_URL}/?search=pasta`);
  check(searchRes, {
    'søgning status 200': (r) => r.status === 200,
  });
  errorRate.add(searchRes.status !== 200);
  responseTime.add(searchRes.timings.duration);

  sleep(1);
}

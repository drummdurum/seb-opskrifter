/**
 * SOAK TEST
 * Formål: Afdæk problemer der kun opstår over lang tid – f.eks. memory leaks,
 * DB-connection pool udtømning, log-fil vækst, eller langsom performance-nedgang.
 *
 * Kør med: k6 run tests/k6/soak-test.js
 *
 * OBS: Testen kører i 2 timer. Sæt BASE_URL miljøvariabel for at pege på
 * staging-miljø: k6 run --env BASE_URL=http://din-server:3000 tests/k6/soak-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const slowRequests = new Counter('slow_requests');

export const options = {
  stages: [
    { duration: '5m',  target: 15  },  // Langsom opvarmning
    { duration: '110m', target: 15 },  // Hold moderat load i næsten 2 timer
    { duration: '5m',  target: 0   },  // Nedkøling
  ],
  thresholds: {
    // Performance må ikke forringes over tid
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed:   ['rate<0.02'],
    errors:            ['rate<0.02'],
    // Hvis mange slow requests opstår sidst i testen, tyder det på memory leak
    slow_requests:     ['count<500'],
  },
};

export default function () {
  const iteration = __ITER;

  // GET forside
  const homeRes = http.get(`${BASE_URL}/`);
  const homeSlow = homeRes.timings.duration > 1500;
  check(homeRes, {
    'forside status 200': (r) => r.status === 200,
    'forside ikke for langsom': (r) => r.timings.duration < 1500,
  });
  errorRate.add(homeRes.status !== 200);
  responseTime.add(homeRes.timings.duration);
  if (homeSlow) slowRequests.add(1);

  sleep(1);

  // GET tags
  const tagsRes = http.get(`${BASE_URL}/tags`);
  const tagsSlow = tagsRes.timings.duration > 1500;
  check(tagsRes, {
    'tags status 200': (r) => r.status === 200,
    'tags ikke for langsom': (r) => r.timings.duration < 1500,
  });
  errorRate.add(tagsRes.status !== 200);
  responseTime.add(tagsRes.timings.duration);
  if (tagsSlow) slowRequests.add(1);

  sleep(1);

  // Søgning – variation for at undgå caching skævheder
  const searchTerms = ['kylling', 'pasta', 'salat', 'suppe', 'kage', 'fisk'];
  const term = searchTerms[iteration % searchTerms.length];
  const searchRes = http.get(`${BASE_URL}/?search=${term}`);
  const searchSlow = searchRes.timings.duration > 1500;
  check(searchRes, {
    'søgning status 200': (r) => r.status === 200,
    'søgning ikke for langsom': (r) => r.timings.duration < 1500,
  });
  errorRate.add(searchRes.status !== 200);
  responseTime.add(searchRes.timings.duration);
  if (searchSlow) slowRequests.add(1);

  // Variabel pause for at simulere reel brugeradfærd
  sleep(Math.random() * 3 + 2); // 2-5 sekunder
}

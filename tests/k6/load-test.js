/**
 * LOAD TEST
 * Formål: Verificer at systemet klarer det forventede normal-load stabilt over tid,
 * og at performance ikke forringes (memory leaks, DB-connection pool udtømning osv.)
 *
 * Kør med: k6 run tests/k6/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

export const options = {
  stages: [
    { duration: '2m',  target: 20 },  // Opvarmning til normalt load
    { duration: '10m', target: 20 },  // Hold stabilt normalt load i 10 min
    { duration: '2m',  target: 0  },  // Nedkøling
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<1500'], // Strenge krav til normal drift
    http_req_failed:   ['rate<0.01'],                // Maks 1% fejl
    errors:            ['rate<0.01'],
  },
};

const endpoints = [
  { url: '/',              name: 'forside'   },
  { url: '/tags',          name: 'tags'      },
  { url: '/?search=kage',  name: 'søg-kage'  },
  { url: '/?search=suppe', name: 'søg-suppe' },
  { url: '/recipes/ny',    name: 'ny-side'   },
];

export default function () {
  // Simuler en reel bruger der browser rundt på siden
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint.url}`);

  check(res, {
    [`${endpoint.name} status ok`]: (r) => r.status === 200 || r.status === 404,
    [`${endpoint.name} svartid under 1s`]: (r) => r.timings.duration < 1000,
  });

  errorRate.add(res.status >= 500);
  responseTime.add(res.timings.duration);
  requestCount.add(1);

  // Realistisk tænkepause mellem sidevisninger
  sleep(Math.random() * 2 + 1); // 1-3 sekunder
}

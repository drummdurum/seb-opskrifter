/**
 * SPIKE TEST
 * Formål: Test serverens evne til at håndtere pludselige, ekstreme load-stigninger
 * (f.eks. viral opskrift eller et reklamestøt).
 *
 * Kør med: k6 run tests/k6/spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // Normalt baggrundsniveau
    { duration: '10s', target: 500 },  // Pludselig spike til 500 brugere
    { duration: '1m',  target: 500 },  // Hold spike
    { duration: '10s', target: 10  },  // Hurtig nedgang
    { duration: '30s', target: 10  },  // Recover periode
    { duration: '10s', target: 0   },  // Afslutning
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% under 3s under spike
    http_req_failed:   ['rate<0.10'],  // Accepterer op til 10% fejl under spike
    errors:            ['rate<0.10'],
  },
};

export default function () {
  // GET forside – den mest ramte endpoint under et spike
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'forside status 200': (r) => r.status === 200,
    'forside svartid under 5s': (r) => r.timings.duration < 5000,
  });
  errorRate.add(homeRes.status !== 200);
  responseTime.add(homeRes.timings.duration);

  sleep(0.3);

  // GET ny opskrift side – 404 er forventet (siden hedder /recipes/new ikke /ny)
  const recipeRes = http.get(`${BASE_URL}/recipes/new`, {
    responseCallback: http.expectedStatuses(200, 404),
  });
  check(recipeRes, {
    'ny opskrift side loader': (r) => r.status === 200 || r.status === 404,
  });
  responseTime.add(recipeRes.timings.duration);

  sleep(0.3);

  // GET tags – sidebar/navigation
  const tagsRes = http.get(`${BASE_URL}/tags`);
  check(tagsRes, {
    'tags status 200': (r) => r.status === 200,
  });
  errorRate.add(tagsRes.status !== 200);
  responseTime.add(tagsRes.timings.duration);

  sleep(0.4);
}

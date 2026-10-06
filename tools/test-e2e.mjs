// End-to-end integration and multi-tenancy verification test for Sift
const PORT = process.env.TEST_PORT || 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

class CookieJarClient {
  constructor() {
    this.cookies = new Map();
  }

  async request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = { ...(options.headers || {}) };
    
    // Attach cookies
    if (this.cookies.size > 0) {
      const cookieStr = Array.from(this.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers['Cookie'] = cookieStr;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof String)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, { ...options, headers });

    // Store Set-Cookie
    const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    for (const cookieHeader of setCookieHeaders) {
      const parts = cookieHeader.split(';')[0].split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        if (cookieHeader.includes('Max-Age=0') || cookieHeader.includes('Expires=Thu, 01 Jan 1970')) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }

    let json = null;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return { status: res.status, ok: res.ok, json, text };
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function run() {
  console.log(`\n========================================`);
  console.log(`Starting Sift End-to-End Test Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`========================================\n`);

  // 1. Health & Database Engine Status
  console.log(`[Step 1] Database & System Status Check`);
  const clientAnon = new CookieJarClient();
  const statusRes = await clientAnon.request('/api/status');
  assert(statusRes.ok, `Status API responded with 200 (Engine: ${statusRes.json?.engine}, Status: ${statusRes.json?.status})`);

  // 2. Unauthenticated verification
  console.log(`\n[Step 2] Unauthenticated /api/auth/me check`);
  const unauthRes = await clientAnon.request('/api/auth/me');
  assert(unauthRes.json?.authenticated === false, `Unauthenticated request correctly returns authenticated: false`);

  // 3. Register Alice
  console.log(`\n[Step 3] Register User A (Alice)`);
  const alice = new CookieJarClient();
  const randomSuffix = Math.floor(Math.random() * 100000);
  const aliceEmail = `alice_${randomSuffix}@test.dev`;
  const regAliceRes = await alice.request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Alice Dev',
      email: aliceEmail,
      password: 'password123',
      confirmPassword: 'password123',
    },
  });
  assert(regAliceRes.ok, `Alice registered successfully: ${aliceEmail}`);
  assert(regAliceRes.json?.user?.email === aliceEmail, `Response contains user object with matching email`);
  assert(regAliceRes.json?.onboarded === false, `New user starts with onboarded: false`);
  assert(alice.cookies.has('sift_session'), `Session cookie 'sift_session' received`);

  // 4. Alice Profile check via /api/auth/me
  console.log(`\n[Step 4] Alice session validation via /api/auth/me`);
  const meAliceRes = await alice.request('/api/auth/me');
  assert(meAliceRes.json?.authenticated === true, `Alice is authenticated`);
  assert(meAliceRes.json?.user?.name === 'Alice Dev', `Alice's profile matches`);
  assert(meAliceRes.json?.settings?.onboarded === false, `Alice's settings have onboarded: false`);

  // 5. Alice completes Onboarding
  console.log(`\n[Step 5] Alice Onboarding wizard persistence`);
  const onboardRes = await alice.request('/api/auth/onboarding', {
    method: 'POST',
    body: {
      categories: ['Development', 'AI'],
      bookmarks: [
        {
          title: 'GitHub',
          url: 'https://github.com',
          description: 'Code repository and collaboration',
          category: 'Development',
          isFavorite: true,
        },
      ],
    },
  });
  assert(onboardRes.ok, `Onboarding submitted successfully`);
  assert(onboardRes.json?.success === true, `Onboarding returned success`);

  // Check Alice library
  const libAliceRes = await alice.request('/api/library');
  assert(libAliceRes.ok, `Alice library fetched successfully`);
  assert(libAliceRes.json?.bookmarks?.length === 1, `Alice has exactly 1 bookmark (GitHub)`);
  const aliceGithub = libAliceRes.json.bookmarks[0];
  assert(aliceGithub.title === 'GitHub', `Bookmark title is GitHub`);
  assert(aliceGithub.is_favorite === true || aliceGithub.isFavorite === true, `GitHub is marked as favorite`);

  // 6. Alice creates custom category
  console.log(`\n[Step 6] Alice creates custom category 'DevOps'`);
  const createCatRes = await alice.request('/api/categories', {
    method: 'POST',
    body: {
      name: 'DevOps',
      icon: 'cloud',
      color: '#3b82f6',
    },
  });
  assert(createCatRes.ok, `Category DevOps created`);
  const devopsCategory = createCatRes.json?.category;
  assert(devopsCategory && devopsCategory.name === 'DevOps', `Returned category has name DevOps and id ${devopsCategory?.id}`);

  // 7. Alice adds bookmark into 'DevOps'
  console.log(`\n[Step 7] Alice adds bookmark 'Vercel' in category 'DevOps'`);
  const createBmRes = await alice.request('/api/bookmarks', {
    method: 'POST',
    body: {
      title: 'Vercel',
      url: 'https://vercel.com',
      description: 'Frontend cloud platform',
      categoryId: devopsCategory.id,
      isFavorite: false,
    },
  });
  assert(createBmRes.ok, `Bookmark Vercel created`);
  const aliceVercel = createBmRes.json?.bookmark;
  assert(aliceVercel && (aliceVercel.category_id === devopsCategory.id || aliceVercel.categoryId === devopsCategory.id), `Vercel is linked to DevOps category`);

  // 8. Track Bookmark Open (Audit trail / Recent links)
  console.log(`\n[Step 8] Alice opens bookmark (updates last_opened_at)`);
  const openRes = await alice.request(`/api/bookmarks/${aliceVercel.id}/open`, {
    method: 'POST',
  });
  assert(openRes.ok, `Track open API returned 200`);
  assert(Boolean(openRes.json?.openedAt || openRes.json?.lastOpenedAt), `Bookmark openedAt was updated to timestamp`);

  // 9. Safe Category Deletion (Safe delete moves bookmarks to Uncategorized)
  console.log(`\n[Step 9] Alice deletes DevOps category (Safe delete test)`);
  const delCatRes = await alice.request(`/api/categories/${devopsCategory.id}`, {
    method: 'DELETE',
  });
  assert(delCatRes.ok, `Category deleted successfully`);

  // Verify Vercel was moved to Uncategorized (category_id is null) and NOT deleted!
  const getVercelRes = await alice.request(`/api/bookmarks/${aliceVercel.id}`);
  assert(getVercelRes.ok, `Vercel bookmark still exists after category deletion`);
  assert(getVercelRes.json?.bookmark?.category_id === null || getVercelRes.json?.bookmark?.categoryId === null, `Vercel category_id was set to null (Uncategorized)`);

  // 10. Register User B (Bob) - Test User Isolation
  console.log(`\n[Step 10] Register User B (Bob)`);
  const bob = new CookieJarClient();
  const bobEmail = `bob_${randomSuffix}@test.dev`;
  const regBobRes = await bob.request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Bob Builder',
      email: bobEmail,
      password: 'bobpassword456',
      confirmPassword: 'bobpassword456',
    },
  });
  assert(regBobRes.ok, `Bob registered successfully: ${bobEmail}`);

  // 11. Strict Isolation Check: Bob's library must be completely empty initially!
  console.log(`\n[Step 11] Strict Data Isolation Check`);
  const libBobRes = await bob.request('/api/library');
  assert(libBobRes.ok, `Bob library fetched`);
  assert(libBobRes.json?.bookmarks?.length === 0, `Bob has 0 bookmarks (Alice's bookmarks are completely isolated!)`);

  // Bob attempts to maliciously modify or delete Alice's bookmark!
  console.log(`\n[Step 12] Security Check: User B cannot modify or delete User A's bookmarks`);
  const bobAttackRes = await bob.request(`/api/bookmarks/${aliceVercel.id}`, {
    method: 'PATCH',
    body: { title: 'Hacked by Bob' },
  });
  assert(bobAttackRes.status === 404, `Bob cannot patch Alice's bookmark (returned 404 Not Found)`);

  const bobDeleteAttackRes = await bob.request(`/api/bookmarks/${aliceVercel.id}`, {
    method: 'DELETE',
  });
  assert(bobDeleteAttackRes.status === 404, `Bob cannot delete Alice's bookmark (returned 404 Not Found)`);

  // Verify Alice's bookmark remains intact
  const aliceCheckRes = await alice.request(`/api/bookmarks/${aliceVercel.id}`);
  assert(aliceCheckRes.json?.bookmark?.title === 'Vercel', `Alice's bookmark remains intact and untouched`);

  // 13. Settings update
  console.log(`\n[Step 13] Update Alice's Settings`);
  const updateSettingsRes = await alice.request('/api/settings', {
    method: 'POST',
    body: {
      theme: 'dark',
      name: 'Alice Wonder',
    },
  });
  assert(updateSettingsRes.ok, `Settings updated successfully`);
  assert(updateSettingsRes.json?.settings?.theme === 'dark', `Alice theme set to dark`);

  // 14. Logout
  console.log(`\n[Step 14] Alice Logout`);
  const logoutRes = await alice.request('/api/auth/logout', {
    method: 'POST',
  });
  assert(logoutRes.ok, `Logout endpoint returned 200`);
  assert(!alice.cookies.has('sift_session'), `Session cookie removed from client`);

  const meAfterLogout = await alice.request('/api/auth/me');
  assert(meAfterLogout.json?.authenticated === false, `Alice is no longer authenticated`);

  // 15. Login back in with credentials
  console.log(`\n[Step 15] Alice Log in back with credentials`);
  const loginRes = await alice.request('/api/auth/login', {
    method: 'POST',
    body: {
      email: aliceEmail,
      password: 'password123',
    },
  });
  assert(loginRes.ok, `Alice logged in successfully`);
  assert(alice.cookies.has('sift_session'), `Session cookie received upon login`);

  // Verify Alice still has her bookmarks
  const libAliceRelogin = await alice.request('/api/library');
  assert(libAliceRelogin.json?.bookmarks?.length === 2, `Alice still has all her bookmarks after re-logging in (Count: 2)`);

  console.log(`\n========================================`);
  console.log(`🎉 ALL 15 END-TO-END TESTS PASSED!`);
  console.log(`========================================\n`);
}

run().catch((err) => {
  console.error('Fatal error during E2E test:', err);
  process.exit(1);
});

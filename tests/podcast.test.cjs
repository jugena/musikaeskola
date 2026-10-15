// Run with: node --test tests/podcast.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('Podcast API: authenticated uploads, publication, validation and conflicting edits', async () => {
    // All writes happen in an isolated copy, never in the real content directory.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'musika-podcast-'));
    fs.cpSync(path.join(root, 'api'), path.join(dir, 'api'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'data/podcasts.json'), '[]\n');
    const password = require('node:crypto').randomBytes(20).toString('hex');
    const php = process.env.PHP_BINARY || path.join(root, '.tools/php/php.exe');
    const server = spawn(php, ['-d', 'upload_max_filesize=100M', '-d', 'post_max_size=110M', '-S', '127.0.0.1:18037', '-t', dir], {
        env: { ...process.env, MUSIKA_ADMIN_PASSWORD_HASH: require('node:crypto').createHash('sha256').update(password).digest('hex') },
        stdio: ['ignore', 'ignore', 'pipe']
    });
    try {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.stderr.on('data', chunk => { if (String(chunk).includes('started')) resolve(); });
            server.once('exit', code => reject(new Error(`PHP exited: ${code}`)));
        });
        const base = 'http://127.0.0.1:18037/';
        let cookie = '';
        const request = (url, options = {}, authenticated = true) => fetch(base + url, {
            ...options, headers: { ...(authenticated ? { Cookie: cookie } : {}), ...options.headers }
        });
        const put = (data, revision) => request('api/content.php?collection=podcasts', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, revision })
        });
        assert.equal((await request('api/upload.php', { method: 'POST' }, false)).status, 401);
        const login = await request('api/content.php?action=login', {
            method: 'POST', body: JSON.stringify({ password })
        });
        assert.equal(login.status, 200);
        cookie = login.headers.get('set-cookie').split(';')[0];
        const upload = async (kind, name, bytes) => {
            const body = new FormData();
            body.append('kind', kind);
            body.append('file', new Blob([bytes]), name);
            return request('api/upload.php', { method: 'POST', body });
        };
        assert.equal((await upload('audio', 'fake.mp3', 'not audio')).status, 400);
        assert.equal((await upload('cover', 'fake.png', '<?php echo 1;')).status, 400);
        const audio = await upload('audio', 'episode.mp3', fs.readFileSync(path.join(root, 'audio/podcasts/De_mayor_a_menor_en_un_semitono.mp3')));
        assert.equal(audio.status, 201);
        const audioPath = (await audio.json()).path;
        assert.equal((await request(audioPath, {}, false)).status, 200);
        const cover = await upload('cover', 'cover.png', fs.readFileSync(path.join(root, 'img/logo.png')));
        assert.equal(cover.status, 201);
        const coverPath = (await cover.json()).path;
        assert.equal((await request(coverPath, {}, false)).status, 200);
        let state = await (await request('api/content.php?collection=podcasts&admin=1')).json();
        const episode = { id: 'test-1', title: 'Prueba', title_eu: 'Proba', description: 'Texto', description_eu: 'Testua', keywords: 'música', keywords_eu: 'musika', date: '2020-01-01', episode: '1', cover: coverPath, audio_url: audioPath, published: false };
        let saved = await put([episode], state.revision);
        assert.equal(saved.status, 200);
        state = await saved.json();
        assert.equal((await (await request('api/content.php?collection=podcasts', {}, false)).json()).data.length, 0);
        assert.equal((await (await request('api/content.php?collection=podcasts&admin=1')).json()).data.length, 1);
        assert.equal((await put([{ ...episode, published: true }], 'stale')).status, 409);
        assert.equal((await put([{ ...episode, id: "bad'id" }], state.revision)).status, 400);
        assert.equal((await put([{ ...episode, audio_url: 'javascript:episode.mp3' }], state.revision)).status, 400);
        assert.equal((await put([{ ...episode, date: '2026-02-31' }], state.revision)).status, 400);
        saved = await put([{ ...episode, published: true }, { ...episode, id: 'future', published: true, date: '2999-01-01' }], state.revision);
        assert.equal(saved.status, 200);
        state = await saved.json();
        const publicData = await (await request('api/content.php?collection=podcasts', {}, false)).json();
        assert.deepEqual(publicData.data.map(item => item.id), ['test-1']);
        assert.equal((await put([], state.revision)).status, 200);
        assert.equal((await (await request('api/content.php?collection=podcasts&admin=1')).json()).data.length, 0);
    } finally {
        server.kill();
        await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('Public player: search preserves playback; Escuchar starts it; unrelated JSON failures do not hide episodes', async () => {
    const listeners = {};
    const elements = {};
    for (const id of ['podcast-grid', 'podcast-featured', 'podcast-featured-title', 'podcast-featured-description', 'podcast-featured-keywords', 'podcast-featured-cover', 'podcast-featured-audio']) {
        elements[id] = { style: {}, innerHTML: '', textContent: '', hidden: false, loads: 0, plays: 0,
            load() { this.loads++; }, pause() {}, play() { this.plays++; return Promise.resolve(); },
            removeAttribute(name) { delete this[name]; }, getAttribute(name) { return this[name] ?? null; }, scrollIntoView() {},
            after(element) { elements[element.id] = element; } };
    }
    const document = {
        documentElement: { lang: 'es' }, body: { classList: { contains: () => false } },
        getElementById: id => elements[id] || null, querySelectorAll: () => [], querySelector: () => null,
        createElement: () => ({ textContent: '', setAttribute() {} }),
        addEventListener: (name, handler) => { listeners[name] = handler; }
    };
    const window = { location: new URL('http://localhost/school/podcast.html') };
    const episode = { id: 'pc1', title: 'Piano', description: 'Clase', keywords: 'música', audio_url: 'audio/podcasts/episodio%20uno.mp3', published: true, date: '2020-01-01' };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'script.js'), 'utf8'), {
        document, window, URL, URLSearchParams, Intl, console,
        fetch: async url => {
            const collection = new URL(url, window.location).searchParams.get('collection');
            if (collection === 'news') throw new Error('unrelated collection unavailable');
            return { ok: true, json: async () => ({ ok: true, data: collection === 'podcasts' ? [episode] : [], revision: 'test' }) };
        }
    });
    listeners.DOMContentLoaded();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(elements['podcast-grid'].innerHTML, /Piano/);
    const audio = elements['podcast-featured-audio'];
    assert.match(audio.src, /episodio%20uno\.mp3$/);
    const loads = audio.loads;
    listeners.input({ target: { id: 'podcast-search', value: 'Piano' } });
    assert.equal(audio.loads, loads);
    window.playPodcast('pc1');
    assert.equal(audio.plays, 1);
    assert.equal(audio.loads, loads);
});

for (const lang of ['es', 'eu']) test(`Backoffice ${lang}: cancelling an edit creates a new episode; failed saves preserve the form`, async () => {
    const elements = {};
    const listeners = {};
    const createElement = () => ({
        value: '', checked: true, disabled: false, style: {}, innerHTML: '', textContent: '', events: {},
        classList: { add() {}, remove() {} }, setAttribute() {},
        after(element) { if (element.id) elements[element.id] = element; },
        parentElement: { querySelector: () => null },
        addEventListener(name, handler) { this.events[name] = handler; },
        pause() {}, load() {}, removeAttribute() {}, scrollIntoView() {}
    });
    for (const id of ['editor-es', 'podcasts-form', 'podcast-id', 'podcast-title', 'podcast-title-eu', 'podcast-description', 'podcast-description-eu', 'podcast-keywords', 'podcast-keywords-eu', 'podcast-date', 'podcast-episode', 'podcast-cover', 'podcast-audio-url', 'podcast-published', 'podcast-audio-preview', 'podcast-upload-status', 'submit-podcast-btn', 'admin-podcasts-body', 'section-podcasts']) elements[id] = createElement();
    const form = elements['podcasts-form'];
    form.reset = () => {
        let prevented = false;
        form.events.reset({ preventDefault() { prevented = true; } });
        if (!prevented) Object.entries(elements).filter(([id]) => id.startsWith('podcast-')).forEach(([, element]) => { element.value = ''; });
    };
    const document = {
        documentElement: { lang },
        body: { classList: { contains: name => name === 'admin-page' }, appendChild(element) { elements[element.id] = element; } },
        getElementById: id => elements[id] || null, createElement,
        querySelectorAll: () => [], addEventListener(name, handler) { listeners[name] = handler; }
    };
    const window = { location: new URL('http://localhost/backoffice.html'), clearTimeout() {}, setTimeout() {} };
    const original = { id: 'old', title: 'Anterior', title_eu: 'Aurrekoa', description: 'Texto', description_eu: 'Testua', date: '2020-01-01', audio_url: 'audio/podcasts/test.mp3', published: false };
    let fail = false;
    let submitted;
    const errors = [];
    vm.runInNewContext(fs.readFileSync(path.join(root, 'script.js'), 'utf8'), {
        document, window, URL, URLSearchParams, Intl, FormData,
        console: { ...console, error: (...args) => errors.push(args) },
        fetch: async (url, options = {}) => {
            const collection = new URL(url, window.location).searchParams.get('collection');
            if (options.method === 'PUT') {
                submitted = JSON.parse(options.body);
                return { ok: !fail, json: async () => fail ? { ok: false, error: 'content_changed_reload' } : { ok: true, revision: 'new' } };
            }
            return { ok: true, json: async () => ({ ok: true, data: collection === 'podcasts' ? [original] : [], revision: 'original' }) };
        }
    });
    listeners.DOMContentLoaded();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(elements['podcast-audio-file']);
    assert.ok(elements['podcast-cover-file']);
    window.editPodcast('old');
    assert.equal(elements['podcast-id'].value, 'old');
    form.reset();
    assert.equal(elements['podcast-id'].value, '');
    elements['podcast-title'].value = 'Nuevo';
    elements['podcast-audio-url'].value = 'audio/podcasts/new.mp3';
    await form.onsubmit({ preventDefault() {} });
    assert.equal(submitted.data.length, 2);
    assert.notEqual(submitted.data[0].id, 'old');
    assert.equal(submitted.revision, 'original');
    window.editPodcast('old');
    elements['podcast-title'].value = 'No perder';
    fail = true;
    await form.onsubmit({ preventDefault() {} });
    assert.equal(elements['podcast-title'].value, 'No perder');
    assert.equal(elements['submit-podcast-btn'].disabled, false);
    assert.ok(errors.length);
});

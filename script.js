document.addEventListener('DOMContentLoaded', () => {
    let quillEs, quillEu, quillEventEs, quillEventEu;
    if (document.getElementById('editor-es')) {
        const toolbarOptions = [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'header': [1, 2, 3, false] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image', 'video'],
            ['clean']
        ];
        quillEs = new Quill('#editor-es', { theme: 'snow', modules: { toolbar: toolbarOptions } });
        quillEu = new Quill('#editor-eu', { theme: 'snow', modules: { toolbar: toolbarOptions } });
    }
    if (document.getElementById('event-editor-es')) {
        const toolbarOptions = [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'header': [1, 2, 3, false] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image', 'video'],
            ['clean']
        ];
        quillEventEs = new Quill('#event-editor-es', { theme: 'snow', modules: { toolbar: toolbarOptions } });
        quillEventEu = new Quill('#event-editor-eu', { theme: 'snow', modules: { toolbar: toolbarOptions } });
    }

    // Detect language and containers
    const lang = document.documentElement.lang || 'es';
    const containers = {
        news: document.getElementById('news-grid-dynamic'),
        subjects: document.getElementById('subjects-grid-dynamic'),
        teachers: document.getElementById('teachers-grid-dynamic'),
        calendar: document.getElementById('calendar-view')
    };

    // Forms
    const forms = {
        news: document.getElementById('news-form'),
        subjects: document.getElementById('subjects-form'),
        teachers: document.getElementById('teachers-form'),
        events: document.getElementById('events-form')
    };

    // Table Bodies
    const tables = {
        news: document.getElementById('admin-news-body'),
        subjects: document.getElementById('admin-subjects-body'),
        teachers: document.getElementById('admin-teachers-body'),
        events: document.getElementById('admin-events-body')
    };

    // FIREBASE INITIALIZATION
    const firebaseConfig = {
        apiKey: "AIzaSyBfkQkidwrsc7zyUcPhN0UL2wSxZoDr9Ac",
        authDomain: "musika-eskola-ecce1.firebaseapp.com",
        databaseURL: "https://musika-eskola-ecce1-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "musika-eskola-ecce1",
        storageBucket: "musika-eskola-ecce1.firebasestorage.app",
        messagingSenderId: "324451594740",
        appId: "1:324451594740:web:77b5a943b9bb21505b89a1"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // DATA INITIALIZATION
    let news = [];
    let subjects = [];
    let teachers = [];
    let events = [];
    let nonTeachingDays = []; // Formato: ['YYYY-MM-DD', ...]
    let subjectFilter = '';
    let teacherFilter = '';
    let menuState = {
        home: true, subjects: true, teachers: true, exercises: true, calendar: true, enrollment: true, contact: true
    };

    db.ref('musika_news').on('value', (snapshot) => {
        let val = snapshot.val();
        news = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
        renderNews();
    });

    db.ref('musika_subjects').on('value', (snapshot) => {
        let val = snapshot.val();
        subjects = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
        renderSubjects();
    });

    db.ref('musika_teachers').on('value', (snapshot) => {
        let val = snapshot.val();
        teachers = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
        renderTeachers();
    });

    db.ref('musika_events').on('value', (snapshot) => {
        let val = snapshot.val();
        events = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
        renderEvents();
        if (containers.calendar) renderCalendar();
    });

    db.ref('musika_menu').on('value', (snapshot) => {
        let val = snapshot.val();
        if (val) menuState = val;
        renderMenuAdmin();
        applyMenuState();
    });

    db.ref('musika_calendar_config').on('value', (snapshot) => {
        let val = snapshot.val();
        nonTeachingDays = val && val.nonTeachingDays ? val.nonTeachingDays : [];
        if (containers.calendar) renderCalendar();
    });

    const applyMenuState = () => {
        const toggleLink = (hrefs, isVisible) => {
            hrefs.forEach(href => {
                document.querySelectorAll(`nav.nav-links a[href*="${href}"]`).forEach(el => {
                    el.style.display = isVisible ? '' : 'none';
                });
            });
        };
        toggleLink(['index.html', 'index-eu.html'], menuState.home);
        toggleLink(['asignaturas.html', 'asignaturas-eu.html'], menuState.subjects);
        toggleLink(['profesorado.html', 'profesorado-eu.html'], menuState.teachers);
        toggleLink(['ejercicios.html', 'ejercicios-eu.html'], menuState.exercises);
        toggleLink(['calendario.html', 'calendario-eu.html'], menuState.calendar);
        toggleLink(['matricula.html', 'matricula-eu.html', 'matricula-bilingue.html'], menuState.enrollment);
        toggleLink(['contacto.html', 'contacto-eu.html'], menuState.contact);
    };
    applyMenuState();

    // RENDERING FUNCTIONS
    const renderNews = () => {
        const now = new Date().toISOString().split('T')[0];
        if (containers.news) {
            const visible = news.filter(n => {
                const isPublished = !n.publish_date || n.publish_date <= now;
                const isNotExpired = !n.expiry_date || n.expiry_date >= now;
                return n.on_home && isPublished && isNotExpired;
            });
            containers.news.innerHTML = visible.map(n => `
                <article class="news-card">
                    <div class="news-img" style="background-image: url('${n.img || 'https://images.unsplash.com/photo-1514119412350-e174d90d280e'}')"></div>
                    <div class="news-content">
                        <span class="news-date">${n.date}</span>
                        <h3 class="news-title">${lang === 'eu' ? (n.title_eu || n.title) : n.title}</h3>
                        <div class="news-excerpt" style="margin-bottom: 1rem;">${lang === 'eu' ? (n.summary_eu || n.summary || n.excerpt_eu || n.excerpt) : (n.summary || n.excerpt)}</div>
                        <a href="${lang === 'eu' ? 'noticia-eu.html' : 'noticia.html'}?id=${n.id}" class="btn-more">${lang === 'eu' ? 'Irakurri gehiago' : 'Leer más'}</a>
                    </div>
                </article>
            `).join('');
        }
        if (tables.news) {
            tables.news.innerHTML = news.map(n => `
                <tr>
                    <td>
                        ${n.date}<br>
                        <small style="opacity: 0.6; font-size: 0.7rem;">Pub: ${n.publish_date || '-'}</small><br>
                        <small style="opacity: 0.6; font-size: 0.7rem;">Exp: ${n.expiry_date || '-'}</small>
                    </td>
                    <td>${n.title}</td>
                    <td style="text-align:center"><input type="checkbox" ${n.on_home ? 'checked' : ''} onchange="toggleNewsHome('${n.id}')"></td>
                    <td>
                        <button class="btn btn-primary" onclick="editNews('${n.id}')">Editar</button>
                        <button class="btn btn-success" onclick="duplicateNews('${n.id}')" title="Duplicar">Copy</button>
                        <button class="btn btn-danger" onclick="deleteItem('news', '${n.id}')">X</button>
                    </td>
                </tr>
            `).join('');
        }
    };

    const renderSubjects = () => {
        if (containers.subjects) {
            const filtered = subjects.filter(s => 
                s.name.toLowerCase().includes(subjectFilter.toLowerCase()) || 
                (s.name_eu && s.name_eu.toLowerCase().includes(subjectFilter.toLowerCase())) ||
                (s.teachers && s.teachers.toLowerCase().includes(subjectFilter.toLowerCase()))
            );
            containers.subjects.innerHTML = filtered.map(s => `
                <div class="subject-item">
                    <h3 class="subject-name" style="color: var(--primary-color); font-weight: 800;">${lang === 'eu' ? (s.name_eu || s.name) : s.name}</h3>
                    <p style="margin-bottom: 0.5rem;"><strong>${lang === 'eu' ? 'Irakasleak' : 'Profesorado'}:</strong></p>
                    <ul class="profesorado-list">
                        ${(s.teachers || '').split(',').map(t => `<li>${t.trim()}</li>`).join('')}
                    </ul>
                </div>
            `).join('') || '<p style="text-align:center; padding:2rem; opacity:0.6;">No se han encontrado resultados / Ez da emaitzarik aurkitu</p>';
        }
        if (tables.subjects) {
            tables.subjects.innerHTML = subjects.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.name_eu}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editSubject('${s.id}')">Editar</button>
                        <button class="btn btn-danger" onclick="deleteItem('subjects', '${s.id}')">X</button>
                    </td>
                </tr>
            `).join('');
        }
    };

    const renderTeachers = () => {
        if (containers.teachers) {
            const filtered = teachers.filter(t => 
                t.name.toLowerCase().includes(teacherFilter.toLowerCase()) || 
                t.instrument.toLowerCase().includes(teacherFilter.toLowerCase()) ||
                (t.instrument_eu && t.instrument_eu.toLowerCase().includes(teacherFilter.toLowerCase()))
            );
            containers.teachers.innerHTML = filtered.map(t => `
                <div class="teacher-card">
                    <h3 class="teacher-name" style="color: #333; font-weight: 800;">${t.name}</h3>
                    <span class="teacher-subject" style="color: var(--primary-color); font-weight: 700; text-transform: uppercase; font-size: 0.85rem; display: block; margin-bottom: 1rem;">
                        ${lang === 'eu' ? (t.instrument_eu || t.instrument) : t.instrument}
                    </span>
                    <div class="tutoring" style="background: #f8f9fa; padding: 1rem; border-radius: 10px; border-left: 3px solid var(--primary-color);">
                        <p class="tutoring-title" style="font-size: 0.75rem; font-weight: 800; color: #777; margin-bottom: 0.5rem; letter-spacing: 0.5px;">${lang === 'eu' ? 'TUTORETZAK' : 'TUTORÍAS'}</p>
                        <p class="tutoring-list" style="font-size: 0.95rem; color: #444; margin: 0;">${(lang === 'eu' ? (t.tutoring_eu || t.tutoring) : t.tutoring).replace(/\n/g, '<br>')}</p>
                    </div>
                </div>
            `).join('') || '<p style="text-align:center; padding:2rem; opacity:0.6;">No se han encontrado resultados / Ez da emaitzarik aurkitu</p>';
        }
        if (tables.teachers) {
            tables.teachers.innerHTML = teachers.map(t => `
                <tr>
                    <td>${t.name}</td>
                    <td>${t.instrument}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editTeacher('${t.id}')">Editar</button>
                        <button class="btn btn-danger" onclick="deleteItem('teachers', '${t.id}')">X</button>
                    </td>
                </tr>
            `).join('');
        }
    };

    // SEARCH LISTENERS
    document.addEventListener('input', (e) => {
        if (e.target.id === 'subject-search') {
            subjectFilter = e.target.value;
            renderSubjects();
        }
        if (e.target.id === 'teacher-search') {
            teacherFilter = e.target.value;
            renderTeachers();
        }
    });

    const renderEvents = () => {
        if (tables.events) {
            tables.events.innerHTML = events.sort((a, b) => a.date.localeCompare(b.date)).map(e => `
                <tr>
                    <td>${e.date}</td>
                    <td>${e.time}</td>
                    <td>${e.title}</td>
                    <td>${e.type}</td>
                    <td>
                        <button class="btn btn-primary" style="vertical-align: middle;" onclick="editEvent('${e.id}')">Editar</button>
                        <button class="btn btn-success" style="vertical-align: middle;" onclick="duplicateEvent('${e.id}')" title="Duplicar">Copy</button>
                        <button class="btn" style="background:#25D366; color:white; padding: 0; width: 42px; height: 38px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; border: none; border-radius: 8px;" onclick="shareEventWhatsApp('${e.id}')" title="WhatsApp">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.978l-1.125 4.105 4.204-1.102a7.935 7.935 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger" style="vertical-align: middle;" onclick="deleteItem('events', '${e.id}')">X</button>
                    </td>
                </tr>
            `).join('');
        }
    };

    const renderMenuAdmin = () => {
        const menuContainer = document.getElementById('admin-menu-body');
        if (!menuContainer) return;

        const items = [
            { key: 'home', labelES: 'Inicio', labelEU: 'Hasiera' },
            { key: 'subjects', labelES: 'Asignaturas', labelEU: 'Ikasgaiak' },
            { key: 'teachers', labelES: 'Profesorado', labelEU: 'Irakasleak' },
            { key: 'exercises', labelES: 'Ejercicios', labelEU: 'Ariketak' },
            { key: 'calendar', labelES: 'Calendario', labelEU: 'Egutegia' },
            { key: 'enrollment', labelES: 'Matrícula', labelEU: 'Matrikula' },
            { key: 'contact', labelES: 'Contacto', labelEU: 'Kontaktua' }
        ];

        menuContainer.innerHTML = items.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 0.5rem; color: white;">
                <strong style="font-size: 1.1rem;">${lang === 'eu' ? item.labelEU : item.labelES}</strong>
                <div>
                    <span style="margin-right: 1rem; opacity: 0.8; font-size: 0.9rem;">
                        ${menuState[item.key] ? (lang === 'eu' ? 'Ikusgai webgunean' : 'Visible en la web') : (lang === 'eu' ? 'Ezkutatuta' : 'Oculto')}
                    </span>
                    <button class="btn ${menuState[item.key] ? 'btn-danger' : 'btn-success'}" onclick="toggleMenu('${item.key}')">
                        ${menuState[item.key] ? (lang === 'eu' ? 'Desaktibatu' : 'Desactivar') : (lang === 'eu' ? 'Aktibatu' : 'Activar')}
                    </button>
                </div>
            </div>
        `).join('');
    };

    // FORM HANDLERS
    if (forms.news) {
        forms.news.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('news-id').value || 'n' + Date.now();

            // Sync HTML textareas back to Quill if they are open
            if (document.getElementById('html-editor-es') && document.getElementById('html-editor-es').style.display !== 'none') {
                quillEs.root.innerHTML = document.getElementById('html-editor-es').value;
            }
            if (document.getElementById('html-editor-eu') && document.getElementById('html-editor-eu').style.display !== 'none') {
                quillEu.root.innerHTML = document.getElementById('html-editor-eu').value;
            }

            const excerptVal = quillEs ? quillEs.root.innerHTML : document.getElementById('news-excerpt')?.value;
            const excerptEuVal = quillEu ? quillEu.root.innerHTML : document.getElementById('news-excerpt-eu')?.value;

            const data = {
                id,
                title: document.getElementById('news-title').value,
                title_eu: document.getElementById('news-title-eu').value,
                date: document.getElementById('news-date').value,
                publish_date: document.getElementById('news-publish-date').value || null,
                expiry_date: document.getElementById('news-expiry-date').value || null,
                img: document.getElementById('news-img').value,
                summary: document.getElementById('news-summary') ? document.getElementById('news-summary').value : '',
                summary_eu: document.getElementById('news-summary-eu') ? document.getElementById('news-summary-eu').value : '',
                excerpt: excerptVal,
                excerpt_eu: excerptEuVal,
                on_home: document.getElementById('news-on-home').checked
            };
            upsert('news', data);
            forms.news.reset();
            if (quillEs) {
                quillEs.root.innerHTML = '';
                quillEu.root.innerHTML = '';
            }
            document.getElementById('news-id').value = '';
        }
    }

    if (forms.subjects) {
        forms.subjects.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('subject-id').value || 's' + Date.now();
            const data = {
                id,
                name: document.getElementById('subject-name').value,
                name_eu: document.getElementById('subject-name-eu').value,
                teachers: document.getElementById('subject-teachers').value
            };
            upsert('subjects', data);
            forms.subjects.reset();
            document.getElementById('subject-id').value = '';
        }
    }

    if (forms.teachers) {
        forms.teachers.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('teacher-id').value || 't' + Date.now();
            const data = {
                id,
                name: document.getElementById('teacher-name').value,
                instrument: document.getElementById('teacher-instrument').value,
                instrument_eu: document.getElementById('teacher-instrument-eu').value,
                tutoring: document.getElementById('teacher-tutoring').value,
                tutoring_eu: document.getElementById('teacher-tutoring-eu').value
            };
            upsert('teachers', data);
            forms.teachers.reset();
            document.getElementById('teacher-id').value = '';
        }
    }

    if (forms.events) {
        forms.events.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('event-id').value || 'e' + Date.now();
            const data = {
                id,
                title: document.getElementById('event-title').value,
                title_eu: document.getElementById('event-title-eu').value,
                type: document.getElementById('event-type').value,
                type_eu: document.getElementById('event-type-eu').value,
                date: document.getElementById('event-date').value,
                time: document.getElementById('event-time').value,
                img: document.getElementById('event-img').value,
                summary: document.getElementById('event-summary').value,
                summary_eu: document.getElementById('event-summary-eu').value,
                description: quillEventEs ? quillEventEs.root.innerHTML : '',
                description_eu: quillEventEu ? quillEventEu.root.innerHTML : ''
            };
            upsert('events', data);
            forms.events.reset();
            if (quillEventEs) {
                quillEventEs.root.innerHTML = '';
                quillEventEu.root.innerHTML = '';
            }
            document.getElementById('event-id').value = '';
        }
    }

    // HELPER FUNCTIONS
    const upsert = (entity, data) => {
        let list = (entity === 'news') ? news : (entity === 'subjects') ? subjects : (entity === 'teachers') ? teachers : events;
        const idx = list.findIndex(item => item.id === data.id);
        if (idx > -1) list[idx] = data;
        else list.unshift(data);
        saveAndRender();
    };

    const saveAndRender = () => {
        firebase.database().ref('musika_news').set(news);
        firebase.database().ref('musika_subjects').set(subjects);
        firebase.database().ref('musika_teachers').set(teachers);
        firebase.database().ref('musika_events').set(events);
    };

    window.saveCalendarConfig = () => {
        firebase.database().ref('musika_calendar_config').set({ nonTeachingDays });
    };

    window.toggleNewsHome = (id) => {
        const item = news.find(n => n.id === id);
        if (item) item.on_home = !item.on_home;
        saveAndRender();
    };

    window.toggleMenu = (key) => {
        menuState[key] = !menuState[key];
        firebase.database().ref('musika_menu').set(menuState);
    };

    window.deleteItem = (entity, id) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;';

        const box = document.createElement('div');
        box.style.cssText = 'background:white; color:#333; padding:2rem; border-radius:8px; text-align:center; max-width:400px; box-shadow:0 10px 25px rgba(0,0,0,0.5);';
        box.innerHTML = `
            <h3 style="margin-bottom:1rem; color:#d9534f;">¿Seguro que quieres borrarlo?</h3>
            <p style="margin-bottom:1.5rem; color:#666;">Esta acción no se puede deshacer.</p>
            <div style="display:flex; gap:1rem; justify-content:center;">
                <button id="modal-confirm-btn" class="btn btn-danger" style="padding:0.6rem 1.5rem;">Sí, Borrar</button>
                <button id="modal-cancel-btn" class="btn" style="background:#e0e0e0; color:#333; padding:0.6rem 1.5rem;">Cancelar</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById('modal-confirm-btn').onclick = () => {
            document.body.removeChild(overlay);
            if (entity === 'news') news = news.filter(n => n && n.id !== id);
            if (entity === 'subjects') subjects = subjects.filter(s => s && s.id !== id);
            if (entity === 'teachers') teachers = teachers.filter(t => t && t.id !== id);
            if (entity === 'events') events = events.filter(e => e && e.id !== id);
            saveAndRender();
        };

        document.getElementById('modal-cancel-btn').onclick = () => {
            document.body.removeChild(overlay);
        };
    };

    window.toggleHtml = (langKey) => {
        const quill = langKey === 'es' ? quillEs : quillEu;
        const currentHtml = quill.root.innerHTML;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; justify-content:center; align-items:center;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:white; color:#333; padding:2rem; border-radius:8px; width:90%; max-width:900px; height:80vh; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.5);';
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="margin:0; color:#5eabdc;">Editor de Código HTML (${langKey === 'es' ? 'Castellano' : 'Euskera'})</h3>
                <span style="color:#666; font-size:0.9rem;">Usa etiquetas como &lt;img&gt;, &lt;b&gt;, &lt;p&gt;...</span>
            </div>
            <textarea id="modal-html-textarea" style="flex:1; width:100%; padding:1.5rem; font-family: 'Courier New', monospace; font-size:15px; border:2px solid #eee; border-radius:6px; resize:none; margin-bottom:1.5rem; color:#222; background:#fdfdfd; line-height:1.5;">${currentHtml}</textarea>
            <div style="display:flex; gap:1rem; justify-content:flex-end;">
                <button id="modal-html-save-btn" class="btn btn-success" style="padding:0.8rem 2.5rem; font-weight:bold;">Aplicar Cambios</button>
                <button id="modal-html-cancel-btn" class="btn" style="background:#e0e0e0; color:#333; padding:0.8rem 2.5rem;">Descartar</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Focus the textarea automatically
        document.getElementById('modal-html-textarea').focus();

        document.getElementById('modal-html-save-btn').onclick = () => {
            const newHtml = document.getElementById('modal-html-textarea').value;
            quill.root.innerHTML = newHtml;
            document.body.removeChild(overlay);
        };

        document.getElementById('modal-html-cancel-btn').onclick = () => {
            if (confirm('¿Descartar los cambios realizados en el código?')) {
                document.body.removeChild(overlay);
            }
        };
    };

    window.editNews = (id) => {
        const item = news.find(n => n.id === id);
        document.getElementById('news-id').value = item.id;
        document.getElementById('news-title').value = item.title;
        document.getElementById('news-title-eu').value = item.title_eu;
        document.getElementById('news-date').value = item.date;
        document.getElementById('news-publish-date').value = item.publish_date || '';
        document.getElementById('news-expiry-date').value = item.expiry_date || '';
        document.getElementById('news-img').value = item.img || '';
        
        if (document.getElementById('news-summary')) {
            document.getElementById('news-summary').value = item.summary || '';
        }
        if (document.getElementById('news-summary-eu')) {
            document.getElementById('news-summary-eu').value = item.summary_eu || '';
        }

        const preview = document.getElementById('news-img-preview');
        if (preview) {
            if (item.img) {
                preview.style.backgroundImage = `url(${item.img})`;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }

        if (quillEs) {
            quillEs.root.innerHTML = item.excerpt;
            quillEu.root.innerHTML = item.excerpt_eu;
            // Also reset HTML textareas if they are open
            const htmlEs = document.getElementById('html-editor-es');
            const htmlEu = document.getElementById('html-editor-eu');
            if (htmlEs && htmlEs.style.display !== 'none') window.toggleHtml('es');
            if (htmlEu && htmlEu.style.display !== 'none') window.toggleHtml('eu');
        } else {
            const elEs = document.getElementById('news-excerpt');
            if (elEs) elEs.value = item.excerpt;
            const elEu = document.getElementById('news-excerpt-eu');
            if (elEu) elEu.value = item.excerpt_eu;
        }

        document.getElementById('news-on-home').checked = item.on_home;
    };

    window.editSubject = (id) => {
        const item = subjects.find(s => s.id === id);
        document.getElementById('subject-id').value = item.id;
        document.getElementById('subject-name').value = item.name;
        document.getElementById('subject-name-eu').value = item.name_eu;
        document.getElementById('subject-teachers').value = item.teachers;
    };

    window.editTeacher = (id) => {
        const item = teachers.find(t => t.id === id);
        document.getElementById('teacher-id').value = item.id;
        document.getElementById('teacher-name').value = item.name;
        document.getElementById('teacher-instrument').value = item.instrument;
        document.getElementById('teacher-instrument-eu').value = item.instrument_eu;
        document.getElementById('teacher-tutoring').value = item.tutoring;
        document.getElementById('teacher-tutoring-eu').value = item.tutoring_eu;
    };

    window.editEvent = (id) => {
        const item = events.find(e => e.id === id);
        document.getElementById('event-id').value = item.id;
        document.getElementById('event-title').value = item.title;
        document.getElementById('event-title-eu').value = item.title_eu;
        document.getElementById('event-type').value = item.type;
        document.getElementById('event-type-eu').value = item.type_eu;
        document.getElementById('event-date').value = item.date;
        document.getElementById('event-time').value = item.time;
        document.getElementById('event-img').value = item.img || '';
        document.getElementById('event-summary').value = item.summary || '';
        document.getElementById('event-summary-eu').value = item.summary_eu || '';
        if (quillEventEs) {
            quillEventEs.root.innerHTML = item.description || '';
            quillEventEu.root.innerHTML = item.description_eu || '';
        }
    };

    window.duplicateNews = (id) => {
        const item = news.find(n => n.id === id);
        if (item) {
            const newItem = JSON.parse(JSON.stringify(item));
            newItem.id = 'n' + Date.now();
            newItem.title += ' (COPIA)';
            newItem.on_home = false;
            news.unshift(newItem);
            saveAndRender();
        }
    };

    window.duplicateEvent = (id) => {
        const item = events.find(e => e.id === id);
        if (item) {
            const newItem = JSON.parse(JSON.stringify(item));
            newItem.id = 'e' + Date.now();
            newItem.title += ' (COPIA)';
            events.unshift(newItem);
            saveAndRender();
        }
    };

    window.shareEventWhatsApp = (id) => {
        const e = events.find(item => item.id === id);
        if (!e) return;

        const title = e.title + " / " + (e.title_eu || e.title);
        const summary = e.summary + " / " + (e.summary_eu || e.summary);
        
        // Robust protocol detection
        let finalUrl = "https://musika-eskola.web.app";
        if (window.location.protocol !== 'file:') {
            finalUrl = window.location.origin;
        }
        
        let path = window.location.pathname;
        path = path.replace('backoffice.html', 'calendario.html').replace('backoffice-eu.html', 'calendario-eu.html');
        finalUrl += (path.startsWith('/') ? '' : '/') + path;
        
        // High compatibility plain text message
        let message = 
            "--- EVENTO / EKITALDIA ---\n\n" +
            "*" + title + "*\n\n" +
            "FECHA/DATA: " + e.date + "\n" +
            "HORA/ORDUA: " + e.time + "\n\n" +
            summary + "\n\n" +
            "INFO: " + finalUrl;
        
        if (e.img) {
            message += "\n\nIMAGEN: " + e.img;
        }
        
        const waUrl = "https://wa.me/?text=" + encodeURIComponent(message);
        window.open(waUrl, '_blank');
    };

    // SINGLE NEWS RENDERING
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');
    const newsDetailContainer = document.getElementById('news-detail-container');
    if (newsDetailContainer && newsId) {
        db.ref('musika_news').on('value', (snapshot) => {
            let val = snapshot.val();
            let allNews = val ? (Array.isArray(val) ? val : Object.values(val)).filter(Boolean) : [];
            const item = allNews.find(n => n.id === newsId);
            if (item) {
                const title = lang === 'eu' ? (item.title_eu || item.title) : item.title;
                const summary = lang === 'eu' ? (item.summary_eu || item.summary) : item.summary;
                const content = lang === 'eu' ? (item.excerpt_eu || item.excerpt) : item.excerpt;
                newsDetailContainer.innerHTML = `
                    <div style="max-width: 900px; margin: 0 auto; background: white; color: #333; padding: 4rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <span style="color: #666; font-weight: 700; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;">${item.date}</span>
                        <h1 style="color: #5eabdc; margin: 1rem 0 2rem; font-size: 3rem; line-height: 1.2;">${title}</h1>
                        ${item.img ? `<img src="${item.img}" style="width: 100%; max-height: 500px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">` : ''}
                        
                        <div style="font-size: 1.3rem; line-height: 1.6; color: #555; font-style: italic; margin-bottom: 2.5rem; padding-left: 1.5rem; border-left: 4px solid #5eabdc;">
                            ${summary}
                        </div>

                        <div style="font-size: 1.2rem; line-height: 1.8; color: #444;" class="news-full-content">
                            ${content}
                        </div>
                        <div style="margin-top: 4rem; text-align: center;">
                            <a href="${lang === 'eu' ? 'index-eu.html' : 'index.html'}" class="btn" style="background: #5eabdc; color: white; padding: 1rem 2.5rem; font-weight: bold; font-size: 1.2rem; border-radius: 8px; text-decoration: none; display: inline-block; transition: all 0.3s ease;">
                                ${lang === 'eu' ? 'Webgunera itzuli' : 'Volver a la web'}
                            </a>
                        </div>
                    </div>
                `;
            } else {
                newsDetailContainer.innerHTML = `<h2 style="text-align:center; color:white;">${lang === 'eu' ? 'Notizia ez da aurkitu' : 'Noticia no encontrada'}</h2>`;
            }
        });
    }

    // CALENDAR LOGIC
    let currentCalendarDate = new Date();
    let currentCalendarView = 'month';

    window.setCalendarView = (view) => {
        currentCalendarView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            const btnView = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
            btn.classList.toggle('active', btnView === view);
        });
        renderCalendar();
    };

    window.changeCalendarDate = (delta) => {
        if (currentCalendarView === 'month') {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
        } else if (currentCalendarView === 'week') {
            currentCalendarDate.setDate(currentCalendarDate.getDate() + (delta * 7));
        } else if (currentCalendarView === 'day') {
            currentCalendarDate.setDate(currentCalendarDate.getDate() + delta);
        } else if (currentCalendarView === 'year') {
            currentCalendarDate.setFullYear(currentCalendarDate.getFullYear() + delta);
        }
        renderCalendar();
    };

    const renderCalendar = () => {
        if (!containers.calendar) return;
        const titleEl = document.getElementById('current-view-title');
        
        if (currentCalendarView === 'month') {
            renderMonthView(titleEl);
        } else if (currentCalendarView === 'week') {
            renderWeekView(titleEl);
        } else if (currentCalendarView === 'day') {
            renderDayView(titleEl);
        } else if (currentCalendarView === 'year') {
            renderYearView(titleEl);
        }
    };

    const renderMonthView = (titleEl) => {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        let startDay = firstDay.getDay();
        if (startDay === 0) startDay = 7;
        startDay--; 

        const monthNames = lang === 'eu' ? 
            ['Urtarrila', 'Otsaila', 'Martxoa', 'Apirila', 'Maiatza', 'Ekaina', 'Uztaila', 'Abuztua', 'Iraila', 'Urria', 'Azaroa', 'Abendua'] :
            ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        if (titleEl) titleEl.innerText = `${monthNames[month]} ${year}`;

        const dayNames = lang === 'eu' ? ['Al', 'Ar', 'Az', 'Og', 'Ol', 'Lr', 'Ig'] : ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
        
        let html = `
            <div class="calendar-grid-header">
                ${dayNames.map(d => `<div>${d}</div>`).join('')}
            </div>
            <div class="calendar-grid-body">
        `;

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-num">${prevMonthLastDay - i}</span></div>`;
        }

        const today = new Date();
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isNonTeaching = nonTeachingDays.includes(dateStr) || (isWeekend && !nonTeachingDays.includes('teaching-' + dateStr));
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''} ${isNonTeaching ? 'non-teaching' : ''}">
                    <span class="calendar-day-num">${i}</span>
                    <div class="calendar-events">
                        ${dayEvents.map(e => `
                            <div class="event-tag" onclick="openEventDetail('${e.id}')" title="${e.title}">
                                ${e.time} ${lang === 'eu' ? (e.title_eu || e.title) : e.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const remaining = 42 - (startDay + lastDay.getDate());
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-num">${i}</span></div>`;
        }

        html += `</div>`;
        containers.calendar.innerHTML = html;
    };

    const renderWeekView = (titleEl) => {
        const curr = new Date(currentCalendarDate);
        const day = curr.getDay() || 7; 
        if (day !== 1) curr.setDate(curr.getDate() - (day - 1));
        
        const end = new Date(curr);
        end.setDate(end.getDate() + 6);

        if (titleEl) {
            titleEl.innerText = `${curr.getDate()}/${curr.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
        }

        const dayNames = lang === 'eu' ? ['Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata', 'Igandea'] : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        let html = `<div class="calendar-week-grid">`;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(curr);
            date.setDate(date.getDate() + i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isNonTeaching = nonTeachingDays.includes(dateStr) || (isWeekend && !nonTeachingDays.includes('teaching-' + dateStr));
            
            html += `
                <div class="calendar-day week-day-col ${dayEvents.length > 0 ? 'has-events' : ''} ${isNonTeaching ? 'non-teaching' : ''}">
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span style="display: block; font-size: 0.8rem; opacity: 0.7;">${dayNames[i]}</span>
                        <strong style="font-size: 1.2rem;">${date.getDate()}</strong>
                    </div>
                    <div class="calendar-events">
                        ${dayEvents.map(e => `
                            <div class="event-tag" onclick="openEventDetail('${e.id}')" style="white-space: normal; height: auto; padding: 6px;">
                                <strong>${e.time}</strong><br>
                                ${lang === 'eu' ? (e.title_eu || e.title) : e.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        containers.calendar.innerHTML = html;
    };

    const renderDayView = (titleEl) => {
        const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(currentCalendarDate.getDate()).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
        
        if (titleEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            titleEl.innerText = currentCalendarDate.toLocaleDateString(lang === 'eu' ? 'eu-ES' : 'es-ES', options);
        }

        if (dayEvents.length === 0) {
            containers.calendar.innerHTML = `
                <div style="text-align: center; padding: 5rem; color: rgba(255,255,255,0.5);">
                    <p style="font-size: 1.5rem;">${lang === 'eu' ? 'Ez dago ekitaldirik egun honetan' : 'No hay eventos para este día'}</p>
                </div>
            `;
            return;
        }

        let html = `<div class="calendar-day-detail">`;
        dayEvents.forEach(e => {
            const title = lang === 'eu' ? (e.title_eu || e.title) : e.title;
            const type = lang === 'eu' ? (e.type_eu || e.type) : e.type;
            const summary = lang === 'eu' ? (e.summary_eu || e.summary) : e.summary;
            
            html += `
                <div class="event-card-horizontal" onclick="openEventDetail('${e.id}')" style="cursor: pointer;">
                    <div class="event-card-img" style="background-image: url('${e.img || 'https://images.unsplash.com/photo-1514119412350-e174d90d280e'}')"></div>
                    <div class="event-card-content">
                        <span class="event-tag" style="background: white; color: #5eabdc; display: inline-block; margin-bottom: 0.5rem;">${type}</span>
                        <h3 style="color: white; margin-bottom: 0.5rem;">${e.time} - ${title}</h3>
                        <p style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">${summary}</p>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        containers.calendar.innerHTML = html;
    };

    const renderYearView = (titleEl) => {
        const year = currentCalendarDate.getFullYear();
        if (titleEl) titleEl.innerText = year;

        const monthNames = lang === 'eu' ? 
            ['Urtarrila', 'Otsaila', 'Martxoa', 'Apirila', 'Maiatza', 'Ekaina', 'Uztaila', 'Abuztua', 'Iraila', 'Urria', 'Azaroa', 'Abendua'] :
            ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        let html = `<div class="calendar-year-grid">`;

        for (let m = 0; m < 12; m++) {
            const firstDay = new Date(year, m, 1);
            let startDay = firstDay.getDay();
            if (startDay === 0) startDay = 7;
            startDay--;

            html += `
                <div class="month-mini">
                    <h4 style="text-align: center; margin-bottom: 0.5rem; color: white;">${monthNames[m]}</h4>
                    <div class="month-mini-grid">
                        ${['L','M','X','J','V','S','D'].map(d => `<div style="opacity: 0.5; font-size: 0.6rem;">${d}</div>`).join('')}
                        ${Array(startDay).fill('<div></div>').join('')}
                        ${Array.from({length: new Date(year, m + 1, 0).getDate()}, (_, i) => {
                            const d = new Date(year, m, i + 1);
                            const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                            const isWknd = d.getDay() === 0 || d.getDay() === 6;
                            const isNT = nonTeachingDays.includes(dateStr) || (isWknd && !nonTeachingDays.includes('teaching-' + dateStr));
                            const hasEvent = events.some(e => e.date === dateStr);
                            
                            let style = '';
                            if (isNT) style = 'background:#002244; color:white; border-radius:4px;';
                            else if (hasEvent) style = 'background:white; color:#5eabdc; border-radius:4px;';
                            
                            return `<div class="day-mini" style="${style}" onclick="currentCalendarDate = new Date(${year}, ${m}, ${i+1}); setCalendarView('day');">${i + 1}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        containers.calendar.innerHTML = html;
    };

    window.openEventDetail = (id) => {
        const e = events.find(item => item.id === id);
        if (!e) return;

        const title = lang === 'eu' ? (e.title_eu || e.title) : e.title;
        const type = lang === 'eu' ? (e.type_eu || e.type) : e.type;
        const summary = lang === 'eu' ? (e.summary_eu || e.summary) : e.summary;
        const description = lang === 'eu' ? (e.description_eu || e.description) : e.description;

        const overlay = document.createElement('div');
        overlay.className = 'event-modal-overlay';
        overlay.onclick = (event) => { if (event.target === overlay) document.body.removeChild(overlay); };
        
        overlay.innerHTML = `
            <div class="event-modal">
                <div class="event-modal-header" style="background-image: url('${e.img || 'https://images.unsplash.com/photo-1514119412350-e174d90d280e'}')">
                    <div class="event-modal-close" onclick="document.body.removeChild(this.closest('.event-modal-overlay'))">&times;</div>
                </div>
                <div class="event-modal-body">
                    <span style="background: #5eabdc; color: white; padding: 4px 12px; border-radius: 50px; font-size: 0.9rem; font-weight: bold; margin-bottom: 1rem; display: inline-block;">${type}</span>
                    <h2 style="color: #5eabdc; font-size: 2.5rem; margin-bottom: 0.5rem;">${title}</h2>
                    <p style="color: #666; font-weight: bold; margin-bottom: 1.5rem; font-size: 1.2rem;">${e.date} | ${e.time}</p>
                    
                    <div style="font-size: 1.2rem; line-height: 1.6; color: #444; font-style: italic; margin-bottom: 2rem; padding-left: 1rem; border-left: 4px solid #5eabdc;">
                        ${summary}
                    </div>
                    
                    <div style="line-height: 1.8; color: #333;" class="event-full-content">
                        ${description}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    };

    window.openCalendarConfig = () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(5px);';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:white; color:#333; padding:2.5rem; border-radius:20px; width:90%; max-width:800px; max-height:90vh; display:flex; flex-direction:column; box-shadow: 0 20px 50px rgba(0,0,0,0.3);';
        
        let configMonth = new Date();
        configMonth.setDate(1);

        const renderConfigCalendar = () => {
            const year = configMonth.getFullYear();
            const month = configMonth.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            let startDay = firstDay.getDay();
            if (startDay === 0) startDay = 7;
            startDay--;

            const monthNames = lang === 'eu' ? 
                ['Urtarrila', 'Otsaila', 'Martxoa', 'Apirila', 'Maiatza', 'Ekaina', 'Uztaila', 'Abuztua', 'Iraila', 'Urria', 'Azaroa', 'Abendua'] :
                ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            const dayNames = lang === 'eu' ? ['Al', 'Ar', 'Az', 'Og', 'Ol', 'Lr', 'Ig'] : ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="color:#5eabdc; margin:0;">${lang === 'eu' ? 'Eskola-egunak Konfiguratu' : 'Configurar Días Lectivos'}</h2>
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <button id="config-prev-month" class="btn btn-primary" style="padding:0.3rem 0.8rem;">&larr;</button>
                        <strong style="min-width:120px; text-align:center;">${monthNames[month]} ${year}</strong>
                        <button id="config-next-month" class="btn btn-primary" style="padding:0.3rem 0.8rem;">&rarr;</button>
                    </div>
                </div>
                <p style="margin-bottom:1.5rem; font-size:0.9rem; color:#666;">
                    ${lang === 'eu' ? 'Egin klik egunetan lektiboak edo ez-lektiboak bezala markatzeko. Asteburuak automatikoki ez-lektiboak dira.' : 'Haz clic en los días para marcarlos como lectivos o no lectivos. Los fines de semana son no lectivos por defecto.'}
                </p>
                <div class="calendar-grid-header" style="color:#666; font-size:0.8rem;">
                    ${dayNames.map(d => `<div>${d}</div>`).join('')}
                </div>
                <div class="calendar-grid-body" style="grid-template-columns: repeat(7, 1fr); gap:4px; background:none;">
            `;

            for (let i = 0; i < startDay; i++) html += '<div></div>';

            for (let i = 1; i <= lastDay.getDate(); i++) {
                const date = new Date(year, month, i);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isNonTeaching = nonTeachingDays.includes(dateStr) || (isWeekend && !nonTeachingDays.includes('teaching-' + dateStr));
                
                html += `
                    <div class="config-day" data-date="${dateStr}" style="
                        padding:1rem 0.5rem; 
                        text-align:center; 
                        border-radius:8px; 
                        cursor:pointer; 
                        font-weight:bold;
                        transition:all 0.2s;
                        background: ${isNonTeaching ? '#002244' : '#f0f0f0'};
                        color: ${isNonTeaching ? 'white' : '#333'};
                    ">${i}</div>
                `;
            }

            html += `</div>
                <div style="margin-top:2rem; display:flex; gap:1rem; justify-content:flex-end;">
                    <button id="config-save-btn" class="btn btn-success" style="padding:0.8rem 2rem;">${lang === 'eu' ? 'Gorde' : 'Guardar'}</button>
                    <button id="config-close-btn" class="btn" style="background:#e0e0e0; padding:0.8rem 2rem;">${lang === 'eu' ? 'Itxi' : 'Cerrar'}</button>
                </div>
            `;
            box.innerHTML = html;

            // Re-attach listeners
            box.querySelectorAll('.config-day').forEach(day => {
                day.onclick = () => {
                    const d = day.getAttribute('data-date');
                    const dateObj = new Date(d);
                    const isWknd = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    
                    if (isWknd) {
                        const teachingKey = 'teaching-' + d;
                        if (nonTeachingDays.includes(teachingKey)) {
                            nonTeachingDays = nonTeachingDays.filter(x => x !== teachingKey);
                        } else {
                            nonTeachingDays.push(teachingKey);
                        }
                    } else {
                        if (nonTeachingDays.includes(d)) {
                            nonTeachingDays = nonTeachingDays.filter(x => x !== d);
                        } else {
                            nonTeachingDays.push(d);
                        }
                    }
                    renderConfigCalendar();
                };
            });

            box.querySelector('#config-prev-month').onclick = () => { configMonth.setMonth(configMonth.getMonth() - 1); renderConfigCalendar(); };
            box.querySelector('#config-next-month').onclick = () => { configMonth.setMonth(configMonth.getMonth() + 1); renderConfigCalendar(); };
            box.querySelector('#config-save-btn').onclick = () => { window.saveCalendarConfig(); document.body.removeChild(overlay); };
            box.querySelector('#config-close-btn').onclick = () => { document.body.removeChild(overlay); };
        };

        renderConfigCalendar();
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    };

    if (containers.calendar) renderCalendar();
});

const API_URL = window.APP_CONFIG?.API_URL || window.API_URL || window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (!token || !userJson || (typeof isTokenExpired === 'function' && isTokenExpired(token))) {
        if (typeof clearSession === 'function') clearSession();
        window.location.href = 'login.html';
        return;
    }

    try {
        const user = JSON.parse(userJson);
        document.getElementById('student-name').textContent = user.name;
    } catch (e) {
        logout();
    }
}

async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');
        //console.log('Loading dashboard with token:', !!token);

        const response = await fetch(`${API_URL}/api/my-enrollments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        //console.log('Enrollments response status:', response.status);
        
        if (response.ok) {
            const promotions = await response.json();
            //console.log('Loaded promotions:', promotions);
            
            if (promotions.length > 0) {
                // Load the first promotion found for the student view
                const promotion = promotions[0];
                //console.log('Selected promotion:', promotion);
                populateDashboard(promotion);
            } else {
                //console.log('No enrollments found');
                showNoEnrollments();
            }
        } else {
            console.error('Failed to fetch enrollments:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function showNoEnrollments() {
    document.querySelector('.section-container').innerHTML = `
        <div class="alert alert-warning text-center p-5">
            <h3>No Active Programs</h3>
            <p>You seem to not be enrolled in any bootcamp yet.</p>
        </div>
    `;
}

function populateDashboard(promotion) {
    //console.log('Populating dashboard with promotion:', promotion);
    
    // 1. Description
    if (promotion.description) {
        document.getElementById('promotion-description').innerHTML = escapeHtml(promotion.description);
    }

    // 2. Roadmap / Gantt
    generateGantt(promotion);

    // 3. Calendar
    loadCalendar(promotion.id);

    // 4. Quick Links
    loadQuickLinks(promotion.id);

    // 5. Dynamic Sections (Modules/Competencias)
    if (promotion.modules && promotion.modules.length > 0) {
        renderModulesAccordion(promotion.modules);
    }

    // 6. Extended Info (Schedule, Team, Resources, Evaluation)
    // Try both promotion.id and promotion._id to ensure compatibility
    const promotionId = promotion.id || promotion._id;
    //console.log('Using promotion ID for extended info:', promotionId);
    
    // Force show sections to test visibility
    //console.log('Testing section visibility...');
    testSectionVisibility();
    
    loadExtendedInfo(promotionId);
}

function testSectionVisibility() {
    // Test if sections are actually visible by adding some test content
    const sections = ['horario', 'equipo', 'evaluacion', 'resources'];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            //console.log(`Section ${sectionId} found and visible`);
            
            // Add a temporary test indicator
            const existing = section.querySelector('.test-indicator');
            if (!existing) {
                const testDiv = document.createElement('div');
                testDiv.className = 'test-indicator alert alert-info mt-2';
                testDiv.innerHTML = `<small>🧪 Section ${sectionId} is loaded and waiting for data...</small>`;
                
                const cardBody = section.querySelector('.card-body');
                if (cardBody) {
                    cardBody.appendChild(testDiv);
                    // Force the section to be visible
                    section.style.display = 'block';
                    section.style.visibility = 'visible';
                }
            }
        } else {
            console.error(`Section ${sectionId} NOT found in DOM`);
        }
    });
    
    // Also add test data to see if rendering works
    //console.log('Adding test data to verify rendering functions...');
    
    // Test schedule rendering with sample data
    setTimeout(() => {
        const testSchedule = {
            online: { entry: 'TEST: 08:20', finish: 'TEST: 15:20' },
            notes: 'TEST: This is test schedule data'
        };
        //console.log('Testing schedule render with:', testSchedule);
        renderSchedule(testSchedule);
    }, 1000);
    
    // Test team rendering with sample data
    setTimeout(() => {
        const testTeam = [
            { name: 'TEST: Ana Aragón', role: 'TEST: Formadora', email: 'test@test.com' }
        ];
        //console.log('Testing team render with:', testTeam);
        renderTeam(testTeam);
    }, 1500);
    
    // Test evaluation rendering
    setTimeout(() => {
        const testEvaluation = 'TEST: This is test evaluation data to verify rendering works';
        //console.log('Testing evaluation render with:', testEvaluation);
        renderEvaluation(testEvaluation);
    }, 2000);
}

async function loadExtendedInfo(promotionId) {
    try {
        //console.log('Loading extended info for promotion:', promotionId);
        
        // Make sure we have a valid promotion ID
        if (!promotionId) {
            console.error('No promotion ID provided');
            return;
        }
        
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`);
        //console.log('Extended info response status:', response.status);
        
        if (response.ok) {
            const info = await response.json();
            //console.log('Extended info loaded:', info);
            
            // Render each section with additional debugging
            //console.log('Rendering schedule...');
            renderSchedule(info.schedule);
            
            //console.log('Rendering team...');
            renderTeam(info.team);
            
            //console.log('Rendering resources...');
            renderResources(info.resources);
            
            //console.log('Rendering evaluation...');
            renderEvaluation(info.evaluation);
        } else {
            console.error('Failed to load extended info:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
        }
    } catch (error) {
        console.error('Error loading extended info:', error);
    }
}

function renderSchedule(schedule) {
    //console.log('renderSchedule called with:', schedule);
    
    const container = document.getElementById('horario');
    if (!container) {
        console.error('Schedule container with ID "horario" not found');
        return;
    }
    
    const scheduleDiv = container.querySelector('.card-body');
    if (!scheduleDiv) {
        console.error('Schedule card-body not found within horario container');
        return;
    }
    
    // Remove test indicator
    const testIndicator = scheduleDiv.querySelector('.test-indicator');
    if (testIndicator) {
        testIndicator.remove();
    }
    
    if (!schedule) {
        //console.log('No schedule data provided');
        return;
    }
    
    // Be more lenient with data validation - show even partial data
    const hasOnlineData = schedule.online && Object.values(schedule.online).some(v => v);
    const hasPresentialData = schedule.presential && Object.values(schedule.presential).some(v => v);
    const hasNotes = schedule.notes;
    
    //console.log('Schedule validation:', { hasOnlineData, hasPresentialData, hasNotes });
    
    if (!hasOnlineData && !hasPresentialData && !hasNotes) {
        //console.log('Schedule data is empty - showing placeholder');
        // Show a placeholder instead of nothing
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'dynamic-schedule mt-4 p-3 bg-light rounded';
        placeholderDiv.innerHTML = `
            <h6 class="text-muted">
                <i class="bi bi-clock-fill me-2"></i>No custom schedule information available
            </h6>
            <p class="text-muted mb-0">Using default schedule shown above.</p>
        `;
        scheduleDiv.appendChild(placeholderDiv);
        return;
    }
    
    //console.log('Rendering schedule data...');
    
    // Clear existing dynamic content but preserve the original content
    let existingDynamic = scheduleDiv.querySelector('.dynamic-schedule');
    if (existingDynamic) {
        existingDynamic.remove();
    }
    
    const dynamicDiv = document.createElement('div');
    dynamicDiv.className = 'dynamic-schedule mt-4 p-3 bg-light rounded';
    
    let html = '<h6 class="text-primary"><i class="bi bi-clock-fill me-2"></i>Custom Schedule Information</h6>';
    
    if (hasOnlineData) {
        html += `
            <div class="mb-3">
                <h6 class="text-primary">📱 Online Schedule</h6>
                <ul class="mb-0">
                    ${schedule.online.entry ? `<li><strong>Entry:</strong> ${escapeHtml(schedule.online.entry)}</li>` : ''}
                    ${schedule.online.start ? `<li><strong>Start:</strong> ${escapeHtml(schedule.online.start)}</li>` : ''}
                    ${schedule.online.break ? `<li><strong>Break:</strong> ${escapeHtml(schedule.online.break)}</li>` : ''}
                    ${schedule.online.lunch ? `<li><strong>Lunch:</strong> ${escapeHtml(schedule.online.lunch)}</li>` : ''}
                    ${schedule.online.finish ? `<li><strong>Finish:</strong> ${escapeHtml(schedule.online.finish)}</li>` : ''}
                </ul>
            </div>
        `;
    }
    
    if (hasPresentialData) {
        html += `
            <div class="mb-3">
                <h6 class="text-success">🏢 Presential Schedule</h6>
                <ul class="mb-0">
                    ${schedule.presential.entry ? `<li><strong>Entry:</strong> ${escapeHtml(schedule.presential.entry)}</li>` : ''}
                    ${schedule.presential.start ? `<li><strong>Start:</strong> ${escapeHtml(schedule.presential.start)}</li>` : ''}
                    ${schedule.presential.break ? `<li><strong>Break:</strong> ${escapeHtml(schedule.presential.break)}</li>` : ''}
                    ${schedule.presential.lunch ? `<li><strong>Lunch:</strong> ${escapeHtml(schedule.presential.lunch)}</li>` : ''}
                    ${schedule.presential.finish ? `<li><strong>Finish:</strong> ${escapeHtml(schedule.presential.finish)}</li>` : ''}
                </ul>
            </div>
        `;
    }
    
    if (hasNotes) {
        html += `<div class="alert alert-info mb-0"><i class="bi bi-info-circle me-2"></i><strong>Notes:</strong> ${escapeHtml(schedule.notes)}</div>`;
    }
    
    dynamicDiv.innerHTML = html;
    scheduleDiv.appendChild(dynamicDiv);
    
    //console.log('Schedule rendered successfully');
}

function renderTeam(team) {
    //console.log('renderTeam called with:', team);
    
    const container = document.getElementById('team-list'); // UL element
    if (!container) {
        console.error('Team container with ID "team-list" not found');
        return;
    }
    
    // Remove test indicator from parent section
    const parentSection = document.getElementById('equipo');
    if (parentSection) {
        const testIndicator = parentSection.querySelector('.test-indicator');
        if (testIndicator) {
            testIndicator.remove();
        }
    }
    
    if (!team || !Array.isArray(team) || team.length === 0) {
        //console.log('No team data provided or team array is empty');
        return;
    }

    //console.log('Rendering team data...');
    
    // Clear only the dynamic content, preserve any static content
    const existingDynamicItems = container.querySelectorAll('.dynamic-team-member');
    existingDynamicItems.forEach(item => item.remove());
    
    team.forEach((member, index) => {
        const li = document.createElement('li');
        li.className = 'mb-2 dynamic-team-member p-2 bg-light rounded';
        
        let memberHtml = `<strong class="text-primary">${escapeHtml(member.name || 'Unknown')}</strong>`;
        
        if (member.role) {
            memberHtml += ` - <span class="badge bg-secondary">${escapeHtml(member.role)}</span>`;
        }
        
        if (member.email) {
            memberHtml += `<br><small><i class="bi bi-envelope me-1"></i><a href="mailto:${escapeHtml(member.email)}">${escapeHtml(member.email)}</a></small>`;
        }
        
        if (member.linkedin) {
            memberHtml += ` <small><a href="${escapeHtml(member.linkedin)}" target="_blank" class="text-decoration-none text-primary"><i class="bi bi-linkedin"></i> LinkedIn</a></small>`;
        }
        
        li.innerHTML = memberHtml;
        container.appendChild(li);
    });
    
    //console.log('Team rendered successfully');
}

function renderResources(resources) {
    //console.log('renderResources called with:', resources);
    
    const container = document.getElementById('resources');
    if (!container) {
        console.error('Resources container with ID "resources" not found');
        return;
    }
    
    const resourcesDiv = container.querySelector('.card-body');
    if (!resourcesDiv) {
        console.error('Resources card-body not found within resources container');
        return;
    }
    
    // Remove test indicator
    const testIndicator = resourcesDiv.querySelector('.test-indicator');
    if (testIndicator) {
        testIndicator.remove();
    }
    
    if (!resources || !Array.isArray(resources) || resources.length === 0) {
        //console.log('No resources data provided or resources array is empty');
        return;
    }
    
    //console.log('Rendering resources data...');
    
    // Clear existing dynamic content but keep the title
    const existingDynamic = resourcesDiv.querySelector('.dynamic-resources');
    if (existingDynamic) {
        existingDynamic.remove();
    }
    
    const dynamicDiv = document.createElement('div');
    dynamicDiv.className = 'dynamic-resources mt-4';
    
    let html = '<h6 class="text-success mb-3"><i class="bi bi-link-45deg me-2"></i>Additional Resources</h6><div class="list-group">';
    
    resources.forEach((resource, index) => {
        html += `
            <a href="${escapeHtml(resource.url || '#')}" target="_blank" class="list-group-item list-group-item-action">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${escapeHtml(resource.title || 'Untitled Resource')}</h6>
                        ${resource.url ? `<small class="text-muted">${escapeHtml(resource.url)}</small>` : ''}
                    </div>
                    ${resource.category ? `<span class="badge bg-secondary">${escapeHtml(resource.category)}</span>` : ''}
                </div>
            </a>
        `;
    });
    
    html += '</div>';
    dynamicDiv.innerHTML = html;
    resourcesDiv.appendChild(dynamicDiv);
    
    //console.log('Resources rendered successfully');
}

function renderEvaluation(evaluation) {
    //console.log('renderEvaluation called with:', evaluation);
    
    const container = document.getElementById('evaluacion');
    if (!container) {
        console.error('Evaluation container with ID "evaluacion" not found');
        return;
    }
    
    const evaluationDiv = container.querySelector('.card-body');
    if (!evaluationDiv) {
        console.error('Evaluation card-body not found within evaluacion container');
        return;
    }
    
    // Remove test indicator
    const testIndicator = evaluationDiv.querySelector('.test-indicator');
    if (testIndicator) {
        testIndicator.remove();
    }
    
    if (!evaluation) {
        //console.log('No evaluation data provided');
        // Show placeholder instead of nothing
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'dynamic-evaluation mt-4 p-3 bg-light rounded';
        placeholderDiv.innerHTML = `
            <h6 class="text-muted">
                <i class="bi bi-info-circle me-2"></i>No custom evaluation information available
            </h6>
            <p class="text-muted mb-0">Using default evaluation criteria shown above.</p>
        `;
        evaluationDiv.appendChild(placeholderDiv);
        return;
    }
    
    //console.log('Rendering evaluation data...');
    
    // Clear existing dynamic content but preserve the original content
    let existingDynamic = evaluationDiv.querySelector('.dynamic-evaluation');
    if (existingDynamic) {
        existingDynamic.remove();
    }
    
    const dynamicDiv = document.createElement('div');
    dynamicDiv.className = 'dynamic-evaluation mt-4 p-3 bg-primary bg-opacity-10 border border-primary rounded';
    
    dynamicDiv.innerHTML = `
        <h6 class="text-primary mb-3">
            <i class="bi bi-info-circle-fill me-2"></i>Custom Evaluation Information
        </h6>
        <div class="text-dark">${/<[a-z]/i.test(evaluation) ? evaluation : escapeHtml(evaluation).replace(/\n/g, '<br>')}</div>
    `;
    
    evaluationDiv.appendChild(dynamicDiv);
    
    //console.log('Evaluation rendered successfully');
}

function generateGantt(promotion) {
    const table = document.getElementById('gantt-table');
    table.innerHTML = '';
    document.getElementById('gantt-loading').classList.add('hidden');

    const weeks = promotion.weeks || 24; // Default to 24 if not set
    const modules = promotion.modules || [];
    const employability = promotion.employability || [];

    if (modules.length === 0) {
        table.innerHTML = '<tr><td class="text-center p-3">No modules defined</td></tr>';
        return;
    }

    // Helper function to get month for a week (1-indexed)
    function getMonthForWeek(weekNum) {
        return Math.ceil(weekNum / 4);
    }

    // Month Header Row
    const monthRow = document.createElement('tr');
    monthRow.className = 'month-header';
    const monthLabel = document.createElement('th');
    monthLabel.className = 'label';
    monthLabel.textContent = 'Months';
    monthRow.appendChild(monthLabel);

    let currentMonth = 0;
    let monthSpan = 0;
    let monthCell = null;

    for (let i = 1; i <= weeks; i++) {
        const month = getMonthForWeek(i);

        if (month !== currentMonth) {
            if (monthCell) {
                monthCell.colSpan = monthSpan;
            }
            currentMonth = month;
            monthCell = document.createElement('th');
            monthCell.textContent = `M${month}`;
            monthCell.style.textAlign = 'center';
            monthRow.appendChild(monthCell);
            monthSpan = 1;
        } else {
            monthSpan++;
        }
    }
    if (monthCell) {
        monthCell.colSpan = monthSpan;
    }
    table.appendChild(monthRow);

    // Week Header Row
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    emptyHeader.className = 'label';
    emptyHeader.textContent = 'Módulos / Semanas';
    headerRow.appendChild(emptyHeader);

    for (let i = 1; i <= weeks; i++) {
        const th = document.createElement('th');
        th.textContent = i;
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    // Data Rows
    let weekCounter = 0;

    // Define colors/classes based on user CSS
    const classTypes = ['tema', 'proyecto', 'transicion'];

    modules.forEach((module, index) => {
        // Module Row
        const row = document.createElement('tr');
        const label = document.createElement('td');
        label.className = 'label';
        label.innerHTML = `<strong>Module ${index + 1}: ${escapeHtml(module.name)}</strong>`;
        row.appendChild(label);

        // Calculate start and end week for this module
        const moduleStart = weekCounter;
        const moduleEnd = weekCounter + module.duration;

        for (let i = 0; i < weeks; i++) {
            const cell = document.createElement('td');
            if (i >= moduleStart && i < moduleEnd) {
                cell.className = 'block tema';
                cell.title = module.name;
            } else {
                cell.className = 'empty';
            }
            row.appendChild(cell);
        }
        table.appendChild(row);

        // Show individual courses
        if (module.courses && module.courses.length > 0) {
            module.courses.forEach(courseObj => {
                const isObj = courseObj && typeof courseObj === 'object';
                const courseName = isObj ? (courseObj.name || 'Unnamed') : String(courseObj);
                const courseUrl = isObj ? (courseObj.url || '') : '';
                const courseDur = isObj ? (Number(courseObj.duration) || 1) : 1;
                const courseOff = isObj ? (Number(courseObj.startOffset) || 0) : 0;

                const courseRow = document.createElement('tr');
                const courseLabel = document.createElement('td');
                courseLabel.className = 'label';
                const courseLink = courseUrl ? `<a href="${escapeHtml(courseUrl)}" target="_blank" class="text-decoration-none">📖 ${escapeHtml(courseName)}</a>` : `📖 ${escapeHtml(courseName)}`;
                courseLabel.innerHTML = courseLink;
                courseRow.appendChild(courseLabel);

                const absoluteStart = weekCounter + courseOff;
                const absoluteEnd = absoluteStart + courseDur;

                for (let i = 0; i < weeks; i++) {
                    const cell = document.createElement('td');
                    if (i >= absoluteStart && i < absoluteEnd) {
                        cell.className = 'block tema';
                    } else {
                        cell.className = 'empty';
                    }
                    courseRow.appendChild(cell);
                }
                table.appendChild(courseRow);
            });
        }

        // Show individual projects
        if (module.projects && module.projects.length > 0) {
            module.projects.forEach(projectObj => {
                const isObj = projectObj && typeof projectObj === 'object';
                const projectName = isObj ? (projectObj.name || 'Unnamed') : String(projectObj);
                const projectUrl = isObj ? (projectObj.url || '') : '';
                const projectDur = isObj ? (Number(projectObj.duration) || 1) : 1;
                const projectOff = isObj ? (Number(projectObj.startOffset) || 0) : 0;

                const projRow = document.createElement('tr');
                const projLabel = document.createElement('td');
                projLabel.className = 'label';
                const projectLink = projectUrl ? `<a href="${escapeHtml(projectUrl)}" target="_blank" class="text-decoration-none">🎯 ${escapeHtml(projectName)}</a>` : `🎯 ${escapeHtml(projectName)}`;
                projLabel.innerHTML = projectLink;
                projRow.appendChild(projLabel);

                const absoluteStart = weekCounter + projectOff;
                const absoluteEnd = absoluteStart + projectDur;

                for (let i = 0; i < weeks; i++) {
                    const cell = document.createElement('td');
                    if (i >= absoluteStart && i < absoluteEnd) {
                        cell.className = 'block proyecto';
                    } else {
                        cell.className = 'empty';
                    }
                    projRow.appendChild(cell);
                }
                table.appendChild(projRow);
            });
        }

        weekCounter += module.duration;
    });

    // Employability Section
    if (employability && employability.length > 0) {
        // Separator row
        const separatorRow = document.createElement('tr');
        separatorRow.style.height = '10px';
        const separatorCell = document.createElement('td');
        separatorCell.colSpan = weeks + 1;
        separatorRow.appendChild(separatorCell);
        table.appendChild(separatorRow);

        // Section header
        const headerRow = document.createElement('tr');
        const headerCell = document.createElement('td');
        headerCell.className = 'label';
        headerCell.innerHTML = '<strong>💼 Empleabilidad</strong>';
        headerCell.colSpan = weeks + 1;
        headerRow.appendChild(headerCell);
        table.appendChild(headerRow);

        // Employability items
        employability.forEach((item) => {
            const itemRow = document.createElement('tr');
            const itemLabel = document.createElement('td');
            itemLabel.className = 'label';
            const itemUrl = item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" class="text-decoration-none">${escapeHtml(item.name)}</a>` : escapeHtml(item.name);
            itemLabel.innerHTML = `<small>${itemUrl}</small>`;
            itemRow.appendChild(itemLabel);

            // Convert months to weeks: startMonth is 1-indexed
            const startWeek = (item.startMonth - 1) * 4;
            const endWeek = startWeek + (item.duration * 4);

            for (let i = 0; i < weeks; i++) {
                const cell = document.createElement('td');
                if (i >= startWeek && i < endWeek) {
                    cell.className = 'block transicion';
                } else {
                    cell.className = 'empty';
                }
                itemRow.appendChild(cell);
            }
            table.appendChild(itemRow);
        });
    }
}

async function loadCalendar(promotionId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const calendar = await response.json();
            const iframe = document.getElementById('calendar-iframe');
            if (calendar.googleCalendarId) {
                iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendar.googleCalendarId)}&ctz=Europe/Madrid`;
                document.getElementById('no-calendar-msg').classList.add('hidden');
                iframe.classList.remove('hidden');
            } else {
                document.getElementById('no-calendar-msg').classList.remove('hidden');
                iframe.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
    }
}

async function loadQuickLinks(promotionId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const links = await response.json();
            renderQuickLinks(links);
        }
    } catch (error) {
        console.error('Error loading quick links:', error);
    }
}

function renderQuickLinks(links) {
    const container = document.getElementById('quick-links-container');
    container.innerHTML = '';

    // User HTML had hardcoded structure in #link section. 
    // We will append to it or replace content. 
    // The user HTML has a list of buttons in columns.

    const platformIcons = {
        'zoom': 'bi-camera-video',
        'discord': 'bi-discord',
        'classroom': 'bi-grid-3x3-gap',
        'github': 'bi-github',
        'custom': 'bi-link'
    };

    if (links.length === 0) {
        container.innerHTML = '<div class="col-12 text-center">No links available</div>';
        return;
    }

    // Simply list them as buttons in columns
    links.forEach(link => {
        const icon = platformIcons[link.platform] || platformIcons['custom'];

        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        col.innerHTML = `
            <div class="d-grid gap-2">
                <a href="${escapeHtml(link.url)}" target="_blank" class="btn btn-outline-primary text-start">
                    <i class="bi ${icon} me-2"></i> ${escapeHtml(link.name)}
                </a>
            </div>
        `;
        container.appendChild(col);
    });
}

function renderModulesAccordion(modules) {
    const container = document.getElementById('accordion');
    container.innerHTML = '';

    modules.forEach((module, index) => {
        const id = `collapse${index}`;
        const item = document.createElement('div');
        item.className = 'accordion-item';

        // Handle courses - support both string and object formats
        const coursesList = (module.courses || []).map(c => {
            const courseName = typeof c === 'string' ? c : c.name || c;
            const courseUrl = typeof c === 'object' ? c.url : '';
            if (courseUrl) {
                return `<li><a href="${escapeHtml(courseUrl)}" target="_blank">${escapeHtml(courseName)}</a></li>`;
            } else {
                return `<li>${escapeHtml(courseName)}</li>`;
            }
        }).join('');

        // Handle projects - support both string and object formats
        const projectsList = (module.projects || []).map(p => {
            const projectName = typeof p === 'string' ? p : p.name || p;
            const projectUrl = typeof p === 'object' ? p.url : '';
            if (projectUrl) {
                return `<li><a href="${escapeHtml(projectUrl)}" target="_blank">${escapeHtml(projectName)}</a></li>`;
            } else {
                return `<li>${escapeHtml(projectName)}</li>`;
            }
        }).join('');

        item.innerHTML = `
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">
                    Módulo ${index + 1}: ${escapeHtml(module.name)}
                </button>
            </h2>
            <div id="${id}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#accordion">
                <div class="accordion-body">
                    <p><strong>Duration:</strong> ${module.duration} weeks</p>
                    ${coursesList ? `<h6>Temas:</h6><ul>${coursesList}</ul>` : ''}
                    ${projectsList ? `<h6>Proyectos:</h6><ul>${projectsList}</ul>` : ''}
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

function logout() {
    if (typeof clearSession === 'function') clearSession();
    else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    }
    window.location.href = 'login.html';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

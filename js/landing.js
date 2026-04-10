const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

// Load promotions on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPromotions();
});

async function loadPromotions() {
    try {
        const response = await fetch(`${API_URL}/api/promotions`);

        if (response.ok) {
            const promotions = await response.json();
            displayPromotions(promotions);
        } else if (response.status === 401) {
            // No authentication needed for public view, show error
            displayNoPromotions();
        } else {
            displayNoPromotions();
        }
    } catch (error) {
        console.error('Error loading promotions:', error);
        displayNoPromotions();
    }
}

function displayPromotions(promotions) {
    const container = document.getElementById('promotions-container');
    container.innerHTML = '';

    if (promotions.length === 0) {
        container.parentElement.innerHTML = `
            <div style="grid-column: 1 / -1;">
                <div class="no-promotions">
                    <h3>No programs available yet</h3>
                    <p>Teachers are creating new bootcamp programs. Check back soon!</p>
                </div>
            </div>
        `;
        return;
    }

    promotions.forEach(promotion => {
        const card = document.createElement('div');
        card.className = 'promotion-card';
        
        // Generate correct path for different environments
        const isGitHubPages = window.location.hostname.includes('github.io');
        let promotionPath;
        if (isGitHubPages) {
            const pathParts = window.location.pathname.split('/');
            const repoName = pathParts[1];
            promotionPath = `/${repoName}/public-promotion.html`;
        } else {
            promotionPath = 'public-promotion.html';
        }
        
        card.onclick = () => window.location.href = `${promotionPath}?id=${promotion.id}`;
        card.innerHTML = `
            <div class="promotion-card-body">
                <h3>${escapeHtml(promotion.name)}</h3>
                <p>${escapeHtml(promotion.description || 'No description available')}</p>
                <div style="margin-bottom: 15px;">
                    <span class="promotion-badge">${promotion.weeks} weeks</span>
                </div>
                <button class="btn btn-sm btn-primary" style="width: 100%;">
                    <i class="bi bi-eye me-2"></i>View Program
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function displayNoPromotions() {
    const container = document.getElementById('promotions-container');
    container.parentElement.innerHTML = `
        <div style="grid-column: 1 / -1;">
            <div class="no-promotions">
                <h3>Unable to load programs</h3>
                <p>Please refresh the page or try again later.</p>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

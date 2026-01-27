// app.js - Project Ceres Application Logic

// Initialize Lucide icons
lucide.createIcons();

// Profile Manager Class for Local Storage
class ProfileManager {
    constructor() {
        this.storageKey = 'ceres_profiles';
        this.profiles = this.loadProfiles();
    }

    loadProfiles() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load profiles from localStorage:', error);
            return [];
        }
    }

    saveProfiles() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.profiles));
            return true;
        } catch (error) {
            console.error('Failed to save profiles to localStorage:', error);
            return false;
        }
    }

    generateProfileId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `CER-${new Date().getFullYear()}-${timestamp}-${random}`;
    }

    createProfile(data) {
        const profile = {
            id: this.generateProfileId(),
            timestamp: new Date().toISOString(),
            farmerName: data.farmerName,
            livestock: {
                species: data.species,
                count: data.livestockCount,
                value: data.herdValue
            },
            dataPoints: data.dataPoints,
            modules: data.modules,
            riskRating: data.riskRating,
            valuation: data.valuation,
            useCase: data.useCase,
            fullData: data // Store complete data for detailed view
        };

        this.profiles.unshift(profile); // Add to beginning (newest first)
        this.saveProfiles();
        return profile;
    }

    getProfile(id) {
        return this.profiles.find(p => p.id === id);
    }

    deleteProfile(id) {
        this.profiles = this.profiles.filter(p => p.id !== id);
        this.saveProfiles();
    }

    getAllProfiles() {
        return this.profiles;
    }

    getTotalCount() {
        return this.profiles.length;
    }
}

// Initialize Profile Manager
const profileManager = new ProfileManager();

// Global state
let uploads = {
    id: false,
    bank: false,
    herd: false,
    health: false
};

let formData = {};
let selectedModules = ['asset', 'risk', 'financial'];
let currentProfile = null;

// Form field mapping for data collection
const fieldMapping = {
    'farmer-name': 'name',
    'farmer-phone': 'phone',
    'farmer-email': 'email',
    'farmer-county': 'county',
    'farmer-ward': 'ward',
    'farmer-land': 'land',
    'farmer-experience': 'experience',
    'farmer-bank': 'bank',
    'farmer-account-type': 'accountType',
    'livestock-count': 'livestockCount',
    'breeding-stock': 'breedingStock',
    'primary-breed': 'breed',
    'herd-value': 'herdValue',
    'use-case': 'useCase',
    'analysis-objective': 'analysisObjective',
    'system-prompt': 'systemPrompt'
};

function initializeSystem() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    
    // Show Profiles button if there are saved profiles
    if (profileManager.getTotalCount() > 0) {
        document.getElementById('profiles-btn').classList.remove('hidden');
    }
    
    // Animate loading bar
    setTimeout(() => {
        document.getElementById('loading-bar').style.width = '100%';
        document.getElementById('loading-text').textContent = 'Loading modules...';
    }, 100);
    
    setTimeout(() => {
        document.getElementById('loading-text').textContent = 'Calibrating sensors...';
    }, 800);
    
    setTimeout(() => {
        document.getElementById('loading-text').textContent = 'System ready';
    }, 1800);
    
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('workspace-screen').classList.remove('hidden');
    }, 2500);
}

function handleUpload(type, input) {
    if (input.files && input.files[0]) {
        uploads[type] = true;
        const file = input.files[0];
        
        document.getElementById(`${type}-placeholder`).classList.add('hidden');
        document.getElementById(`${type}-complete`).classList.remove('hidden');
        document.getElementById(`${type}-filename`).textContent = file.name;
        
        // Store file info
        formData[`file_${type}`] = {
            name: file.name,
            size: file.size,
            type: file.type
        };
        
        calculateProgress();
    }
}

function removeUpload(type) {
    uploads[type] = false;
    delete formData[`file_${type}`];
    document.getElementById(`file-${type}`).value = '';
    document.getElementById(`${type}-placeholder`).classList.remove('hidden');
    document.getElementById(`${type}-complete`).classList.add('hidden');
    calculateProgress();
}

function collectFormData() {
    // Collect all form field values
    Object.keys(fieldMapping).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            formData[fieldMapping[fieldId]] = element.value;
        }
    });
    
    // Collect radio buttons
    const species = document.querySelector('input[name="species"]:checked');
    if (species) {
        formData.species = species.value;
    }
    
    const risk = document.querySelector('input[name="risk"]:checked');
    if (risk) {
        formData.riskTolerance = risk.value;
    }
    
    // Collect checkboxes
    formData.variables = [];
    document.querySelectorAll('.variable-checkbox:checked').forEach(cb => {
        formData.variables.push(cb.nextElementSibling.textContent);
    });
}

function calculateProgress() {
    collectFormData();
    
    let points = 0;
    let totalPoints = 15;
    
    // Core fields (3 points each)
    if (formData.name) points += 3;
    if (formData.species) points += 2;
    
    // Uploads (2-3 points each)
    if (uploads.id) points += 2;
    if (uploads.bank) points += 3;
    if (uploads.herd) points += 3;
    if (uploads.health) points += 2;
    
    // Additional fields (1 point each)
    const additionalFields = ['phone', 'email', 'county', 'ward', 'land', 'experience', 'bank', 'accountType', 'livestockCount', 'breedingStock', 'breed', 'herdValue'];
    additionalFields.forEach(field => {
        if (formData[field]) points++;
    });
    
    const percentage = Math.round((points / totalPoints) * 100);
    
    // Update progress indicators
    document.getElementById('completion-percentage').textContent = points + '/' + totalPoints;
    document.getElementById('workspace-progress').style.width = percentage + '%';
    document.getElementById('data-points').textContent = points + '/' + totalPoints;
    document.getElementById('bottom-progress').style.width = percentage + '%';
    
    // Enable/disable continue button
    const btn = document.getElementById('analyze-btn');
    if (percentage >= 60 && formData.name) {
        btn.disabled = false;
        btn.classList.remove('bg-slate-200', 'text-slate-400');
        btn.classList.add('bg-slate-900', 'text-white', 'hover:bg-slate-800');
    } else {
        btn.disabled = true;
        btn.classList.add('bg-slate-200', 'text-slate-400');
        btn.classList.remove('bg-slate-900', 'text-white', 'hover:bg-slate-800');
    }
    
    return { points, totalPoints, percentage };
}

function proceedToAnalysis() {
    collectFormData();
    document.getElementById('result-farmer-name').textContent = formData.name || '--';
    
    document.getElementById('workspace-screen').classList.add('hidden');
    document.getElementById('analysis-screen').classList.remove('hidden');
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function toggleModule(card, module) {
    const checkbox = card.querySelector('input[type="checkbox"]');
    const checkmark = card.querySelector('svg');
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        card.classList.add('selected');
        checkmark.classList.remove('hidden');
        if (!selectedModules.includes(module)) {
            selectedModules.push(module);
        }
    } else {
        card.classList.remove('selected');
        checkmark.classList.add('hidden');
        selectedModules = selectedModules.filter(m => m !== module);
    }
}

function backToWorkspace() {
    document.getElementById('analysis-screen').classList.add('hidden');
    document.getElementById('workspace-screen').classList.remove('hidden');
}

function generateIntelligence() {
    collectFormData();
    
    // Generate mock results
    const progress = calculateProgress();
    const livestockCount = parseInt(formData.livestockCount) || 45;
    const herdValue = parseFloat(formData.herdValue) || 4200000;
    
    // Generate risk rating
    const riskScore = Math.random();
    let riskRating, riskBadgeClass, riskText;
    if (riskScore > 0.7) {
        riskRating = 'low';
        riskBadgeClass = 'bg-green-100 text-green-700';
        riskText = 'Low Risk (AA)';
    } else if (riskScore > 0.4) {
        riskRating = 'medium';
        riskBadgeClass = 'bg-amber-100 text-amber-700';
        riskText = 'Medium Risk (A)';
    } else {
        riskRating = 'high';
        riskBadgeClass = 'bg-red-100 text-red-700';
        riskText = 'High Risk (B)';
    }
    
    // Save profile
    const profileData = {
        farmerName: formData.name,
        livestock: {
            species: formData.species || 'dairy',
            count: livestockCount,
            value: herdValue
        },
        dataPoints: progress.points,
        modules: selectedModules,
        riskRating: riskRating,
        valuation: herdValue,
        useCase: formData.useCase || 'banking'
    };
    
    currentProfile = profileManager.createProfile(profileData);
    
    // Update UI with results
    document.getElementById('profile-id-display').textContent = currentProfile.id;
    document.getElementById('result-farmer-name').textContent = formData.name || 'Unknown Farmer';
    document.getElementById('result-livestock-count').textContent = `${livestockCount} Head`;
    document.getElementById('result-livestock-type').textContent = (formData.species || 'Dairy Cattle').charAt(0).toUpperCase() + (formData.species || 'Dairy Cattle').slice(1);
    document.getElementById('risk-badge').className = `inline-flex items-center gap-2 px-4 py-2 ${riskBadgeClass} rounded-full text-sm font-bold`;
    document.getElementById('risk-badge').innerHTML = `<span class="w-2 h-2 rounded-full"></span>${riskText}`;
    document.getElementById('total-valuation').textContent = `KES ${(herdValue / 1000000).toFixed(1)}M`;
    document.getElementById('timestamp').textContent = new Date().toLocaleString();
    document.getElementById('data-points-count').textContent = progress.points;
    document.getElementById('modules-count').textContent = selectedModules.length;
    document.getElementById('confidence-score').textContent = `${Math.min(95 + Math.random() * 5, 100).toFixed(0)}%`;
    
    // Show Profiles button
    document.getElementById('profiles-btn').classList.remove('hidden');
    
    // Transition screens
    document.getElementById('analysis-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function startNewProfile() {
    // Reset all data
    formData = {};
    uploads = { id: false, bank: false, herd: false, health: false };
    selectedModules = ['asset', 'risk', 'financial'];
    currentProfile = null;
    
    // Clear all form fields
    Object.keys(fieldMapping).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });
    
    // Clear radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.checked = false;
    });
    
    // Reset uploads
    ['id', 'bank', 'herd', 'health'].forEach(type => {
        document.getElementById(`file-${type}`).value = '';
        document.getElementById(`${type}-placeholder`).classList.remove('hidden');
        document.getElementById(`${type}-complete`).classList.add('hidden');
    });
    
    // Reset to welcome screen
    document.getElementById('success-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function showProfilesScreen() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('workspace-screen').classList.add('hidden');
    document.getElementById('analysis-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.add('hidden');
    document.getElementById('profiles-screen').classList.remove('hidden');
    
    renderProfilesList();
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function hideProfilesScreen() {
    document.getElementById('profiles-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function renderProfilesList() {
    const profiles = profileManager.getAllProfiles();
    const totalCount = profileManager.getTotalCount();
    
    document.getElementById('total-profiles').textContent = totalCount;
    
    const listContainer = document.getElementById('profiles-list');
    const emptyContainer = document.getElementById('profiles-empty');
    
    if (totalCount === 0) {
        listContainer.innerHTML = '';
        emptyContainer.classList.remove('hidden');
        return;
    }
    
    emptyContainer.classList.add('hidden');
    
    listContainer.innerHTML = profiles.map(profile => {
        const date = new Date(profile.timestamp);
        const riskBadgeClass = {
            low: 'bg-green-100 text-green-700',
            medium: 'bg-amber-100 text-amber-700',
            high: 'bg-red-100 text-red-700'
        }[profile.riskRating] || 'bg-slate-100 text-slate-700';
        
        const speciesIcon = {
            dairy: '🥛',
            beef: '🥩',
            goats: '🐐',
            mixed: '🐄🐐'
        }[profile.livestock.species] || '🐄';
        
        return `
            <div class="profile-card glass-card rounded-2xl p-6 border border-slate-200 cursor-pointer group" onclick="loadProfile('${profile.id}')">
                <div class="flex items-center justify-between mb-4">
                    <div class="font-mono text-xs font-semibold text-slate-400 mono">${profile.id}</div>
                    <button onclick="event.stopPropagation(); deleteProfile('${profile.id}')" class="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate-100 rounded-lg">
                        <i data-lucide="trash-2" class="w-4 h-4 text-slate-400"></i>
                    </button>
                </div>
                
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                        ${speciesIcon}
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-900 mb-1">${profile.farmerName || 'Unnamed Farmer'}</h3>
                        <p class="text-sm text-slate-500">${profile.livestock.count} ${profile.livestock.species} • ${date.toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div class="text-xs text-slate-400 uppercase tracking-widest">Valuation</div>
                    <div class="font-semibold text-slate-900 mono">KES ${(profile.valuation / 1000000).toFixed(1)}M</div>
                </div>
                
                <div class="flex items-center justify-between pt-2">
                    <div class="text-xs text-slate-400 uppercase tracking-widest">Risk</div>
                    <div class="px-2 py-1 rounded-full text-xs font-bold ${riskBadgeClass} risk-badge">
                        ${profile.riskRating.toUpperCase()}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadProfile(profileId) {
    const profile = profileManager.getProfile(profileId);
    if (!profile) return;
    
    // Populate current profile data
    currentProfile = profile;
    formData = profile.fullData || {};
    
    // Navigate to success screen
    document.getElementById('profiles-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');
    
    // Update UI with profile data
    document.getElementById('profile-id-display').textContent = profile.id;
    document.getElementById('result-farmer-name').textContent = profile.farmerName;
    document.getElementById('result-livestock-count').textContent = `${profile.livestock.count} Head`;
    document.getElementById('result-livestock-type').textContent = profile.livestock.species.charAt(0).toUpperCase() + profile.livestock.species.slice(1);
    document.getElementById('timestamp').textContent = new Date(profile.timestamp).toLocaleString();
    document.getElementById('total-valuation').textContent = `KES ${(profile.valuation / 1000000).toFixed(1)}M`;
    document.getElementById('data-points-count').textContent = profile.dataPoints;
    document.getElementById('modules-count').textContent = profile.modules.length;
    document.getElementById('confidence-score').textContent = `${Math.min(95 + Math.random() * 5, 100).toFixed(0)}%`;
    
    // Update risk badge
    const riskBadgeClass = {
        low: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700'
    }[profile.riskRating] || 'bg-slate-100 text-slate-700';
    
    document.getElementById('risk-badge').className = `inline-flex items-center gap-2 px-4 py-2 ${riskBadgeClass} rounded-full text-sm font-bold`;
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function deleteProfile(profileId) {
    if (confirm('Delete this profile? This action cannot be undone.')) {
        profileManager.deleteProfile(profileId);
        renderProfilesList();
    }
}

function exportProfile() {
    if (!currentProfile) return;
    
    // Create a simple text report
    const report = `
PROJECT CERES - FARMER INTELLIGENCE REPORT
===========================================

Profile ID: ${currentProfile.id}
Generated: ${new Date(currentProfile.timestamp).toLocaleString()}

FARMER DETAILS
--------------
Name: ${currentProfile.farmerName}
Contact: ${formData.phone || 'N/A'}
Location: ${formData.county || 'N/A'}, ${formData.ward || 'N/A'}

LIVESTOCK ASSETS
----------------
Species: ${currentProfile.livestock.species}
Head Count: ${currentProfile.livestock.count}
Estimated Value: KES ${currentProfile.valuation.toLocaleString()}

ANALYSIS SUMMARY
----------------
Risk Rating: ${currentProfile.riskRating.toUpperCase()}
Data Points: ${currentProfile.dataPoints}
AI Modules: ${currentProfile.modules.join(', ').toUpperCase()}
Confidence: ${Math.min(95 + Math.random() * 5, 100).toFixed(0)}%

This is a simulated export for demonstration purposes.
    `;
    
    // Download as file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProfile.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetSystem() {
    if (confirm('Return to home screen? All current data will be lost.')) {
        // Clear current session data
        formData = {};
        uploads = { id: false, bank: false, herd: false, health: false };
        selectedModules = ['asset', 'risk', 'financial'];
        currentProfile = null;
        
        // Reset UI
        document.getElementById('workspace-screen').classList.add('hidden');
        document.getElementById('welcome-screen').classList.remove('hidden');
        
        // Re-initialize icons
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Show Profiles button if there are saved profiles
    if (profileManager.getTotalCount() > 0) {
        document.getElementById('profiles-btn').classList.remove('hidden');
    }
    
    // Add module card click handlers
    document.querySelectorAll('.module-card').forEach(card => {
        const module = card.dataset.module;
        card.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                toggleModule(card, module);
            }
        });
    });
    
    // Add change listeners to all form fields
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('input', calculateProgress);
        element.addEventListener('change', calculateProgress);
    });
});

// Expose global functions for onclick handlers
window.initializeSystem = initializeSystem;
window.handleUpload = handleUpload;
window.removeUpload = removeUpload;
window.calculateProgress = calculateProgress;
window.proceedToAnalysis = proceedToAnalysis;
window.toggleModule = toggleModule;
window.backToWorkspace = backToWorkspace;
window.generateIntelligence = generateIntelligence;
window.startNewProfile = startNewProfile;
window.showProfilesScreen = showProfilesScreen;
window.hideProfilesScreen = hideProfilesScreen;
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.exportProfile = exportProfile;
window.resetSystem = resetSystem;

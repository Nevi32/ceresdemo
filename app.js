// app.js - Enhanced with Document Processing & Thinking Animation

// Initialize Lucide icons
lucide.createIcons();

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Document Processor Class
class DocumentProcessor {
    constructor() {
        this.parsedData = {};
    }

    async processFiles(files, category) {
        const results = [];
        
        for (const file of files) {
            const fileData = {
                name: file.name,
                size: file.size,
                type: file.type,
                category: category,
                parsed: false,
                content: null,
                error: null
            };

            try {
                const content = await this.extractContent(file);
                fileData.content = content;
                fileData.parsed = true;
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                fileData.error = error.message;
            }

            results.push(fileData);
        }

        return results;
    }

    async extractContent(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'pdf':
                return await this.parsePDF(file);
            case 'csv':
                return await this.parseCSV(file);
            case 'xlsx':
            case 'xls':
                return this.parseExcel(file);
            case 'jpg':
            case 'jpeg':
            case 'png':
                return { type: 'image', message: 'Image uploaded (OCR not implemented in demo)' };
            default:
                return { type: 'unknown', message: `File uploaded: ${file.name}` };
        }
    }

    async parsePDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let textContent = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(item => item.str).join(' ') + '\n';
        }

        // Extract key financial data (simplified)
        const extractedData = this.extractFinancialData(textContent);
        
        return {
            type: 'pdf',
            pageCount: pdf.numPages,
            text: textContent.substring(0, 1000) + '...', // Truncated for storage
            extractedData: extractedData
        };
    }

    parseCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                complete: (results) => {
                    resolve({
                        type: 'csv',
                        rows: results.data.length,
                        headers: results.meta.fields || [],
                        preview: results.data.slice(0, 10),
                        summary: this.summarizeCSVData(results.data)
                    });
                },
                error: (error) => reject(error)
            });
        });
    }

    parseExcel(file) {
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    resolve({
                        type: 'excel',
                        sheetCount: workbook.SheetNames.length,
                        sheetName: workbook.SheetNames[0],
                        rows: jsonData.length - 1,
                        headers: jsonData[0] || [],
                        preview: jsonData.slice(1, 11),
                        summary: this.summarizeExcelData(jsonData)
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read Excel file'));
            reader.readAsArrayBuffer(file);
        });
    }

    extractFinancialData(text) {
        // Simple pattern matching for demo purposes
        const patterns = {
            balance: /balance|current/i,
            income: /income|revenue|earnings/i,
            expense: /expense|cost|spending/i,
            date: /\d{1,2}[/\-]\d{1,2}[/\-]\d{4}/g
        };

        const extracted = {
            dates: text.match(patterns.date) || [],
            mentions: []
        };

        Object.entries(patterns).forEach(([key, pattern]) => {
            if (key !== 'date' && pattern.test(text)) {
                extracted.mentions.push(key);
            }
        });

        return extracted;
    }

    summarizeCSVData(data) {
        const numericColumns = {};
        
        data.forEach(row => {
            Object.entries(row).forEach(([key, value]) => {
                if (!isNaN(value) && value !== '') {
                    numericColumns[key] = (numericColumns[key] || 0) + parseFloat(value);
                }
            });
        });

        return {
            totalRows: data.length,
            numericColumns: Object.keys(numericColumns),
            columnCount: Object.keys(data[0] || {}).length
        };
    }

    summarizeExcelData(data) {
        return {
            totalRows: data.length - 1,
            columnCount: data[0] ? data[0].length : 0
        };
    }
}

// Profile Manager Class (Enhanced)
class ProfileManager {
    constructor() {
        this.storageKey = 'ceres_profiles_v2';
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
            documents: data.documents, // Store parsed document data
            extractedInsights: data.extractedInsights,
            fullData: data
        };

        this.profiles.unshift(profile);
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

// Initialize managers
const profileManager = new ProfileManager();
const documentProcessor = new DocumentProcessor();

// Global state
let uploads = {
    id: [],
    bank: [],
    herd: [],
    health: []
};

let formData = {};
let selectedModules = ['asset', 'risk', 'financial'];
let currentProfile = null;

// Form field mapping
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
    
    if (profileManager.getTotalCount() > 0) {
        document.getElementById('profiles-btn').classList.remove('hidden');
    }
    
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
    if (!input.files || input.files.length === 0) return;
    
    const files = Array.from(input.files);
    
    // Add files to global state
    uploads[type].push(...files);
    
    // Hide placeholder and show file list
    document.getElementById(`${type}-placeholder`).classList.add('hidden');
    const filesList = document.getElementById(`${type}-files-list`);
    filesList.classList.remove('hidden');
    
    // Render file list
    renderFileList(type);
    
    // Update progress
    calculateProgress();
}

function renderFileList(type) {
    const filesList = document.getElementById(`${type}-files-list`);
    const files = uploads[type];
    
    filesList.innerHTML = files.map((file, index) => {
        const extension = file.name.split('.').pop().toLowerCase();
        const icon = getFileIcon(extension);
        
        return `
            <div class="file-list-item ${extension} rounded-lg p-3 flex items-center justify-between group">
                <div class="flex items-center gap-3">
                    <div class="file-icon">
                        ${icon}
                    </div>
                    <div>
                        <p class="text-sm font-medium text-slate-900">${file.name}</p>
                        <p class="text-xs text-slate-500">${formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button onclick="removeFile('${type}', ${index})" class="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate-100 rounded-lg">
                    <i data-lucide="x" class="w-4 h-4 text-slate-400"></i>
                </button>
            </div>
        `;
    }).join('');
    
    // Re-initialize icons
    setTimeout(() => lucide.createIcons(), 10);
}

function getFileIcon(extension) {
    const icons = {
        pdf: 'PDF',
        csv: 'CSV',
        xlsx: 'XLS',
        jpg: 'IMG',
        jpeg: 'IMG',
        png: 'IMG'
    };
    return icons[extension] || 'FILE';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile(type, index) {
    uploads[type].splice(index, 1);
    
    const filesList = document.getElementById(`${type}-files-list`);
    const placeholder = document.getElementById(`${type}-placeholder`);
    
    if (uploads[type].length === 0) {
        filesList.classList.add('hidden');
        placeholder.classList.remove('hidden');
    } else {
        renderFileList(type);
    }
    
    calculateProgress();
}

function collectFormData() {
    Object.keys(fieldMapping).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            formData[fieldMapping[fieldId]] = element.value;
        }
    });
    
    const species = document.querySelector('input[name="species"]:checked');
    if (species) formData.species = species.value;
    
    const risk = document.querySelector('input[name="risk"]:checked');
    if (risk) formData.riskTolerance = risk.value;
    
    formData.variables = [];
    document.querySelectorAll('.variable-checkbox:checked').forEach(cb => {
        formData.variables.push(cb.nextElementSibling.textContent);
    });
}

function calculateProgress() {
    collectFormData();
    
    let points = 0;
    let totalPoints = 15;
    
    if (formData.name) points += 3;
    if (formData.species) points += 2;
    
    // Count files for upload points
    if (uploads.id.length > 0) points += 2;
    if (uploads.bank.length > 0) points += 3;
    if (uploads.herd.length > 0) points += 3;
    if (uploads.health.length > 0) points += 2;
    
    const additionalFields = ['phone', 'email', 'county', 'ward', 'land', 'experience', 'bank', 'accountType', 'livestockCount', 'breedingStock', 'breed', 'herdValue'];
    additionalFields.forEach(field => {
        if (formData[field]) points++;
    });
    
    const percentage = Math.round((points / totalPoints) * 100);
    
    document.getElementById('completion-percentage').textContent = points + '/' + totalPoints;
    document.getElementById('workspace-progress').style.width = percentage + '%';
    document.getElementById('data-points').textContent = points + '/' + totalPoints;
    document.getElementById('bottom-progress').style.width = percentage + '%';
    
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

async function generateIntelligence() {
    collectFormData();
    
    // Show thinking animation
    document.getElementById('analysis-screen').classList.add('hidden');
    document.getElementById('thinking-screen').classList.remove('hidden');
    
    // Prepare document processing
    const allFiles = [...uploads.id, ...uploads.bank, ...uploads.herd, ...uploads.health];
    
    // Update thinking UI
    document.getElementById('thinking-text').textContent = 'Processing documents...';
    document.getElementById('thinking-details').textContent = `${allFiles.length} files to analyze`;
    
    // Animate progress bar
    setTimeout(() => {
        document.getElementById('thinking-bar').style.width = '30%';
    }, 100);
    
    // Process documents
    const documentResults = {};
    const processingContainer = document.getElementById('processing-files');
    
    // Create processing tags
    allFiles.forEach((file, index) => {
        const tag = document.createElement('div');
        tag.className = 'processing-file-tag';
        tag.id = `processing-${index}`;
        tag.innerHTML = `<i data-lucide="file" class="w-3 h-3"></i> ${file.name}`;
        processingContainer.appendChild(tag);
    });
    
    lucide.createIcons();
    
    // Process each category
    const categories = ['id', 'bank', 'herd', 'health'];
    let processedFiles = 0;
    
    for (const category of categories) {
        if (uploads[category].length > 0) {
            document.getElementById('thinking-text').textContent = `Analyzing ${category} documents...`;
            
            const results = await documentProcessor.processFiles(uploads[category], category);
            documentResults[category] = results;
            
            // Mark files as completed
            uploads[category].forEach(() => {
                const tag = document.getElementById(`processing-${processedFiles}`);
                if (tag) {
                    tag.classList.add('completed');
                    tag.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> ${tag.textContent}`;
                }
                processedFiles++;
            });
        }
    }
    
    // Complete progress
    document.getElementById('thinking-bar').style.width = '100%';
    document.getElementById('thinking-text').textContent = 'Generating insights...';
    
    setTimeout(() => {
        // Generate final profile
        const progress = calculateProgress();
        const livestockCount = parseInt(formData.livestockCount) || 45;
        const herdValue = parseFloat(formData.herdValue) || 4200000;
        
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
        
        // Extract insights from documents
        const extractedInsights = this.extractDocumentInsights(documentResults);
        
        // Create profile
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
            useCase: formData.useCase || 'banking',
            documents: documentResults,
            extractedInsights: extractedInsights
        };
        
        currentProfile = profileManager.createProfile(profileData);
        
        // Update success screen
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
        
        // Show profiles button
        document.getElementById('profiles-btn').classList.remove('hidden');
        
        // Hide thinking and show success
        document.getElementById('thinking-screen').classList.add('hidden');
        document.getElementById('success-screen').classList.remove('hidden');
        
        // Clean up processing tags
        processingContainer.innerHTML = '';
        
        // Re-initialize icons
        setTimeout(() => lucide.createIcons(), 100);
    }, 1500);
}

function extractDocumentInsights(documentResults) {
    const insights = {
        totalFiles: 0,
        categories: {},
        financialMentions: [],
        dataPointsExtracted: 0
    };

    Object.entries(documentResults).forEach(([category, files]) => {
        insights.categories[category] = {
            fileCount: files.length,
            parsedSuccessfully: files.filter(f => f.parsed).length
        };
        insights.totalFiles += files.length;

        files.forEach(file => {
            if (file.parsed && file.content) {
                if (file.content.extractedData) {
                    insights.dataPointsExtracted += Object.keys(file.content.extractedData).length;
                }
                if (file.content.mentions) {
                    insights.financialMentions.push(...file.content.mentions);
                }
            }
        });
    });

    return insights;
}

function startNewProfile() {
    formData = {};
    uploads = { id: [], bank: [], herd: [], health: [] };
    selectedModules = ['asset', 'risk', 'financial'];
    currentProfile = null;
    
    Object.keys(fieldMapping).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) element.value = '';
    });
    
    document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
    
    ['id', 'bank', 'herd', 'health'].forEach(type => {
        document.getElementById(`file-${type}`).value = '';
        document.getElementById(`${type}-placeholder`).classList.remove('hidden');
        document.getElementById(`${type}-files-list`).classList.add('hidden');
        document.getElementById(`${type}-files-list`).innerHTML = '';
    });
    
    document.getElementById('success-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
    
    setTimeout(() => lucide.createIcons(), 100);
}

function showProfilesScreen() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('workspace-screen').classList.add('hidden');
    document.getElementById('analysis-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.add('hidden');
    document.getElementById('thinking-screen').classList.add('hidden');
    document.getElementById('profiles-screen').classList.remove('hidden');
    
    renderProfilesList();
    setTimeout(() => lucide.createIcons(), 100);
}

function hideProfilesScreen() {
    document.getElementById('profiles-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
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
        
        const totalFiles = profile.documents ? Object.values(profile.documents).reduce((sum, arr) => sum + arr.length, 0) : 0;
        
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
                        <p class="text-xs text-slate-400 mt-1">${totalFiles} documents processed</p>
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
    
    setTimeout(() => lucide.createIcons(), 10);
}

function loadProfile(profileId) {
    const profile = profileManager.getProfile(profileId);
    if (!profile) return;
    
    currentProfile = profile;
    formData = profile.fullData || {};
    
    document.getElementById('profiles-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');
    
    document.getElementById('profile-id-display').textContent = profile.id;
    document.getElementById('result-farmer-name').textContent = profile.farmerName;
    document.getElementById('result-livestock-count').textContent = `${profile.livestock.count} Head`;
    document.getElementById('result-livestock-type').textContent = profile.livestock.species.charAt(0).toUpperCase() + profile.livestock.species.slice(1);
    document.getElementById('timestamp').textContent = new Date(profile.timestamp).toLocaleString();
    document.getElementById('total-valuation').textContent = `KES ${(profile.valuation / 1000000).toFixed(1)}M`;
    document.getElementById('data-points-count').textContent = profile.dataPoints;
    document.getElementById('modules-count').textContent = profile.modules.length;
    document.getElementById('confidence-score').textContent = `${Math.min(95 + Math.random() * 5, 100).toFixed(0)}%`;
    
    const riskBadgeClass = {
        low: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700'
    }[profile.riskRating] || 'bg-slate-100 text-slate-700';
    
    document.getElementById('risk-badge').className = `inline-flex items-center gap-2 px-4 py-2 ${riskBadgeClass} rounded-full text-sm font-bold`;
    
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
Bank: ${formData.bank || 'N/A'}
Account Type: ${formData.accountType || 'N/A'}

LIVESTOCK ASSETS
----------------
Species: ${currentProfile.livestock.species}
Head Count: ${currentProfile.livestock.count}
Primary Breed: ${formData.breed || 'N/A'}
Estimated Value: KES ${currentProfile.valuation.toLocaleString()}

ANALYSIS SUMMARY
----------------
Risk Rating: ${currentProfile.riskRating.toUpperCase()}
Data Points: ${currentProfile.dataPoints}
AI Modules: ${currentProfile.modules.join(', ').toUpperCase()}
Confidence: ${Math.min(95 + Math.random() * 5, 100).toFixed(0)}%
Use Case: ${currentProfile.useCase || 'N/A'}

DOCUMENTS PROCESSED
-------------------
${Object.entries(currentProfile.documents || {}).map(([category, files]) => {
    return `${category.toUpperCase()}: ${files.filter(f => f.parsed).length}/${files.length} files parsed successfully`;
}).join('\n')}

EXTRACTED INSIGHTS
------------------
Total Files: ${currentProfile.extractedInsights?.totalFiles || 0}
Data Points Extracted: ${currentProfile.extractedInsights?.dataPointsExtracted || 0}
Financial Mentions: ${(currentProfile.extractedInsights?.financialMentions || []).join(', ')}

This is a simulated export for demonstration purposes.
    `;
    
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
        formData = {};
        uploads = { id: [], bank: [], herd: [], health: [] };
        selectedModules = ['asset', 'risk', 'financial'];
        currentProfile = null;
        
        document.getElementById('workspace-screen').classList.add('hidden');
        document.getElementById('welcome-screen').classList.remove('hidden');
        
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (profileManager.getTotalCount() > 0) {
        document.getElementById('profiles-btn').classList.remove('hidden');
    }
    
    document.querySelectorAll('.module-card').forEach(card => {
        const module = card.dataset.module;
        card.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                toggleModule(card, module);
            }
        });
    });
    
    document.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('input', calculateProgress);
        element.addEventListener('change', calculateProgress);
    });
});

// Expose global functions
window.initializeSystem = initializeSystem;
window.handleUpload = handleUpload;
window.removeFile = removeFile;
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

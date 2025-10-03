// Application state
let currentSection = 1;
const totalSections = 4;
let currentAppSection = 'survey';

// Survey data templates
const surveyData = {
    problemCategories: [
        "Money/expenses",
        "Food/nutrition",
        "Clothing",
        "Transport",
        "Academics/study support",
        "Mental health/wellbeing",
        "Social life/connections",
        "Opportunities (jobs/internships/events)",
        "Housing/accommodation",
        "Safety/security"
    ]
};

// Enhanced Data Storage and Sync System
const DataManager = {
    STORAGE_KEYS: {
        SURVEYS: 'survey_responses',
        PENDING_SYNC: 'pending_sync_queue',
        TEAM_MEMBERS: 'team_members',
        SYNC_TIMESTAMP: 'last_sync_timestamp',
        DEVICE_INFO: 'device_info'
    },

    // Save survey response with sync tracking
    saveSurvey(response) {
        let surveys = this.getAllSurveys();
        const surveyId = this.generateId();
        const timestamp = new Date().toISOString();
        
        const completeSurvey = {
            ...response,
            id: surveyId,
            timestamp: timestamp,
            deviceId: this.getDeviceId(),
            syncStatus: navigator.onLine ? 'synced' : 'pending',
            date: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
        
        surveys.push(completeSurvey);
        localStorage.setItem(this.STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
        
        // Add to sync queue if offline
        if (!navigator.onLine) {
            this.addToSyncQueue(completeSurvey);
        }
        
        return completeSurvey;
    },

    // Get all surveys
    getAllSurveys() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SURVEYS) || '[]');
    },

    // Sync Management
    addToSyncQueue(survey) {
        let queue = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PENDING_SYNC) || '[]');
        queue.push(survey);
        localStorage.setItem(this.STORAGE_KEYS.PENDING_SYNC, JSON.stringify(queue));
    },

    getPendingSyncCount() {
        const queue = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PENDING_SYNC) || '[]');
        return queue.length;
    },

    clearSyncQueue() {
        localStorage.removeItem(this.STORAGE_KEYS.PENDING_SYNC);
    },

    // Team Sync Simulation
    async syncWithTeam() {
        if (!navigator.onLine) {
            throw new Error('No internet connection');
        }

        const pendingSurveys = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PENDING_SYNC) || '[]');
        const allSurveys = this.getAllSurveys();
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real app, this would send data to a server
        // For now, we'll simulate successful sync
        const syncResults = {
            success: true,
            surveysSynced: pendingSurveys.length,
            timestamp: new Date().toISOString(),
            teamMembers: this.getTeamMembers()
        };

        // Mark surveys as synced
        allSurveys.forEach(survey => {
            if (survey.syncStatus === 'pending') {
                survey.syncStatus = 'synced';
            }
        });
        
        localStorage.setItem(this.STORAGE_KEYS.SURVEYS, JSON.stringify(allSurveys));
        this.clearSyncQueue();
        this.setLastSyncTimestamp();
        
        return syncResults;
    },

    // Team Management
    getTeamMembers() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TEAM_MEMBERS) || '[]');
    },

    addTeamMember(member) {
        let team = this.getTeamMembers();
        const existingMember = team.find(m => m.deviceId === member.deviceId);
        
        if (!existingMember) {
            team.push({
                ...member,
                joined: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            });
            localStorage.setItem(this.STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(team));
        }
        
        return team;
    },

    updateTeamMemberPresence(deviceId, isOnline) {
        let team = this.getTeamMembers();
        const member = team.find(m => m.deviceId === deviceId);
        
        if (member) {
            member.isOnline = isOnline;
            member.lastSeen = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(team));
        }
    },

    // Device Management
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = this.generateId();
            localStorage.setItem('deviceId', deviceId);
            
            // Register this device as a team member
            this.addTeamMember({
                deviceId: deviceId,
                name: 'Device ' + deviceId.substring(0, 8),
                role: 'field_researcher'
            });
        }
        return deviceId;
    },

    setLastSyncTimestamp() {
        localStorage.setItem(this.STORAGE_KEYS.SYNC_TIMESTAMP, new Date().toISOString());
    },

    getLastSyncTimestamp() {
        return localStorage.getItem(this.STORAGE_KEYS.SYNC_TIMESTAMP);
    },

    // Export functions
    exportJSON() {
        const data = this.getAllSurveys();
        if (data.length === 0) {
            TeamApp.showNotification('No data to export', 'warning');
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `survey-data-${new Date().toISOString().split('T')[0]}.json`);
        TeamApp.showNotification('JSON data exported successfully', 'success');
    },

    exportCSV() {
        const surveys = this.getAllSurveys();
        if (surveys.length === 0) {
            TeamApp.showNotification('No data to export', 'warning');
            return;
        }

        const headers = [
            'ID', 'Date', 'Timestamp', 'Device ID', 'Sync Status',
            'Open Ended Problem', 'Top Problem 1', 'Top Problem 2', 'Top Problem 3',
            'Current Solution', 'Satisfaction Rating', 'Frustration Details',
            'Custom Solution', 'Solution Features', 'Likelihood Rating',
            'Willingness to Pay', 'Boss Battle', 'Interested in Trying',
            'Email', 'Phone'
        ];
        
        const csvRows = [headers.join(',')];

        surveys.forEach(survey => {
            const topProblems = survey.topProblems ? survey.topProblems.slice(0, 3) : [];
            const contactInfo = survey.contactInfo || {};
            
            const row = [
                survey.id,
                `"${survey.date || ''}"`,
                `"${survey.timestamp || ''}"`,
                `"${survey.deviceId || ''}"`,
                `"${survey.syncStatus || 'unknown'}"`,
                `"${(survey.openEndedProblem || '').replace(/"/g, '""')}"`,
                `"${topProblems[0] ? topProblems[0].category : ''}"`,
                `"${topProblems[1] ? topProblems[1].category : ''}"`,
                `"${topProblems[2] ? topProblems[2].category : ''}"`,
                `"${(survey.currentSolution || '').replace(/"/g, '""')}"`,
                `"${survey.satisfactionRating || ''}"`,
                `"${(survey.frustrationDetails || '').replace(/"/g, '""')}"`,
                `"${(survey.customSolution || '').replace(/"/g, '""')}"`,
                `"${(survey.solutionFeatures || '').replace(/"/g, '""')}"`,
                `"${survey.likelihoodRating || ''}"`,
                `"${survey.willingnessToPay || ''}"`,
                `"${(survey.bossBattle || '').replace(/"/g, '""')}"`,
                `"${survey.interestedInTrying || ''}"`,
                `"${contactInfo.email || ''}"`,
                `"${contactInfo.phone || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        this.downloadFile(blob, `survey-data-${new Date().toISOString().split('T')[0]}.csv`);
        TeamApp.showNotification('CSV data exported successfully', 'success');
    },

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    clearData() {
        if (confirm('Are you sure you want to clear all survey data? This cannot be undone.')) {
            localStorage.removeItem(this.STORAGE_KEYS.SURVEYS);
            localStorage.removeItem(this.STORAGE_KEYS.PENDING_SYNC);
            TeamApp.showNotification('All data cleared successfully', 'success');
            this.updateFileSection();
            loadDashboard();
        }
    },

    updateFileSection() {
        const surveys = this.getAllSurveys();
        document.getElementById('total-surveys-count').textContent = surveys.length;
        
        // Calculate storage usage
        const dataSize = JSON.stringify(surveys).length;
        document.getElementById('storage-used').textContent = this.formatBytes(dataSize);

        // Update sync status
        const pendingSync = this.getPendingSyncCount();
        const syncStatusElement = document.getElementById('sync-status');
        if (pendingSync > 0) {
            syncStatusElement.textContent = `📱 ${pendingSync} pending sync`;
            syncStatusElement.style.backgroundColor = '#ffcc00';
            syncStatusElement.style.color = '#000';
        } else {
            const lastSync = this.getLastSyncTimestamp();
            const syncTime = lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never';
            syncStatusElement.textContent = `✅ Synced ${syncTime}`;
            syncStatusElement.style.backgroundColor = '#4bb543';
            syncStatusElement.style.color = 'white';
        }

        this.updateRecentSurveysList(surveys);
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    updateRecentSurveysList(surveys) {
        const container = document.getElementById('recent-surveys-list');
        const recentSurveys = surveys.slice(-5).reverse();

        if (recentSurveys.length === 0) {
            container.innerHTML = '<p>No surveys completed yet.</p>';
            return;
        }

        container.innerHTML = recentSurveys.map(survey => `
            <div class="ranking-item" style="margin-bottom: 10px;">
                <div>
                    <strong>${survey.date || new Date(survey.timestamp).toLocaleDateString()}</strong>
                    <span style="float: right; font-size: 0.8em; background: ${survey.syncStatus === 'synced' ? '#4bb543' : '#ffcc00'}; color: ${survey.syncStatus === 'synced' ? 'white' : 'black'}; padding: 2px 6px; border-radius: 10px;">
                        ${survey.syncStatus === 'synced' ? '✓' : '⏳'}
                    </span>
                    <br>
                    <small>Top Problems: ${survey.topProblems ? survey.topProblems.slice(0, 3).map(p => p.category).join(', ') : 'N/A'}</small><br>
                    <small>Solution: ${survey.customSolution ? (survey.customSolution.substring(0, 50) + '...') : 'N/A'}</small>
                </div>
            </div>
        `).join('');
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// AI-Powered Insights Generator
const InsightGenerator = {
    generateInsights(surveyData) {
        if (!surveyData || surveyData.totalResponses === 0) {
            return this.getEmptyInsights();
        }

        const insights = {
            problemAnalysis: this.analyzeProblems(surveyData),
            solutionPotential: this.analyzeSolutions(surveyData),
            marketOpportunity: this.analyzeMarket(surveyData),
            teamPerformance: this.analyzeTeamPerformance(surveyData)
        };

        return insights;
    },

    analyzeProblems(data) {
        const topProblem = data.topProblem;
        const topProblemCount = data.topProblems[topProblem] || 0;
        const percentage = Math.round((topProblemCount / data.totalResponses) * 100);
        
        let severityInsight = '';
        if (data.avgProblemSeverity >= 4.0) {
            severityInsight = `The high average severity score of ${data.avgProblemSeverity}/5 indicates these are critical pain points requiring immediate attention.`;
        } else if (data.avgProblemSeverity >= 3.0) {
            severityInsight = `With a moderate severity score of ${data.avgProblemSeverity}/5, these issues represent significant daily challenges for students.`;
        } else {
            severityInsight = `The lower severity scores suggest these are persistent annoyances rather than critical blockers.`;
        }

        const satisfaction = this.calculateAverageSatisfaction(data.satisfaction);
        let satisfactionInsight = '';
        if (satisfaction <= 2.0) {
            satisfactionInsight = "Current solutions are largely inadequate, creating a strong opening for better alternatives.";
        } else if (satisfaction <= 3.0) {
            satisfactionInsight = "Students are moderately satisfied but open to significantly better solutions.";
        } else {
            satisfactionInsight = "While somewhat satisfied, students still see room for improvement in current solutions.";
        }

        return {
            title: "🔍 Problem Analysis Insights",
            summary: `${topProblem} emerges as the dominant challenge, affecting ${percentage}% of respondents. ${severityInsight} ${satisfactionInsight}`,
            recommendation: "Focus initial solution development on addressing the top 3 problem areas identified through collaborative brainstorming sessions."
        };
    },

    analyzeSolutions(data) {
        const adoptionLikelihood = this.calculateAverageLikelihood(data.adoptionLikelihood);
        const earlyAdopterRate = (data.earlyAdopter.yes / (data.earlyAdopter.yes + data.earlyAdopter.no)) * 100;
        
        let adoptionInsight = '';
        if (adoptionLikelihood >= 4.0) {
            adoptionInsight = `Extremely strong adoption potential with ${adoptionLikelihood.toFixed(1)}/5 average likelihood rating.`;
        } else if (adoptionLikelihood >= 3.0) {
            adoptionInsight = `Solid adoption potential with room for improvement in solution features.`;
        } else {
            adoptionInsight = `Lower adoption scores suggest need for better solution-market fit.`;
        }

        let earlyAdopterInsight = '';
        if (earlyAdopterRate >= 70) {
            earlyAdopterInsight = `Exceptional early adopter potential with ${Math.round(earlyAdopterRate)}% willing to try new solutions independently.`;
        } else if (earlyAdopterRate >= 50) {
            earlyAdopterInsight = `Strong early adopter base of ${Math.round(earlyAdopterRate)}% provides good foundation for initial rollout.`;
        } else {
            earlyAdopterInsight = `Consider strategies to increase early adoption beyond the current ${Math.round(earlyAdopterRate)}% base.`;
        }

        const pricing = this.analyzePricingData(data.willingnessToPay);
        
        return {
            title: "🚀 Solution Potential Assessment",
            summary: `${adoptionInsight} ${earlyAdopterInsight} The pricing analysis suggests ${pricing.recommendation}`,
            recommendation: "Develop MVP focusing on core value proposition and test with the identified early adopter segment."
        };
    },

    analyzeMarket(data) {
        const totalMarketSize = data.totalResponses;
        const conversionRate = (data.earlyAdopter.yes / data.totalResponses) * 100;
        
        let marketSizeInsight = '';
        if (totalMarketSize >= 100) {
            marketSizeInsight = "Substantial data collection provides high-confidence market insights.";
        } else if (totalMarketSize >= 50) {
            marketSizeInsight = "Growing dataset shows clear patterns and reliable trends.";
        } else {
            marketSizeInsight = "Continue data collection to strengthen market insights.";
        }

        let conversionInsight = '';
        if (conversionRate >= 20) {
            conversionInsight = `Excellent conversion potential with ${Math.round(conversionRate)}% of respondents expressing strong interest.`;
        } else if (conversionRate >= 10) {
            conversionInsight = `Moderate conversion rate of ${Math.round(conversionRate)}% indicates need for strong value proposition.`;
        } else {
            conversionInsight = `Focus on improving value proposition to increase the ${Math.round(conversionRate)}% conversion rate.`;
        }

        return {
            title: "💰 Market Opportunity Analysis",
            summary: `${marketSizeInsight} ${conversionInsight} The data reveals clear problem-solution fit with measurable market demand.`,
            recommendation: "Prioritize solutions addressing the highest severity problems with strongest adoption likelihood scores."
        };
    },

    analyzeTeamPerformance(data) {
        const pendingSync = DataManager.getPendingSyncCount();
        const lastSync = DataManager.getLastSyncTimestamp();
        const teamMembers = DataManager.getTeamMembers();
        
        let syncInsight = '';
        if (pendingSync === 0) {
            syncInsight = "All data successfully synchronized across team devices.";
        } else {
            syncInsight = `${pendingSync} surveys pending synchronization - ensure stable internet connection.`;
        }

        let teamInsight = '';
        if (teamMembers.length > 1) {
            teamInsight = `Team of ${teamMembers.length} researchers actively collecting data with good coordination.`;
        } else {
            teamInsight = "Consider expanding research team for broader data collection coverage.";
        }

        return {
            title: "👥 Team Performance Overview",
            summary: `${teamInsight} ${syncInsight} Data collection pace suggests ${this.getCollectionPace(data.totalResponses)}.`,
            recommendation: "Maintain current collection momentum while ensuring regular data synchronization."
        };
    },

    // Helper methods
    calculateAverageSatisfaction(satisfactionData) {
        const total = Object.values(satisfactionData).reduce((sum, count) => sum + count, 0);
        if (total === 0) return 0;
        
        const weightedSum = Object.entries(satisfactionData).reduce((sum, [rating, count]) => {
            return sum + (parseInt(rating) * count);
        }, 0);
        
        return weightedSum / total;
    },

    calculateAverageLikelihood(likelihoodData) {
        const total = Object.values(likelihoodData).reduce((sum, count) => sum + count, 0);
        if (total === 0) return 0;
        
        const weightedSum = Object.entries(likelihoodData).reduce((sum, [rating, count]) => {
            return sum + (parseInt(rating) * count);
        }, 0);
        
        return weightedSum / total;
    },

    analyzePricingData(pricingData) {
        const entries = Object.entries(pricingData);
        if (entries.length === 0) return { recommendation: "insufficient pricing data collected" };
        
        const maxEntry = entries.reduce((max, entry) => entry[1] > max[1] ? entry : max);
        const total = Object.values(pricingData).reduce((sum, count) => sum + count, 0);
        const percentage = Math.round((maxEntry[1] / total) * 100);
        
        return {
            topPrice: maxEntry[0],
            percentage: percentage,
            recommendation: `pricing around ${maxEntry[0]} aligns with ${percentage}% of respondents' expectations`
        };
    },

    getCollectionPace(totalSurveys) {
        if (totalSurveys === 0) return "beginning data collection phase";
        if (totalSurveys < 10) return "early stage data collection";
        if (totalSurveys < 50) return "steady data collection progress";
        return "robust data collection at scale";
    },

    getEmptyInsights() {
        return {
            problemAnalysis: {
                title: "🔍 Problem Analysis Insights",
                summary: "Collect more survey data to generate AI-powered insights about student challenges and pain points.",
                recommendation: "Begin data collection to uncover patterns and opportunities."
            },
            solutionPotential: {
                title: "🚀 Solution Potential Assessment",
                summary: "No solution data available yet. Start collaborative brainstorming sessions to assess solution potential.",
                recommendation: "Engage with students to co-create and validate solution ideas."
            },
            marketOpportunity: {
                title: "💰 Market Opportunity Analysis",
                summary: "Market insights will appear here as survey data is collected and analyzed.",
                recommendation: "Continue field research to quantify market size and opportunity."
            },
            teamPerformance: {
                title: "👥 Team Performance Overview",
                summary: "Team sync status and performance metrics will display here once data is collected.",
                recommendation: "Ensure all team members are properly synced and collecting data."
            }
        };
    }
};

// Enhanced Team App with Sync Features
const TeamApp = {
    currentSurvey: null,
    teamMembers: [],
    syncInterval: null,
    
    init() {
        this.loadTeamData();
        this.setupTeamFeatures();
        this.setupNotifications();
        this.startSyncMonitoring();
        this.setupPresenceDetection();
    },
    
    loadTeamData() {
        this.teamMembers = DataManager.getTeamMembers();
        
        if (this.teamMembers.length === 0) {
            // Initialize with current device as team member
            const deviceId = DataManager.getDeviceId();
            this.teamMembers = [{
                id: DataManager.generateId(),
                deviceId: deviceId,
                name: 'Primary Researcher',
                role: 'lead',
                isOnline: navigator.onLine,
                joined: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            }];
            DataManager.addTeamMember(this.teamMembers[0]);
        }
    },
    
    setupTeamFeatures() {
        this.createTeamPanel();
        this.setupSyncButton();
    },
    
    createTeamPanel() {
        const header = document.querySelector('header');
        const teamBtn = document.createElement('button');
        teamBtn.innerHTML = `👥 Team (${this.teamMembers.length})`;
        teamBtn.className = 'nav-btn';
        teamBtn.style.marginLeft = '10px';
        teamBtn.addEventListener('click', () => this.showTeamPanel());
        
        header.appendChild(teamBtn);
    },
    
    setupSyncButton() {
        const dashboardControls = document.querySelector('.dashboard-controls');
        if (dashboardControls) {
            const syncBtn = document.createElement('button');
            syncBtn.innerHTML = '🔄 Sync Team Data';
            syncBtn.className = 'export-btn';
            syncBtn.style.backgroundColor = '#4361ee';
            syncBtn.addEventListener('click', () => this.manualSync());
            dashboardControls.appendChild(syncBtn);
        }
    },
    
    showTeamPanel() {
        const panel = document.createElement('div');
        panel.className = 'team-panel';
        panel.innerHTML = `
            <div class="panel-content">
                <h3>Team Management & Sync</h3>
                <div class="team-list">
                    ${this.teamMembers.map(member => `
                        <div class="team-member">
                            <div>
                                <strong>${member.name}</strong>
                                <span class="role">${member.role}</span>
                            </div>
                            <div style="font-size: 0.8em; color: ${member.isOnline ? '#4bb543' : '#666'}">
                                ${member.isOnline ? '🟢 Online' : '⚫ Last seen: ' + new Date(member.lastSeen).toLocaleTimeString()}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <strong>Sync Status:</strong><br>
                    • ${DataManager.getPendingSyncCount()} surveys pending sync<br>
                    • Last sync: ${DataManager.getLastSyncTimestamp() ? new Date(DataManager.getLastSyncTimestamp()).toLocaleString() : 'Never'}
                </div>
                <button onclick="TeamApp.manualSync()" style="margin: 5px;">🔄 Sync Now</button>
                <button onclick="TeamApp.exportTeamData()" style="margin: 5px;">📊 Export All Data</button>
                <button onclick="this.parentElement.parentElement.remove()" style="margin: 5px;">Close</button>
            </div>
        `;
        
        document.body.appendChild(panel);
    },
    
    async manualSync() {
        const pendingCount = DataManager.getPendingSyncCount();
        if (pendingCount === 0 && navigator.onLine) {
            this.showNotification('All data is already synced!', 'success');
            return;
        }
        
        if (!navigator.onLine) {
            this.showNotification('Cannot sync - no internet connection', 'error');
            return;
        }
        
        this.showNotification('Syncing data with team...', 'info');
        
        try {
            const results = await DataManager.syncWithTeam();
            this.showNotification(`Successfully synced ${results.surveysSynced} surveys`, 'success');
            DataManager.updateFileSection();
            loadDashboard();
        } catch (error) {
            this.showNotification(`Sync failed: ${error.message}`, 'error');
        }
    },
    
    startSyncMonitoring() {
        // Check for pending sync every 30 seconds when online
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && DataManager.getPendingSyncCount() > 0) {
                this.autoSync();
            }
        }, 30000);
    },
    
    async autoSync() {
        try {
            await DataManager.syncWithTeam();
            console.log('Auto-sync completed successfully');
        } catch (error) {
            console.log('Auto-sync failed:', error.message);
        }
    },
    
    setupPresenceDetection() {
        // Update online status for current device
        DataManager.updateTeamMemberPresence(DataManager.getDeviceId(), navigator.onLine);
        
        // Refresh team status every minute
        setInterval(() => {
            this.teamMembers.forEach(member => {
                if (member.deviceId === DataManager.getDeviceId()) {
                    DataManager.updateTeamMemberPresence(member.deviceId, navigator.onLine);
                }
            });
        }, 60000);
    },
    
    exportTeamData() {
        const allData = {
            team: this.teamMembers,
            responses: DataManager.getAllSurveys(),
            syncInfo: {
                pendingSync: DataManager.getPendingSyncCount(),
                lastSync: DataManager.getLastSyncTimestamp(),
                deviceId: DataManager.getDeviceId()
            },
            timestamp: new Date().toISOString(),
            exportDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
        
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        DataManager.downloadFile(blob, `team-survey-data-${new Date().toISOString().split('T')[0]}.json`);
        
        this.showNotification('Team data exported successfully', 'success');
    },
    
    setupNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4bb543' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffcc00' : '#4361ee'};
            color: ${type === 'warning' ? '#000' : 'white'};
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Enhanced Survey Logic
const SurveyManager = {
    currentRatings: {},

    // Initialize problem ratings
    initProblemRatings() {
        const container = document.getElementById('problem-ratings');
        container.innerHTML = ''; // Clear any existing content
        
        surveyData.problemCategories.forEach(category => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            
            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.textContent = category;
            questionDiv.appendChild(questionText);
            
            const ratingScale = document.createElement('div');
            ratingScale.className = 'rating-scale';
            ratingScale.dataset.category = category;
            
            for (let i = 1; i <= 5; i++) {
                const ratingOption = document.createElement('div');
                ratingOption.className = 'rating-option';
                ratingOption.dataset.value = i;
                ratingOption.textContent = i;
                ratingOption.addEventListener('click', () => this.handleRatingSelect(category, i, ratingScale));
                ratingScale.appendChild(ratingOption);
            }
            
            questionDiv.appendChild(ratingScale);
            container.appendChild(questionDiv);
        });
    },

    // Handle rating selection
    handleRatingSelect(category, value, scale) {
        // Update visual selection
        Array.from(scale.children).forEach(option => {
            option.classList.remove('selected');
        });
        scale.querySelector(`[data-value="${value}"]`).classList.add('selected');
        
        // Store rating
        this.currentRatings[category] = parseInt(value);
        
        // Auto-update top problems
        this.updateTopProblemsDisplay();
    },

    // Automatically determine top 3 problems
    updateTopProblemsDisplay() {
        const topProblems = this.getTopProblems();
        
        if (topProblems.length > 0) {
            const display = document.getElementById('top-problems-display');
            const list = document.getElementById('top-problems-list');
            
            list.innerHTML = topProblems.map((problem, index) => `
                <div class="top-problem-item">
                    <strong>${index + 1}. ${problem.category}</strong>
                    <br><small>Severity: ${problem.rating}/5</small>
                </div>
            `).join('');
            
            display.style.display = 'block';
            
            // Update top problem text in next section
            if (topProblems[0]) {
                document.getElementById('top-problem-text').textContent = `"${topProblems[0].category}"`;
            }
        } else {
            document.getElementById('top-problems-display').style.display = 'none';
        }
    },

    // Get top 3 problems based on ratings
    getTopProblems() {
        const problems = Object.entries(this.currentRatings)
            .map(([category, rating]) => ({ category, rating }))
            .filter(problem => problem.rating > 0) // Only include rated problems
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 3);
        
        return problems;
    },

    // Reset survey form
    resetSurveyForm() {
        // Clear all form fields
        document.getElementById('open-ended-problem').value = '';
        document.getElementById('current-solution').value = '';
        document.getElementById('frustration-details').value = '';
        document.getElementById('solution-brainstorming-area').innerText = 'Start typing your solution ideas here...';
        document.getElementById('solution-features').value = '';
        document.getElementById('custom-pricing').value = '';
        document.getElementById('boss-battle').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        
        // Reset ratings
        document.querySelectorAll('.rating-option.selected').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelectorAll('.option-item.selected').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Reset contact info
        document.getElementById('contact-info').style.display = 'none';
        
        // Reset current ratings
        this.currentRatings = {};
        this.updateTopProblemsDisplay();
        
        // Reset to first section
        currentSection = 1;
        document.querySelectorAll('.survey-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('section-1').classList.add('active');
        
        // Reset progress
        document.getElementById('progress-bar').style.width = '0%';
        document.querySelectorAll('.section-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === 0);
        });
        
        // Hide thank you message
        document.getElementById('thank-you').style.display = 'none';
    },

    // Collect all survey data
    collectSurveyData() {
        const topProblems = this.getTopProblems();
        
        return {
            // Section 1
            openEndedProblem: document.getElementById('open-ended-problem').value.trim(),
            problemRatings: { ...this.currentRatings },
            topProblems: topProblems,
            
            // Section 2
            currentSolution: document.getElementById('current-solution').value.trim(),
            satisfactionRating: document.querySelector('#satisfaction-rating .rating-option.selected')?.dataset.value,
            frustrationDetails: document.getElementById('frustration-details').value.trim(),
            
            // Section 3 - Dynamic Solution Creation
            customSolution: document.getElementById('solution-brainstorming-area').innerText.trim(),
            solutionFeatures: document.getElementById('solution-features').value.trim(),
            likelihoodRating: document.querySelector('#likelihood-rating .rating-option.selected')?.dataset.value,
            willingnessToPay: document.getElementById('custom-pricing').value.trim(),
            
            // Section 4
            bossBattle: document.getElementById('boss-battle').value.trim(),
            interestedInTrying: document.querySelector('#section-4 .options-list .option-item.selected')?.dataset.value,
            contactInfo: this.getContactInfo()
        };
    },

    // Get contact info if provided
    getContactInfo() {
        const interested = document.querySelector('#section-4 .options-list .option-item.selected')?.dataset.value;
        if (interested === 'yes') {
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            
            if (email || phone) {
                return {
                    email: email,
                    phone: phone
                };
            }
        }
        return null;
    },

    // Validate current section
    validateSection(sectionNumber) {
        switch (sectionNumber) {
            case 1:
                return this.validateSection1();
            case 2:
                return this.validateSection2();
            case 3:
                return this.validateSection3();
            case 4:
                return this.validateSection4();
            default:
                return true;
        }
    },

    validateSection1() {
        const ratingsCount = Object.keys(this.currentRatings).length;
        if (ratingsCount < 3) {
            TeamApp.showNotification('Please rate at least 3 problems to identify the top issues.', 'warning');
            return false;
        }
        
        const openEnded = document.getElementById('open-ended-problem').value.trim();
        if (openEnded.length < 10) {
            TeamApp.showNotification('Please provide more detail about the most annoying problem.', 'warning');
            return false;
        }
        
        return true;
    },

    validateSection2() {
        const hasSolution = document.getElementById('current-solution').value.trim().length > 0;
        if (!hasSolution) {
            TeamApp.showNotification('Please describe your current solution approach.', 'warning');
            return false;
        }
        
        const satisfactionSelected = document.querySelector('#satisfaction-rating .rating-option.selected');
        if (!satisfactionSelected) {
            TeamApp.showNotification('Please rate your satisfaction with the current solution.', 'warning');
            return false;
        }
        
        return true;
    },

    validateSection3() {
        const hasCustomSolution = document.getElementById('solution-brainstorming-area').innerText.trim().length > 20;
        if (!hasCustomSolution) {
            TeamApp.showNotification('Please work together to create a more detailed solution idea.', 'warning');
            return false;
        }
        
        const likelihoodSelected = document.querySelector('#likelihood-rating .rating-option.selected');
        if (!likelihoodSelected) {
            TeamApp.showNotification('Please rate how likely you would be to use this solution.', 'warning');
            return false;
        }
        
        const hasPricing = document.getElementById('custom-pricing').value.trim().length > 0;
        if (!hasPricing) {
            TeamApp.showNotification('Please indicate how much you would be willing to pay.', 'warning');
            return false;
        }
        
        return true;
    },

    validateSection4() {
        const hasBossBattle = document.getElementById('boss-battle').value.trim().length > 0;
        if (!hasBossBattle) {
            TeamApp.showNotification('Please describe your "boss battle" metaphor.', 'warning');
            return false;
        }
        
        const interestSelected = document.querySelector('#section-4 .options-list .option-item.selected');
        if (!interestSelected) {
            TeamApp.showNotification('Please indicate if you are interested in trying solutions.', 'warning');
            return false;
        }
        
        // If interested in trying, validate contact info
        if (interestSelected.dataset.value === 'yes') {
            const email = document.getElementById('email').value.trim();
            if (!email) {
                TeamApp.showNotification('Please provide an email address if you are interested.', 'warning');
                return false;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                TeamApp.showNotification('Please provide a valid email address.', 'warning');
                return false;
            }
        }
        
        return true;
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize survey components
    SurveyManager.initProblemRatings();
    setupEventListeners();
    TeamApp.init();
    loadDashboard();
    DataManager.updateFileSection();
    
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone').matches) {
        console.log('App is running in standalone mode');
        document.body.classList.add('standalone');
    }
    
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
                // Show user-friendly message
                TeamApp.showNotification('Offline features not available', 'warning');
            });
    }

    // Initialize device ID
    if (!localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', TeamApp.generateId());
    }
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            switchAppSection(section);
        });
    });

    // Survey navigation
    document.getElementById('next-1').addEventListener('click', () => navigateToSection(2));
    document.getElementById('next-2').addEventListener('click', () => navigateToSection(3));
    document.getElementById('next-3').addEventListener('click', () => navigateToSection(4));
    document.getElementById('prev-2').addEventListener('click', () => navigateToSection(1));
    document.getElementById('prev-3').addEventListener('click', () => navigateToSection(2));
    document.getElementById('prev-4').addEventListener('click', () => navigateToSection(3));

    // Form submissions
    document.getElementById('submit').addEventListener('click', submitSurvey);
    document.getElementById('view-results').addEventListener('click', () => switchAppSection('dashboard'));

    // File management
    document.getElementById('export-json').addEventListener('click', () => DataManager.exportJSON());
    document.getElementById('export-csv').addEventListener('click', () => DataManager.exportCSV());
    document.getElementById('clear-data').addEventListener('click', () => DataManager.clearData());

    // Contact info toggle
    document.querySelectorAll('#section-4 .option-item').forEach(item => {
        item.addEventListener('click', function() {
            const showContact = this.dataset.value === 'yes';
            document.getElementById('contact-info').style.display = showContact ? 'block' : 'none';
        });
    });

    // Rating scale selection
    document.querySelectorAll('.rating-scale').forEach(scale => {
        scale.addEventListener('click', function(e) {
            if (e.target.classList.contains('rating-option')) {
                // Deselect all options in this scale
                const siblings = Array.from(e.target.parentNode.children);
                siblings.forEach(sibling => sibling.classList.remove('selected'));
                
                // Select the clicked option
                e.target.classList.add('selected');
            }
        });
    });
    
    // Option selection
    document.querySelectorAll('.options-list').forEach(list => {
        list.addEventListener('click', function(e) {
            if (e.target.classList.contains('option-item')) {
                // For single selection lists
                if (!e.target.parentNode.classList.contains('multi-select')) {
                    const siblings = Array.from(e.target.parentNode.children);
                    siblings.forEach(sibling => sibling.classList.remove('selected'));
                }
                
                // Toggle selection
                e.target.classList.toggle('selected');
            }
        });
    });
    
    // Dashboard tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Export button
    document.getElementById('export-data').addEventListener('click', () => DataManager.exportCSV());
    
    // PWA Installation Prompt
    let deferredPrompt;
    const installPrompt = document.getElementById('install-prompt');
    const installBtn = document.getElementById('install-btn');
    const cancelInstall = document.getElementById('cancel-install');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installPrompt.style.display = 'block';
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installPrompt.style.display = 'none';
                deferredPrompt = null;
            }
        }
    });

    cancelInstall.addEventListener('click', () => {
        installPrompt.style.display = 'none';
    });
    
    // Online/Offline Detection
    window.addEventListener('online', function() {
        document.getElementById('offline-indicator').style.display = 'none';
        DataManager.updateTeamMemberPresence(DataManager.getDeviceId(), true);
        
        // Auto-sync when coming online
        if (DataManager.getPendingSyncCount() > 0) {
            TeamApp.autoSync();
        }
    });

    window.addEventListener('offline', function() {
        document.getElementById('offline-indicator').style.display = 'block';
        DataManager.updateTeamMemberPresence(DataManager.getDeviceId(), false);
    });
    
    // Prevent double-tap zoom on buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    });
    
    // Better touch feedback
    document.querySelectorAll('.rating-option, .option-item').forEach(item => {
        item.addEventListener('touchstart', function() {
            this.style.backgroundColor = '#e9ecef';
        });
        
        item.addEventListener('touchend', function() {
            this.style.backgroundColor = '';
        });
    });
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        // Redraw charts on orientation change
        setTimeout(loadDashboard, 300);
    });
}

function submitSurvey() {
    const surveyData = SurveyManager.collectSurveyData();
    
    // Add metadata
    surveyData.collectedBy = TeamApp.teamMembers[0]?.name || 'Unknown Collector';
    surveyData.deviceId = DataManager.getDeviceId();
    
    // Save to storage
    const savedSurvey = DataManager.saveSurvey(surveyData);
    if (savedSurvey) {
        const syncStatus = savedSurvey.syncStatus === 'synced' ? 'and synced' : '(pending sync)';
        TeamApp.showNotification(`Survey submitted successfully ${syncStatus}!`, 'success');
        
        // Show thank you message
        document.querySelectorAll('.survey-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById('thank-you').style.display = 'block';
        document.getElementById('progress-bar').style.width = '100%';
        
        // Update file section
        DataManager.updateFileSection();
        
        // Reset form for next survey
        setTimeout(() => {
            SurveyManager.resetSurveyForm();
        }, 3000);
        
        // Vibrate on success
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    }
}

function switchAppSection(section) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.app-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    currentAppSection = section;
    
    if (section === 'dashboard') {
        loadDashboard();
    } else if (section === 'files') {
        DataManager.updateFileSection();
    }
}

function navigateToSection(sectionNumber) {
    // Validate current section before proceeding
    if (!SurveyManager.validateSection(currentSection)) {
        return;
    }
    
    // Hide current section
    document.getElementById(`section-${currentSection}`).classList.remove('active');
    
    // Update section indicator
    document.querySelectorAll('.section-dot').forEach(dot => {
        dot.classList.remove('active');
    });
    document.querySelector(`.section-dot[data-section="${sectionNumber}"]`).classList.add('active');
    
    // Show new section
    document.getElementById(`section-${sectionNumber}`).classList.add('active');
    
    // Update progress bar
    const progress = (sectionNumber / totalSections) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    
    // Update current section
    currentSection = sectionNumber;
}

function loadDashboard() {
    const responses = DataManager.getAllSurveys();
    
    // Update statistics
    document.getElementById('total-responses').textContent = responses.length;
    document.getElementById('completion-rate').textContent = responses.length > 0 ? '100%' : '0%';
    
    // If we have responses, process them
    if (responses.length > 0) {
        const processedData = processSurveyData(responses);
        updateDashboardCharts(processedData);
        updateDashboardInsights(processedData);
        populateResponseTable(responses);
    } else {
        // Show empty state
        document.getElementById('avg-problem-severity').textContent = '0.0';
        document.getElementById('top-problem').textContent = '-';
        document.getElementById('solution-interest').textContent = '0%';
        
        // Clear charts or show empty state
        clearCharts();
        showEmptyDashboardState();
    }
}

function showEmptyDashboardState() {
    // Clear insights
    document.getElementById('most-pressing-insight').textContent = 
        'No data yet. Collect some survey responses to see insights.';
    document.getElementById('willingness-pay-insight').textContent = 
        'No data yet. Collect some survey responses to see insights.';
    document.getElementById('early-adopter-insight').textContent = 
        'No data yet. Collect some survey responses to see insights.';
        
    // Clear table
    document.getElementById('response-table-body').innerHTML = 
        '<tr><td colspan="7" style="text-align: center; padding: 20px;">No survey data available yet</td></tr>';
}

function processSurveyData(responses) {
    if (responses.length === 0) return null;
    
    // Initialize data structures
    const processedData = {
        totalResponses: responses.length,
        completionRate: 100,
        
        // Initialize empty objects for aggregating data
        problemDistribution: {},
        topProblems: {},
        severityByCategory: {},
        satisfaction: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        adoptionLikelihood: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        willingnessToPay: {},
        earlyAdopter: {yes: 0, no: 0},
        
        // Will calculate these
        avgProblemSeverity: 0,
        topProblem: '',
        solutionInterest: 0
    };
    
    let totalSeverity = 0;
    let severityCount = 0;
    
    // Process each response
    responses.forEach(response => {
        // Process problem distribution and severity
        if (response.problemRatings) {
            Object.entries(response.problemRatings).forEach(([category, rating]) => {
                // Problem distribution - count occurrences
                processedData.problemDistribution[category] = (processedData.problemDistribution[category] || 0) + 1;
                
                // Accumulate for average severity
                if (rating > 0) {
                    totalSeverity += parseInt(rating);
                    severityCount++;
                    
                    // Build severity by category
                    if (!processedData.severityByCategory[category]) {
                        processedData.severityByCategory[category] = { sum: 0, count: 0 };
                    }
                    processedData.severityByCategory[category].sum += parseInt(rating);
                    processedData.severityByCategory[category].count++;
                }
            });
        }
        
        // Process top problems
        if (response.topProblems && response.topProblems.length > 0) {
            response.topProblems.forEach((problem, index) => {
                if (index === 0) {
                    // Count #1 top problems
                    processedData.topProblems[problem.category] = (processedData.topProblems[problem.category] || 0) + 1;
                }
            });
        }
        
        // Process satisfaction
        if (response.satisfactionRating) {
            const rating = parseInt(response.satisfactionRating);
            if (rating >= 1 && rating <= 5) {
                processedData.satisfaction[rating]++;
            }
        }
        
        // Process adoption likelihood
        if (response.likelihoodRating) {
            const rating = parseInt(response.likelihoodRating);
            if (rating >= 1 && rating <= 5) {
                processedData.adoptionLikelihood[rating]++;
            }
        }
        
        // Process willingness to pay
        if (response.willingnessToPay) {
            processedData.willingnessToPay[response.willingnessToPay] = 
                (processedData.willingnessToPay[response.willingnessToPay] || 0) + 1;
        }
        
        // Process early adopter
        if (response.interestedInTrying) {
            if (response.interestedInTrying === 'yes') {
                processedData.earlyAdopter.yes++;
            } else {
                processedData.earlyAdopter.no++;
            }
        }
    });
    
    // Calculate averages and determine top problem
    processedData.avgProblemSeverity = severityCount > 0 ? (totalSeverity / severityCount).toFixed(1) : '0.0';
    
    // Find top problem
    let maxCount = 0;
    let topProblem = '';
    Object.entries(processedData.topProblems).forEach(([problem, count]) => {
        if (count > maxCount) {
            maxCount = count;
            topProblem = problem;
        }
    });
    processedData.topProblem = topProblem || '-';
    
    // Calculate solution interest
    const totalInterest = processedData.earlyAdopter.yes + processedData.earlyAdopter.no;
    processedData.solutionInterest = totalInterest > 0 ? 
        Math.round((processedData.earlyAdopter.yes / totalInterest) * 100) + '%' : '0%';
    
    // Calculate average severity by category
    Object.keys(processedData.severityByCategory).forEach(category => {
        const data = processedData.severityByCategory[category];
        processedData.severityByCategory[category] = (data.sum / data.count).toFixed(1);
    });
    
    return processedData;
}

function updateDashboardCharts(data) {
    if (!data) return;
    
    // Problem Distribution Chart
    createProblemDistributionChart(data.problemDistribution);
    
    // Top Problems Chart
    createTopProblemsChart(data.topProblems);
    
    // Severity by Category Chart
    createSeverityByCategoryChart(data.severityByCategory);
    
    // Satisfaction Chart
    createSatisfactionChart(data.satisfaction);
    
    // Adoption Likelihood Chart
    createAdoptionLikelihoodChart(data.adoptionLikelihood);
    
    // Willingness to Pay Chart
    createWillingnessPayChart(data.willingnessToPay);
    
    // Early Adopter Chart
    createEarlyAdopterChart(data.earlyAdopter);
}

function clearCharts() {
    // Clear all chart canvases
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

function createProblemDistributionChart(data) {
    const ctx = document.getElementById('problem-distribution-chart').getContext('2d');
    const labels = Object.keys(data);
    const chartData = Object.values(data);
    
    if (chartData.length === 0) {
        showEmptyChart(ctx, 'No problem distribution data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: [
                    '#4361ee', '#3a0ca3', '#4cc9f0', '#f72585', '#7209b7',
                    '#4895ef', '#560bad', '#b5179e', '#480ca8', '#3f37c9'
                ].slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: window.innerWidth <= 768 ? 'bottom' : 'right',
                },
                title: {
                    display: true,
                    text: 'Problem Category Distribution'
                }
            }
        }
    });
}

function createTopProblemsChart(data) {
    const ctx = document.getElementById('top-problems-chart').getContext('2d');
    const labels = Object.keys(data);
    const chartData = Object.values(data);
    
    if (chartData.length === 0) {
        showEmptyChart(ctx, 'No top problems data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Times Ranked as #1 Problem',
                data: chartData,
                backgroundColor: '#f72585',
                borderColor: '#b5179e',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top Problem Areas'
                }
            }
        }
    });
}

function createSeverityByCategoryChart(data) {
    const ctx = document.getElementById('severity-by-category-chart').getContext('2d');
    const labels = Object.keys(data);
    const chartData = Object.values(data).map(val => parseFloat(val));
    
    if (chartData.length === 0) {
        showEmptyChart(ctx, 'No severity data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Severity (1-5)',
                data: chartData,
                backgroundColor: '#4361ee',
                borderColor: '#3a0ca3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Problem Severity by Category'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: 'Severity Rating'
                    }
                }
            }
        }
    });
}

function createSatisfactionChart(data) {
    const ctx = document.getElementById('satisfaction-chart').getContext('2d');
    const labels = ['1 (Very Dissatisfied)', '2', '3 (Neutral)', '4', '5 (Very Satisfied)'];
    const chartData = [data[1] || 0, data[2] || 0, data[3] || 0, data[4] || 0, data[5] || 0];
    
    if (chartData.reduce((a, b) => a + b, 0) === 0) {
        showEmptyChart(ctx, 'No satisfaction data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: [
                    '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Current Solution Satisfaction'
                }
            }
        }
    });
}

function createAdoptionLikelihoodChart(data) {
    const ctx = document.getElementById('adoption-likelihood-chart').getContext('2d');
    const labels = ['1 (Very Unlikely)', '2', '3 (Neutral)', '4', '5 (Very Likely)'];
    const chartData = [data[1] || 0, data[2] || 0, data[3] || 0, data[4] || 0, data[5] || 0];
    
    if (chartData.reduce((a, b) => a + b, 0) === 0) {
        showEmptyChart(ctx, 'No adoption likelihood data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Responses',
                data: chartData,
                backgroundColor: '#20c997',
                borderColor: '#198754',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Solution Adoption Likelihood'
                }
            }
        }
    });
}

function createWillingnessPayChart(data) {
    const ctx = document.getElementById('willingness-pay-chart').getContext('2d');
    const labels = Object.keys(data);
    const chartData = Object.values(data);
    
    if (chartData.length === 0) {
        showEmptyChart(ctx, 'No willingness to pay data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: [
                    '#4cc9f0', '#4361ee', '#3a0ca3', '#7209b7', '#4895ef'
                ].slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Willingness to Pay for Solutions'
                }
            }
        }
    });
}

function createEarlyAdopterChart(data) {
    const ctx = document.getElementById('early-adopter-chart').getContext('2d');
    const labels = ['Yes', 'No'];
    const chartData = [data.yes || 0, data.no || 0];
    
    if (chartData.reduce((a, b) => a + b, 0) === 0) {
        showEmptyChart(ctx, 'No early adopter data available');
        return;
    }
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: ['#198754', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Early Adopter Potential'
                }
            }
        }
    });
}

function showEmptyChart(ctx, message) {
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
}

function updateDashboardInsights(data) {
    const insights = InsightGenerator.generateInsights(data);
    
    // Update insights panel
    const insightsPanel = document.querySelector('.insights-panel');
    if (insightsPanel) {
        insightsPanel.innerHTML = `
            <h3>AI-Powered Insights</h3>
            <div class="insight-item">
                <div class="insight-title">
                    <span>${insights.problemAnalysis.title.split(' ')[0]}</span>
                    <span>${insights.problemAnalysis.title.split(' ').slice(1).join(' ')}</span>
                </div>
                <div class="insight-content">${insights.problemAnalysis.summary}</div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #4361ee; font-weight: 500;">
                    💡 ${insights.problemAnalysis.recommendation}
                </div>
            </div>
            
            <div class="insight-item">
                <div class="insight-title">
                    <span>${insights.solutionPotential.title.split(' ')[0]}</span>
                    <span>${insights.solutionPotential.title.split(' ').slice(1).join(' ')}</span>
                </div>
                <div class="insight-content">${insights.solutionPotential.summary}</div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #4361ee; font-weight: 500;">
                    💡 ${insights.solutionPotential.recommendation}
                </div>
            </div>
            
            <div class="insight-item">
                <div class="insight-title">
                    <span>${insights.marketOpportunity.title.split(' ')[0]}</span>
                    <span>${insights.marketOpportunity.title.split(' ').slice(1).join(' ')}</span>
                </div>
                <div class="insight-content">${insights.marketOpportunity.summary}</div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #4361ee; font-weight: 500;">
                    💡 ${insights.marketOpportunity.recommendation}
                </div>
            </div>
            
            <div class="insight-item">
                <div class="insight-title">
                    <span>${insights.teamPerformance.title.split(' ')[0]}</span>
                    <span>${insights.teamPerformance.title.split(' ').slice(1).join(' ')}</span>
                </div>
                <div class="insight-content">${insights.teamPerformance.summary}</div>
                <div style="margin-top: 8px; font-size: 0.9em; color: #4361ee; font-weight: 500;">
                    💡 ${insights.teamPerformance.recommendation}
                </div>
            </div>
        `;
    }
}

function populateResponseTable(responses) {
    const tableBody = document.getElementById('response-table-body');
    
    if (responses.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No survey data available yet</td></tr>';
        return;
    }
    
    // Sort by timestamp (newest first)
    const sortedResponses = [...responses].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tableBody.innerHTML = sortedResponses.map(response => {
        const topProblems = response.topProblems ? response.topProblems.slice(0, 3).map(p => p.category).join(', ') : 'N/A';
        const topProblem = response.topProblems && response.topProblems[0] ? response.topProblems[0].category : 'N/A';
        const severity = response.topProblems && response.topProblems[0] ? response.topProblems[0].rating + '/5' : 'N/A';
        const solution = response.customSolution ? (response.customSolution.substring(0, 30) + (response.customSolution.length > 30 ? '...' : '')) : 'N/A';
        const willingness = response.willingnessToPay || 'N/A';
        const earlyAdopter = response.interestedInTrying === 'yes' ? 'Yes' : (response.interestedInTrying === 'no' ? 'No' : 'N/A');
        
        return `
            <tr>
                <td>${response.id.substring(0, 8)}...</td>
                <td>${response.date || new Date(response.timestamp).toLocaleDateString()}</td>
                <td>${topProblem}</td>
                <td>${severity}</td>
                <td>${solution}</td>
                <td>${willingness}</td>
                <td>${earlyAdopter}</td>
            </tr>
        `;
    }).join('');
}
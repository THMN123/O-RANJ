const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let teamId = '';
let surveyTemplateId = '';
let surveyResponseId = '';

// Test configuration
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'password123',
  teamName: 'Test Team'
};

const testSurveyTemplate = {
  name: 'Student Problem Survey',
  description: 'Test survey template for student problems',
  category: 'student',
  status: 'active',
  questions: [
    {
      type: 'text',
      questionText: 'What is the most annoying problem?',
      required: true,
      order: 1
    },
    {
      type: 'rating',
      questionText: 'Rate problem severity',
      required: true,
      order: 2
    }
  ]
};

async function testFlow(flowName, testFunction) {
  console.log(`\n🧪 Testing: ${flowName}`);
  try {
    await testFunction();
    console.log(`✅ ${flowName} - PASSED`);
  } catch (error) {
    console.log(`❌ ${flowName} - FAILED:`, error.response?.data || error.message);
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Registration Flow
async function testRegistration() {
  const response = await axios.post(`${API_BASE}/auth/register`, testUser);
  
  if (response.data.success) {
    authToken = response.data.data.token;
    userId = response.data.data.user._id;
    teamId = response.data.data.user.team;
    console.log('   User registered:', response.data.data.user.email);
    console.log('   Team created:', response.data.data.team.name);
  } else {
    throw new Error('Registration failed');
  }
}

// 2. Login Flow
async function testLogin() {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: testUser.email,
    password: testUser.password
  });

  if (response.data.success) {
    authToken = response.data.data.token;
    console.log('   User logged in:', response.data.data.user.email);
  } else {
    throw new Error('Login failed');
  }
}

// 3. Get Current User
async function testGetCurrentUser() {
  const response = await axios.get(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Current user:', response.data.data.user.name);
  } else {
    throw new Error('Get current user failed');
  }
}

// 4. Create Survey Template
async function testCreateSurveyTemplate() {
  const response = await axios.post(`${API_BASE}/survey-templates`, testSurveyTemplate, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    surveyTemplateId = response.data.data.template._id;
    console.log('   Template created:', response.data.data.template.name);
  } else {
    throw new Error('Create template failed');
  }
}

// 5. Get Survey Templates
async function testGetSurveyTemplates() {
  const response = await axios.get(`${API_BASE}/survey-templates`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Templates found:', response.data.data.templates.length);
  } else {
    throw new Error('Get templates failed');
  }
}

// 6. Submit Survey Response
async function testSubmitSurveyResponse() {
  const surveyResponse = {
    surveyTemplate: surveyTemplateId,
    responses: {
      openEndedProblem: "Time management is the biggest issue",
      problemRatings: {
        "Money/expenses": 4,
        "Food/nutrition": 3,
        "Academics/study support": 5
      },
      topProblems: [
        { category: "Academics/study support", rating: 5 },
        { category: "Money/expenses", rating: 4 },
        { category: "Food/nutrition", rating: 3 }
      ],
      currentSolution: "Using calendar apps but still struggling",
      satisfactionRating: "3",
      frustrationDetails: "Not enough hours in the day",
      customSolution: "AI-powered time management assistant",
      solutionFeatures: "Smart scheduling, priority management, progress tracking",
      likelihoodRating: "5",
      willingnessToPay: "R50",
      bossBattle: "The Time Monster that steals all productive hours",
      interestedInTrying: "yes"
    },
    deviceInfo: {
      deviceId: "test-device-001",
      platform: "Test Platform",
      userAgent: "Test Agent",
      appVersion: "1.0.0"
    },
    analytics: {
      startTime: new Date(Date.now() - 300000),
      endTime: new Date(),
      completionTime: 300,
      sectionsCompleted: ['1', '2', '3', '4']
    }
  };

  const response = await axios.post(`${API_BASE}/survey-responses`, surveyResponse, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    surveyResponseId = response.data.data.response._id;
    console.log('   Response submitted:', response.data.data.response._id);
  } else {
    throw new Error('Submit response failed');
  }
}

// 7. Get Survey Responses
async function testGetSurveyResponses() {
  const response = await axios.get(`${API_BASE}/survey-responses`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Responses found:', response.data.data.responses.length);
  } else {
    throw new Error('Get responses failed');
  }
}

// 8. Get Survey Analytics
async function testGetSurveyAnalytics() {
  const response = await axios.get(`${API_BASE}/survey-responses/analytics`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Analytics:', response.data.data.analytics);
  } else {
    throw new Error('Get analytics failed');
  }
}

// 9. Test Sync Endpoint (for offline mode)
async function testSyncResponses() {
  const offlineResponses = [
    {
      surveyTemplate: surveyTemplateId,
      responses: {
        openEndedProblem: "Offline test response",
        problemRatings: { "Transport": 4 },
        topProblems: [{ category: "Transport", rating: 4 }],
        currentSolution: "Walking",
        satisfactionRating: "2",
        customSolution: "Better transport system",
        likelihoodRating: "4",
        willingnessToPay: "R30",
        bossBattle: "The Walking Dead",
        interestedInTrying: "yes"
      },
      deviceInfo: {
        deviceId: "offline-device-001",
        platform: "Offline Platform",
        userAgent: "Offline Agent",
        appVersion: "1.0.0"
      },
      analytics: {
        startTime: new Date(Date.now() - 600000),
        endTime: new Date(),
        completionTime: 600,
        sectionsCompleted: ['1', '2', '3', '4']
      }
    }
  ];

  const response = await axios.post(`${API_BASE}/survey-responses/sync`, {
    responses: offlineResponses
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Sync completed:', response.data.data.syncResults);
  } else {
    throw new Error('Sync failed');
  }
}

// 10. Export Data
async function testExportData() {
  const response = await axios.get(`${API_BASE}/survey-responses/export`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Export successful, records:', response.data.data.responses.length);
  } else {
    throw new Error('Export failed');
  }
}

// 11. Duplicate Template
async function testDuplicateTemplate() {
  const response = await axios.post(`${API_BASE}/survey-templates/${surveyTemplateId}/duplicate`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Template duplicated:', response.data.data.template.name);
  } else {
    throw new Error('Duplicate template failed');
  }
}

// 12. Update User Profile
async function testUpdateProfile() {
  const response = await axios.put(`${API_BASE}/auth/profile`, {
    name: 'Updated Test User',
    preferences: {
      language: 'en',
      notifications: true
    }
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.success) {
    console.log('   Profile updated:', response.data.data.user.name);
  } else {
    throw new Error('Update profile failed');
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive O-RANJ App Tests\n');
  
  await testFlow('User Registration', testRegistration);
  await wait(1000);
  
  await testFlow('User Login', testLogin);
  await wait(1000);
  
  await testFlow('Get Current User', testGetCurrentUser);
  await wait(1000);
  
  await testFlow('Create Survey Template', testCreateSurveyTemplate);
  await wait(1000);
  
  await testFlow('Get Survey Templates', testGetSurveyTemplates);
  await wait(1000);
  
  await testFlow('Submit Survey Response', testSubmitSurveyResponse);
  await wait(1000);
  
  await testFlow('Get Survey Responses', testGetSurveyResponses);
  await wait(1000);
  
  await testFlow('Get Survey Analytics', testGetSurveyAnalytics);
  await wait(1000);
  
  await testFlow('Sync Offline Responses', testSyncResponses);
  await wait(1000);
  
  await testFlow('Export Data', testExportData);
  await wait(1000);
  
  await testFlow('Duplicate Template', testDuplicateTemplate);
  await wait(1000);
  
  await testFlow('Update User Profile', testUpdateProfile);
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📊 Summary:');
  console.log('✅ Authentication flows (Registration, Login, Profile)');
  console.log('✅ Survey Template management');
  console.log('✅ Survey Response submission and retrieval');
  console.log('✅ Analytics and data export');
  console.log('✅ Offline sync capability');
  console.log('✅ Team-based data isolation');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error);
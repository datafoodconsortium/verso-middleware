let fetch;
import('node-fetch').then(module => {
  fetch = module.default;
});

const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('../config.json');

const OptimizationService = require('./optimizationService.js');

const testVersoNeeds = require('../dataset/needs-verso.json');

dotenv.config();
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with increased size limit

// Initialize optimization service
const optimizationService = new OptimizationService(
  config.VERSO_OPTIM_API_URL,
  config.VERSO_API_KEY
);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// DFC to Verso optimization route
app.post('/optimWhithVersoReturn', async (req, res, next) => {
  try {
    const dfcGraph = req.body;
    console.log('dfcGraph', dfcGraph);
    const versoData = optimizationService.transformDFCtoVerso(dfcGraph);
    console.log('versoData', versoData);
    const dfcResult = await optimizationService.callVersoOptimization(versoData);
    res.json(dfcResult);
  } catch (error) {
    console.error('Error in /optim route:', error);
    res.status(500).json({ 
      error: 'Optimization failed',
      message: error.message 
    });
  }
});

// DFC to Verso optimization route
app.post('/optim', async (req, res, next) => {
  try {
    const dfcGraph = req.body;
    // console.log('dfcGraph', dfcGraph);
    console.log('__dfcGraph', JSON.stringify(dfcGraph));
    const {versoNeeds, dfcNeeds } = await optimizationService.transformDFCtoVerso(dfcGraph);
    // console.log('versoData', versoData);
    // console.log('needsVerso', needsVerso);
    // const compare = optimizationService.compareData(versoNeeds, testVersoNeeds);
    // console.log('__compare', compare);
    const versoResult = await optimizationService.callVersoOptimization(versoNeeds);
    // console.log('__versoResult', JSON.stringify(versoResult));
    const dfcResult = await optimizationService.transformVersoToDFC(versoResult, dfcNeeds);
    // console.log('__dfcResult', JSON.stringify(dfcResult));
    res.json(dfcResult);
  } catch (error) {
    console.error('Error in /optim route:', error);
    res.status(500).json({ 
      error: 'Optimization failed',
      message: error.message 
    });
  }
});
// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
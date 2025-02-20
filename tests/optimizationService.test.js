require('dotenv').config(); // Charger les variables d'environnement

const OptimizationService = require('../src/optimizationService');
const expectedResults = require('../dataset/results-verso.json');
const ordersData = require('../dataset/orders-DFC.json');
const needsData = require('../dataset/needs-verso.json');

describe('OptimizationService', () => {
    let optimizationService;
    beforeEach(() => {
       // Initialize service with dummy API values
        optimizationService = new OptimizationService(process.env.VERSO_OPTIM_API_URL, process.env.VERSO_API_KEY);

    });

    describe('transform DFC to Verso', () => {

        it('should transform DFC data to Verso format correctly', async () => {
            // When
            const {versoNeeds, dfcNeeds } = await optimizationService.transformDFCtoVerso(ordersData);
            // console.log('__versoNeeds', versoNeeds);
            // console.log('__dfcNeeds', dfcNeeds);
            // Check if versoNeeds contains vehicles and shipments
            expect(versoNeeds).toHaveProperty('vehicles');
            expect(versoNeeds).toHaveProperty('shipments');

            // expect(versoNeeds).toMatchObject(needsData);

            // Check structure of versoNeeds

        });


    });

    describe('optimize', () => {
        it('should optimize data correctly', async () => {
            // Given
            const {versoNeeds, dfcNeeds } = await optimizationService.transformDFCtoVerso(ordersData);
            // console.log('__versoNeeds', versoNeeds);
            // When
            const optimizedResult = await optimizationService.callVersoOptimization(versoNeeds);
            
            // Exclude computing times from the comparison
            const { summary: { computing_times, ...restSummary }, ...restOptimizedResult } = optimizedResult;
            const { summary: { computing_times: expectedComputingTimes, ...restExpectedSummary }, ...restExpectedResults } = expectedResults;

            // Verify consistency with results-verso.json excluding computing times
            expect({ ...restOptimizedResult, summary: restSummary }).toMatchObject({ ...restExpectedResults, summary: restExpectedSummary });
        });
    });

    describe('optimize whith DFC return', () => {
        it('should optimize data and return DFC format correctly', async () => {
            // Given
            const {versoNeeds, dfcNeeds } = await optimizationService.transformDFCtoVerso(ordersData);

            // When
            const optimizedResult = await optimizationService.callVersoOptimization(versoNeeds);
            // console.log('optimizedResult', optimizedResult)
            const dfcResult = await optimizationService.transformVersoToDFC(optimizedResult,dfcNeeds);
            // console.log('dfcResult', dfcResult)
            expect(dfcResult).toBeDefined();    
        }); 
    }); 

}); 
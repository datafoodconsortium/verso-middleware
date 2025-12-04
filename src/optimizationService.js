const jsonld = require('jsonld');
const config = require('../config.json');

class OptimizationService {
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
    }

    /**
     * Clean object by removing @context property recursively
     * @param {Object} obj - Object to clean
     * @returns {Object} Cleaned object without @context
     */
    cleanObject(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanObject(item));
        }

        if (typeof obj === 'object') {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key !== '@context') {
                    cleaned[key] = this.cleanObject(value);
                }
            }
            return cleaned;
        }

        return obj;
    }

    /**
     * Transform DFC graph data to Verso format
     * @param {Object} dfcGraph - Input DFC graph data
     * @returns {Object} Verso formatted data
     */
    async transformDFCtoVerso(dfcGraph) {
        // Input validation
        if (!dfcGraph || typeof dfcGraph !== 'object') {
            throw new Error('Invalid DFC graph: input must be an object');
        }

        // Initialize counters for unique IDs
        let vehicleId = 1;
        let shipmentIdCounter = 1;

        // Initialize Verso data structure
        const versoData = {
            vehicles: [],
            shipments: []
        };

        const orders = await jsonld.frame(dfcGraph, {
            "@context": dfcGraph['@context'],
            "@type": "dfc-b:Order"
        });
        // console.log('__orders', orders);


        for (const order of orders['@graph']) {
            const physicalPlaceId = order['dfc-b:selects']?.['dfc-b:pickedUpAt']?.['@id'] || order['dfc-b:selects']?.['dfc-b:pickedUpAt'];
            const pickupPhysicalPlace = await jsonld.frame(dfcGraph, {
                "@context": dfcGraph['@context'],
                "@id": physicalPlaceId
            });
            const pickupAddress = pickupPhysicalPlace['dfc-b:hasAddress'];
            for (const part of order['dfc-b:hasPart']) {
                let partOrigin = dfcGraph['@graph'].find(entity => entity['@id'] === part['@id']);
                const physicalProductId = part['dfc-b:fulfilledBy']?.['@id'] || part['dfc-b:fulfilledBy']?.['dfc-b:constitutedBy'];
                const physicalProduct = await jsonld.frame(dfcGraph, {
                    "@context": dfcGraph['@context'],
                    "@id": physicalProductId,
                    "dfc-b:fulfills": {
                        "@embed": "@never"
                    },
                    "dfc-b:representedBy": {
                        "@embed": "@never"
                    }
                });
                const sourcePhysicalPlace = physicalProduct?.['dfc-b:constitutedBy']?.['dfc-b:isStoredIn'];
                const sourceAddress = sourcePhysicalPlace?.['dfc-b:hasAddress'];

                // Validate that sourceAddress has valid coordinates
                if (!sourceAddress || sourceAddress['dfc-b:longitude'] === null || sourceAddress['dfc-b:longitude'] === undefined ||
                    sourceAddress['dfc-b:latitude'] === null || sourceAddress['dfc-b:latitude'] === undefined) {
                    console.warn('⚠️  SKIPPING part - sourceAddress missing valid coordinates');
                    console.warn('sourceAddress', sourceAddress);
                    continue;
                }

                const pickupId = shipmentIdCounter++;
                const deliveryId = shipmentIdCounter++;
                partOrigin['pickupShipmentId'] = pickupId;
                partOrigin['deliveryShipmentId'] = deliveryId;

                // Parse coordinates - ensure they are valid numbers
                const sourceLongitude = parseFloat(sourceAddress['dfc-b:longitude']);
                const sourceLatitude = parseFloat(sourceAddress['dfc-b:latitude']);

                if (isNaN(sourceLongitude) || isNaN(sourceLatitude)) {
                    console.warn('⚠️  SKIPPING part - invalid coordinate values');
                    continue;
                }

                // Create vehicle
                const vehicle = {
                    id: vehicleId++,
                    start: [sourceLongitude, sourceLatitude],
                    end: [sourceLongitude, sourceLatitude]
                };
                versoData.vehicles.push(vehicle);

                // Validate pickupAddress has valid coordinates
                if (!pickupAddress || pickupAddress['dfc-b:longitude'] === null || pickupAddress['dfc-b:longitude'] === undefined ||
                    pickupAddress['dfc-b:latitude'] === null || pickupAddress['dfc-b:latitude'] === undefined) {
                    console.warn('⚠️  SKIPPING shipment - pickupAddress missing valid coordinates',);
                    continue;
                }

                const pickupLongitude = parseFloat(pickupAddress['dfc-b:longitude']);
                const pickupLatitude = parseFloat(pickupAddress['dfc-b:latitude']);

                if (isNaN(pickupLongitude) || isNaN(pickupLatitude)) {
                    console.warn('⚠️  SKIPPING shipment - invalid pickup coordinate values');
                    continue;
                }

                // Parse time windows with validation
                let pickupTimeWindow = null;
                let deliveryTimeWindow = null;

                try {
                    if (pickupPhysicalPlace?.['dfc-b:isOpeningDuring']?.['dfc-b:start'] && pickupPhysicalPlace?.['dfc-b:isOpeningDuring']?.['dfc-b:end']) {
                        pickupTimeWindow = [
                            Math.floor(Date.parse(pickupPhysicalPlace['dfc-b:isOpeningDuring']['dfc-b:start']) / 1000),
                            Math.floor(Date.parse(pickupPhysicalPlace['dfc-b:isOpeningDuring']['dfc-b:end']) / 1000)
                        ];
                    } else {
                        console.warn('⚠️  Missing pickup time window');
                        pickupTimeWindow = [null, null];
                    }

                    if (sourcePhysicalPlace?.['dfc-b:isOpeningDuring']?.['dfc-b:start'] && sourcePhysicalPlace?.['dfc-b:isOpeningDuring']?.['dfc-b:end']) {
                        deliveryTimeWindow = [
                            Math.floor(Date.parse(sourcePhysicalPlace['dfc-b:isOpeningDuring']['dfc-b:start']) / 1000),
                            Math.floor(Date.parse(sourcePhysicalPlace['dfc-b:isOpeningDuring']['dfc-b:end']) / 1000)
                        ];
                    } else {
                        console.warn('⚠️  Missing delivery time window');
                        deliveryTimeWindow = [null, null];
                    }
                } catch (e) {
                    console.warn('⚠️  Error parsing time windows');
                    pickupTimeWindow = [null, null];
                    deliveryTimeWindow = [null, null];
                }

                // Create shipment
                const shipment = {
                    pickup: {
                        id: pickupId,
                        location: [sourceLongitude, sourceLatitude],
                        time_windows: [pickupTimeWindow],
                        service: 1000
                    },
                    delivery: {
                        id: deliveryId,
                        location: [pickupLongitude, pickupLatitude],
                        time_windows: [deliveryTimeWindow],
                        service: 1000
                    }
                };
                versoData.shipments.push(shipment);
            }
        };



        return {
            versoNeeds: versoData,
            dfcNeeds: dfcGraph
        };
    }

    /**
     * Transform Verso result back to DFC format
     * @param {Object} versoResult - Result from Verso optimization
     * @returns {Object} DFC formatted result
     */
    async transformVersoToDFC(versoResult, dfcNeeds) {
        // Initialize DFC result structure

        let context = await (await fetch(config.CONTEXT_JSON_URL)).json();
        context = {
            '@context': {
                ...(context['@context']),
                "pickupShipmentId": {
                    "@id": "https://example.org/pickupShipmentId",
                    "@type": "http://www.w3.org/2001/XMLSchema#integer"
                },
                "deliveryShipmentId": {
                    "@id": "https://example.org/deliveryShipmentId",
                    "@type": "http://www.w3.org/2001/XMLSchema#integer"
                },
                'dfc-b:isChippedIn': {
                    "@type": "@id"
                },
                'dfc-b:hasRoute': {
                    "@type": "@id"
                },
                'dfc-b:vehicle': {
                    "@type": "@id"
                },
                'dfc-b:steps': {
                    "@type": "@id"
                },
                'dfc-b:ships': {
                    "@type": "@id"
                },
                'dfc-b:hasRoute': {
                    "@type": "@id"
                },
                'dfc-b:pickup': {
                    "@type": "@id"
                },
                'dfc-b:delivery': {
                    "@type": "@id"
                },
                'dfc-b:isStoredIn': {
                    "@type": "@id"
                },
                'dfc-b:transports': {
                    "@type": "@id"
                }
            }
        };

        const dfcWithVersoIdContext = {
            '@context': context['@context'],
            '@graph': dfcNeeds['@graph']
        };

        const flattened = await jsonld.flatten(dfcWithVersoIdContext, context);

        const dfcResult = {
            '@context': context['@context'],
            '@graph': flattened['@graph'],
        };

        const orderLines = flattened['@graph'].filter(part => part['@type'] === 'dfc-b:OrderLine');

        // Transform routes to DFC graph
        for (const [routeIndex, route] of versoResult.routes.entries()) {
            const vehicleId = `${config.JSONLD_BASE}/vehicle-${route.vehicle}`;
            const routeId = `${config.JSONLD_BASE}/route-${routeIndex}`;

            const shipments = [];
            const steps = [];

            for (const [stepIndex, step] of route.steps.entries()) {
                let shipment;
                let stepShipment;

                if (step.type === 'pickup' || step.type === 'delivery') {
                    const orderLine = orderLines.find(orderLine =>
                        orderLine.pickupShipmentId === step.id || orderLine.deliveryShipmentId === step.id
                    );

                    if (orderLine) {
                        const orderLineFramed = await jsonld.frame(dfcWithVersoIdContext, {
                            "@context": context['@context'],
                            "@id": orderLine['@id'],
                            "dfc-b:partOf": {
                                "@embed": "@always",
                                "dfc-b:belongsTo": {
                                    "@embed": "@never"
                                }
                            },
                            "dfc-b:concerns": {
                                "@embed": "@never"
                            }
                        });

                        const realStock = await jsonld.frame(dfcWithVersoIdContext, {
                            "@context": context['@context'],
                            "@id": orderLineFramed['dfc-b:fulfilledBy']['dfc-b:constitutedBy']['@id'],
                            "dfc-b:constitutes": {
                                "@embed": "@always",
                                "dfc-b:fulfills": {
                                    "@embed": "@never"
                                },
                                "dfc-b:represents": {
                                    "@embed": "@never"
                                }
                            }
                        });

                        shipment = {
                            '@id': `${config.JSONLD_BASE}/shipment-${step.id}`,
                            '@type': 'dfc-b:Shipment',
                            'dfc-b:isChippedIn': vehicleId,
                            'dfc-b:transports': realStock['@id'],
                            'dfc-b:startAt': realStock['dfc-b:isStoredIn']['dfc-b:hasAddress'],
                            'dfc-b:endAt': orderLineFramed['dfc-b:partOf']['dfc-b:selects']['dfc-b:pickedUpAt']['dfc-b:hasAddress']
                        };

                        dfcResult['@graph'].push(shipment);
                        shipments.push(shipment);

                        if (step.type === 'pickup') {
                            stepShipment = {
                                'dfc-b:pickup': shipment['@id']
                            };
                        } else if (step.type === 'delivery') {
                            stepShipment = {
                                'dfc-b:delivery': shipment['@id']
                            };
                        }
                    }
                }

                const stepDFC = {
                    '@id': `${config.JSONLD_BASE}/step-${routeIndex}-${stepIndex}`,
                    '@type': 'dfc-b:Step',
                    'dfc-b:stepType': step.type,
                    'dfc-b:hasRoute': routeId,
                    'dfc-b:geo': step.location,
                    'dfc-b:arrival': step.arrival,
                    'dfc-b:duration': step.duration,
                    'dfc-b:waiting_time': step.waiting_time,
                    ...stepShipment
                };
                dfcResult['@graph'].push(stepDFC);
                steps.push(stepDFC);
            }

            const vehicle = {
                '@id': vehicleId,
                '@type': 'dfc-b:Vehicle',
                'dfc-b:ships': shipments.map(shipment => shipment['@id'])
            };
            dfcResult['@graph'].push(vehicle);

            const routeDFC = {
                '@id': routeId,
                '@type': 'dfc-b:Route',
                'dfc-b:geometry': route.geometry,
                'dfc-b:vehicle': vehicleId,
                'dfc-b:steps': steps.map(step => step['@id'])
            };
            dfcResult['@graph'].push(routeDFC);
        }

        const frame = {
            "@context": context['@context'],
            "@type": "dfc-b:Route",
            "dfc-b:geometry": {},
            "dfc-b:vehicle": {
                "@embed": "@always",
                "dfc-b:ships": {
                    "@embed": "@always",
                    "dfc-b:transports": {
                        "@embed": "@always",
                        "dfc-b:constitutes": {
                            "@embed": "@always",
                            "dfc-b:fulfills": {
                                "@embed": "@always",
                                "dfc-b:partOf": {
                                    "@embed": "@never"
                                },
                                "dfc-b:concerns": {
                                    "@embed": "@always",
                                    "dfc-b:offers": {
                                        "@embed": "@always",
                                        "dfc-b:references": {
                                            "@embed": "@always",
                                            "dfc-b:referencedBy": {
                                                "@embed": "@never"
                                            },
                                            "dfc-b:hasProcess": {
                                                "@embed": "@never"
                                            }
                                        },
                                        "dfc-b:offeredThrough": {
                                            "@embed": "@never"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "dfc-b:steps": {
                "@embed": "@always",
                "dfc-b:pickup": {
                    "@embed": "@never"
                },
                "dfc-b:delivery": {
                    "@embed": "@never"
                }
            }
        };

        const framed = await jsonld.frame(dfcResult, frame);

        // Sort the @graph objects by @type
        dfcResult['@graph'].sort((a, b) => a['@type'].localeCompare(b['@type']));

        return dfcResult;
    }

    /**
     * Call Verso optimization API
     * @param {Object} versoData - Data in Verso format
     * @returns {Promise<Object>} Optimization result
     */
    async callVersoOptimization(versoData) {
        const response = await fetch(`${this.apiUrl}?api_key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(versoData)
        });
        if (!response.ok) {
            console.error('Verso optimization API error response:', {
                status: response.status,
                statusText: response.statusText,
                body: await response.text()
            });
            // Log a curl command to reproduce the failed request
            const requestBody = JSON.stringify(versoData);
            const curlCommand = `curl -X POST "${this.apiUrl}?api_key=${this.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'`;
            const errorBody = await response.text();
            console.error('Verso optimization API returned status:', response.status);
            console.error('Response body:', errorBody);
            console.error('Curl command to reproduce the error:\n', curlCommand);
            throw new Error(`Verso optimization failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Comparer versoData et needsData
    compareData = (versoData, needsData) => {
        const differences = [];

        // Comparer les véhicules
        const vehiclesMatch = JSON.stringify(versoData.vehicles) === JSON.stringify(needsData.vehicles);
        if (!vehiclesMatch) {
            differences.push({
                type: 'vehicles',
                verso: versoData.vehicles,
                needs: needsData.vehicles
            });
        }

        // Comparer les expéditions
        const shipmentsMatch = JSON.stringify(versoData.shipments) === JSON.stringify(needsData.shipments);
        if (!shipmentsMatch) {
            differences.push({
                type: 'shipments',
                verso: versoData.shipments,
                needs: needsData.shipments
            });
        }

        // Log uniquement s'il y a des différences
        if (differences.length > 0) {
            console.log('Differences found:');
            differences.forEach(diff => {
                console.log(`\n${diff.type}:`);
                console.log('Differences between:', JSON.stringify(diff.verso), '\nand:', JSON.stringify(diff.needs));
            });
        }

        return vehiclesMatch && shipmentsMatch;
    };

    /**
     * Main optimization method that orchestrates the entire process
     * @param {Object} dfcGraph - Input DFC graph data
     * @returns {Promise<Object>} Optimized result in DFC format
     */
    async optimize(dfcGraph) {
        // Transformer les données DFC en format Verso
        const versoData = this.transformDFCtoVerso(dfcGraph);

        const compare = this.compareData(versoData, dfcGraph);

        // Appeler l'API d'optimisation Verso
        const versoResult = await this.callVersoOptimization(versoData);

        // Transformer le résultat Verso en format DFC
        const dfcResult = await this.transformVersoToDFC(versoResult, dfcGraph);

        return dfcResult;
    }
}

module.exports = OptimizationService;
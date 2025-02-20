const jsonld = require('jsonld');

class OptimizationService {
    constructor(apiUrl, apiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
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
            // console.log('__order', order);
            const physicalPlaceId = order['dfc-b:selects']?.['dfc-b:pickedUpAt']?.['@id']||order['dfc-b:selects']?.['dfc-b:pickedUpAt'];
            // console.log('__physicalPlaceId', physicalPlaceId);
            const physicalPlace = await jsonld.frame(dfcGraph, {
                "@context": dfcGraph['@context'],
                "@id": physicalPlaceId
            });
            // console.log('__physicalPlace', physicalPlace);
            const pickupAddress = physicalPlace['dfc-b:hasAddress'];
            for (const part of order['dfc-b:hasPart']) {
                // console.log('__part', part);
                let partOrigin = dfcGraph['@graph'].find(entity => entity['@id'] === part['@id']);
                const physicalProductId = part['dfc-b:fulfilledBy']?.['@id']||part['dfc-b:fulfilledBy']?.['dfc-b:constitutedBy'];
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
                const sourceAddress = physicalProduct?.['dfc-b:constitutedBy']?.['dfc-b:isStoredIn']?.['dfc-b:hasAddress'];
                // console.log('__sourceAddress', sourceAddress);
                const pickupId = shipmentIdCounter++;
                const deliveryId = shipmentIdCounter++;
                partOrigin['pickupShipmentId'] = pickupId;
                partOrigin['deliveryShipmentId'] = deliveryId;


                 // Create vehicle
                 const vehicle = {
                    id: vehicleId++,
                    start: [
                        parseFloat(sourceAddress['dfc-b:longitude']),
                        parseFloat(sourceAddress['dfc-b:latitude'])
                    ],
                    end: [
                        parseFloat(sourceAddress['dfc-b:longitude']),
                        parseFloat(sourceAddress['dfc-b:latitude'])
                    ]
                };
                versoData.vehicles.push(vehicle);

                // Create shipment
                const shipment = {
                    pickup: {
                        id: pickupId,
                        location: [
                            parseFloat(sourceAddress['dfc-b:longitude']),
                            parseFloat(sourceAddress['dfc-b:latitude'])
                        ],
                        time_windows: [[1738796400, 1738810800]], // Fixed time window for example
                        service: 1000
                    },
                    delivery: {
                        id: deliveryId,
                        location: [
                            parseFloat(pickupAddress['dfc-b:longitude']),
                            parseFloat(pickupAddress['dfc-b:latitude'])
                        ],
                        time_windows: [[1738796400, 1738810800]], // Fixed time window for example
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


        // console.log('dfcNeeds', JSON.stringify(dfcNeeds));

        let context = await (await fetch(process.env.CONTEXT_JSON_URL)).json();
        context = {
            '@context':{
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

        // const dfcNeedsExpanded = await jsonld.expand(dfcWithVersoIdContext);

        const flattened = await jsonld.flatten(dfcWithVersoIdContext, context);

        const dfcResult = {
            '@context': context['@context'],
            '@graph': flattened['@graph'],

        };

        const orderLines = flattened['@graph'].filter(part => part['@type'] === 'dfc-b:OrderLine');
        // console.log('__orderLines', orderLines[0]);

        // Transform routes to DFC graph
        for (const [routeIndex, route] of versoResult.routes.entries()) {
            const vehicleId = `${process.env.JSONLD_BASE}/vehicle-${route.vehicle}`;
            const routeId = `${process.env.JSONLD_BASE}/route-${routeIndex}`;

            const shipments = [];
            const steps = [];

            for (const [stepIndex, step] of route.steps.entries()) {
                let shipment;
                let stepShipment;

                if (step.type === 'pickup' || step.type === 'delivery') {
                    const orderLine = orderLines.find(orderLine  =>
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

                        // console.log('__orderLineFramed', orderLineFramed);

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
                        // delete realStock['@context'];

                        // console.log('__realStock', realStock);

                        // if (Array.isArray(realStock['dfc-b:isStoredIn']['dfc-b:hasAddress'])) {
                        //     console.log('__realStock', realStock);
                        //     console.log('__orderLineFramed', orderLineFramed);
                        // }

                        shipment = {
                            '@id': `${process.env.JSONLD_BASE}/shipment-${step.id}`,
                            '@type': 'dfc-b:Shipment',
                            'dfc-b:isChippedIn': vehicleId,
                            'dfc-b:transports': realStock['@id'],
                            'dfc-b:startAt': realStock['dfc-b:isStoredIn']['dfc-b:hasAddress'],
                            'dfc-b:endAt': orderLineFramed['dfc-b:partOf']['dfc-b:selects']['dfc-b:pickedUpAt']['dfc-b:hasAddress']
                        };
                        // console.log('__shipment', shipment);

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
                // console.log('__stepShipment', stepShipment);

                const stepDFC = {
                    '@id': `${process.env.JSONLD_BASE}/step-${routeIndex}-${stepIndex}`,
                    '@type': 'dfc-b:Step',
                    'dfc-b:stepType': step.type,
                    'dfc-b:hasRoute': routeId,
                    'dfc-b:geo': step.location,
                    'dfc-b:arrival': step.arrival,
                    'dfc-b:duration': step.duration,
                    'dfc-b:waiting_time': step.waiting_time,
                    ...stepShipment
                };
                // console.log('__stepDFC', stepDFC);
                dfcResult['@graph'].push(stepDFC);
                steps.push(stepDFC);
            }

            const vehicle = {
                '@id': vehicleId,
                '@type': 'dfc-b:Vehicle',
                'dfc-b:ships': shipments.map(shipment => shipment['@id'])
            };
            // console.log('__vehicle', vehicle['@id']);
            dfcResult['@graph'].push(vehicle);

            const routeDFC = {
                '@id': routeId,
                '@type': 'dfc-b:Route',
                'dfc-b:geometry': route.geometry,
                'dfc-b:vehicle': vehicleId,
                'dfc-b:steps': steps.map(step => step['@id'])

            };
            // console.log('__routeDFC', routeDFC['@id']);
            dfcResult['@graph'].push(routeDFC);
        }


        // console.log('__dfcResult', JSON.stringify(dfcResult));

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

        // console.log('__frame', JSON.stringify(frame));


        const framed = await jsonld.frame(dfcResult, frame);

        console.log('__framed', JSON.stringify(framed));

        // const entityWithoutType = dfcResult['@graph'].filter(entity => !entity['@type']);
        // console.log('__entityWithoutType', entityWithoutType);
        // Sort the @graph objects by @type
        dfcResult['@graph'].sort((a, b) => a['@type'].localeCompare(b['@type']));

        console.log('__dfcResult', JSON.stringify(dfcResult));


        return dfcResult;
    }

    /**
     * Call Verso optimization API
     * @param {Object} versoData - Data in Verso format
     * @returns {Promise<Object>} Optimization result
     */
    async callVersoOptimization(versoData) {
        // console.log('__versoData', JSON.stringify(versoData));
        const response = await fetch(`${this.apiUrl}?api_key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(versoData)
        });
        if (!response.ok) {
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
        // console.log('__compare', compare);
// 
        // Appeler l'API d'optimisation Verso
        const versoResult = await this.callVersoOptimization(versoData);

        // Transformer le résultat Verso en format DFC
        const dfcResult = await this.transformVersoToDFC(versoResult, dfcGraph);

        return dfcResult;
    }
}

module.exports = OptimizationService;
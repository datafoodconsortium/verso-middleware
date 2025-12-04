# Project Context

Context document on the Verso ↔ Data Food Consortium experiment.

---

## Objective

Experiment with using the **DFC protocol** (Data Food Consortium) to perform **logistics optimization** via the Verso API, while ensuring interoperability between platforms.

---

## Architecture

### Problem Statement

**Verso** is a logistics optimization solution specialized in VRP (Vehicle Routing Problem). Verso does not want to directly manage incoming/outgoing APIs in DFC format.

### Solution: Middleware

Creation of a **middleware** that:

1. **Receives** DFC data (orders, addresses, schedules)
2. **Transforms** these needs into Verso format
3. **Calls** Verso API for optimization
4. **Transforms** Verso result into enriched DFC format
5. **Returns** optimized routes in DFC format

```
DFC Platforms  →  Middleware  →  Verso API
                        ↓
                  Optimized DFC routes
```

### Advantages

✅ **Interoperability** - Platforms don't need to know Verso  
✅ **DFC Standard** - Use of common protocol  
✅ **Separation of concerns** - Verso focuses on optimization, not on DFC protocol  
✅ **Enrichment** - Combines business data (orders, products) + logistics (routes, steps)  

---

## Validated Use Cases

### 1. Multi-Platform

**Scenario:**  
A producer has orders on **Open Food Network** AND **Cagette**.

**Need:**  
Optimize all deliveries in a single round.

**Solution:**  
Producer retrieves all orders via DFC protocol, sends them to middleware, and receives an optimized itinerary.

**Status:** ✅ Validated

---

### 2. Multi-Producer (Logistics Provider)

**Scenario:**  
A logistics provider delivers for multiple producers.

**Need:**  
Share deliveries to optimize costs.

**Solution:**  
Logistics provider accesses orders from multiple producers (with their consent), groups them, and gets shared routes.

**Current implementation:**  
A user marked "logistics provider" in database gets all orders to optimize.

**Status:** ✅ Validated (simplistic but functional implementation)

---

### 3. Multi-Platform + Multi-Producer

**Scenario:**  
A logistics provider manages multiple producers across multiple platforms.

**Need:**  
Global optimization.

**Solution:**  
Combination of cases 1 and 2.

**Status:** ✅ Validated without difficulties

---

## Main Added Value

### Business Data + Logistics Crossover

**Verso Problem:**  
Verso returns an optimization result that contains:
- Routes with geometries
- Steps (pickup, delivery)
- Schedules

But **does not contain**:
- Detailed orders
- Products
- Volumes
- Nature of movements (which product goes where?)

**Middleware Solution:**

1. **Forward (DFC → Verso):**  
   - Assign Verso IDs to OrderLines  
   - Keep original DFC graph

2. **Return (Verso → DFC):**  
   - Use Verso IDs to find OrderLines  
   - Create `Shipment` entities linking routes and orders  
   - Enrich DFC graph with optimized routes

**Result:**  
Consumer receives complete DFC graph with:
- ✅ Original orders
- ✅ Products and quantities
- ✅ Optimized routes
- ✅ Links between routes and orders
- ✅ Estimated arrival times

---

## Impacts on DFC Ontology

### Observation

The experiment showed that **several concepts and properties are missing** in the DFC ontology to express:
- Optimization needs
- Optimization results

### Necessary Extensions

The middleware added to its JSON-LD context:

**Entities:**
- `dfc-b:Route` - Optimized itinerary
- `dfc-b:Vehicle` - Delivery vehicle
- `dfc-b:Shipment` - Shipment (link between order and route)
- `dfc-b:Step` - Route step

**Properties:**
- `dfc-b:geometry` - Route geometry (polyline)
- `dfc-b:vehicle` - Route vehicle
- `dfc-b:steps` - Route steps
- `dfc-b:stepType` - Step type (start, pickup, delivery, end)
- `dfc-b:geo` - GPS coordinates
- `dfc-b:arrival` - Arrival timestamp
- `dfc-b:duration` - Step duration
- `dfc-b:ships` - Vehicle shipments
- `dfc-b:transports` - Transported order
- `dfc-b:isChippedIn` - Shipment vehicle
- `dfc-b:startAt` - Shipment start step
- `dfc-b:endAt` - Shipment arrival step
- `dfc-b:versoIdPickup` - Verso pickup ID (traceability)
- `dfc-b:versoIdDelivery` - Verso delivery ID (traceability)

### Recommendations

These extensions should be:
1. **Formalized** in the DFC ontology
2. **Standardized** for interoperability
3. **Documented** with examples

---

## Current Limitations

### Technical

⚠️ **Fixed service time** - 1000 seconds by default for all steps  
⚠️ **One vehicle per source** - No multi-vehicle grouping  
⚠️ **No capacities** - Unlimited volume for vehicles  
⚠️ **Return to depot mandatory** - No open circuit  
⚠️ **Simple time windows** - One slot per location  

### Functional

⚠️ **Simplistic authentication** - "Logistics provider" user marked manually  
⚠️ **No rights management** - Total access to orders  
⚠️ **No advanced validation** - Invalid coordinates = skip  

---

## Planned Evolutions

### Short Term

- [ ] Vehicle capacity support
- [ ] Multi-vehicle per producer
- [ ] JSON Schema validation
- [ ] Better time windows management
- [ ] Service time configuration

### Medium Term

- [ ] Robust authentication
- [ ] Permissions management (who sees which orders)
- [ ] Open circuits support
- [ ] Incremental optimization
- [ ] Visualization interface

### Long Term

- [ ] Integration with other optimization engines
- [ ] AI predictions (travel time, etc.)
- [ ] Real-time optimization
- [ ] Carbon footprint calculation

---

## Project Resources

### Repositories

- **Middleware:** [verso-middleware](https://github.com/...)
- **DFC Prototype:** [dfc-prototype-V3](https://github.com/...)
- **DFC Ontology:** [ontology](https://github.com/datafoodconsortium/ontology)

### Documentation

- **DFC:** https://datafoodconsortium.org/
- **Verso:** https://verso-optim.com/
- **Business API:** https://github.com/datafoodconsortium/business-api

### Test Datasets

Available in `dataset/`:
- `orders-DFC.json` - Example DFC orders
- `needs-verso.json` - Generated Verso format
- `results-verso.json` - Verso result
- `results-DFC.json` - Enriched DFC result

---

## Feedback

### Successes

✅ **Validated interoperability** - DFC protocol works for logistics  
✅ **Functional multi-platform** - Order aggregation from various sources  
✅ **Functional multi-producer** - Validated sharing  
✅ **Data enrichment** - Successful business + logistics combination  

### Challenges

⚠️ **Ontology to extend** - Missing logistics concepts  
⚠️ **JSON-LD complexity** - Framing and flattening sometimes difficult  
⚠️ **Performance** - Large graph processing to optimize  
⚠️ **Identifier management** - Complex DFC ↔ Verso traceability  

### Lessons Learned

💡 **Powerful but demanding JSON-LD** - Requires good understanding  
💡 **Clear separation of responsibilities** - Middleware = good approach  
💡 **Tests with real data** - Essential for validation  
💡 **Critical documentation** - Complex JSON-LD = indispensable doc  

---

## Conclusion

This experiment demonstrated the **viability of the DFC protocol for logistics**. 

The Verso middleware proves that it is possible to:
- ✅ Use DFC for logistics use cases
- ✅ Integrate external services (Verso)
- ✅ Enrich business data with logistics data
- ✅ Maintain interoperability

**Next steps:**
1. Formalize ontological extensions
2. Industrialize middleware
3. Extend to other optimization engines
4. Deploy in production

---

**For more information:**  
- [Main README](../README.md)
- [Technical architecture](ARCHITECTURE-en.md)
- [API guide](API-en.md)


'use strict';
// A reproducible fixture shaped like the client's Report Definitions & Field Mapping.
// Values are synthetic and must NEVER be represented as actual Power BI results.
const ROUND = (x, decimals = 2) => Number(x.toFixed(decimals));

const EXAMPLE_RECORD = {
  id: 'LD-804821-PO-229140', division: 'Carolina', account: 'Restaurant',
  loadId: 'LD-804821', poNumber: 'PO-229140', shipMethod: 'TL',
  vendorId: 'VND-4801', vendorName: "Denny's", item: 'ITEM-10291 Fries 6x5lb',
  priceCategory: 'Standard Frozen', freightCategory: 'Frozen', receivedDate: '2026-10-28',
  miles: 420, pallets: 22, cases: 1520, weight: 38400, cube: 1920,
  utilizationPercent: 94.2, sfc: 1.90, afc: 1.84, delta: -0.06,
  freightCost: 2796.80, standardCost: 2888.00, variance: -91.20,
  impact: -91.20, margin: 4.2, status: 'Matched', newLaneFlag: false,
  linehaul: { mbmLinehaul: 2100, contracted3PLLinehaul: 0, vendorDelivery: 0, cust3PLLinehaul: 0 },
  surcharges: { fsc: 320, unloadingLabor: 180, truckDetention: 0, managementFee: 95,
    layover: 0, palletCharge: 45, stopOffCharge: 0, billback: 0, misc: 56.8,
    facFuelSurcharge: 0, truckDetentionUnused: 0, outOfRouteMiles: 0,
    unusedVehicleOrdered: 0, extraordinaryFreightCredit: 0, return: 0, deadhead: 0 }
};

function createMockRecords() {
  const divisions = ['Carolina', 'Atlanta', 'Chicago', 'Dallas', 'Phoenix', 'Tampa'];
  const vendors = [
    ['VND-4801',"Denny's"], ['VND-4802','Northstar Supply'],
    ['VND-4803','Valley Produce'], ['VND-4804','Blue Ribbon Foods']
  ];
  const priceCategories = ['Standard Frozen','Standard Chilled','Dry Goods'];
  const freightCategories = ['Frozen','Chilled','Dry'];
  const records = [structuredClone(EXAMPLE_RECORD)];
  for (let i=1;i<=179;i++) {
    const cases = 350 + (i*83)%1900;
    const afc = ROUND(1.58 + (i%19)*0.035);
    const sfc = ROUND(1.69 + (i%16)*0.034);
    const freightCost = ROUND(cases*afc), standardCost=ROUND(cases*sfc);
    const loadId = `LD-${804821 + Math.floor(i/2)}`;
    const poNumber = `PO-${229140+i}`;
    const vendor = vendors[i%vendors.length];
    const date = new Date(Date.UTC(2026,0,1 + (i*17)%303)).toISOString().slice(0,10);
    const baseLinehaul = ROUND(freightCost * .73);
    records.push({
      id:`${loadId}-${poNumber}`, division:divisions[i%divisions.length],account:'Restaurant',loadId,poNumber,
      shipMethod: ['TL','LTL','Intermodal'][i%3],vendorId: vendor[0],vendorName:vendor[1],
      item:`ITEM-${10291+i} Sample Product ${i}`,priceCategory:priceCategories[i%3],freightCategory:freightCategories[i%3],
      receivedDate:date,miles:160+(i*37)%1300,pallets:5+i%22,cases,weight:cases*25.2,cube:ROUND(cases*1.25),
      utilizationPercent:ROUND(70+(i%28)*.9),sfc,afc,delta:ROUND(afc-sfc),freightCost,standardCost,
      variance: ROUND(freightCost-standardCost),impact:ROUND(freightCost-standardCost),margin:ROUND(2+i%12*.4),
      status: i%17===0?'Review':'Matched',newLaneFlag:i%11===0,
      linehaul: {mbmLinehaul:baseLinehaul,contracted3PLLinehaul:0,vendorDelivery:0,cust3PLLinehaul:0},
      surcharges: {fsc:ROUND(freightCost*.10),unloadingLabor:ROUND(freightCost*.04),truckDetention:i%17===0?90:0,
        managementFee:ROUND(freightCost*.03),layover:0,palletCharge:ROUND(freightCost*.01),stopOffCharge:0,billback:0,
        misc:ROUND(freightCost-baseLinehaul-freightCost*.1-freightCost*.04-freightCost*.03-freightCost*.01-(i%17===0?90:0)),
        facFuelSurcharge:0,truckDetentionUnused:0,outOfRouteMiles:0,unusedVehicleOrdered:0,
        extraordinaryFreightCredit:0,return:0,deadhead:0}
    });
  }
  return Object.freeze(records);
}
module.exports = { EXAMPLE_RECORD, createMockRecords };

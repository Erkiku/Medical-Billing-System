const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Store Settings
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "R & A Medical Store",
      tagline: "Retail & Wholesale Chemists • Complete Healthcare",
      address: "Shop No. 12, Main Market, Near City Hospital",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      phone: "+91 98765 43210",
      email: "billing@ramedical.com",
      gstin: "07AAAAA0000A1Z5",
      dlNumber1: "DL-20B-123456",
      dlNumber2: "DL-21B-654321",
      fssaiNumber: "10012345678901",
      terms: "1. Goods once sold will not be accepted back without bill.\n2. Store medicines in cool, dry place.\n3. For Schedule H medicines, doctor prescription is mandatory.\n4. Disputes subject to local jurisdiction only.",
      upiId: "ramedical@upi",
      smsGateway: "MOCK",
    },
  });

  // 2. Users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  await prisma.user.upsert({
    where: { email: "admin@medicalpro.com" },
    update: {},
    create: {
      name: "Admin Manager",
      email: "admin@medicalpro.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      phone: "9876543210",
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "pharmacist@medicalpro.com" },
    update: {},
    create: {
      name: "Suresh Pharmacist",
      email: "pharmacist@medicalpro.com",
      passwordHash: staffPassword,
      role: "PHARMACIST",
      phone: "9876543211",
      active: true,
    },
  });

  // 3. Categories
  const categories = [
    { name: "Antibiotics", description: "Antibacterial and anti-infective formulations" },
    { name: "Analgesics & Pain Relief", description: "Pain relief, fever, and anti-inflammatory" },
    { name: "Gastrointestinal", description: "Antacids, PPIs, anti-emetic" },
    { name: "Antidiabetic", description: "Blood sugar management" },
    { name: "Cardiovascular", description: "Hypertension, cardiac medicines" },
    { name: "Vitamins & Supplements", description: "Nutritional supplements, multivitamins" },
    { name: "Respiratory & Cough", description: "Cough syrups, anti-allergic, inhalers" },
  ];

  const catMap = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    catMap[cat.name] = c.id;
  }

  // 4. Doctors
  const doctors = [
    {
      name: "Dr. Rajesh Sharma",
      hospitalOrClinic: "City Multi-speciality Hospital",
      mobile: "9810101010",
      registrationNumber: "MCI-28491",
      address: "Cabin 4, City Hospital, New Delhi",
    },
    {
      name: "Dr. Priya Verma",
      hospitalOrClinic: "Verma Children Clinic",
      mobile: "9810202020",
      registrationNumber: "DMC-55102",
      address: "Sector 14, Rohini, New Delhi",
    },
    {
      name: "Dr. Ankit Gupta",
      hospitalOrClinic: "Gupta Health Care",
      mobile: "9810303030",
      registrationNumber: "DMC-33421",
      address: "Model Town, Delhi",
    },
  ];

  for (const doc of doctors) {
    const existing = await prisma.doctor.findFirst({ where: { name: doc.name } });
    if (!existing) {
      await prisma.doctor.create({ data: doc });
    }
  }

  // 5. Customers
  const customers = [
    {
      name: "Ramesh Kumar",
      mobile: "9876500001",
      email: "ramesh@example.com",
      address: "House 42, Block C, Civil Lines, Delhi",
      totalPurchases: 2450,
      totalPaid: 2000,
      balanceDue: 450,
    },
    {
      name: "Sunita Sharma",
      mobile: "9876500002",
      email: "sunita@example.com",
      address: "Flat 102, Shanti Kunj, Delhi",
      totalPurchases: 1850,
      totalPaid: 1850,
      balanceDue: 0,
    },
    {
      name: "Amit Patel",
      mobile: "9876500003",
      email: "amit@example.com",
      address: "Shop 5, Cloth Market, Chandni Chowk, Delhi",
      totalPurchases: 4500,
      totalPaid: 3300,
      balanceDue: 1200,
    },
  ];

  for (const cust of customers) {
    await prisma.customer.upsert({
      where: { mobile: cust.mobile },
      update: {},
      create: cust,
    });
  }

  // 6. Suppliers
  const suppliers = [
    {
      name: "Apollo Healthcare Distributors",
      mobile: "9811122233",
      email: "orders@apollodist.com",
      address: "Wholesale Medicine Market, Bhagirath Palace, Delhi",
      gstin: "07AAACA1234D1Z2",
      dlNumber: "DL-20B-7890",
      contactPerson: "Sanjay Verma",
    },
    {
      name: "Cipla Wholesale Agency",
      mobile: "9822233344",
      email: "delhi@ciplawholesale.com",
      address: "Plot 45, Okhla Phase 2, New Delhi",
      gstin: "07BBBCA5678E1Z5",
      dlNumber: "DL-20B-6543",
      contactPerson: "Rakesh Mehta",
    },
  ];

  for (const sup of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    if (!existing) {
      await prisma.supplier.create({ data: sup });
    }
  }

  // 7. Medicines & Batches
  const medicines = [
    {
      name: "Dolo 650 Tablet",
      genericName: "Paracetamol",
      saltComposition: "Paracetamol 650mg",
      company: "Micro Labs Ltd",
      categoryId: catMap["Analgesics & Pain Relief"],
      barcode: "8901148205018",
      packSize: "1x15",
      purchasePrice: 24.5,
      mrp: 33.6,
      sellingPrice: 32.0,
      gstRate: 12.0,
      minStockLevel: 20,
      batches: [
        {
          batchNumber: "DL-8821",
          mfgDate: new Date("2024-05-01"),
          expiryDate: new Date("2027-04-30"),
          quantity: 200,
          purchasePrice: 24.5,
          mrp: 33.6,
        },
        {
          batchNumber: "DL-OLD-99",
          mfgDate: new Date("2022-01-01"),
          expiryDate: new Date("2024-01-01"), // Expired batch
          quantity: 15,
          purchasePrice: 22.0,
          mrp: 30.0,
        },
      ],
    },
    {
      name: "Augmentin 625 Duo Tablet",
      genericName: "Amoxicillin and Potassium Clavulanate",
      saltComposition: "Amoxicillin 500mg + Clavulanic Acid 125mg",
      company: "GlaxoSmithKline Pharmaceuticals",
      categoryId: catMap["Antibiotics"],
      barcode: "8901038380238",
      packSize: "1x10",
      purchasePrice: 155.0,
      mrp: 204.5,
      sellingPrice: 195.0,
      gstRate: 12.0,
      minStockLevel: 15,
      batches: [
        {
          batchNumber: "AG-6250",
          mfgDate: new Date("2024-06-15"),
          expiryDate: new Date("2026-06-30"),
          quantity: 80,
          purchasePrice: 155.0,
          mrp: 204.5,
        },
      ],
    },
    {
      name: "Pan 40 Tablet",
      genericName: "Pantoprazole Gastro-resistant Tablets",
      saltComposition: "Pantoprazole Sodium 40mg",
      company: "Alkem Laboratories Ltd",
      categoryId: catMap["Gastrointestinal"],
      barcode: "8901117105011",
      packSize: "1x15",
      purchasePrice: 115.0,
      mrp: 162.0,
      sellingPrice: 155.0,
      gstRate: 12.0,
      minStockLevel: 25,
      batches: [
        {
          batchNumber: "PAN-4019",
          mfgDate: new Date("2024-04-01"),
          expiryDate: new Date("2027-03-31"),
          quantity: 150,
          purchasePrice: 115.0,
          mrp: 162.0,
        },
      ],
    },
    {
      name: "Azee 500 Tablet",
      genericName: "Azithromycin Tablets IP",
      saltComposition: "Azithromycin 500mg",
      company: "Cipla Ltd",
      categoryId: catMap["Antibiotics"],
      barcode: "8901117205022",
      packSize: "1x5",
      purchasePrice: 88.0,
      mrp: 128.5,
      sellingPrice: 120.0,
      gstRate: 12.0,
      minStockLevel: 20,
      batches: [
        {
          batchNumber: "AZ-5001",
          mfgDate: new Date("2024-07-01"),
          expiryDate: new Date("2026-05-31"), // Near expiry (<90 days relative to future dates)
          quantity: 65,
          purchasePrice: 88.0,
          mrp: 128.5,
        },
      ],
    },
    {
      name: "Glycomet 500 SR Tablet",
      genericName: "Metformin Hydrochloride Sustained Release",
      saltComposition: "Metformin 500mg",
      company: "USV Private Ltd",
      categoryId: catMap["Antidiabetic"],
      barcode: "8901117305033",
      packSize: "1x20",
      purchasePrice: 32.0,
      mrp: 49.5,
      sellingPrice: 46.0,
      gstRate: 12.0,
      minStockLevel: 30,
      batches: [
        {
          batchNumber: "GLY-502",
          mfgDate: new Date("2024-08-01"),
          expiryDate: new Date("2027-07-31"),
          quantity: 180,
          purchasePrice: 32.0,
          mrp: 49.5,
        },
      ],
    },
    {
      name: "Telma 40 Tablet",
      genericName: "Telmisartan Tablets IP",
      saltComposition: "Telmisartan 40mg",
      company: "Glenmark Pharmaceuticals",
      categoryId: catMap["Cardiovascular"],
      barcode: "8901117405044",
      packSize: "1x15",
      purchasePrice: 98.0,
      mrp: 154.0,
      sellingPrice: 145.0,
      gstRate: 12.0,
      minStockLevel: 20,
      batches: [
        {
          batchNumber: "TL-408",
          mfgDate: new Date("2024-03-01"),
          expiryDate: new Date("2027-02-28"),
          quantity: 90,
          purchasePrice: 98.0,
          mrp: 154.0,
        },
      ],
    },
    {
      name: "Becosules Z Capsules",
      genericName: "B-Complex Forte with Vitamin C and Zinc",
      saltComposition: "Vitamin B-Complex + Vitamin C 150mg + Zinc Sulphate",
      company: "Pfizer Ltd",
      categoryId: catMap["Vitamins & Supplements"],
      barcode: "8901117505055",
      packSize: "1x20",
      purchasePrice: 38.0,
      mrp: 54.0,
      sellingPrice: 50.0,
      gstRate: 12.0,
      minStockLevel: 25,
      batches: [
        {
          batchNumber: "BC-120",
          mfgDate: new Date("2024-09-01"),
          expiryDate: new Date("2026-08-31"),
          quantity: 110,
          purchasePrice: 38.0,
          mrp: 54.0,
        },
      ],
    },
    {
      name: "Cetzine 10mg Tablet",
      genericName: "Cetirizine Hydrochloride",
      saltComposition: "Cetirizine 10mg",
      company: "Dr. Reddy's Laboratories",
      categoryId: catMap["Respiratory & Cough"],
      barcode: "8901117605066",
      packSize: "1x10",
      purchasePrice: 15.0,
      mrp: 23.5,
      sellingPrice: 22.0,
      gstRate: 12.0,
      minStockLevel: 25, // Note: quantity 6 is low stock!
      batches: [
        {
          batchNumber: "CZ-09",
          mfgDate: new Date("2024-05-01"),
          expiryDate: new Date("2027-04-30"),
          quantity: 6, // Low stock trigger
          purchasePrice: 15.0,
          mrp: 23.5,
        },
      ],
    },
  ];

  for (const med of medicines) {
    const { batches, ...medData } = med;
    let medicine = await prisma.medicine.findFirst({ where: { name: medData.name } });
    if (!medicine) {
      medicine = await prisma.medicine.create({ data: medData });
    }
    for (const b of batches) {
      await prisma.batch.upsert({
        where: {
          medicineId_batchNumber: {
            medicineId: medicine.id,
            batchNumber: b.batchNumber,
          },
        },
        update: {},
        create: {
          ...b,
          medicineId: medicine.id,
        },
      });
    }
  }

  console.log("Seeding complete! Sample data ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


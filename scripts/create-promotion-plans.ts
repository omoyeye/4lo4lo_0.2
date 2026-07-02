import { db } from "../server/db";
import { promotionPlans } from "../shared/schema";

async function createPromotionPlans() {
  console.log("Creating initial promotion plans...");

  try {
    // First check if there are any plans already
    const existingPlans = await db.select().from(promotionPlans);

    if (existingPlans.length > 0) {
      console.log(`${existingPlans.length} promotion plans already exist, skipping creation.`);
      return;
    }

    // Initial promotion plans
    const plans = [
      {
        name: "Basic Boost",
        description: "Basic engagement package for small accounts",
        engagementCount: 10000,
        price: 5.00,
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 1, // Default admin ID
      },
      {
        name: "Growth Pack",
        description: "Medium engagement package for growing accounts",
        engagementCount: 20000,
        price: 10.00,
        isActive: true,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 1,
      },
      {
        name: "Premium Promotion",
        description: "Premium engagement package for established accounts",
        engagementCount: 50000,
        price: 20.00,
        isActive: true,
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 1,
      }
    ];

    // Insert the plans
    const result = await db.insert(promotionPlans).values(plans).returning();
    console.log(`Successfully created ${result.length} promotion plans.`);
  } catch (error) {
    console.error("Error creating promotion plans:", error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the function
createPromotionPlans();